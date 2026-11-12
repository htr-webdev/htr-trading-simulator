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

interface ChartPanelProps {
  candles?: ChartCandle[];
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

/**
 * Central chart area: renders the candlestick chart from the given
 * candles (demo data until the data-fetch step wires the backend).
 */
function ChartPanel({ candles = DEMO_CANDLES }: ChartPanelProps) {
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

    if (!series) {
      return;
    }

    const data: CandlestickData<Time>[] = candles.map((candle) => ({
      time: (candle.time / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    series.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <section
      data-testid="chart-panel"
      className="flex min-h-0 flex-1 flex-col bg-terminal-bg"
    >
      <div
        ref={containerRef}
        data-testid="chart-container"
        className="min-h-0 w-full flex-1"
      />
    </section>
  );
}

/** Static demo candles proving the render pipeline until real data lands. */
const DEMO_CANDLES: ChartCandle[] = [
  { time: Date.UTC(2025, 5, 16, 0), open: 105000, high: 105500, low: 104800, close: 105300 },
  { time: Date.UTC(2025, 5, 16, 1), open: 105300, high: 105700, low: 105100, close: 105600 },
  { time: Date.UTC(2025, 5, 16, 2), open: 105600, high: 105800, low: 105200, close: 105250 },
  { time: Date.UTC(2025, 5, 16, 3), open: 105250, high: 105650, low: 105150, close: 105550 },
  { time: Date.UTC(2025, 5, 16, 4), open: 105550, high: 105900, low: 105400, close: 105850 },
];

export default ChartPanel;
