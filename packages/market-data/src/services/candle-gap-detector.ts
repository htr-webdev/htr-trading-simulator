import type { Candle } from "../types/candle.js";

export interface CandleGap {
  start: number;
  end: number;
  missingCount: number;
}

const INTERVALS_IN_MINUTES: Record<string, number> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "1d": 1440,
};

/**
 * Detects gaps in a sorted, deduplicated candle sequence.
 * Candles must be sorted by openTime before calling this function.
 */
export function detectCandleGaps(candles: Candle[], interval: string): CandleGap[] {
  const intervalMinutes = INTERVALS_IN_MINUTES[interval];

  if (!intervalMinutes) {
    throw new Error(`Unsupported interval: ${interval}`);
  }

  const step = intervalMinutes * 60 * 1000;
  const gaps: CandleGap[] = [];

  for (let i = 1; i < candles.length; i += 1) {
    const expected = candles[i - 1].openTime + step;
    const actual = candles[i].openTime;

    if (actual <= expected) {
      continue;
    }

    gaps.push({
      start: expected,
      end: actual - step,
      missingCount: Math.round((actual - expected) / step),
    });
  }

  return gaps;
}
