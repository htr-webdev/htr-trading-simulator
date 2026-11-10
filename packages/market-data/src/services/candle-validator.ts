import type { Candle } from "../types/candle.js";

export function validateCandles(candles: Candle[]): Candle[] {
  const validated: Candle[] = [];
  const seenOpenTimes = new Set<number>();

  for (const [index, candle] of candles.entries()) {
    const values = [
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
    ];

    if (
      values.some(
        (value) =>
          value.trim() === "" ||
          !/^\d+(\.\d+)?$/.test(value) ||
          !Number.isFinite(Number(value)),
      )
    ) {
      throw new Error(`Invalid price or volume at candle ${index}.`);
    }

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume);

    if (
      candle.openTime < 0 ||
      candle.closeTime < candle.openTime ||
      low <= 0 ||
      high < low ||
      high < open ||
      high < close ||
      low > open ||
      low > close ||
      volume < 0
    ) {
      throw new Error(`Invalid candle values at index ${index}.`);
    }

    if (seenOpenTimes.has(candle.openTime)) {
      continue;
    }

    seenOpenTimes.add(candle.openTime);
    validated.push(candle);
  }

  return validated.sort((a, b) => a.openTime - b.openTime);
}
