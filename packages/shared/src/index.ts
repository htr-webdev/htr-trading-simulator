export interface HealthResponse {
  status: "ok" | "error";
  service: string;
  timestamp: string;
}

export {
  REPLAY_SPEEDS,
  DEFAULT_REPLAY_SPEED,
} from "./constants/replay.js";
export type { ReplaySpeed, ReplayStatus, ReplayState } from "./constants/replay.js";
export type { ReplaySessionResponse } from "./constants/replay.js";
export { INTERVAL_MS } from "./constants/intervals.js";
export type { CandleIntervalKey } from "./constants/intervals.js";
