import { describe, expect, it } from "vitest";
import { candlesToCsv, csvToCandles, CSV_HEADER } from "../src/candle-csv.js";
import type { Candle } from "@htr-trading-simulator/market-data";

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

describe("candlesToCsv", () => {
  it("writes the header and one row per candle", () => {
    const csv = candlesToCsv([candle(0), candle(MINUTE)]);
    const lines = csv.trim().split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines[1]).toBe(`0,1,2,0.5,1.5,10,${MINUTE - 1}`);
  });

  it("ends the file with a trailing newline", () => {
    expect(candlesToCsv([])).toBe(`${CSV_HEADER}\n`);
  });
});

describe("csvToCandles", () => {
  it("round-trips candles through the CSV format", () => {
    const candles = [candle(0), candle(MINUTE)];

    expect(csvToCandles(candlesToCsv(candles))).toEqual(candles);
  });

  it("rejects an invalid header", () => {
    expect(() => csvToCandles("a,b\n0,1,2,0.5,1.5,10,59999")).toThrowError(
      "Candle file has an invalid header.",
    );
  });

  it("rejects a row with the wrong column count", () => {
    expect(() =>
      csvToCandles(`${CSV_HEADER}\n0,1,2,0.5,1.5,10`),
    ).toThrowError("Invalid candle record at line 2.");
  });

  it("rejects a row with a non-numeric timestamp", () => {
    expect(() =>
      csvToCandles(`${CSV_HEADER}\nabc,1,2,0.5,1.5,10,59999`),
    ).toThrowError("Invalid candle record at line 2.");
  });
});
