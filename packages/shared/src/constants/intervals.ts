/**
 * Supported candle intervals and their duration in ms. Kept in
 * shared so backend services (replay, aggregation) and the frontend
 * agree on the same set. All boundaries are UTC-aligned: every value
 * divides 24h exactly, so flooring an epoch timestamp into buckets
 * yields UTC-aligned candles.
 */
export const INTERVAL_MS: Record<string, number> = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export type CandleIntervalKey = keyof typeof INTERVAL_MS;
