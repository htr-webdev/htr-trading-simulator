import { describe, expect, it } from "vitest";
import { detectCandleGaps } from "../src/services/candle-gap-detector.js";
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

describe("detectCandleGaps", () => {
  it("finds no gaps in a continuous sequence", () => {
    const gaps = detectCandleGaps(
      [candle(0), candle(MINUTE), candle(2 * MINUTE)],
      "1m",
    );

    expect(gaps).toEqual([]);
  });

  it("reports a gap with start, end and missing count", () => {
    const gaps = detectCandleGaps(
      [candle(0), candle(MINUTE), candle(4 * MINUTE)],
      "1m",
    );

    expect(gaps).toEqual([
      { start: 2 * MINUTE, end: 3 * MINUTE, missingCount: 2 },
    ]);
  });

  it("reports multiple gaps", () => {
    const gaps = detectCandleGaps(
      [candle(0), candle(3 * MINUTE), candle(7 * MINUTE)],
      "1m",
    );

    expect(gaps).toHaveLength(2);
    expect(gaps[0].missingCount).toBe(2);
    expect(gaps[1].missingCount).toBe(3);
  });

  it("respects the given interval step", () => {
    const hour = 60 * MINUTE;
    const gaps = detectCandleGaps(
      [candle(0), candle(2 * hour)],
      "1h",
    );

    expect(gaps).toEqual([{ start: hour, end: hour, missingCount: 1 }]);
  });

  it("throws for an unsupported interval", () => {
    expect(() => detectCandleGaps([candle(0)], "7m")).toThrowError(
      "Unsupported interval: 7m",
    );
  });
});
