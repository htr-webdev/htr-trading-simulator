import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperAccountState } from "@htr-trading-simulator/shared";
import { usePaperTrading } from "../src/hooks/usePaperTrading";
import {
  closePaperPosition,
  fetchPaperAccount,
  setPaperProtectiveLevels,
  submitPaperOrder,
} from "../src/services/paper-trading-service";

vi.mock("../src/services/paper-trading-service", () => ({
  closePaperPosition: vi.fn(),
  fetchPaperAccount: vi.fn(),
  setPaperProtectiveLevels: vi.fn(),
  submitPaperOrder: vi.fn(),
}));

const mockedFetchAccount = vi.mocked(fetchPaperAccount);
const mockedSubmit = vi.mocked(submitPaperOrder);
const mockedClose = vi.mocked(closePaperPosition);
const mockedSetLevels = vi.mocked(setPaperProtectiveLevels);

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

beforeEach(() => {
  mockedFetchAccount.mockReset();
  mockedSubmit.mockReset();
  mockedClose.mockReset();
  mockedSetLevels.mockReset();
  mockedFetchAccount.mockResolvedValue({ status: "success", account: accountState() });
});

describe("usePaperTrading", () => {
  it("loads the account for the session", async () => {
    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: "abc", isPlaying: false }),
    );

    await waitFor(() => expect(result.current.account).not.toBeNull());
    expect(mockedFetchAccount).toHaveBeenCalledWith("abc");
    expect(result.current.error).toBeNull();
  });

  it("clears the account when the session changes", async () => {
    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: string | null }) =>
        usePaperTrading({ sessionId, isPlaying: false }),
      { initialProps: { sessionId: "abc" as string | null } },
    );

    await waitFor(() => expect(result.current.account).not.toBeNull());

    rerender({ sessionId: "def" });

    expect(result.current.account).toBeNull();
    expect(mockedFetchAccount).toHaveBeenLastCalledWith("def");
  });

  it("does nothing without a session", async () => {
    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: null, isPlaying: false }),
    );

    expect(result.current.account).toBeNull();

    await act(() => result.current.submitOrder("long", 1));

    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("submits an order and stores the updated account", async () => {
    mockedSubmit.mockResolvedValue({
      status: "success",
      account: accountState({ unrealizedPnl: 7, equity: 10_007 }),
    });

    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: "abc", isPlaying: false }),
    );
    await waitFor(() => expect(result.current.account).not.toBeNull());

    await act(() => result.current.submitOrder("long", 0.5));

    expect(mockedSubmit).toHaveBeenCalledWith("abc", "long", 0.5);
    expect(result.current.account?.unrealizedPnl).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it("surfaces order errors and keeps the account", async () => {
    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: "abc", isPlaying: false }),
    );
    await waitFor(() => expect(result.current.account).not.toBeNull());

    mockedSubmit.mockResolvedValue({
      status: "error",
      message: "Insufficient balance for this position.",
    });

    await act(() => result.current.submitOrder("long", 999));

    expect(result.current.error).toBe("Insufficient balance for this position.");
    expect(result.current.account?.balance).toBe(10_000);
  });

  it("closes a position", async () => {
    mockedClose.mockResolvedValue({
      status: "success",
      account: accountState({ realizedPnl: 15 }),
    });

    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: "abc", isPlaying: false }),
    );
    await waitFor(() => expect(result.current.account).not.toBeNull());

    await act(() => result.current.closePosition("pos-1"));

    expect(mockedClose).toHaveBeenCalledWith("abc", "pos-1");
    expect(result.current.account?.realizedPnl).toBe(15);
  });
});

describe("usePaperTrading.setProtectiveLevels", () => {
  it("posts the levels and stores the updated account", async () => {
    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: "abc", isPlaying: false }),
    );
    await waitFor(() => expect(result.current.account).not.toBeNull());

    mockedSetLevels.mockResolvedValue({
      status: "success",
      account: accountState({ unrealizedPnl: 1 }),
    });

    await act(() =>
      result.current.setProtectiveLevels("pos-1", { stopLoss: 95, takeProfit: null }),
    );

    expect(mockedSetLevels).toHaveBeenCalledWith("abc", "pos-1", {
      stopLoss: 95,
      takeProfit: null,
    });
    expect(result.current.account?.unrealizedPnl).toBe(1);
  });

  it("is a no-op without a session", async () => {
    const { result } = renderHook(() =>
      usePaperTrading({ sessionId: null, isPlaying: false }),
    );

    await act(() => result.current.setProtectiveLevels("pos-1", { stopLoss: 95 }));

    expect(mockedSetLevels).not.toHaveBeenCalled();
  });
});
