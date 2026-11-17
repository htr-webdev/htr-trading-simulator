import {
  INITIAL_PAPER_BALANCE,
  type ExitReason,
  type PaperAccountState,
  type PaperPosition,
  type PaperTrade,
  type TradeDirection,
} from "@htr-trading-simulator/shared";

export type {
  PaperAccountState,
  PaperPosition,
  PaperTrade,
  TradeDirection,
};

export interface OpenPositionInput {
  direction: TradeDirection;
  /** Position size in the base currency, e.g. BTC. */
  size: number;
  /** Current replay price used as entry. */
  price: number;
  symbol: string;
  replayTime: number;
}

export interface ProtectiveLevels {
  stopLoss?: number | null;
  takeProfit?: number | null;
}

/**
 * The replay candle a trigger check is evaluated against.
 */
export interface CandleRange {
  openTime: number;
  high: number;
  low: number;
}

const INITIAL_BALANCE = INITIAL_PAPER_BALANCE;

/**
 * Paper trading account for one replay session.
 *
 * Tracks cash, open positions and completed trades. Prices come
 * exclusively from the replay clock, so no future market data can
 * influence fills or mark-to-market. No leverage: opening a position
 * reserves its full notional value (size * entry price) as margin.
 *
 * Stop-loss / take-profit execution rules (deterministic):
 * - Levels are checked candle by candle, in chronological order, over
 *   the candle's high/low range.
 * - A long position closes at its stop-loss when the candle's low
 *   touches or falls below it, and at its take-profit when the high
 *   touches or rises above it (mirrored for shorts).
 * - The position closes exactly at the trigger price, never better
 *   (no gap fills) — execution is pessimistic.
 * - If both the stop-loss and the take-profit fall inside a single
 *   candle's range, the stop-loss is assumed to hit first. This is
 *   the conservative worst-case assumption and keeps results
 *   deterministic without intra-candle path data.
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
      stopLoss: null,
      takeProfit: null,
    };

    this.positions.set(position.id, position);

    return position;
  }

  /**
   * Sets, edits or clears a position's stop-loss / take-profit
   * levels. Validation follows the side of the trade: a long stops
   * out below its entry and takes profit above it, a short mirrors
   * that. Passing null clears a level; omitting it leaves it as is.
   */
  setProtectiveLevels(
    positionId: string,
    levels: ProtectiveLevels,
  ): PaperPosition | { error: string } {
    const position = this.positions.get(positionId);

    if (!position) {
      return { error: "Position not found." };
    }

    const next = {
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
    };

    if (levels.stopLoss !== undefined) {
      const error = this.validateLevel("stop-loss", levels.stopLoss, position);

      if (error) {
        return { error };
      }

      next.stopLoss = levels.stopLoss;
    }

    if (levels.takeProfit !== undefined) {
      const error = this.validateLevel("take-profit", levels.takeProfit, position);

      if (error) {
        return { error };
      }

      next.takeProfit = levels.takeProfit;
    }

    if (
      next.stopLoss !== null &&
      next.takeProfit !== null &&
      next.stopLoss === next.takeProfit
    ) {
      return { error: "Stop-loss and take-profit must be different prices." };
    }

    position.stopLoss = next.stopLoss;
    position.takeProfit = next.takeProfit;

    return position;
  }

  private validateLevel(
    name: "stop-loss" | "take-profit",
    value: number | null,
    position: PaperPosition,
  ): string | null {
    if (value === null) {
      return null; // clearing the level is always valid
    }

    if (!Number.isFinite(value) || value <= 0) {
      return `Invalid ${name}. Expected a positive number or null to clear.`;
    }

    if (position.direction === "long" && name === "stop-loss" && value >= position.entryPrice) {
      return `Invalid ${name}. For a long position it must be below the entry price.`;
    }

    if (position.direction === "long" && name === "take-profit" && value <= position.entryPrice) {
      return `Invalid ${name}. For a long position it must be above the entry price.`;
    }

    if (position.direction === "short" && name === "stop-loss" && value <= position.entryPrice) {
      return `Invalid ${name}. For a short position it must be above the entry price.`;
    }

    if (position.direction === "short" && name === "take-profit" && value >= position.entryPrice) {
      return `Invalid ${name}. For a short position it must be below the entry price.`;
    }

    return null;
  }

  /**
   * Closes a position at the given price. The reason is recorded on
   * the trade: manual closes, or automatic stop-loss / take-profit
   * executions triggered during replay monitoring.
   */
  closePosition(
    positionId: string,
    price: number,
    replayTime: number,
    exitReason: ExitReason = "manual",
  ): PaperTrade | { error: string } {
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
      exitReason,
    };

    this.trades.push(trade);

    return trade;
  }

  /**
   * Evaluates stop-loss / take-profit triggers for one replay candle
   * (high/low range) and closes every hit position at its trigger
   * price. See the class comment for the deterministic execution
   * rules. Returns the number of positions closed.
   */
  checkTriggers(candle: CandleRange): number {
    let closed = 0;

    for (const position of [...this.positions.values()]) {
      // Stop-loss first: the documented conservative assumption when
      // both levels fall inside a single candle's range.
      if (position.stopLoss !== null && this.levelHit(position.stopLoss, candle)) {
        this.closePosition(position.id, position.stopLoss, candle.openTime, "stop-loss");
        closed += 1;
        continue;
      }

      if (position.takeProfit !== null && this.levelHit(position.takeProfit, candle)) {
        this.closePosition(position.id, position.takeProfit, candle.openTime, "take-profit");
        closed += 1;
      }
    }

    return closed;
  }

  private levelHit(level: number, candle: CandleRange): boolean {
    // A level is hit when it lies inside the candle's traded range.
    return level >= candle.low && level <= candle.high;
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
      markPrice,
      balance: this.balance,
      unrealizedPnl: unrealized,
      equity: this.balance + unrealized,
      realizedPnl: this.realizedPnl,
      openPositions: [...this.positions.values()],
      closedTrades: [...this.trades],
    };
  }
}
