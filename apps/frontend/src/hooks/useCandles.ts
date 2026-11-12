import { useEffect, useState } from "react";
import {
  fetchCandles,
  type CandleFetchResult,
  type ChartInterval,
} from "../services/candles-service";
import type { ChartState } from "../features/chart/ChartPanel";

interface UseCandlesOptions {
  symbol: string;
  interval: ChartInterval;
  /** UTC date range in YYYY-MM-DD. */
  startDate: string;
  endDate: string;
}

/** Initial demo window; replay controls will replace it later. */
export const INITIAL_DATE_RANGE = { startDate: "2025-06-15", endDate: "2025-06-15" };

/**
 * Loads candles from the backend for the given query and exposes the
 * chart state (loading / empty / error / ready).
 *
 * The initial state is "loading"; on query changes the previous
 * candles stay visible while the fresh ones load (no flicker).
 */
export function useCandles({
  symbol,
  interval,
  startDate,
  endDate,
}: UseCandlesOptions): ChartState {
  const [state, setState] = useState<ChartState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchCandles(symbol, interval, startDate, endDate).then(
      (result: CandleFetchResult) => {
        if (cancelled) {
          return;
        }

        if (result.status === "success") {
          setState({ status: "ready", candles: result.candles });
        } else if (result.status === "empty") {
          setState({ status: "empty" });
        } else {
          setState({ status: "error", message: result.message });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [symbol, interval, startDate, endDate]);

  return state;
}
