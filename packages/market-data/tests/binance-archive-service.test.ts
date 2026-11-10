import { describe, expect, it } from "vitest";
import { BinanceArchiveService } from "../src/services/binance-archive-service.js";
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

function allMonthCandles(year: number, month: number): Candle[] {
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month, 1);
  const candles: Candle[] = [];

  for (let t = monthStart; t < monthEnd; t += MINUTE) {
    candles.push(candle(t));
  }

  return candles;
}

describe("BinanceArchiveService", () => {
  it("rejects an invalid date format", async () => {
    const service = new BinanceArchiveService();

    await expect(
      service.getCandles("BTCUSDT", "1m", "2025/06/01", "2025-06-02"),
    ).rejects.toThrowError("Invalid date format: 2025/06/01. Expected YYYY-MM-DD.");
  });

  it("rejects a non-calendar date", async () => {
    const service = new BinanceArchiveService();

    await expect(
      service.getCandles("BTCUSDT", "1m", "2025-02-30", "2025-03-01"),
    ).rejects.toThrowError("Invalid calendar date: 2025-02-30");
  });

  it("rejects a start date after the end date", async () => {
    const service = new BinanceArchiveService();

    await expect(
      service.getCandles("BTCUSDT", "1m", "2025-06-03", "2025-06-01"),
    ).rejects.toThrowError("Start date must be before or equal to end date.");
  });

  it("does not skip a partial month on incremental download", async () => {
    const service = new BinanceArchiveService();

    // June is complete but July is only half covered.
    const existing = allMonthCandles(2025, 6).concat(
      allMonthCandles(2025, 7).slice(0, Math.floor((15 * 24 * 60 * MINUTE) / MINUTE)),
    );

    const skipSpy = (service as unknown as { isMonthComplete: (candles: Candle[], interval: string, start: number, end: number) => boolean });

    // July's archive must still be requested: it is outside the range or incomplete.
    expect(skipSpy.isMonthComplete(existing, "1m", Date.UTC(2025, 5, 1), Date.UTC(2025, 6, 1))).toBe(true);
    expect(skipSpy.isMonthComplete(existing, "1m", Date.UTC(2025, 6, 1), Date.UTC(2025, 7, 1))).toBe(false);
  });

  it("marks a month complete only with every expected candle present", async () => {
    const service = new BinanceArchiveService();
    const complete = allMonthCandles(2025, 6);
    const oneMissing = complete.slice(0, complete.length - 1);

    const skipSpy = (service as unknown as { isMonthComplete: (candles: Candle[], interval: string, start: number, end: number) => boolean });

    expect(skipSpy.isMonthComplete(complete, "1m", Date.UTC(2025, 5, 1), Date.UTC(2025, 6, 1))).toBe(true);
    expect(skipSpy.isMonthComplete(oneMissing, "1m", Date.UTC(2025, 5, 1), Date.UTC(2025, 6, 1))).toBe(false);
  });
});
