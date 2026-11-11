import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CandleDatabase } from "../src/storage/candle-database.js";

function insertCandle(
  database: CandleDatabase,
  openTime: number,
): void {
  database.connection
    .prepare(
      `INSERT INTO candles
        (symbol, interval, open_time, open, high, low, close, volume, close_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "BTCUSDT",
      "1m",
      openTime,
      "1",
      "2",
      "0.5",
      "1.5",
      "10",
      openTime + 59_999,
    );
}

describe("CandleDatabase", () => {
  it("creates the candles table on open", () => {
    const database = new CandleDatabase(":memory:");

    const table = database.connection
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'candles'",
      )
      .get();

    expect(table).toEqual({ name: "candles" });

    database.close();
  });

  it("rejects duplicate candles with the same symbol, interval and open time", () => {
    const database = new CandleDatabase(":memory:");

    insertCandle(database, 0);

    expect(() => insertCandle(database, 0)).toThrowError();

    database.close();
  });

  it("allows the same open time for different symbols or intervals", () => {
    const database = new CandleDatabase(":memory:");

    database.connection
      .prepare(
        `INSERT INTO candles
          (symbol, interval, open_time, open, high, low, close, volume, close_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("BTCUSDT", "1m", 0, "1", "2", "0.5", "1.5", "10", 59_999);

    database.connection
      .prepare(
        `INSERT INTO candles
          (symbol, interval, open_time, open, high, low, close, volume, close_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("BTCUSDT", "5m", 0, "1", "2", "0.5", "1.5", "10", 299_999);

    const count = database.connection
      .prepare("SELECT COUNT(*) AS count FROM candles")
      .get() as { count: number };

    expect(count.count).toBe(2);

    database.close();
  });

  it("reopens an existing database file without losing data", () => {
    const directory = mkdtempSync(join(tmpdir(), "htr-candle-db-"));
    const filePath = join(directory, "candles.sqlite");

    try {
      const first = new CandleDatabase(filePath);
      insertCandle(first, 0);
      first.close();

      const second = new CandleDatabase(filePath);
      const count = second.connection
        .prepare("SELECT COUNT(*) AS count FROM candles")
        .get() as { count: number };

      expect(count.count).toBe(1);

      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
