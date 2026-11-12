import { INTERVAL_MS, type CandleIntervalKey } from "@htr-trading-simulator/shared";
import type { CandleApiItem } from "./candles.js";

/**
 * Aggregates sorted 1-minute candles into the given target interval.
 *
 * Each output candle covers one UTC-aligned bucket: the bucket start
 * is floor(openTime / intervalMs) * intervalMs, which lands on exact
 * UTC boundaries for every supported interval. The bucket's open is
 * the first candle's open, its close is the last candle's close, and
 * high/low are the extremes of the bucket.
 *
 * Missing candles are handled by aggregating whatever data exists in
 * a bucket; a gap produces no synthetic candle, and the trailing
 * bucket may be partial (the still-forming candle during replay).
 * Input must be in chronological order, as returned by the database.
 */
export function aggregateCandles(
  candles: CandleApiItem[],
  interval: CandleIntervalKey,
): CandleApiItem[] {
  const intervalMs = INTERVAL_MS[interval];

  if (intervalMs <= 60 * 1000) {
    // Nothing to aggregate; return a copy to keep the contract simple.
    return [...candles];
  }

  const buckets: CandleApiItem[] = [];

  for (const candle of candles) {
    const bucketStart = Math.floor(candle.time / intervalMs) * intervalMs;
    const current = buckets[buckets.length - 1];

    if (current && current.time === bucketStart) {
      current.high = Math.max(current.high, candle.high);
      current.low = Math.min(current.low, candle.low);
      current.close = candle.close;
      continue;
    }

    buckets.push({
      time: bucketStart,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }

  return buckets;
}
