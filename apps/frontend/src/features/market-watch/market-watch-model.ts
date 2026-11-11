export interface MarketWatchSymbol {
  symbol: string;
  bid: number;
  ask: number;
  /** Price change since the previous daily close. */
  change: number;
  /** Percentage change since the previous daily close. */
  changePercent: number;
}

/**
 * Initial static symbol data for the Market Watch panel.
 *
 * Live/historical data sources replace this list in later issues; the
 * panel only renders whatever list it receives.
 */
export const INITIAL_MARKET_WATCH_SYMBOLS: MarketWatchSymbol[] = [
  { symbol: "BTCUSDT", bid: 105414.63, ask: 105425.93, change: 452.14, changePercent: 0.43 },
  { symbol: "ETHUSDT", bid: 3489.02, ask: 3489.77, change: -21.36, changePercent: -0.61 },
  { symbol: "SOLUSDT", bid: 184.12, ask: 184.21, change: 3.98, changePercent: 2.21 },
  { symbol: "BNBUSDT", bid: 982.4, ask: 982.91, change: 1.27, changePercent: 0.13 },
  { symbol: "XRPUSDT", bid: 2.3841, ask: 2.3857, change: -0.0192, changePercent: -0.8 },
];

/** Formats a price with a stable number of decimals for table alignment. */
export function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 10 ? 4 : 2,
  });
}

/** Formats a change value with an explicit sign. */
export function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "-";
  const magnitude = Math.abs(change);

  return `${sign}${magnitude.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: magnitude < 10 ? 4 : 2,
  })}`;
}
