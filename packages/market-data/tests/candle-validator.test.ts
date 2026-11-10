import { describe, expect, it } from "vitest";
import { validateCandles } from "../src/services/candle-validator.js";
import type { Candle } from "../src/types/candle.js";

const MINUTE = 60 * 1000;

function candle(openTime: number, overrides: Partial<Candle> = {}): Candle {
  return {
    openTime,
    open: "1",
    high: "2",
    low: "0.5",
    close: "1.5",
    volume: "10",
    closeTime: openTime + MINUTE - 1,
    ...overrides,
  };
}

describe("validateCandles", () => {
  it("accepts a valid candle", () => {
    const candles = validateCandles([candle(0)]);

    expect(candles).toHaveLength(1);
  });

  it("sorts candles chronologically", () => {
    const candles = validateCandles([candle(2 * MINUTE), candle(0), candle(MINUTE)]);
    const times = candles.map((candle) => candle.openTime);

    expect(times).toEqual([0, MINUTE, 2 * MINUTE]);
  });

  it("removes duplicate open times, keeping the first occurrence", () => {
    const first = candle(0, { close: "1.4" });
    const duplicate = candle(0, { close: "1.6" });
    const candles = validateCandles([first, duplicate]);

    expect(candles).toHaveLength(1);
    expect(candles[0].close).toBe("1.4");
  });

  it.each([
    ["empty open price", candle(0, { open: " " })],
    ["non-numeric volume", candle(0, { volume: "abc" })],
    ["non-positive low", candle(0, { low: "0" })],
    ["high below low", candle(0, { high: "0.1", low: "0.5" })],
    ["open above high", candle(0, { open: "3" })],
    ["close above high", candle(0, { close: "3" })],
    ["open below low", candle(0, { open: "0.1" })],
    ["close below low", candle(0, { close: "0.1" })],
    ["negative volume", candle(0, { volume: "-1" })],
    ["close time before open time", candle(0, { closeTime: -1 })],
  ])("rejects %s", (_name, invalid) => {
    expect(() => validateCandles([invalid])).toThrowError();
  });
});
