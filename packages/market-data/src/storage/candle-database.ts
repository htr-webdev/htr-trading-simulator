import { DatabaseSync } from "node:sqlite";
import type { Candle } from "../types/candle.js";

// The composite primary key (symbol, interval, open_time) is backed by an
// implicit index that serves the candle query patterns (filter by symbol and
// interval, range over open_time, ordered output). No additional index is
// needed; add one only when a new query pattern requires it.
const CREATE_CANDLES_TABLE = `
  CREATE TABLE IF NOT EXISTS candles (
    symbol TEXT NOT NULL,
    interval TEXT NOT NULL,
    open_time INTEGER NOT NULL,
    open TEXT NOT NULL,
    high TEXT NOT NULL,
    low TEXT NOT NULL,
    close TEXT NOT NULL,
    volume TEXT NOT NULL,
    close_time INTEGER NOT NULL,
    PRIMARY KEY (symbol, interval, open_time)
  )
`;

interface CandleRow {
  open_time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  close_time: number;
}

/**
 * Local SQLite storage for historical market data.
 *
 * Owns the database connection lifecycle and guarantees the candle
 * schema exists. All statements are parameterized; duplicate candles
 * are ignored at the database level via the composite primary key.
 */
export class CandleDatabase {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    this.database = new DatabaseSync(filePath);
    this.database.exec(CREATE_CANDLES_TABLE);
  }

  /**
   * Inserts candles for one symbol and interval inside a single
   * transaction. Existing records are skipped. Returns the number of
   * newly inserted candles.
   */
  insertCandles(
    symbol: string,
    interval: string,
    candles: Candle[],
  ): number {
    const statement = this.database.prepare(
      `INSERT OR IGNORE INTO candles
        (symbol, interval, open_time, open, high, low, close, volume, close_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    let inserted = 0;

    this.database.exec("BEGIN");

    try {
      for (const candle of candles) {
        const result = statement.run(
          symbol,
          interval,
          candle.openTime,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
          candle.closeTime,
        );

        inserted += Number(result.changes);
      }

      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return inserted;
  }

  /** Counts candles stored for a symbol and interval. */
  countCandles(symbol: string, interval: string): number {
    const row = this.database
      .prepare(
        "SELECT COUNT(*) AS count FROM candles WHERE symbol = ? AND interval = ?",
      )
      .get(symbol, interval) as { count: number };

    return row.count;
  }

  /**
   * Retrieves candles for a symbol and interval within the given
   * inclusive open-time range, in chronological order.
   */
  getCandles(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Candle[] {
    const rows = this.database
      .prepare(
        `SELECT open_time, open, high, low, close, volume, close_time
         FROM candles
         WHERE symbol = ? AND interval = ?
           AND open_time >= ? AND open_time <= ?
         ORDER BY open_time ASC`,
      )
      .all(symbol, interval, startTime, endTime) as unknown as CandleRow[];

    return rows.map((row) => ({
      openTime: row.open_time,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      closeTime: row.close_time,
    }));
  }

  /**
   * Returns the query plan rows for the candle range query. Exposed
   * for tests to verify that queries run on the primary key index.
   */
  explainCandleQuery(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): string[] {
    const statement = this.database.prepare(
      `EXPLAIN QUERY PLAN
       SELECT open_time
       FROM candles
       WHERE symbol = ? AND interval = ?
         AND open_time >= ? AND open_time <= ?
       ORDER BY open_time ASC`,
    );

    return statement.all(symbol, interval, startTime, endTime).map(
      (row) => (row as unknown as { detail: string }).detail,
    );
  }

  close(): void {
    this.database.close();
  }
}
