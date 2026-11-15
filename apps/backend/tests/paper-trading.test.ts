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
