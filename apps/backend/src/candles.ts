import { CandleDatabase } from "@htr-trading-simulator/market-data";
import { INTERVAL_MS, type CandleIntervalKey } from "@htr-trading-simulator/shared";
import { aggregateCandles } from "./aggregation.js";

export const ALLOWED_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

export type CandleInterval = (typeof ALLOWED_INTERVALS)[number];

const SYMBOL_PATTERN = /^[A-Z0-9]{4,20}$/;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CandleQueryParams {
  symbol: string;
  interval: CandleInterval;
  startTime: number;
  endTime: number;
}

function parseDate(value: string): number | undefined {
  if (!DATE_PATTERN.test(value)) {
    return undefined;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    return undefined;
  }

  return timestamp;
}

/**
 * Parses and validates the /candles query parameters.
 * Returns the query, or an error message for the 400 response.
 */
export function parseCandleQuery(query: {
  symbol?: string;
  interval?: string;
  start?: string;
  end?: string;
}): { query: CandleQueryParams } | { error: string } {
  const symbol = query.symbol?.toUpperCase();

  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return { error: "Invalid or missing symbol. Expected letters/digits, e.g. BTCUSDT." };
  }

  const interval = query.interval as CandleInterval | undefined;

  if (!interval || !ALLOWED_INTERVALS.includes(interval)) {
    return {
      error: `Invalid or missing interval. Allowed: ${ALLOWED_INTERVALS.join(", ")}.`,
    };
  }

  if (!query.start || !query.end) {
    return { error: "Missing start or end date. Expected YYYY-MM-DD." };
  }

  const startTime = parseDate(query.start);
  const endTime = parseDate(query.end);

  if (startTime === undefined) {
    return { error: `Invalid start date: ${query.start}. Expected YYYY-MM-DD.` };
  }

  if (endTime === undefined) {
    return { error: `Invalid end date: ${query.end}. Expected YYYY-MM-DD.` };
  }

  // The end date is inclusive: query through the end of that UTC day.
  const endTimeInclusive = endTime + 24 * 60 * 60 * 1000 - 1;

  if (startTime > endTimeInclusive) {
    return { error: "Start date must be before or equal to end date." };
  }

  return { query: { symbol, interval, startTime, endTime: endTimeInclusive } };
}

export interface CandleApiItem {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Retrieves candles for a validated query. Prices are returned as
 * numbers, the shape charting libraries expect. A missing database
 * file is treated as "no data yet", not a failure.
 *
 * Intervals above 1m are aggregated from the stored 1-minute
 * candles, so no additional downloads are needed. The 1m read is
 * extended backwards to the first UTC bucket boundary covering the
 * requested start, so the first aggregated candle is complete.
 */
export function getCandles(
  database: CandleDatabase | null,
  { symbol, interval, startTime, endTime }: CandleQueryParams,
): CandleApiItem[] {
  if (!database) {
    return [];
  }

  const intervalMs = INTERVAL_MS[interval as CandleIntervalKey];
  const alignedStart = Math.floor(startTime / intervalMs) * intervalMs;

  const oneMinuteCandles = database
    .getCandles(symbol, "1m", alignedStart, endTime)
    .map((candle) => ({
      time: candle.openTime,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }));

  return aggregateCandles(oneMinuteCandles, interval as CandleIntervalKey);
}
