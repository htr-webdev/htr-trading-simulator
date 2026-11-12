/**
 * Playback speeds the replay engine supports. Kept in shared so the
 * backend validation and the frontend controls use the same set.
 */
export const REPLAY_SPEEDS = [0.25, 0.5, 1, 2, 4, 10] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export const DEFAULT_REPLAY_SPEED: ReplaySpeed = 1;

/** Lifecycle states of a replay session. */
export type ReplayStatus = "paused" | "playing" | "ended";

export interface ReplayState {
  symbol: string;
  interval: string;
  /** First candle open time the session may reveal (ms). */
  startTime: number;
  /** Last candle open time the session may reveal (ms). */
  endTime: number;
  /** Replay clock position in ms; never past endTime. */
  currentTime: number;
  speed: ReplaySpeed;
  status: ReplayStatus;
}
