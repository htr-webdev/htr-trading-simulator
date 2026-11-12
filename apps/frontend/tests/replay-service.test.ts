import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReplayState } from "@htr-trading-simulator/shared";
import {
  API_BASE_URL,
} from "../src/services/candles-service";
import {
  controlReplay,
  createReplaySession,
  fetchReplayCandles,
  fetchReplayState,
  setReplaySpeed,
} from "../src/services/replay-service";

function mockResponse(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      } as Response),
    ),
  );
}

function replayState(overrides: Partial<ReplayState> = {}): ReplayState {
  return {
    symbol: "BTCUSDT",
    interval: "1m",
    startTime: 1_000,
    endTime: 2_000,
    currentTime: 1_000,
    speed: 1,
    status: "paused",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createReplaySession", () => {
  it("posts the session config and returns the session id and state", async () => {
    mockResponse(201, { sessionId: "abc", state: replayState() });

    const result = await createReplaySession("BTCUSDT", "1m", "2025-10-01", "2025-10-02");

    expect(result).toEqual({ status: "success", sessionId: "abc", state: replayState() });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        interval: "1m",
        start: "2025-10-01",
        end: "2025-10-02",
      }),
    });
  });

  it("returns the backend error message on a 400 response", async () => {
    mockResponse(400, { error: "Invalid or missing symbol." });

    const result = await createReplaySession("bad", "1m", "2025-10-01", "2025-10-02");

    expect(result).toEqual({ status: "error", message: "Invalid or missing symbol." });
  });
});

describe("controlReplay", () => {
  it("posts the action to the session endpoint", async () => {
    mockResponse(200, { sessionId: "abc", state: replayState({ status: "playing" }) });

    const result = await controlReplay("abc", "play");

    expect(result).toEqual({
      status: "success",
      sessionId: "abc",
      state: replayState({ status: "playing" }),
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc/play`, {
      method: "POST",
    });
  });
});

describe("fetchReplayState", () => {
  it("gets the current state", async () => {
    mockResponse(200, { sessionId: "abc", state: replayState({ currentTime: 1_500 }) });

    const result = await fetchReplayState("abc");

    expect(result).toEqual({
      status: "success",
      sessionId: "abc",
      state: replayState({ currentTime: 1_500 }),
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc`, undefined);
  });
});

describe("setReplaySpeed", () => {
  it("posts the new speed", async () => {
    mockResponse(200, { sessionId: "abc", state: replayState({ speed: 4 }) });

    const result = await setReplaySpeed("abc", 4);

    expect(result).toEqual({
      status: "success",
      sessionId: "abc",
      state: replayState({ speed: 4 }),
    });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc/speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed: 4 }),
    });
  });
});

describe("fetchReplayCandles", () => {
  it("returns the revealed candles", async () => {
    mockResponse(200, [{ time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 }]);

    const result = await fetchReplayCandles("abc");

    expect(result).toEqual({
      status: "success",
      candles: [{ time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 }],
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc/candles`);
  });

  it("returns an error when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("connection refused"))));

    const result = await fetchReplayCandles("abc");

    expect(result).toEqual({
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    });
  });
});
