import { useEffect, useState } from "react";
import type { ReplayState } from "@htr-trading-simulator/shared";
import { fetchReplayCandles } from "../services/replay-service";
import type { ChartState } from "../features/chart/ChartPanel";

interface CandleSnapshot {
  sessionId: string;
  /** Replay clock position the candles were fetched for. */
  fetchedTime: number;
  chart: ChartState;
}

/**
 * Loads the candles revealed by a replay session and refreshes them
 * whenever the replay clock moves, so the chart reveals candles
 * progressively while never showing future data.
 *
 * While the session is playing, the clock advances between polls and
 * each poll triggers one fetch; paused and ended sessions only
 * refetch when the clock actually changed. A snapshot from another
 * session renders as loading until the first candles arrive.
 */
export function useReplayCandles(
  sessionId: string | null,
  state: ReplayState | null,
): ChartState {
  const [snapshot, setSnapshot] = useState<CandleSnapshot | null>(null);

  useEffect(() => {
    if (
      !sessionId ||
      !state ||
      (snapshot !== null &&
        snapshot.sessionId === sessionId &&
        snapshot.fetchedTime === state.currentTime)
    ) {
      return;
    }

    let cancelled = false;

    fetchReplayCandles(sessionId).then((result) => {
      if (cancelled) {
        return;
      }

      let chart: ChartState;

      if (result.status === "error") {
        chart = { status: "error", message: result.message };
      } else if (result.candles.length === 0) {
        chart = { status: "empty" };
      } else {
        chart = { status: "ready", candles: result.candles };
      }

      setSnapshot({ sessionId, fetchedTime: state.currentTime, chart });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, state, snapshot]);

  if (!sessionId || snapshot === null || snapshot.sessionId !== sessionId) {
    return { status: "loading" };
  }

  return snapshot.chart;
}
