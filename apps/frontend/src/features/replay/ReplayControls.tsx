import type { ReplayState, ReplaySpeed } from "@htr-trading-simulator/shared";
import type { UseReplayResult } from "../../hooks/useReplay";

function formatReplayTime(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

interface ReplayControlsProps {
  replay: UseReplayResult;
  /** Session interval, shown next to the controls, e.g. "1m". */
  interval: string;
}

/**
 * Playback bar for historical replay: session start, play/pause,
 * single-candle step, playback speed buttons and the replay clock.
 * All actions are disabled until a session is started, and controls
 * become inert once the session has ended.
 */
function ReplayControls({ replay, interval }: ReplayControlsProps) {
  const state: ReplayState | null = replay.state;
  const hasSession = replay.sessionId !== null;
  const isEnded = state?.status === "ended";
  const isPlaying = state?.status === "playing";

  return (
    <div
      data-testid="replay-controls"
      className="flex items-center gap-2 border-b border-terminal-border bg-terminal-panel px-3 py-1.5"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-terminal-muted">
        Replay
      </span>

      {!hasSession && (
        <button
          type="button"
          data-testid="replay-start"
          onClick={() => void replay.start()}
          disabled={replay.isBusy}
          className="rounded border border-terminal-border px-2 py-0.5 text-xs text-terminal-text hover:bg-terminal-border/40 disabled:opacity-50"
        >
          Start
        </button>
      )}

      {hasSession && !isEnded && (
        <>
          <button
            type="button"
            data-testid={isPlaying ? "replay-pause" : "replay-play"}
            onClick={() => void (isPlaying ? replay.pause() : replay.play())}
            disabled={replay.isBusy}
            className="rounded border border-terminal-border px-2 py-0.5 text-xs text-terminal-text hover:bg-terminal-border/40 disabled:opacity-50"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            data-testid="replay-step"
            onClick={() => void replay.step()}
            disabled={replay.isBusy || isPlaying}
            className="rounded border border-terminal-border px-2 py-0.5 text-xs text-terminal-text hover:bg-terminal-border/40 disabled:opacity-50"
          >
            Step +1
          </button>

          <div className="ml-1 flex items-center gap-1" data-testid="replay-speeds">
            {replay.speeds.map((speed: ReplaySpeed) => (
              <button
                key={speed}
                type="button"
                data-testid={`replay-speed-${speed}`}
                onClick={() => void replay.changeSpeed(speed)}
                disabled={replay.isBusy}
                className={`rounded border px-1.5 py-0.5 text-xs disabled:opacity-50 ${
                  state?.speed === speed
                    ? "border-terminal-text text-terminal-text"
                    : "border-terminal-border text-terminal-muted hover:bg-terminal-border/40"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </>
      )}

      {isEnded && (
        <span data-testid="replay-ended" className="text-xs text-terminal-muted">
          Session ended
        </span>
      )}

      {state && (
        <span data-testid="replay-clock" className="ml-auto font-mono text-xs text-terminal-text">
          {formatReplayTime(state.currentTime)} · {interval}
        </span>
      )}

      {replay.error && (
        <span data-testid="replay-error" className="text-xs text-terminal-down">
          {replay.error}
        </span>
      )}
    </div>
  );
}

export default ReplayControls;
