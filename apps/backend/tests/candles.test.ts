import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CandleDatabase } from "@htr-trading-simulator/market-data";
import { getCandles, parseCandleQuery } from "../src/candles.js";

const MINUTE = 60 * 1000;

function candle(openTime: number, close = "1.5") {
  return {
    openTime,
    open: "1",
    high: "2",
    low: "0.5",
    close,
    volume: "10",
    closeTime: openTime + MINUTE - 1,
  };
}

function createTestDatabase(): { database: CandleDatabase; path: string } {
  const directory = mkdtempSync(join(tmpdir(), "htr-candles-api-"));
  const database = new CandleDatabase(join(directory, "candles.sqlite"));

  return { database, path: directory };
}

describe("parseCandleQuery", () => {
  it("parses a valid query with an inclusive end date", () => {
    const result = parseCandleQuery({
      symbol: "btcusdt",
      interval: "1m",
      start: "2025-06-15",
      end: "2025-06-16",
    });

    expect(result).toEqual({
      query: {
        symbol: "BTCUSDT",
        interval: "1m",
        startTime: Date.UTC(2025, 5, 15),
        endTime: Date.UTC(2025, 5, 17) - 1,
      },
    });
  });

  it.each([
    [
      "invalid symbol",
      { symbol: "BTC USDT!", interval: "1m", start: "2025-06-15", end: "2025-06-16" },
      "Invalid or missing symbol",
    ],
    [
      "unsupported interval",
      { symbol: "BTCUSDT", interval: "7m", start: "2025-06-15", end: "2025-06-16" },
      "Invalid or missing interval",
    ],
    [
      "bad start date",
      { symbol: "BTCUSDT", interval: "1m", start: "2025/06/15", end: "2025-06-16" },
      "Invalid start date",
    ],
    [
      "non-calendar end date",
      { symbol: "BTCUSDT", interval: "1m", start: "2025-06-15", end: "2025-02-30" },
      "Invalid end date",
    ],
    [
      "missing dates",
      { symbol: "BTCUSDT", interval: "1m" },
      "Missing start or end date",
    ],
    [
      "start after end",
      { symbol: "BTCUSDT", interval: "1m", start: "2025-06-16", end: "2025-06-15" },
      "Start date must be before or equal to end date",
    ],
  ])("rejects %s", (_name, query, message) => {
    const result = parseCandleQuery(query);

    expect("error" in result && result.error.includes(message)).toBe(true);
  });
});

describe("getCandles", () => {
  it("returns numeric candle items from the database", () => {
    const { database, path } = createTestDatabase();

    try {
      database.insertCandles("BTCUSDT", "1m", [candle(Date.UTC(2025, 5, 15))]);

      const items = getCandles(database, {
        symbol: "BTCUSDT",
        interval: "1m",
        startTime: Date.UTC(2025, 5, 15),
        endTime: Date.UTC(2025, 5, 16) - 1,
      });

      expect(items).toEqual([
        { time: Date.UTC(2025, 5, 15), open: 1, high: 2, low: 0.5, close: 1.5 },
      ]);
    } finally {
      database.close();
      rmSync(path, { recursive: true, force: true });
    }
  });

  it("returns an empty list without a database", () => {
    expect(
      getCandles(null, {
        symbol: "BTCUSDT",
        interval: "1m",
        startTime: 0,
        endTime: 1,
      }),
    ).toEqual([]);
  });
});
