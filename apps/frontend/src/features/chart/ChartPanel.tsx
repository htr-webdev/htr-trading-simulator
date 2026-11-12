import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { CHART_THEME } from "./chart-theme";

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type ChartState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; candles: ChartCandle[] };

interface ChartPanelProps {
  state: ChartState;
  /** Shown in the chart header, e.g. "BTCUSDT — M1". */
  label?: string;
}

const CHART_OPTIONS = {
  ...CHART_THEME,
  autoSize: true,
  timeScale: {
    ...CHART_THEME.timeScale,
    timeVisible: true,
    secondsVisible: false,
  },
};

function stateOverlay(state: ChartState) {
  if (state.status === "loading") {
    return <span className="text-xs text-terminal-muted">Loading candles…</span>;
  }

  if (state.status === "empty") {
    return (
      <span className="text-xs text-terminal-muted">
        No local data yet — download candles with the CLI first.
      </span>
    );
  }

  if (state.status === "error") {
    return <span className="text-xs text-terminal-down">{state.message}</span>;
  }

  return null;
}

/**
 * Central chart area: renders the candlestick chart from the given
 * candles, with loading, empty and error overlays for every other
 * data state.
 */
function ChartPanel({ state, label }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, CHART_OPTIONS);
    const series = chart.addSeries(CandlestickSeries, CHART_THEME.candlestick);

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;

    if (!series || state.status !== "ready") {
      return;
    }

    const data: CandlestickData<Time>[] = state.candles.map((candle) => ({
      time: (candle.time / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    series.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [state]);

  return (
    <section
      data-testid="chart-panel"
      className="relative flex min-h-0 flex-1 flex-col bg-terminal-bg"
    >
      {label && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center px-3 py-1.5">
          <span
            data-testid="chart-label"
            className="text-xs font-semibold text-terminal-text"
          >
            {label}
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        data-testid="chart-container"
        className="min-h-0 w-full flex-1"
      />

      {state.status !== "ready" && (
        <div
          data-testid="chart-overlay"
          className="absolute inset-0 flex items-center justify-center bg-terminal-bg/80"
        >
          {stateOverlay(state)}
        </div>
      )}
    </section>
  );
}

export default ChartPanel;
