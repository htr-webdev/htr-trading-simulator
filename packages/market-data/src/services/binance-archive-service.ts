import type { Candle } from "../types/candle.js";
import {
  BinanceArchiveClient,
  type ArchivePeriod,
} from "../providers/binance/binance-archive-client.js";
import { extractCsvFromArchive } from "../providers/binance/binance-archive-extractor.js";
import { parseBinanceCsv } from "../providers/binance/binance-csv-parser.js";
import { validateCandles } from "./candle-validator.js";
import { mergeCandles } from "./candle-merge.js";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const INTERVALS_IN_MINUTES: Record<string, number> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "1d": 1440,
};

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export class BinanceArchiveService {
  private readonly client: BinanceArchiveClient;

  constructor() {
    this.client = new BinanceArchiveClient();
  }

  async getCandles(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string,
    existingCandles: Candle[] = [],
  ): Promise<Candle[]> {
    const startTime = this.parseDate(startDate);
    const endTime = this.parseDate(endDate);

    if (startTime > endTime) {
      throw new Error("Start date must be before or equal to end date.");
    }

    const endExclusive = endTime + DAY_IN_MILLISECONDS;
    const candles: Candle[] = [];

    const currentDate = new Date(startTime);
    currentDate.setUTCDate(1);

    while (currentDate.getTime() <= endTime) {
      const period: ArchivePeriod = {
        type: "monthly",
        year: currentDate.getUTCFullYear(),
        month: currentDate.getUTCMonth() + 1,
      };

      const monthStart = currentDate.getTime();
      const monthEnd = Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() + 1,
        1,
      );

      const coveredByRange =
        monthStart >= startTime && monthEnd <= endExclusive;

      if (coveredByRange && this.isMonthComplete(existingCandles, interval, monthStart, monthEnd)) {
        currentDate.setUTCDate(1);
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        continue;
      }

      const archive = await this.client.downloadKlineArchive(
        symbol,
        interval,
        period,
      );

      if (archive) {
        const csv = await extractCsvFromArchive(archive);
        const monthlyCandles = parseBinanceCsv(csv);

        candles.push(...monthlyCandles);
      }

      currentDate.setUTCDate(1);
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    const downloaded = validateCandles(candles).filter(
      (candle) =>
        candle.openTime >= startTime && candle.openTime < endExclusive,
    );

    return mergeCandles(existingCandles, downloaded);
  }

  /**
   * A month is complete when the existing candles contain every expected
   * step for that month. Only fully covered months are skipped on
   * incremental downloads.
   */
  private isMonthComplete(
    candles: Candle[],
    interval: string,
    monthStart: number,
    monthEnd: number,
  ): boolean {
    const intervalMinutes = INTERVALS_IN_MINUTES[interval];

    if (!intervalMinutes) {
      throw new Error(`Unsupported interval: ${interval}`);
    }

    const step = intervalMinutes * 60 * 1000;
    const expectedCount =
      daysInUtcMonth(
        new Date(monthStart).getUTCFullYear(),
        new Date(monthStart).getUTCMonth(),
      ) *
      (DAY_IN_MILLISECONDS / step);

    const candleTimes = new Set<number>();

    for (const candle of candles) {
      if (candle.openTime >= monthStart && candle.openTime < monthEnd) {
        candleTimes.add(candle.openTime);
      }
    }

    return candleTimes.size >= expectedCount;
  }

  private parseDate(value: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Invalid date format: ${value}. Expected YYYY-MM-DD.`);
    }

    const timestamp = Date.parse(`${value}T00:00:00.000Z`);

    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== value
    ) {
      throw new Error(`Invalid calendar date: ${value}`);
    }

    return timestamp;
  }
}
