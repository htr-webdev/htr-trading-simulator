import { describe, expect, it } from "vitest";
import { mergeCandles } from "../src/services/candle-merge.js";
import type { Candle } from "../src/types/candle.js";

const MINUTE = 60 * 1000;

function candle(openTime: number, close = "1.5"): Candle {
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

describe("mergeCandles", () => {
  it("merges non-overlapping sequences in chronological order", () => {
    const merged = mergeCandles(
      [candle(0), candle(MINUTE)],
      [candle(2 * MINUTE), candle(3 * MINUTE)],
    );

    expect(merged.map((candle) => candle.openTime)).toEqual([
      0,
      MINUTE,
      2 * MINUTE,
      3 * MINUTE,
    ]);
  });

  it("removes duplicates from overlapping ranges", () => {
    const merged = mergeCandles(
      [candle(0), candle(MINUTE)],
      [candle(MINUTE), candle(2 * MINUTE)],
    );

    expect(merged).toHaveLength(3);
  });

  it("keeps the existing candle when duplicates collide", () => {
    const merged = mergeCandles([candle(0, "1.4")], [candle(0, "1.6")]);

    expect(merged).toHaveLength(1);
    expect(merged[0].close).toBe("1.4");
  });

  it("returns existing candles unchanged when nothing new arrives", () => {
    const merged = mergeCandles([candle(0)], []);

    expect(merged).toHaveLength(1);
  });
});
