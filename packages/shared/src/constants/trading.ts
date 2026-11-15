export type TradeDirection = "long" | "short";

export interface PaperPosition {
  id: string;
  symbol: string;
  direction: TradeDirection;
  /** Position size in the base currency, e.g. BTC. */
  size: number;
  entryPrice: number;
  openedAtReplayTime: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  size: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  openedAtReplayTime: number;
  closedAtReplayTime: number;
}

export interface PaperAccountState {
  /** Settled cash; changes only when a position closes. */
  balance: number;
  /** Unrealized PnL of all open positions at the current mark price. */
  unrealizedPnl: number;
  /** balance + unrealizedPnl; what the account is worth right now. */
  equity: number;
  /** Total PnL of closed trades. */
  realizedPnl: number;
  openPositions: PaperPosition[];
  closedTrades: PaperTrade[];
}

/** Starting cash of every paper trading account. */
export const INITIAL_PAPER_BALANCE = 10_000;
