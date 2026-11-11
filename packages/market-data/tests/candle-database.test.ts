import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CandleDatabase } from "../src/storage/candle-database.js";
import type { Candle } from "../src/types/candle.js";

const MINUTE = 60 * 1000;

function candle(openTime: number): Candle {
  return {
    openTime,
    open: "1",
    high: "2",
    low: "0.5",
    close: "1.5",
    volume: "10",
    closeTime: openTime + MINUTE - 1,
  };
}

describe("CandleDatabase", () => {
  it("creates the candles table on open", () => {
    const database = new CandleDatabase(":memory:");

    const row = database
      .countCandles("BTCUSDT", "1m");

    expect(row).toBe(0);

    database.close();
  });

  it("inserts candles and reports the inserted count", () => {
    const database = new CandleDatabase(":memory:");

    const inserted = database.insertCandles("BTCUSDT", "1m", [
      candle(0),
      candle(MINUTE),
    ]);

    expect(inserted).toBe(2);
    expect(database.countCandles("BTCUSDT", "1m")).toBe(2);

    database.close();
  });

  it("ignores duplicate candles and counts only new ones", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [candle(0), candle(MINUTE)]);

    const inserted = database.insertCandles("BTCUSDT", "1m", [
      candle(0),
      candle(MINUTE),
      candle(2 * MINUTE),
    ]);

    expect(inserted).toBe(1);
    expect(database.countCandles("BTCUSDT", "1m")).toBe(3);

    database.close();
  });

  it("keeps duplicates separate per symbol and interval", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [candle(0)]);
    database.insertCandles("BTCUSDT", "5m", [candle(0)]);
    database.insertCandles("ETHUSDT", "1m", [candle(0)]);

    expect(database.countCandles("BTCUSDT", "1m")).toBe(1);
    expect(database.countCandles("BTCUSDT", "5m")).toBe(1);
    expect(database.countCandles("ETHUSDT", "1m")).toBe(1);

    database.close();
  });

  it("retrieves candles in chronological order within the range", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [
      candle(0),
      candle(MINUTE),
      candle(2 * MINUTE),
      candle(3 * MINUTE),
    ]);

    const candles = database.getCandles("BTCUSDT", "1m", MINUTE, 3 * MINUTE);

    expect(candles.map((candle) => candle.openTime)).toEqual([
      MINUTE,
      2 * MINUTE,
      3 * MINUTE,
    ]);
  });

  it("maps stored rows back to the candle structure", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [candle(0)]);

    const [stored] = database.getCandles("BTCUSDT", "1m", 0, MINUTE);

    expect(stored).toEqual(candle(0));

    database.close();
  });

  it("returns an empty list for a range without candles", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [candle(0)]);

    expect(database.getCandles("BTCUSDT", "1m", MINUTE, 2 * MINUTE)).toEqual([]);

    database.close();
  });

  it("reopens an existing database file without losing data", () => {
    const directory = mkdtempSync(join(tmpdir(), "htr-candle-db-"));
    const filePath = join(directory, "candles.sqlite");

    try {
      const first = new CandleDatabase(filePath);
      first.insertCandles("BTCUSDT", "1m", [candle(0)]);
      first.close();

      const second = new CandleDatabase(filePath);

      expect(second.countCandles("BTCUSDT", "1m")).toBe(1);

      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses the primary key index for range queries without a sort step", () => {
    const database = new CandleDatabase(":memory:");

    database.insertCandles("BTCUSDT", "1m", [
      candle(0),
      candle(MINUTE),
      candle(2 * MINUTE),
    ]);

    const plan = database.explainCandleQuery("BTCUSDT", "1m", 0, 2 * MINUTE);

    expect(plan).toHaveLength(1);
    // The composite primary key's implicit index serves the query as a
    // covering index — symbol, interval and open_time all come from it.
    expect(plan[0]).toContain("SEARCH candles USING COVERING INDEX");
    expect(plan[0]).toContain("symbol=? AND interval=?");
    expect(plan.join(" ")).not.toContain("USE TEMP B-TREE");

    database.close();
  });
});
