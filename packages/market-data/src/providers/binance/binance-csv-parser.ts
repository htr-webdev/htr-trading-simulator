import type { Candle } from "../../types/candle.js";
import type { BinanceKline } from "./types.js";
import { mapBinanceKline } from "./binance-mapper.js";

function normalizeTimestamp(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  let timestamp = BigInt(value);

  // Binance Spot archive timestamps switched to microseconds in 2025.
  if (timestamp >= 100_000_000_000_000n) {
    timestamp /= 1000n;
  }

  const result = Number(timestamp);

  if (!Number.isSafeInteger(result)) {
    throw new Error(`Timestamp is outside the safe integer range: ${value}`);
  }

  return result;
}

export function parseBinanceCsv(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);

  if (!lines[0]) {
    throw new Error("CSV file is empty.");
  }

  const candles: Candle[] = [];

  for (const [index, line] of lines.entries()) {
    const columns = line.split(",");

    if (columns.length !== 12) {
      throw new Error(
        `Invalid Binance CSV row at line ${index + 1}. Expected 12 columns.`,
      );
    }

    const openTime = normalizeTimestamp(columns[0]);
    const closeTime = normalizeTimestamp(columns[6]);
    const numberOfTrades = Number(columns[8]);

    if (!Number.isSafeInteger(numberOfTrades) || numberOfTrades < 0) {
      throw new Error(`Invalid trade count at line ${index + 1}.`);
    }

    const kline = [
      openTime,
      columns[1],
      columns[2],
      columns[3],
      columns[4],
      columns[5],
      closeTime,
      columns[7],
      numberOfTrades,
      columns[9],
      columns[10],
      columns[11],
    ] as BinanceKline;

    candles.push(mapBinanceKline(kline));
  }

  return candles;
}
