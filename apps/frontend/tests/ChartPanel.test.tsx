import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IChartApi, ISeriesApi } from "lightweight-charts";

// jsdom has no canvas support, so the chart library is mocked and the
// tests focus on the React wiring: container lifecycle and data updates.
const setData = vi.fn();
const fitContent = vi.fn();
const remove = vi.fn();

vi.mock("lightweight-charts", () => ({
  CandlestickSeries: { type: () => "candlestick" },
  createChart: vi.fn(() => {
    const chart = {
      addSeries: vi.fn(() => ({ setData }) as unknown as ISeriesApi<"Candlestick">),
      timeScale: vi.fn(() => ({ fitContent })),
      remove,
    };

    return chart as unknown as IChartApi;
  }),
}));

import ChartPanel from "../src/features/chart/ChartPanel";
import { CHART_THEME } from "../src/features/chart/chart-theme";

describe("ChartPanel", () => {
  it("renders the chart container", () => {
    render(<ChartPanel />);

    expect(screen.getByTestId("chart-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
  });

  it("creates the chart, feeds candles and cleans up on unmount", () => {
    const candles = [
      { time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: 2_000, open: 1.5, high: 2.5, low: 1, close: 2 },
    ];

    const { unmount } = render(<ChartPanel candles={candles} />);

    expect(setData).toHaveBeenCalledWith([
      { time: 1, open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: 2, open: 1.5, high: 2.5, low: 1, close: 2 },
    ]);
    expect(fitContent).toHaveBeenCalled();

    unmount();

    expect(remove).toHaveBeenCalled();
  });

  it("uses the terminal palette for the chart theme", () => {
    expect(CHART_THEME.candlestick.upColor).toBe("#26a69a");
    expect(CHART_THEME.candlestick.downColor).toBe("#ef5350");
    expect(CHART_THEME.layout.background.color).toBe("#0b0e14");
  });
});
