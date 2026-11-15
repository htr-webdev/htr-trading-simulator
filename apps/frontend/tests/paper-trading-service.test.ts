import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaperAccountState } from "@htr-trading-simulator/shared";
import { API_BASE_URL } from "../src/services/candles-service";
import {
  closePaperPosition,
  fetchPaperAccount,
  submitPaperOrder,
} from "../src/services/paper-trading-service";

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

function accountState(overrides: Partial<PaperAccountState> = {}): PaperAccountState {
  return {
    markPrice: 100,
    balance: 10_000,
    unrealizedPnl: 0,
    equity: 10_000,
    realizedPnl: 0,
    openPositions: [],
    closedTrades: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPaperAccount", () => {
  it("returns the account state", async () => {
    mockResponse(200, accountState({ equity: 10_050 }));

    const result = await fetchPaperAccount("abc");

    expect(result).toEqual({ status: "success", account: accountState({ equity: 10_050 }) });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc/account`, undefined);
  });

  it("returns the backend error message on failure", async () => {
    mockResponse(404, { error: "Replay session not found." });

    const result = await fetchPaperAccount("abc");

    expect(result).toEqual({ status: "error", message: "Replay session not found." });
  });
});

describe("submitPaperOrder", () => {
  it("posts the order and returns the updated account", async () => {
    mockResponse(201, accountState({ unrealizedPnl: 5, equity: 10_005 }));

    const result = await submitPaperOrder("abc", "long", 0.5);

    expect(result).toEqual({
      status: "success",
      account: accountState({ unrealizedPnl: 5, equity: 10_005 }),
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/replay/sessions/abc/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "long", size: 0.5 }),
    });
  });

  it("surfaces rejection reasons", async () => {
    mockResponse(400, { error: "Insufficient balance for this position." });

    const result = await submitPaperOrder("abc", "long", 999);

    expect(result).toEqual({ status: "error", message: "Insufficient balance for this position." });
  });
});

describe("closePaperPosition", () => {
  it("posts the close request", async () => {
    mockResponse(200, accountState({ realizedPnl: 12 }));

    const result = await closePaperPosition("abc", "pos-1");

    expect(result).toEqual({ status: "success", account: accountState({ realizedPnl: 12 }) });
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/replay/sessions/abc/positions/pos-1/close`,
      { method: "POST" },
    );
  });
});

describe("connection errors", () => {
  it("reports an unreachable backend", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("connection refused"))));

    const result = await fetchPaperAccount("abc");

    expect(result).toEqual({
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    });
  });
});
