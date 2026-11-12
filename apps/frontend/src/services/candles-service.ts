import type { ChartCandle } from "../features/chart/ChartPanel";

/** Base URL of the backend API (overridable via Vite env var). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3000";

export const CHART_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number];

export type CandleFetchResult =
  | { status: "success"; candles: ChartCandle[] }
  | { status: "empty" }
  | { status: "error"; message: string };

interface CandleApiItem {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Fetches historical candles from the backend API for the given
 * symbol, interval and UTC date range (YYYY-MM-DD).
 */
export async function fetchCandles(
  symbol: string,
  interval: ChartInterval,
  startDate: string,
  endDate: string,
): Promise<CandleFetchResult> {
  const params = new URLSearchParams({
    symbol,
    interval,
    start: startDate,
    end: endDate,
  });

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/candles?${params.toString()}`);
  } catch {
    return {
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    };
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const body = (await response.json()) as { error?: string };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the generic status message.
    }

    return { status: "error", message };
  }

  const items = (await response.json()) as CandleApiItem[];

  if (!Array.isArray(items) || items.length === 0) {
    return { status: "empty" };
  }

  return { status: "success", candles: items };
}
