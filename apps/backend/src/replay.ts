import {
  DEFAULT_REPLAY_SPEED,
  REPLAY_SPEEDS,
  type ReplaySpeed,
  type ReplayState,
  type ReplayStatus,
} from "@htr-trading-simulator/shared";

/** Duration in ms of one candle per supported interval. */
const INTERVAL_MS: Record<string, number> = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export interface ReplaySessionConfig {
  symbol: string;
  interval: string;
  startTime: number;
  endTime: number;
  speed?: number;
}

export interface ResolvedReplayConfig extends Required<Omit<ReplaySessionConfig, "speed">> {
  speed: ReplaySpeed;
}

/**
 * Validates replay session input. Returns the normalized config, or
 * an error message for the 400 response.
 */
export function parseReplayConfig(config: ReplaySessionConfig): { config: ResolvedReplayConfig } | { error: string } {
  const { symbol, interval, startTime, endTime } = config;

  if (!symbol || typeof symbol !== "string") {
    return { error: "Invalid or missing symbol." };
  }

  if (!interval || !(interval in INTERVAL_MS)) {
    return { error: `Invalid or missing interval. Allowed: ${Object.keys(INTERVAL_MS).join(", ")}.` };
  }

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return { error: "Start and end time must be numeric timestamps in ms." };
  }

  if (startTime >= endTime) {
    return { error: "Start time must be before end time." };
  }

  const requestedSpeed = config.speed ?? DEFAULT_REPLAY_SPEED;

  if (!REPLAY_SPEEDS.includes(requestedSpeed as ReplaySpeed)) {
    return { error: `Invalid speed. Allowed: ${REPLAY_SPEEDS.join(", ")}.` };
  }

  return {
    config: { symbol, interval, startTime, endTime, speed: requestedSpeed as ReplaySpeed },
  };
}

/**
 * Replay session for one symbol and interval.
 *
 * Owns the replay clock: it starts at the chosen start time, moves
 * forward only while playing, and never passes the session end time.
 * Once the clock reaches the end the session is "ended" and every
 * playback control becomes a no-op, so future candles stay hidden.
 */
export class ReplaySession {
  private currentTime: number;
  private speed: ReplaySpeed;
  private status: ReplayStatus;

  constructor(private readonly config: ResolvedReplayConfig) {
    this.currentTime = config.startTime;
    this.speed = config.speed ?? DEFAULT_REPLAY_SPEED;
    this.status = "paused";
  }

  /** One candle duration for this session's interval, in ms. */
  get intervalMs(): number {
    return INTERVAL_MS[this.config.interval];
  }

  getState(): ReplayState {
    return {
      symbol: this.config.symbol,
      interval: this.config.interval,
      startTime: this.config.startTime,
      endTime: this.config.endTime,
      currentTime: this.currentTime,
      speed: this.speed,
      status: this.status,
    };
  }

  play(): ReplayState {
    if (this.status !== "ended") {
      this.status = "playing";
    }

    return this.getState();
  }

  pause(): ReplayState {
    if (this.status !== "ended") {
      this.status = "paused";
    }

    return this.getState();
  }

  setSpeed(speed: number): ReplayState | { error: string } {
    if (!REPLAY_SPEEDS.includes(speed as ReplaySpeed)) {
      return { error: `Invalid speed. Allowed: ${REPLAY_SPEEDS.join(", ")}.` };
    }

    this.speed = speed as ReplaySpeed;

    return this.getState();
  }

  /**
   * Moves the replay clock forward by deltaMs of simulated time,
   * scaled by the playback speed. Clamps at endTime and marks the
   * session ended; time never flows past the configured end.
   */
  advance(deltaMs: number): ReplayState {
    if (this.status === "ended" || deltaMs <= 0) {
      return this.getState();
    }

    this.currentTime = Math.min(this.currentTime + deltaMs * this.speed, this.config.endTime);

    if (this.currentTime >= this.config.endTime) {
      this.status = "ended";
    }

    return this.getState();
  }

  /** Reveals exactly one more candle of the session's interval. */
  stepForward(): ReplayState {
    return this.advance(this.intervalMs);
  }
}
