import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReplayState } from "@htr-trading-simulator/shared";
import type { UseReplayResult } from "../src/hooks/useReplay";
import ReplayControls from "../src/features/replay/ReplayControls";

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

function makeReplay(overrides: Partial<UseReplayResult> = {}): UseReplayResult {
  const noop = () => Promise.resolve();

  return {
    sessionId: null,
    state: null,
    error: null,
    isBusy: false,
    speeds: [0.25, 0.5, 1, 2, 4, 10],
    start: noop,
    restart: () => Promise.resolve(),
    play: noop,
    pause: noop,
    step: noop,
    changeSpeed: noop,
    ...overrides,
  };
}

describe("ReplayControls", () => {
  it("shows only the start button before a session exists", () => {
    render(<ReplayControls replay={makeReplay()} interval="1m" />);

    expect(screen.getByTestId("replay-start")).toBeInTheDocument();
    expect(screen.queryByTestId("replay-play")).toBeNull();
    expect(screen.queryByTestId("replay-clock")).toBeNull();
  });

  it("shows play, step and speed buttons while paused", () => {
    const replay = makeReplay({
      sessionId: "abc",
      state: replayState(),
    });

    render(<ReplayControls replay={replay} interval="1m" />);

    expect(screen.getByTestId("replay-play")).toBeInTheDocument();
    expect(screen.getByTestId("replay-step")).toBeInTheDocument();
    expect(screen.getByTestId("replay-speed-2")).toBeInTheDocument();
    expect(screen.getByTestId("replay-speed-2")).toHaveTextContent("2x");
    expect(screen.queryByTestId("replay-start")).toBeNull();
  });

  it("calls play when paused", async () => {
    const play = vi.fn(() => Promise.resolve());
    const replay = makeReplay({ sessionId: "abc", state: replayState(), play });

    render(<ReplayControls replay={replay} interval="1m" />);

    fireEvent.click(screen.getByTestId("replay-play"));

    await waitFor(() => expect(play).toHaveBeenCalled());
  });

  it("calls pause while playing and disables stepping", () => {
    const pause = vi.fn(() => Promise.resolve());
    const step = vi.fn(() => Promise.resolve());
    const replay = makeReplay({
      sessionId: "abc",
      state: replayState({ status: "playing" }),
      pause,
      step,
    });

    render(<ReplayControls replay={replay} interval="1m" />);

    expect(screen.getByTestId("replay-pause")).toBeInTheDocument();
    expect(screen.getByTestId("replay-step")).toBeDisabled();

    fireEvent.click(screen.getByTestId("replay-pause"));

    expect(pause).toHaveBeenCalled();
    expect(step).not.toHaveBeenCalled();
  });

  it("calls changeSpeed with the selected speed", async () => {
    const changeSpeed = vi.fn(() => Promise.resolve());
    const replay = makeReplay({ sessionId: "abc", state: replayState(), changeSpeed });

    render(<ReplayControls replay={replay} interval="1m" />);

    fireEvent.click(screen.getByTestId("replay-speed-4"));

    await waitFor(() => expect(changeSpeed).toHaveBeenCalledWith(4));
  });

  it("marks the active speed", () => {
    const replay = makeReplay({ sessionId: "abc", state: replayState({ speed: 0.25 }) });

    render(<ReplayControls replay={replay} interval="1m" />);

    expect(screen.getByTestId("replay-speed-0.25")).toBeInTheDocument();
    expect(screen.getByTestId("replay-speed-10")).toBeInTheDocument();
  });

  it("shows the ended state and hides playback controls", () => {
    const replay = makeReplay({
      sessionId: "abc",
      state: replayState({ status: "ended", currentTime: 2_000 }),
    });

    render(<ReplayControls replay={replay} interval="1m" />);

    expect(screen.getByTestId("replay-ended")).toBeInTheDocument();
    expect(screen.queryByTestId("replay-play")).toBeNull();
    expect(screen.queryByTestId("replay-step")).toBeNull();
    expect(screen.getByTestId("replay-clock")).toBeInTheDocument();
  });

  it("shows the replay clock and errors", () => {
    const replay = makeReplay({
      sessionId: "abc",
      state: replayState({ currentTime: Date.parse("2025-10-01T05:30:00Z") }),
      error: "Cannot reach the API server. Is the backend running?",
    });

    render(<ReplayControls replay={replay} interval="1m" />);

    expect(screen.getByTestId("replay-clock")).toHaveTextContent("2025-10-01 05:30 UTC");
    expect(screen.getByTestId("replay-error")).toBeInTheDocument();
  });
});
