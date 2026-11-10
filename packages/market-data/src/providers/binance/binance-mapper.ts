import type { Candle } from "../../types/candle.js";
import type { BinanceKline } from "./types.js";

export function mapBinanceKline(kline: BinanceKline): Candle {
  return {
    openTime: kline[0],
    open: kline[1],
    high: kline[2],
    low: kline[3],
    close: kline[4],
    volume: kline[5],
    closeTime: kline[6],
  };
}
