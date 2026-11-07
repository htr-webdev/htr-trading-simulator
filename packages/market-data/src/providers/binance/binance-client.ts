import type { BinanceKline } from "./types.js";

const BINANCE_API_BASE_URL = "https://api.binance.com";

export class BinanceClient {
  async getKlines(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<BinanceKline[]> {
    const url = new URL("/api/v3/klines", BINANCE_API_BASE_URL);

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("startTime", String(startTime));
    url.searchParams.set("endTime", String(endTime));
    url.searchParams.set("limit", "1000");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Binance API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as BinanceKline[];
  }
}
