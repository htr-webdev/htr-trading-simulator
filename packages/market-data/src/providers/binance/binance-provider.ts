import type { Candle } from "../../types/candle.js";
import { mapBinanceKline } from "./binance-mapper.js";
import { BinanceClient } from "./binance-client.js";

export class BinanceProvider {
  private readonly client: BinanceClient;

  constructor() {
    this.client = new BinanceClient();
  }

  async getCandles(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    const klines = await this.client.getKlines(
      symbol,
      interval,
      startTime,
      endTime,
    );

    return klines.map(mapBinanceKline);
  }
}
