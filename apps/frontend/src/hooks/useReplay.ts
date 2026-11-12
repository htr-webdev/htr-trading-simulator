import { useCallback, useEffect, useRef, useState } from "react";
import { REPLAY_SPEEDS, type ReplayState, type ReplaySpeed } from "@htr-trading-simulator/shared";
import {
  controlReplay,
  createReplaySession,
  fetchReplayState,
  setReplaySpeed,
} from "../services/replay-service";

/** Poll interval for replay state updates while the session plays. */
const PLAY_POLL_MS = 1000;

interface UseReplayOptions {
  symbol: string;
  interval: string;
  /** UTC date range in YYYY-MM-DD. */
  startDate: string;
  endDate: string;
}

export interface UseReplayResult {
  sessionId: string | null;
  state: ReplayState | null;
  error: string | null;
  isBusy: boolean;
  speeds: readonly ReplaySpeed[];
  start: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  step: () => Promise<void>;
  changeSpeed: (speed: ReplaySpeed) => Promise<void>;
}

/**
 * Owns the replay session lifecycle: creating a session, the
 * playback controls, and polling the state while playing so the
 * replay clock moves even between user actions.
 */
export function useReplay({
  symbol,
  interval,
  startDate,
  endDate,
}: UseReplayOptions): UseReplayResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<ReplayState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Keep the create-session inputs in a ref so polling does not
  // restart when they change mid-session.
  const inputsRef = useRef({ symbol, interval, startDate, endDate });

  useEffect(() => {
    inputsRef.current = { symbol, interval, startDate, endDate };
  }, [symbol, interval, startDate, endDate]);

  const applyResult = useCallback((result: { status: string; message?: string }) => {
    if (result.status === "error") {
      setError(result.message ?? "Unknown replay error.");
    } else {
      setError(null);
    }
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsBusy(true);

      try {
        await action();
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  const start = useCallback(() => {
    const inputs = inputsRef.current;

    return run(async () => {
      const result = await createReplaySession(
        inputs.symbol,
        inputs.interval,
        inputs.startDate,
        inputs.endDate,
      );

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setError(null);
      setSessionId(result.sessionId);
      setState(result.state);
    });
  }, [run]);

  const play = useCallback(() => {
    return run(async () => {
      if (!sessionId) {
        return;
      }

      const result = await controlReplay(sessionId, "play");

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setState(result.state);
      setError(null);
    });
  }, [run, sessionId]);

  const pause = useCallback(() => {
    return run(async () => {
      if (!sessionId) {
        return;
      }

      const result = await controlReplay(sessionId, "pause");

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setState(result.state);
      setError(null);
    });
  }, [run, sessionId]);

  const step = useCallback(() => {
    return run(async () => {
      if (!sessionId) {
        return;
      }

      const result = await controlReplay(sessionId, "step");

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setState(result.state);
      setError(null);
    });
  }, [run, sessionId]);

  const changeSpeed = useCallback(
    (speed: ReplaySpeed) => {
      return run(async () => {
        if (!sessionId) {
          return;
        }

        const result = await setReplaySpeed(sessionId, speed);

        if (result.status === "error") {
          setError(result.message);
          return;
        }

        setState(result.state);
        setError(null);
      });
    },
    [run, sessionId],
  );

  // Poll the backend while playing so the replay clock advances even
  // without user interaction. applyResult on poll failures reports
  // connection problems without touching the last known state.
  const pollRef = useRef(applyResult);

  useEffect(() => {
    pollRef.current = applyResult;
  }, [applyResult]);

  useEffect(() => {
    if (!sessionId || state?.status !== "playing") {
      return;
    }

    const timer = setInterval(() => {
      fetchReplayState(sessionId).then((result) => {
        if (result.status === "error") {
          pollRef.current(result);
          return;
        }

        setError(null);
        setState(result.state);
      });
    }, PLAY_POLL_MS);

    return () => clearInterval(timer);
  }, [sessionId, state?.status]);

  return {
    sessionId,
    state,
    error,
    isBusy,
    speeds: REPLAY_SPEEDS,
    start,
    play,
    pause,
    step,
    changeSpeed,
  };
}
