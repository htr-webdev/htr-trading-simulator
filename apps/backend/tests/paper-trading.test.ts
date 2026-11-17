import { describe, expect, it } from "vitest";
import { PaperTradingAccount } from "../src/paper-trading.js";

const ENTRY = 100;

function open(
  account: PaperTradingAccount,
  overrides: Partial<Parameters<PaperTradingAccount["openPosition"]>[0]> = {},
) {
  return account.openPosition({
    direction: "long",
    size: 1,
    price: ENTRY,
    symbol: "BTCUSDT",
    replayTime: 1_000,
    ...overrides,
  });
}

describe("PaperTradingAccount.openPosition", () => {
  it("opens a long position at the given price", () => {
    const account = new PaperTradingAccount("BTCUSDT");

    const position = open(account, { size: 2 });

    expect(position).toMatchObject({
      symbol: "BTCUSDT",
      direction: "long",
      size: 2,
      entryPrice: ENTRY,
    });
  });

  it("supports multiple simultaneous positions", () => {
    const account = new PaperTradingAccount("BTCUSDT");

    open(account, { direction: "long", size: 1 });
    open(account, { direction: "short", size: 0.5 });

    expect(account.state(ENTRY).openPositions).toHaveLength(2);
  });

  it("rejects invalid direction, size and price", () => {
    const account = new PaperTradingAccount("BTCUSDT");

    expect(open(account, { direction: "sideways" as never })).toHaveProperty("error");
    expect(open(account, { size: 0 })).toHaveProperty("error");
    expect(open(account, { size: -1 })).toHaveProperty("error");
    expect(open(account, { price: 0 })).toHaveProperty("error");
    expect(open(account, { price: Number.NaN })).toHaveProperty("error");
    expect(account.state(ENTRY).openPositions).toHaveLength(0);
  });

  it("rejects orders whose notional exceeds the free balance", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    // 10_000 / 100 = 100 units max without leverage.
    expect(open(account, { size: 100 })).not.toHaveProperty("error");
    expect(open(account, { size: 1 })).toHaveProperty("error");
  });
});

describe("PaperTradingAccount.closePosition", () => {
  it("settles a long position's profit into the balance", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    const position = open(account, { size: 2 }) as never as {
      id: string;
    };
    const trade = account.closePosition(position.id, 110, 2_000) as never as {
      realizedPnl: number;
    };

    expect(trade.realizedPnl).toBe(20); // (110 - 100) * 2
    expect(account.state(110)).toMatchObject({
      balance: 10_020,
      realizedPnl: 20,
      unrealizedPnl: 0,
      equity: 10_020,
    });
  });

  it("settles a short position's loss against the balance", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    const position = open(account, { direction: "short", size: 1 }) as never as {
      id: string;
    };
    account.closePosition(position.id, 104, 2_000);

    // Shorting at 100 and closing at 104 loses 4.
    expect(account.state(104).balance).toBe(9_996);
    expect(account.state(104).realizedPnl).toBe(-4);
  });

  it("records closed trades with entry, exit and timing", () => {
    const account = new PaperTradingAccount("BTCUSDT");

    const position = open(account, { replayTime: 5_000 }) as never as {
      id: string;
    };
    account.closePosition(position.id, 120, 9_000);

    const state = account.state(120);

    expect(state.closedTrades).toHaveLength(1);
    expect(state.closedTrades[0]).toMatchObject({
      symbol: "BTCUSDT",
      direction: "long",
      size: 1,
      entryPrice: ENTRY,
      exitPrice: 120,
      realizedPnl: 20,
      openedAtReplayTime: 5_000,
      closedAtReplayTime: 9_000,
    });
    expect(state.openPositions).toHaveLength(0);
  });

  it("rejects closing an unknown position or closing twice", () => {
    const account = new PaperTradingAccount("BTCUSDT");

    expect(account.closePosition("missing", 100, 0)).toHaveProperty("error");

    const position = open(account) as never as { id: string };
    account.closePosition(position.id, 100, 1_000);

    expect(account.closePosition(position.id, 100, 2_000)).toHaveProperty("error");
    expect(account.state(ENTRY).closedTrades).toHaveLength(1);
  });
});

describe("PaperTradingAccount.state (mark to market)", () => {
  it("computes unrealized PnL across long and short positions", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    open(account, { direction: "long", size: 2 }); // entry 100
    open(account, { direction: "short", size: 1 }); // entry 100

    // Mark at 103: long +6, short -3 -> net +3.
    const state = account.state(103);

    expect(state.unrealizedPnl).toBe(3);
    expect(state.equity).toBe(10_003);
    expect(state.balance).toBe(10_000);
  });

  it("keeps the balance unchanged while positions stay open", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    open(account, { size: 50 });

    expect(account.state(200).balance).toBe(10_000);
    // equity = 10_000 + (200 - 100) * 50
    expect(account.state(200).equity).toBe(15_000);
  });

  it("free balance shrinks by the reserved notional of open positions", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);

    open(account, { size: 40 }); // reserves 40 * 100 = 4_000

    expect(account.freeBalance).toBe(6_000);
  });
});

describe("PaperTradingAccount.setProtectiveLevels", () => {
  function openLong() {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);
    const position = open(account, { size: 1 }) as never as { id: string };
    return { account, positionId: position.id };
  }

  it("sets valid levels for a long position", () => {
    const { account, positionId } = openLong();

    const result = account.setProtectiveLevels(positionId, {
      stopLoss: 90,
      takeProfit: 120,
    });

    expect(result).toMatchObject({ stopLoss: 90, takeProfit: 120 });
  });

  it("rejects levels on the wrong side of the entry price", () => {
    const { account, positionId } = openLong();

    expect(account.setProtectiveLevels(positionId, { stopLoss: 100 })).toHaveProperty("error");
    expect(account.setProtectiveLevels(positionId, { takeProfit: 100 })).toHaveProperty("error");
    expect(account.setProtectiveLevels(positionId, { stopLoss: 110 })).toHaveProperty("error");
    expect(account.setProtectiveLevels(positionId, { takeProfit: 90 })).toHaveProperty("error");
  });

  it("mirrors validation for a short position", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);
    const position = open(account, { direction: "short" }) as never as { id: string };

    expect(account.setProtectiveLevels(position.id, { stopLoss: 90 })).toHaveProperty("error");
    expect(account.setProtectiveLevels(position.id, { takeProfit: 110 })).toHaveProperty("error");

    const result = account.setProtectiveLevels(position.id, {
      stopLoss: 110,
      takeProfit: 90,
    });

    expect(result).toMatchObject({ stopLoss: 110, takeProfit: 90 });
  });

  it("rejects invalid values and unknown positions", () => {
    const { account, positionId } = openLong();

    expect(account.setProtectiveLevels(positionId, { stopLoss: 0 })).toHaveProperty("error");
    expect(account.setProtectiveLevels(positionId, { stopLoss: Number.NaN })).toHaveProperty("error");
    expect(account.setProtectiveLevels("missing", { stopLoss: 90 })).toHaveProperty("error");
  });

  it("edits and clears levels", () => {
    const { account, positionId } = openLong();

    account.setProtectiveLevels(positionId, { stopLoss: 90, takeProfit: 120 });
    account.setProtectiveLevels(positionId, { stopLoss: 95 });

    expect(account.state(ENTRY).openPositions[0]).toMatchObject({
      stopLoss: 95,
      takeProfit: 120,
    });

    account.setProtectiveLevels(positionId, { takeProfit: null });

    expect(account.state(ENTRY).openPositions[0]).toMatchObject({
      stopLoss: 95,
      takeProfit: null,
    });
  });

  it("rejects identical stop-loss and take-profit", () => {
    const { account, positionId } = openLong();

    expect(
      account.setProtectiveLevels(positionId, { stopLoss: 95, takeProfit: 95 }),
    ).toHaveProperty("error");
  });
});

describe("PaperTradingAccount.checkTriggers", () => {
  function openWithLevels(direction: "long" | "short", levels: { stopLoss?: number; takeProfit?: number }) {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);
    const position = open(account, { direction }) as never as { id: string };
    account.setProtectiveLevels(position.id, levels);

    return { account, positionId: position.id };
  }

  it("closes a long position at its stop-loss price when the range crosses it", () => {
    const { account } = openWithLevels("long", { stopLoss: 95 });

    const closed = account.checkTriggers({ openTime: 2_000, high: 98, low: 94 });

    expect(closed).toBe(1);
    const state = account.state(94);
    expect(state.openPositions).toHaveLength(0);
    expect(state.closedTrades[0]).toMatchObject({
      exitPrice: 95,
      realizedPnl: -5,
      exitReason: "stop-loss",
      closedAtReplayTime: 2_000,
    });
  });

  it("closes a long position at its take-profit price when the range crosses it", () => {
    const { account } = openWithLevels("long", { takeProfit: 110 });

    account.checkTriggers({ openTime: 2_000, high: 112, low: 101 });

    const state = account.state(112);
    expect(state.closedTrades[0]).toMatchObject({
      exitPrice: 110,
      realizedPnl: 10,
      exitReason: "take-profit",
    });
  });

  it("mirrors triggers for a short position", () => {
    const { account } = openWithLevels("short", { stopLoss: 110 });

    account.checkTriggers({ openTime: 2_000, high: 115, low: 100 });

    const state = account.state(115);
    expect(state.closedTrades[0]).toMatchObject({
      exitPrice: 110,
      realizedPnl: -10,
      exitReason: "stop-loss",
    });
  });

  it("does nothing when the range misses all levels", () => {
    const { account } = openWithLevels("long", { stopLoss: 95, takeProfit: 110 });

    expect(account.checkTriggers({ openTime: 2_000, high: 105, low: 96 })).toBe(0);
    expect(account.state(100).openPositions).toHaveLength(1);
  });

  it("assumes the stop-loss hits first when both levels fall in one candle", () => {
    const { account } = openWithLevels("long", { stopLoss: 95, takeProfit: 110 });

    account.checkTriggers({ openTime: 2_000, high: 115, low: 90 });

    const trade = account.state(115).closedTrades[0];

    expect(trade).toMatchObject({ exitPrice: 95, exitReason: "stop-loss" });
    expect(account.state(115).openPositions).toHaveLength(0);
  });

  it("keeps other positions open when only one hits its level", () => {
    const account = new PaperTradingAccount("BTCUSDT", 10_000);
    const a = open(account, { size: 1 }) as never as { id: string };
    const b = open(account, { size: 1 }) as never as { id: string };
    account.setProtectiveLevels(a.id, { stopLoss: 95 });
    account.setProtectiveLevels(b.id, { stopLoss: 90 });

    account.checkTriggers({ openTime: 2_000, high: 99, low: 94 });

    const state = account.state(100);
    expect(state.openPositions).toHaveLength(1);
    expect(state.openPositions[0].id).toBe(b.id);
    expect(state.closedTrades).toHaveLength(1);
  });
});
