import { validateZipArchive } from "./binance-archive-validator.js";

export type ArchivePeriod =
  | {
      type: "monthly";
      year: number;
      month: number;
    }
  | {
      type: "daily";
      year: number;
      month: number;
      day: number;
    };

export class BinanceArchiveClient {
  private readonly baseUrl = "https://data.binance.vision";

  async downloadKlineArchive(
    symbol: string,
    interval: string,
    period: ArchivePeriod,
  ): Promise<Uint8Array | null> {
    const normalizedSymbol = symbol.toUpperCase();

    const periodPath =
      period.type === "monthly"
        ? `${period.year}-${String(period.month).padStart(2, "0")}`
        : `${period.year}-${String(period.month).padStart(2, "0")}-${String(period.day).padStart(2, "0")}`;

    const url =
      `${this.baseUrl}/data/spot/${period.type}/klines/` +
      `${normalizedSymbol}/${interval}/` +
      `${normalizedSymbol}-${interval}-${periodPath}.zip`;

    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        `Unable to connect to Binance archive server: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Binance archive download failed: ${response.status} ${response.statusText}`,
      );
    }

    const archive = new Uint8Array(await response.arrayBuffer());

    validateZipArchive(archive);

    return archive;
  }
}
