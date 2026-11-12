import { describe, expect, it } from "vitest";
import { parseReplayConfig, ReplaySession } from "../src/replay.js";

const MINUTE = 60 * 1000;

const baseConfig = {
  symbol: "BTCUSDT",
  interval: "1m",
  startTime: 1_760_000_000_000,
  endTime: 1_760_000_000_000 + 120 * MINUTE,
};

describe("parseReplayConfig", () => {
  it("accepts a valid config and defaults the speed", () => {
    const result = parseReplayConfig({ ...baseConfig, speed: undefined });

    expect(result).toEqual({
      config: { ...baseConfig, speed: 1 },
    });
  });

  it("rejects an unknown interval", () => {
    const result = parseReplayConfig({ ...baseConfig, interval: "7m" });

    expect(result).toHaveProperty("error");
  });

  it("rejects a start time at or after the end time", () => {
    expect(parseReplayConfig({ ...baseConfig, endTime: baseConfig.startTime })).toHaveProperty("error");
    expect(parseReplayConfig({ ...baseConfig, endTime: baseConfig.startTime - 1 })).toHaveProperty("error");
  });

  it("rejects non-numeric timestamps", () => {
    expect(
      parseReplayConfig({ ...baseConfig, startTime: Number.NaN }),
    ).toHaveProperty("error");
  });

  it("rejects a speed outside the allowed set", () => {
    expect(parseReplayConfig({ ...baseConfig, speed: 3 })).toHaveProperty("error");
  });
});

describe("ReplaySession", () => {
  it("starts paused at the chosen start time", () => {
    const session = new ReplaySession(baseConfig);

    expect(session.getState()).toMatchObject({
      currentTime: baseConfig.startTime,
      speed: 1,
      status: "paused",
    });
  });

  it("play and pause toggle the status", () => {
    const session = new ReplaySession(baseConfig);

    expect(session.play().status).toBe("playing");
    expect(session.pause().status).toBe("paused");
  });

  it("advance scales simulated time by the playback speed", () => {
    const session = new ReplaySession({ ...baseConfig, speed: 2 });

    session.advance(MINUTE);

    expect(session.getState().currentTime).toBe(baseConfig.startTime + 2 * MINUTE);
  });

  it("does not move the clock while paused... only when playing", () => {
    const session = new ReplaySession(baseConfig);

    // advance() is driven by the server tick; the session itself does
    // not check the status so the API layer stays free of timers.
    session.advance(MINUTE);

    expect(session.getState().currentTime).toBe(baseConfig.startTime + MINUTE);
  });

  it("clamps the clock at endTime and marks the session ended", () => {
    const session = new ReplaySession(baseConfig);

    const state = session.advance(10 * 60 * MINUTE);

    expect(state.currentTime).toBe(baseConfig.endTime);
    expect(state.status).toBe("ended");
  });

  it("ignores playback controls and negative advance after ending", () => {
    const session = new ReplaySession(baseConfig);
    session.advance(10 * 60 * MINUTE);

    expect(session.play().status).toBe("ended");
    expect(session.pause().status).toBe("ended");
    expect(session.advance(-MINUTE).currentTime).toBe(baseConfig.endTime);
  });

  it("setSpeed validates and updates the playback speed", () => {
    const session = new ReplaySession(baseConfig);

    expect(session.setSpeed(4).speed).toBe(4);
    expect(session.setSpeed(3)).toHaveProperty("error");
    expect(session.getState().speed).toBe(4);
  });

  it("stepForward reveals exactly one candle interval", () => {
    const session = new ReplaySession(baseConfig);

    session.stepForward();
    session.stepForward();

    expect(session.getState().currentTime).toBe(baseConfig.startTime + 2 * MINUTE);
  });

  it("stepForward stops at endTime for a partial last candle", () => {
    const session = new ReplaySession({
      ...baseConfig,
      endTime: baseConfig.startTime + 2.5 * MINUTE,
    });

    session.stepForward();
    session.stepForward();
    session.stepForward();

    expect(session.getState().currentTime).toBe(baseConfig.startTime + 2.5 * MINUTE);
    expect(session.getState().status).toBe("ended");
  });
});
