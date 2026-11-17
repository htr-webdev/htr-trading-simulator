export type TradeDirection = "long" | "short";

/** Why a paper position was closed. */
export type ExitReason = "manual" | "stop-loss" | "take-profit";

export interface PaperPosition {
  id: string;
  symbol: string;
  direction: TradeDirection;
  /** Position size in the base currency, e.g. BTC. */
  size: number;
  entryPrice: number;
  openedAtReplayTime: number;
  /** Trigger price that closes the position at a loss; null = unset. */
  stopLoss: number | null;
  /** Trigger price that closes the position at a profit; null = unset. */
  takeProfit: number | null;
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
  exitReason: ExitReason;
}

export interface PaperAccountState {
  /** Replay price the account is currently valued at. */
  markPrice: number;
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
