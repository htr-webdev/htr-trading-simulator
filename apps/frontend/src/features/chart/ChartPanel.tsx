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
import ChartDrawingOverlay from "./ChartDrawingOverlay";
import type { ChartDrawing, DrawingTool } from "./drawings-model";

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
  /** Drawings for the current symbol + timeframe. */
  drawings?: ChartDrawing[];
  /** Active drawing tool; null disables drawing interactions. */
  drawingTool?: DrawingTool | null;
  selectedDrawingId?: string | null;
  onDrawingAdd?: (type: Exclude<DrawingTool, "select">, points: ChartDrawing["points"]) => void;
  onDrawingSelect?: (id: string | null) => void;
  onDrawingDelete?: (id: string) => void;
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
function ChartPanel({
  state,
  label,
  drawings = [],
  drawingTool = null,
  selectedDrawingId = null,
  onDrawingAdd,
  onDrawingSelect,
  onDrawingDelete,
}: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastFirstTimeRef = useRef<Time | undefined>(undefined);

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

    // Fit the viewport only when the dataset origin changes (new
    // session, symbol or interval). Appended candles must keep the
    // user's manual zoom and pan untouched.
    const firstTime = data[0]?.time;
    const isFirstTimeKnown = firstTime !== undefined && firstTime !== lastFirstTimeRef.current;

    if (isFirstTimeKnown) {
      lastFirstTimeRef.current = firstTime;
      chartRef.current?.timeScale().fitContent();
    }
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
        className="relative min-h-0 w-full flex-1"
      >
        {state.status === "ready" && onDrawingAdd && onDrawingSelect && onDrawingDelete && (
          <ChartDrawingOverlay
            chartRef={chartRef}
            seriesRef={seriesRef}
            drawings={drawings}
            activeTool={drawingTool}
            selectedId={selectedDrawingId}
            onDrawingAdd={onDrawingAdd}
            onDrawingSelect={onDrawingSelect}
            onDrawingDelete={onDrawingDelete}
          />
        )}
      </div>

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
