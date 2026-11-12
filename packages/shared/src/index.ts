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
