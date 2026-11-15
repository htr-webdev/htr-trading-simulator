import { randomUUID } from "node:crypto";
import type { CandleDatabase } from "@htr-trading-simulator/market-data";
import type {
  PaperAccountState,
  ReplaySessionResponse,
  ReplayState,
  TradeDirection,
} from "@htr-trading-simulator/shared";
import { parseReplayConfig, ReplaySession } from "./replay.js";
import { PaperTradingAccount } from "./paper-trading.js";
import { getCandles, type CandleApiItem, type CandleInterval } from "./candles.js";

export interface CreateReplayInput {
  symbol?: string;
  interval?: string;
  start?: string;
  end?: string;
  speed?: number;
}

interface SessionEntry {
  session: ReplaySession;
  account: PaperTradingAccount;
  /** Wall-clock time of the last visit, for catch-up advancement. */
  lastTouched: number;
}

export interface OpenOrderInput {
  direction?: string;
  size?: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): number | undefined {
  if (!DATE_PATTERN.test(value)) {
    return undefined;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    return undefined;
  }

  return timestamp;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory registry of replay sessions plus the wall-clock driver
 * for them. While a session is playing, every interaction first
 * advances its clock by the elapsed real time scaled by the playback
 * speed; paused and ended sessions never move.
 */
export class ReplayService {
  private readonly sessions = new Map<string, SessionEntry>();

  /**
   * Injectable clock so tests can drive advancement deterministically.
   */
  constructor(private readonly now: () => number = Date.now) {}

  /**
   * Creates a session from request input. Dates use the same
   * YYYY-MM-DD format as /candles; the end date is inclusive.
   */
  create(input: CreateReplayInput): { session: ReplaySessionResponse } | { error: string; status: 400 } {
    if (!input.start || !input.end) {
      return { error: "Missing start or end date. Expected YYYY-MM-DD.", status: 400 };
    }

    const startTime = parseDate(input.start);
    const endTime = parseDate(input.end);

    if (startTime === undefined) {
      return { error: `Invalid start date: ${input.start}. Expected YYYY-MM-DD.`, status: 400 };
    }

    if (endTime === undefined) {
      return { error: `Invalid end date: ${input.end}. Expected YYYY-MM-DD.`, status: 400 };
    }

    const parsed = parseReplayConfig({
      symbol: input.symbol ?? "",
      interval: input.interval ?? "",
      startTime,
      endTime: endTime + DAY_MS - 1,
      speed: input.speed,
    });

    if ("error" in parsed) {
      return { error: parsed.error, status: 400 };
    }

    const session = new ReplaySession(parsed.config);
    const account = new PaperTradingAccount(parsed.config.symbol);
    const sessionId = randomUUID();

    this.sessions.set(sessionId, { session, account, lastTouched: this.now() });

    return { session: { sessionId, state: session.getState() } };
  }

  /** Returns the session state, advancing the clock if playing. */
  getState(sessionId: string): ReplaySessionResponse | null {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return null;
    }

    this.tick(entry);

    return { sessionId, state: entry.session.getState() };
  }

  play(sessionId: string): ReplaySessionResponse | null {
    return this.apply(sessionId, (session) => session.play());
  }

  pause(sessionId: string): ReplaySessionResponse | null {
    return this.apply(sessionId, (session) => session.pause());
  }

  stepForward(sessionId: string): ReplaySessionResponse | null {
    return this.apply(sessionId, (session) => session.stepForward());
  }

  setSpeed(sessionId: string, speed: number): ReplaySessionResponse | { error: string } | null {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return null;
    }

    const result = entry.session.setSpeed(speed);

    return "error" in result ? result : { sessionId, state: result };
  }

  /** Switches a session's interval without moving the replay clock. */
  changeInterval(
    sessionId: string,
    interval: string,
  ): ReplaySessionResponse | { error: string } | null {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return null;
    }

    const result = entry.session.setInterval(interval);

    return "error" in result ? result : { sessionId, state: result };
  }

  /**
   * Candles revealed by the replay so far: everything from the
   * session start through the current replay time. Candles beyond
   * the replay clock are never read, so future data cannot leak.
   */
  getCandlesUntilNow(
    sessionId: string,
    database: CandleDatabase | null,
  ): CandleApiItem[] | { error: string; status: 404 } {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return { error: "Replay session not found.", status: 404 };
    }

    const state: ReplayState = this.tick(entry).getState();

    return getCandles(database, {
      symbol: state.symbol,
      interval: state.interval as CandleInterval,
      startTime: state.startTime,
      endTime: state.currentTime,
    });
  }

  /**
   * Latest close price revealed by the replay clock. Reads only 1m
   * candles at or before the replay time, so future prices can never
   * fill orders or value positions. Returns null before the first
   * candle is revealed.
   */
  private latestReplayPrice(
    entry: SessionEntry,
    database: CandleDatabase | null,
  ): number | null {
    if (!database) {
      return null;
    }

    const state: ReplayState = this.tick(entry).getState();
    const candles = database.getCandles(state.symbol, "1m", state.startTime, state.currentTime);

    if (candles.length === 0) {
      return null;
    }

    return Number(candles[candles.length - 1].close);
  }

  /** Paper trading account snapshot valued at the current replay price. */
  getAccount(sessionId: string, database: CandleDatabase | null): PaperAccountState | { error: string; status: 404 } {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return { error: "Replay session not found.", status: 404 };
    }

    const price = this.latestReplayPrice(entry, database) ?? 0;

    return entry.account.state(price);
  }

  /**
   * Opens a position at the latest revealed replay price. Orders are
   * rejected before any candle is revealed — there is no price to
   * fill at yet, and never a future one.
   */
  openPosition(
    sessionId: string,
    input: OpenOrderInput,
    database: CandleDatabase | null,
  ): PaperAccountState | { error: string; status: 400 | 404 } {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return { error: "Replay session not found.", status: 404 };
    }

    const state: ReplayState = this.tick(entry).getState();
    const price = this.latestReplayPrice(entry, database);

    if (price === null) {
      return { error: "No market data revealed yet. Cannot fill orders.", status: 400 };
    }

    const direction = input.direction as TradeDirection;
    const result = entry.account.openPosition({
      direction,
      size: input.size as number,
      price,
      symbol: state.symbol,
      replayTime: state.currentTime,
    });

    if ("error" in result) {
      return { error: result.error, status: 400 };
    }

    return entry.account.state(price);
  }

  /** Closes a position at the latest revealed replay price. */
  closePosition(
    sessionId: string,
    positionId: string,
    database: CandleDatabase | null,
  ): PaperAccountState | { error: string; status: 400 | 404 } {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return { error: "Replay session not found.", status: 404 };
    }

    const state: ReplayState = this.tick(entry).getState();
    const price = this.latestReplayPrice(entry, database);

    if (price === null) {
      return { error: "No market data revealed yet. Cannot fill orders.", status: 400 };
    }

    const result = entry.account.closePosition(positionId, price, state.currentTime);

    if ("error" in result) {
      return { error: result.error, status: 400 };
    }

    return entry.account.state(price);
  }

  /** Advances a playing session by the wall time since the last visit. */
  private tick(entry: SessionEntry): ReplaySession {
    const elapsed = Math.max(this.now() - entry.lastTouched, 0);

    entry.lastTouched = this.now();

    if (entry.session.getState().status === "playing") {
      entry.session.advance(elapsed);
    }

    return entry.session;
  }

  private apply(
    sessionId: string,
    action: (session: ReplaySession) => ReplayState,
  ): ReplaySessionResponse | null {
    const entry = this.sessions.get(sessionId);

    if (!entry) {
      return null;
    }

    this.tick(entry);

    return { sessionId, state: action(entry.session) };
  }
}
