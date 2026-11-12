import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayState } from "@htr-trading-simulator/shared";
import { useReplayCandles } from "../src/hooks/useReplayCandles";
import { fetchReplayCandles } from "../src/services/replay-service";
import type { ChartCandle } from "../src/features/chart/ChartPanel";

vi.mock("../src/services/replay-service", () => ({
  fetchReplayCandles: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchReplayCandles);

function replayState(overrides: Partial<ReplayState> = {}): ReplayState {
  return {
    symbol: "BTCUSDT",
    interval: "1m",
    startTime: 1_000,
    endTime: 10_000,
    currentTime: 1_000,
    speed: 1,
    status: "paused",
    ...overrides,
  };
}

function candle(time: number): ChartCandle {
  return { time, open: 1, high: 2, low: 0.5, close: 1.5 };
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe("useReplayCandles", () => {
  it("stays loading without a session", () => {
    const { result } = renderHook(() => useReplayCandles(null, replayState()));

    expect(result.current).toEqual({ status: "loading" });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("fetches the revealed candles when the session starts", async () => {
    mockedFetch.mockResolvedValue({ status: "success", candles: [candle(1_000)] });

    const { result } = renderHook(() =>
      useReplayCandles("abc", replayState({ currentTime: 1_000 })),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ status: "ready", candles: [candle(1_000)] }),
    );
    expect(mockedFetch).toHaveBeenCalledWith("abc");
  });

  it("refetches when the replay clock advances", async () => {
    mockedFetch.mockResolvedValue({
      status: "success",
      candles: [candle(1_000), candle(2_000)],
    });

    const { result, rerender } = renderHook(
      ({ state }: { state: ReplayState }) => useReplayCandles("abc", state),
      { initialProps: { state: replayState({ currentTime: 1_000 }) } },
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ state: replayState({ currentTime: 2_000 }) });

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        candles: [candle(1_000), candle(2_000)],
      }),
    );
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("does not refetch when the clock has not moved", async () => {
    mockedFetch.mockResolvedValue({ status: "success", candles: [candle(1_000)] });

    const { result, rerender } = renderHook(
      ({ state }: { state: ReplayState }) => useReplayCandles("abc", state),
      { initialProps: { state: replayState({ currentTime: 1_000 }) } },
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ state: replayState({ currentTime: 1_000, status: "playing" }) });

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("reports an empty state when no candles are revealed yet", async () => {
    mockedFetch.mockResolvedValue({ status: "success", candles: [] });

    const { result } = renderHook(() =>
      useReplayCandles("abc", replayState({ currentTime: 1_000 })),
    );

    await waitFor(() => expect(result.current).toEqual({ status: "empty" }));
  });

  it("surfaces fetch errors", async () => {
    mockedFetch.mockResolvedValue({
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    });

    const { result } = renderHook(() =>
      useReplayCandles("abc", replayState({ currentTime: 1_000 })),
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "error",
        message: "Cannot reach the API server. Is the backend running?",
      }),
    );
  });

  it("resets to loading when the session changes", async () => {
    mockedFetch.mockResolvedValue({ status: "success", candles: [candle(1_000)] });

    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: string | null }) => useReplayCandles(sessionId, replayState()),
      { initialProps: { sessionId: "abc" as string | null } },
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ sessionId: "def" });

    expect(result.current).toEqual({ status: "loading" });
  });
});
