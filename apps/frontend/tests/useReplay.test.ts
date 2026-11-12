import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayState } from "@htr-trading-simulator/shared";
import { useReplay } from "../src/hooks/useReplay";
import { controlReplay, createReplaySession } from "../src/services/replay-service";

vi.mock("../src/services/replay-service", () => ({
  controlReplay: vi.fn(),
  createReplaySession: vi.fn(),
  fetchReplayState: vi.fn(),
  setReplaySpeed: vi.fn(),
}));

const mockedCreate = vi.mocked(createReplaySession);
const mockedControl = vi.mocked(controlReplay);

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

beforeEach(() => {
  mockedCreate.mockReset();
  mockedControl.mockReset();
  mockedCreate.mockResolvedValue({
    status: "success",
    sessionId: "abc",
    state: replayState(),
  });
});

const baseOptions = {
  symbol: "BTCUSDT",
  interval: "1m",
  startDate: "2025-06-15",
  endDate: "2025-06-15",
};

describe("useReplay", () => {
  it("starts a session and exposes its state", async () => {
    const { result } = renderHook(() => useReplay(baseOptions));

    await act(() => result.current.start());

    expect(mockedCreate).toHaveBeenCalledWith("BTCUSDT", "1m", "2025-06-15", "2025-06-15");
    expect(result.current.sessionId).toBe("abc");
    expect(result.current.state).toEqual(replayState());
    expect(result.current.error).toBeNull();
  });

  it("does not restart when nothing is active", async () => {
    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useReplay({ ...baseOptions, symbol }),
      { initialProps: { symbol: "BTCUSDT" } },
    );

    await act(() => result.current.restart({ symbol: "ETHUSDT" }));

    expect(mockedCreate).not.toHaveBeenCalled();

    rerender({ symbol: "ETHUSDT" });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("restarts the active session with the new symbol", async () => {
    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useReplay({ ...baseOptions, symbol }),
      { initialProps: { symbol: "BTCUSDT" } },
    );

    await act(() => result.current.start());
    mockedCreate.mockClear();
    mockedCreate.mockResolvedValue({
      status: "success",
      sessionId: "def",
      state: replayState({ symbol: "ETHUSDT" }),
    });

    rerender({ symbol: "ETHUSDT" });
    await act(() => result.current.restart({ symbol: "ETHUSDT" }));

    await waitFor(() => expect(result.current.sessionId).toBe("def"));
    expect(mockedCreate).toHaveBeenCalledWith("ETHUSDT", "1m", "2025-06-15", "2025-06-15");
  });

  it("reports creation errors and keeps the old session", async () => {
    const { result } = renderHook(() => useReplay(baseOptions));

    mockedCreate.mockResolvedValueOnce({
      status: "error",
      message: "Invalid or missing symbol.",
    });

    await act(() => result.current.start());

    expect(result.current.sessionId).toBeNull();
    expect(result.current.error).toBe("Invalid or missing symbol.");
  });

  it("forwards playback controls to the active session", async () => {
    const { result } = renderHook(() => useReplay(baseOptions));

    await act(() => result.current.start());
    mockedControl.mockResolvedValue({ status: "success", state: replayState({ status: "playing" }) });

    await act(() => result.current.play());

    expect(mockedControl).toHaveBeenCalledWith("abc", "play");
    expect(result.current.state?.status).toBe("playing");
  });
});
