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

describe("ReplayService aggregated intervals", () => {
  it("returns aggregated candles up to the replay clock for a 5m session", () => {
    const clock = 1_000;
    const service = new ReplayService(() => clock);
    const database = createTestDatabase();

    // createTestDatabase() fills the full day with 1m candles.

    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "5m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    // stepForward moves one 5m candle; clock stays paused afterwards.
    service.stepForward(sessionId); // +5m

    const candles = service.getCandlesUntilNow(sessionId, database) as CandleApiItem[];

    expect(candles).toHaveLength(2);
    expect(candles.map((item) => item.time)).toEqual([
      START_MS,
      START_MS + 5 * MINUTE,
    ]);
    expect(candles[1]).toEqual({
      time: START_MS + 5 * MINUTE,
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
    });
  });
});

describe("ReplayService.changeInterval", () => {
  it("switches interval keeping the replay clock and re-aggregated candles", () => {
    const service = new ReplayService();
    const database = createTestDatabase();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    service.stepForward(sessionId);
    service.stepForward(sessionId); // 2m

    const state = service.changeInterval(sessionId, "5m");
    expect(state).toMatchObject({ state: { interval: "5m", currentTime: START_MS + 2 * MINUTE } });

    // 3 minutes of 1m data fall into the first 5m bucket only.
    const candles = service.getCandlesUntilNow(sessionId, database) as CandleApiItem[];
    expect(candles).toHaveLength(1);
    expect(candles[0].time).toBe(START_MS);
  });

  it("rejects unknown intervals with an error", () => {
    const service = new ReplayService();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    expect(service.changeInterval(sessionId, "7m")).toEqual({
      error: expect.stringContaining("interval"),
    });
  });
});

describe("ReplayService paper trading", () => {
  function setupTradingSession() {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const database = createTestDatabase();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    return { service, database, sessionId, tickClock: () => { clock += 1; } };
  }

  it("fills orders at the latest revealed candle close", () => {
    const { service, database, sessionId } = setupTradingSession();

    // The start candle is revealed from the beginning, so the order
    // fills at its close without any step.
    const account = service.openPosition(sessionId, { direction: "long", size: 2 }, database) as never;
    expect(account).not.toHaveProperty("error");
    expect(account.openPositions).toHaveLength(1);
    // Entry = close of the first revealed candle = 1.5 per test data.
    expect(account.openPositions[0]).toMatchObject({ entryPrice: 1.5, size: 2, direction: "long" });

    // A session whose data has not started yet cannot fill orders.
    const { sessionId: emptySession } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: "2030-01-01",
      end: "2030-01-02",
    }).session;
    expect(
      service.openPosition(emptySession, { direction: "long", size: 1 }, database),
    ).toEqual({ error: expect.stringContaining("No market data"), status: 400 });
  });

  it("values the account at the current replay price", () => {
    const { service, database, sessionId } = setupTradingSession();
    service.stepForward(sessionId);
    service.openPosition(sessionId, { direction: "long", size: 2 }, database);

    service.stepForward(sessionId); // another candle revealed

    const account = service.getAccount(sessionId, database) as never;
    expect(account.openPositions).toHaveLength(1);
    // Mark price moved with the second candle close (1.5 in fixture).
    expect(account.balance).toBe(10_000);
    expect(account.equity).toBeGreaterThan(0);
  });

  it("closes a position at the latest revealed price and records the trade", () => {
    const { service, database, sessionId } = setupTradingSession();
    service.stepForward(sessionId);
    const opened = service.openPosition(sessionId, { direction: "long", size: 2 }, database) as never;
    const positionId = opened.openPositions[0].id;

    const account = service.closePosition(sessionId, positionId, database) as never;

    expect(account.openPositions).toHaveLength(0);
    expect(account.closedTrades).toHaveLength(1);
    expect(account.closedTrades[0]).toMatchObject({ entryPrice: 1.5, exitPrice: 1.5, size: 2 });
  });

  it("keeps separate accounts per replay session", () => {
    const clock = 1_000;
    const service = new ReplayService(() => clock);
    const database = createTestDatabase();
    const { sessionId: first } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;
    const { sessionId: second } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    service.stepForward(first);
    service.openPosition(first, { direction: "long", size: 1 }, database);

    const firstAccount = service.getAccount(first, database) as never;
    const secondAccount = service.getAccount(second, database) as never;

    expect(firstAccount.openPositions).toHaveLength(1);
    expect(secondAccount.openPositions).toHaveLength(0);
    expect(secondAccount.balance).toBe(10_000);
    expect(database).toBeDefined();
  });

  it("returns 404 for unknown sessions", () => {
    const { service, database } = setupTradingSession();

    expect(service.getAccount("missing", database)).toEqual({
      error: "Replay session not found.",
      status: 404,
    });
    expect(service.openPosition("missing", { direction: "long", size: 1 }, database)).toEqual({
      error: "Replay session not found.",
      status: 404,
    });
  });

  it("rejects invalid orders with 400", () => {
    const { service, database, sessionId } = setupTradingSession();
    service.stepForward(sessionId);

    expect(
      service.openPosition(sessionId, { direction: "sideways", size: 1 }, database),
    ).toEqual({ error: expect.stringContaining("direction"), status: 400 });
    expect(
      service.openPosition(sessionId, { direction: "long", size: 0 }, database),
    ).toEqual({ error: expect.stringContaining("size"), status: 400 });
  });
});

describe("ReplayService stop-loss / take-profit", () => {
  function setupTradingSession() {
    let clock = 1_000;
    const service = new ReplayService(() => clock);
    const database = createTestDatabase();
    const { sessionId } = service.create({
      symbol: "BTCUSDT",
      interval: "1m",
      start: START_DATE,
      end: END_DATE,
    }).session;

    return { service, database, sessionId, advanceClock: () => { clock += 1; } };
  }

  it("auto-closes a long position when a revealed candle hits the stop-loss", () => {
    const { service, database, sessionId } = setupTradingSession();

    // Candle 0 opens the session; candle 1 spikes to 3.0 and drops to 0.6.
    database.insertCandles("BTCUSDT", "1m", [
      candle(START_MS, "1.5"),
      {
        openTime: START_MS + MINUTE,
        open: "1.5",
        high: "3.0",
        low: "0.6",
        close: "1.0",
        volume: "10",
        closeTime: START_MS + MINUTE + MINUTE - 1,
      },
    ]);

    service.openPosition(sessionId, { direction: "long", size: 1 }, database);

    const set = service.setProtectiveLevels(
      sessionId,
      "pos-1",
      { stopLoss: 0.9 },
      database,
    );
    expect(set).not.toHaveProperty("error");

    // Step onto candle 1, then ask again — the forming candle is not
    // evaluated until the clock moves past it.
    service.stepForward(sessionId);
    service.stepForward(sessionId); // now candle 1 is fully closed

    const account = service.getAccount(sessionId, database) as never;

    expect(account.openPositions).toHaveLength(0);
    expect(account.closedTrades).toHaveLength(1);
    expect(account.closedTrades[0]).toMatchObject({
      exitPrice: 0.9,
      exitReason: "stop-loss",
      closedAtReplayTime: START_MS,
    });
    expect(account.balance).toBeCloseTo(10_000 - 0.6, 5);
  });

  it("auto-closes a long position at its take-profit", () => {
    const { service, database, sessionId } = setupTradingSession();

    database.insertCandles("BTCUSDT", "1m", [
      candle(START_MS, "1.5"),
      {
        openTime: START_MS + MINUTE,
        open: "1.5",
        high: "3.0",
        low: "1.4",
        close: "2.5",
        volume: "10",
        closeTime: START_MS + MINUTE + MINUTE - 1,
      },
    ]);

    service.openPosition(sessionId, { direction: "long", size: 1 }, database);
    service.setProtectiveLevels(sessionId, "pos-1", { takeProfit: 2.0 }, database);

    service.stepForward(sessionId);
    service.stepForward(sessionId);

    const account = service.getAccount(sessionId, database) as never;

    expect(account.openPositions).toHaveLength(0);
    expect(account.closedTrades[0]).toMatchObject({
      exitPrice: 2.0,
      exitReason: "take-profit",
    });
  });

  it("validates levels against the position side", () => {
    const { service, database, sessionId } = setupTradingSession();

    service.openPosition(sessionId, { direction: "long", size: 1 }, database);

    expect(
      service.setProtectiveLevels(sessionId, "pos-1", { stopLoss: 5 }, database),
    ).toEqual({ error: expect.stringContaining("below the entry"), status: 400 });
    expect(
      service.setProtectiveLevels(sessionId, "missing", { stopLoss: 0.9 }, database),
    ).toEqual({ error: "Position not found.", status: 400 });
  });

  it("leaves levels unchanged when not mentioned and clears on null", () => {
    const { service, database, sessionId } = setupTradingSession();

    service.openPosition(sessionId, { direction: "long", size: 1 }, database);
    service.setProtectiveLevels(sessionId, "pos-1", { stopLoss: 0.9 }, database);

    let state = service.setProtectiveLevels(sessionId, "pos-1", {}, database) as never;
    expect(state.openPositions[0]).toMatchObject({ stopLoss: 0.9, takeProfit: null });

    state = service.setProtectiveLevels(sessionId, "pos-1", { stopLoss: null }, database) as never;
    expect(state.openPositions[0]).toMatchObject({ stopLoss: null, takeProfit: null });
  });
});
