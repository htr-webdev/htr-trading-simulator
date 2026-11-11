import { DatabaseSync } from "node:sqlite";

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

/**
 * Local SQLite storage for historical market data.
 *
 * Owns the database connection lifecycle and guarantees the candle
 * schema exists. Candle insertion and retrieval are built on top of
 * this class in dedicated operations.
 */
export class CandleDatabase {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    this.database = new DatabaseSync(filePath);
    this.database.exec(CREATE_CANDLES_TABLE);
  }

  get connection(): DatabaseSync {
    return this.database;
  }

  close(): void {
    this.database.close();
  }
}
