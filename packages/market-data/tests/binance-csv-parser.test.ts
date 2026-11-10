import { describe, expect, it } from "vitest";
import { parseBinanceCsv } from "../src/providers/binance/binance-csv-parser.js";

const MILLIS_ROW =
  "1750288200000,0.1,0.2,0.05,0.15,1000,1750288259999,150,10,0.5,50,0";

const MICROS_ROW =
  "1750288200000000,0.1,0.2,0.05,0.15,1000,1750288259999000,150,10,0.5,50,0";

describe("parseBinanceCsv", () => {
  it("parses a millisecond timestamp row into a candle", () => {
    const candles = parseBinanceCsv(MILLIS_ROW);

    expect(candles).toHaveLength(1);
    expect(candles[0]).toEqual({
      openTime: 1750288200000,
      open: "0.1",
      high: "0.2",
      low: "0.05",
      close: "0.15",
      volume: "1000",
      closeTime: 1750288259999,
    });
  });

  it("normalizes 2025 microsecond timestamps to milliseconds", () => {
    const [candle] = parseBinanceCsv(MICROS_ROW);

    expect(candle.openTime).toBe(1750288200000);
    expect(candle.closeTime).toBe(1750288259999);
  });

  it("parses multiple rows", () => {
    const csv = `${MILLIS_ROW}\n${MICROS_ROW}`;
    const candles = parseBinanceCsv(csv);

    expect(candles).toHaveLength(2);
    expect(candles[1].openTime).toBe(1750288200000);
  });

  it("rejects a row with the wrong column count", () => {
    expect(() => parseBinanceCsv("1,2,3")).toThrowError(
      "Invalid Binance CSV row at line 1. Expected 12 columns.",
    );
  });

  it("rejects a row with a non-numeric timestamp", () => {
    const row =
      "not-a-time,0.1,0.2,0.05,0.15,1000,1750288259999,150,10,0.5,50,0";

    expect(() => parseBinanceCsv(row)).toThrowError("Invalid timestamp: not-a-time");
  });

  it("rejects a row with a negative trade count", () => {
    const row =
      "1750288200000,0.1,0.2,0.05,0.15,1000,1750288259999,150,-1,0.5,50,0";

    expect(() => parseBinanceCsv(row)).toThrowError("Invalid trade count at line 1.");
  });

  it("rejects an empty CSV file", () => {
    expect(() => parseBinanceCsv("")).toThrowError("CSV file is empty.");
  });
});
