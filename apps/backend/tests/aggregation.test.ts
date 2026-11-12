import { describe, expect, it } from "vitest";
import { aggregateCandles } from "../src/aggregation.js";
import type { CandleApiItem } from "../src/candles.js";

const MINUTE = 60 * 1000;

function candle(time: number, close = 1.5, high = 2, low = 0.5): CandleApiItem {
  return { time, open: 1, high, low, close };
}

describe("aggregateCandles", () => {
  it("returns the input unchanged for 1m", () => {
    const candles = [candle(0), candle(MINUTE)];

    expect(aggregateCandles(candles, "1m")).toEqual([...candles]);
  });

  it("aggregates 1m candles into exact OHLC buckets", () => {
    const candles = [
      candle(0, 1.2, 2, 0.5), // 5m bucket 0
      candle(MINUTE, 0.8, 2.5, 0.4),
      candle(2 * MINUTE, 1.9, 3, 0.3),
      candle(5 * MINUTE, 2.2, 2.2, 1), // next 5m bucket
    ];

    expect(aggregateCandles(candles, "5m")).toEqual([
      { time: 0, open: 1, high: 3, low: 0.3, close: 1.9 },
      { time: 5 * MINUTE, open: 1, high: 2.2, low: 1, close: 2.2 },
    ]);
  });

  it("aligns hourly buckets to UTC hour boundaries", () => {
    const base = Date.parse("2025-06-15T09:58:00.000Z");
    const candles = [
      candle(base),
      candle(base + MINUTE), // 09:59
      candle(base + 2 * MINUTE), // 10:00 — new bucket
    ];

    const result = aggregateCandles(candles, "1h");

    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(Date.parse("2025-06-15T09:00:00.000Z"));
    expect(result[1].time).toBe(Date.parse("2025-06-15T10:00:00.000Z"));
  });

  it("aligns daily buckets to UTC midnight", () => {
    const lateDay1 = Date.parse("2025-06-15T23:59:00.000Z");
    const day2 = Date.parse("2025-06-16T00:00:00.000Z");

    const result = aggregateCandles([candle(lateDay1), candle(day2)], "1d");

    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(Date.parse("2025-06-15T00:00:00.000Z"));
    expect(result[1].time).toBe(Date.parse("2025-06-16T00:00:00.000Z"));
  });

  it("aligns 4h buckets to the UTC day grid", () => {
    const offset = Date.parse("2025-06-15T05:30:00.000Z");

    const result = aggregateCandles([candle(offset), candle(offset + MINUTE)], "4h");

    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(Date.parse("2025-06-15T04:00:00.000Z"));
  });

  it("keeps aggregating across gaps without synthetic candles", () => {
    const candles = [
      candle(0),
      candle(MINUTE),
      // gap: minutes 2, 3 and 4 missing
      candle(5 * MINUTE),
    ];

    const result = aggregateCandles(candles, "5m");

    expect(result).toEqual([
      { time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: 5 * MINUTE, open: 1, high: 2, low: 0.5, close: 1.5 },
    ]);
  });

  it("emits a partial trailing bucket (the forming replay candle)", () => {
    const candles = [candle(0), candle(MINUTE), candle(2 * MINUTE)];

    const result = aggregateCandles(candles, "5m");

    expect(result).toEqual([
      { time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
    ]);
  });

  it("handles 30m buckets spanning a half hour", () => {
    const base = Date.parse("2025-06-15T10:29:00.000Z");
    const candles = [candle(base), candle(base + MINUTE), candle(base + 2 * MINUTE)];

    const result = aggregateCandles(candles, "30m");

    expect(result).toEqual([
      { time: Date.parse("2025-06-15T10:00:00.000Z"), open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: Date.parse("2025-06-15T10:30:00.000Z"), open: 1, high: 2, low: 0.5, close: 1.5 },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(aggregateCandles([], "1d")).toEqual([]);
  });
});
