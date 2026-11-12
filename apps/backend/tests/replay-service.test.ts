import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CandleDatabase } from "@htr-trading-simulator/market-data";
import { ReplayService } from "../src/replay-service.js";
import type { CandleApiItem } from "../src/candles.js";

const MINUTE = 60 * 1000;
const START_DATE = "2025-10-01";
const END_DATE = "2025-10-02";
const START_MS = Date.parse(`${START_DATE}T00:00:00.000Z`);

function candle(openTime: number) {
  return {
    openTime,
    open: "1",
    high: "2",
    low: "0.5",
    close: "1.5",
    volume: "10",
    closeTime: openTime + MINUTE - 1,
  };
}

const databases: CandleDatabase[] = [];

function createTestDatabase(): CandleDatabase {
  const directory = mkdtempSync(join(tmpdir(), "htr-replay-service-"));
  const database = new CandleDatabase(join(directory, "candles.sqlite"));

  const candles = Array.from({ length: 24 * 60 }, (_, index) => candle(START_MS + index * MINUTE));

  database.insertCandles("BTCUSDT", "1m", candles);
  databases.push(database);

  return database;
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("ReplayService.create", () => {
  it("creates a session with an id and initial state", () => {
    const service = new ReplayService();

    const result = service.create({ symbol: "BTCUSDT", interval: "1m", start: START_DATE, end: END_DATE });

    expect(result).toHaveProperty("session");
    expect(result.session.sessionId).toMatch(/^[\da-f-]{36}$/i);
    expect(result.session.state).toMatchObject({
      symbol: "BTCUSDT",
      interval: "1m",
      status: "paused",
      speed: 1,
      startTime: START_MS,
      currentTime: START_MS,
    });
  });

  it("rejects invalid input with a 400 error", () => {
    const service = new ReplayService();

    expect(service.create({ start: START_DATE, end: END_DATE })).toEqual({
      error: expect.stringContaining("symbol"),
      status: 400,
    });
    expect(service.create({ symbol: "BTCUSDT", interval: "1m" })).toEqual({
      error: expect.stringContaining("start"),
      status: 400,
    });
    expect(
      service.create({ symbol: "BTCUSDT", interval: "1m", start: "2025-13-01", end: END_DATE }),
    ).toEqual({ error: expect.stringContaining("start"), status: 400 });
    expect(
      service.create({ symbol: "BTCUSDT", interval: "1m", start: START_DATE, end: END_DATE, speed: 3 }),
    ).toEqual({ error: expect.stringContaining("speed"), status: 400 });
  });
});

describe("ReplayService playback", () => {
  it("returns null for unknown sessions", () => {
    const service = new ReplayService();

    expect(service.getState("missing")).toBeNull();
    expect(service.play("missing")).toBeNull();
    expect(service.pause("missing")).toBeNull();
    expect(service.stepForward("missing")).toBeNull();
    expect(service.setSpeed("missing", 2)).toBeNull();
  });

  it("does not advance the clock while paused", () => {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    clock += 10 * MINUTE;

    expect(service.getState(sessionId).state.currentTime).toBe(START_MS);
  });

  it("advances a playing session by elapsed wall time scaled by speed", () => {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
      speed: 2,
    }).session;

    service.play(sessionId);
    clock += 3 * MINUTE;

    expect(service.getState(sessionId).state.currentTime).toBe(START_MS + 6 * MINUTE);
  });

  it("catches up on elapsed time even when the session was left unvisited", () => {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    service.play(sessionId);
    clock += 60 * MINUTE;
    service.stepForward(sessionId);

    // The catch-up tick consumed the whole hour, then the step added one candle.
    expect(service.getState(sessionId).state.currentTime).toBe(START_MS + 61 * MINUTE);
  });

  it("steps one candle at a time regardless of wall time when paused", () => {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    service.stepForward(sessionId);
    clock += 5 * MINUTE;
    service.stepForward(sessionId);

    expect(service.getState(sessionId).state.currentTime).toBe(START_MS + 2 * MINUTE);
  });

  it("updates the playback speed", () => {
    const service = new ReplayService();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    expect(service.setSpeed(sessionId, 4)).toMatchObject({ state: { speed: 4 } });
    expect(service.setSpeed(sessionId, 3)).toEqual({ error: expect.stringContaining("speed") });
    expect(service.setSpeed(sessionId, 0.25)).toMatchObject({ state: { speed: 0.25 } });
  });
});

describe("ReplayService.getCandlesUntilNow", () => {
  it("returns only candles up to the replay clock", () => {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const database = createTestDatabase();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    service.play(sessionId);
    clock += 5 * MINUTE;

    const candles = service.getCandlesUntilNow(sessionId, database) as CandleApiItem[];

    expect(candles).toHaveLength(6);
    expect(candles.at(-1)?.time).toBe(START_MS + 5 * MINUTE);
  });

  it("returns 404 for unknown sessions", () => {
    const service = new ReplayService();

    expect(service.getCandlesUntilNow("missing", null)).toEqual({
      error: "Replay session not found.",
      status: 404,
    });
  });
});
