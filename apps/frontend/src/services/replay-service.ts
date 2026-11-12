import type { ReplayState, ReplaySpeed } from "@htr-trading-simulator/shared";
import { API_BASE_URL } from "./candles-service";
import type { ChartCandle } from "../features/chart/ChartPanel";

export type ReplayAction = "play" | "pause" | "step";

export type ReplaySessionResult =
  | { status: "success"; sessionId: string; state: ReplayState }
  | { status: "error"; message: string };

export type ReplayResult =
  | { status: "success"; state: ReplayState }
  | { status: "error"; message: string };

export type ReplayCandlesResult =
  | { status: "success"; candles: ChartCandle[] }
  | { status: "error"; message: string };

interface ReplaySessionResponse {
  sessionId: string;
  state: ReplayState;
}

function parseStateBody(body: ReplaySessionResponse): ReplaySessionResult | ReplayResult {
  return {
    status: "success",
    sessionId: body.sessionId,
    state: body.state,
  };
}

/**
 * Shared error handling for replay API calls: connection failures
 * and backend error messages surface as an error result.
 */
async function requestSession(
  url: string,
  init?: RequestInit,
): Promise<ReplaySessionResult | ReplayResult> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    return {
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    };
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const body = (await response.json()) as { error?: string };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the generic status message.
    }

    return { status: "error", message };
  }

  const body = (await response.json()) as ReplaySessionResponse;

  return parseStateBody(body);
}

/** Creates a replay session for the given symbol, interval and UTC date range. */
export async function createReplaySession(
  symbol: string,
  interval: string,
  startDate: string,
  endDate: string,
  speed?: ReplaySpeed,
): Promise<ReplaySessionResult> {
  return (await requestSession(`${API_BASE_URL}/replay/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      interval,
      start: startDate,
      end: endDate,
      ...(speed !== undefined ? { speed } : {}),
    }),
  })) as ReplaySessionResult;
}

/** Fetches the current replay state, advancing the clock if playing. */
export async function fetchReplayState(sessionId: string): Promise<ReplayResult> {
  return (await requestSession(
    `${API_BASE_URL}/replay/sessions/${sessionId}`,
  )) as ReplayResult;
}

/** Starts, pauses or steps the session forward by one candle. */
export async function controlReplay(
  sessionId: string,
  action: ReplayAction,
): Promise<ReplayResult> {
  return (await requestSession(
    `${API_BASE_URL}/replay/sessions/${sessionId}/${action}`,
    { method: "POST" },
  )) as ReplayResult;
}

/** Updates the playback speed of a session. */
export async function setReplaySpeed(
  sessionId: string,
  speed: ReplaySpeed,
): Promise<ReplayResult> {
  return (await requestSession(
    `${API_BASE_URL}/replay/sessions/${sessionId}/speed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed }),
    },
  )) as ReplayResult;
}

/**
 * Fetches the candles revealed by the replay so far. Candles beyond
 * the replay clock are never sent by the backend.
 */
export async function fetchReplayCandles(sessionId: string): Promise<ReplayCandlesResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/replay/sessions/${sessionId}/candles`);
  } catch {
    return {
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    };
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const body = (await response.json()) as { error?: string };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the generic status message.
    }

    return { status: "error", message };
  }

  const items = (await response.json()) as ChartCandle[];

  if (!Array.isArray(items)) {
    return { status: "error", message: "Unexpected candles response." };
  }

  return { status: "success", candles: items };
}
