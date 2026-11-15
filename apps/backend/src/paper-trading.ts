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

export interface OpenPositionInput {
  direction: TradeDirection;
  /** Position size in the base currency, e.g. BTC. */
  size: number;
  /** Current replay price used as entry. */
  price: number;
  symbol: string;
  replayTime: number;
}

const INITIAL_BALANCE = 10_000;

/**
 * Paper trading account for one replay session.
 *
 * Tracks cash, open positions and completed trades. Prices come
 * exclusively from the replay clock, so no future market data can
 * influence fills or mark-to-market. No leverage: opening a position
 * reserves its full notional value (size * entry price) as margin.
 */
export class PaperTradingAccount {
  private readonly positions = new Map<string, PaperPosition>();

  private readonly trades: PaperTrade[] = [];

  private balance: number;

  private realizedPnl = 0;

  private sequence = 0;

  constructor(
    private readonly symbol: string,
    initialBalance = INITIAL_BALANCE,
  ) {
    this.balance = initialBalance;
  }

  /** Cash not reserved as margin for open positions. */
  get freeBalance(): number {
    let reserved = 0;

    for (const position of this.positions.values()) {
      reserved += position.size * position.entryPrice;
    }

    return this.balance - reserved;
  }

  /**
   * Opens a position at the current replay price. Rejects invalid
   * sizes/prices and orders whose notional exceeds the free balance.
   */
  openPosition(input: OpenPositionInput): PaperPosition | { error: string } {
    const { direction, size, price } = input;

    if (direction !== "long" && direction !== "short") {
      return { error: "Invalid direction. Expected \"long\" or \"short\"." };
    }

    if (!Number.isFinite(size) || size <= 0) {
      return { error: "Invalid size. Expected a positive number." };
    }

    if (!Number.isFinite(price) || price <= 0) {
      return { error: "Invalid price. Expected a positive number." };
    }

    const notional = size * price;

    if (notional > this.freeBalance) {
      return { error: "Insufficient balance for this position." };
    }

    this.sequence += 1;

    const position: PaperPosition = {
      id: `pos-${this.sequence}`,
      symbol: input.symbol,
      direction,
      size,
      entryPrice: price,
      openedAtReplayTime: input.replayTime,
    };

    this.positions.set(position.id, position);

    return position;
  }

  /**
   * Closes a position at the current replay price, settling its PnL
   * into the balance and recording the completed trade.
   */
  closePosition(positionId: string, price: number, replayTime: number): PaperTrade | { error: string } {
    const position = this.positions.get(positionId);

    if (!position) {
      return { error: "Position not found." };
    }

    if (!Number.isFinite(price) || price <= 0) {
      return { error: "Invalid price. Expected a positive number." };
    }

    const pnl =
      position.direction === "long"
        ? (price - position.entryPrice) * position.size
        : (position.entryPrice - price) * position.size;

    this.positions.delete(positionId);
    this.balance += pnl;
    this.realizedPnl += pnl;

    this.sequence += 1;

    const trade: PaperTrade = {
      id: `trade-${this.sequence}`,
      symbol: position.symbol,
      direction: position.direction,
      size: position.size,
      entryPrice: position.entryPrice,
      exitPrice: price,
      realizedPnl: pnl,
      openedAtReplayTime: position.openedAtReplayTime,
      closedAtReplayTime: replayTime,
    };

    this.trades.push(trade);

    return trade;
  }

  /** Total unrealized PnL of open positions at the given mark price. */
  unrealizedPnl(markPrice: number): number {
    let pnl = 0;

    for (const position of this.positions.values()) {
      pnl +=
        position.direction === "long"
          ? (markPrice - position.entryPrice) * position.size
          : (position.entryPrice - markPrice) * position.size;
    }

    return pnl;
  }

  /** Account snapshot valued at the given current replay price. */
  state(markPrice: number): PaperAccountState {
    const unrealized = this.unrealizedPnl(markPrice);

    return {
      balance: this.balance,
      unrealizedPnl: unrealized,
      equity: this.balance + unrealized,
      realizedPnl: this.realizedPnl,
      openPositions: [...this.positions.values()],
      closedTrades: [...this.trades],
    };
  }
}
