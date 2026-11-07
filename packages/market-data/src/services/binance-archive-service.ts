import type { Candle } from "../types/candle.js";
import {
  BinanceArchiveClient,
  type ArchivePeriod,
} from "../providers/binance/binance-archive-client.js";
import { extractCsvFromArchive } from "../providers/binance/binance-archive-extractor.js";
import { parseBinanceCsv } from "../providers/binance/binance-csv-parser.js";
import { validateCandles } from "./candle-validator.js";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

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

    return validateCandles(candles).filter(
      (candle) =>
        candle.openTime >= startTime && candle.openTime < endExclusive,
    );
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
