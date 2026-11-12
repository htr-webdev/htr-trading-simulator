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

import ChartPanel, {
  type ChartState,
} from "../src/features/chart/ChartPanel";
import { CHART_THEME } from "../src/features/chart/chart-theme";

const READY_STATE: ChartState = {
  status: "ready",
  candles: [
    { time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 },
    { time: 2_000, open: 1.5, high: 2.5, low: 1, close: 2 },
  ],
};

describe("ChartPanel", () => {
  it("renders the chart container without an overlay when ready", () => {
    render(<ChartPanel state={READY_STATE} />);

    expect(screen.getByTestId("chart-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-overlay")).toBeNull();
  });

  it("shows the active symbol and interval label when given", () => {
    render(<ChartPanel state={READY_STATE} label="BTCUSDT — M1" />);

    expect(screen.getByTestId("chart-label")).toHaveTextContent("BTCUSDT — M1");
  });

  it("hides the chart label when not given", () => {
    render(<ChartPanel state={READY_STATE} />);

    expect(screen.queryByTestId("chart-label")).toBeNull();
  });

  it("creates the chart, feeds candles and cleans up on unmount", () => {
    const { unmount } = render(<ChartPanel state={READY_STATE} />);

    expect(setData).toHaveBeenCalledWith([
      { time: 1, open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: 2, open: 1.5, high: 2.5, low: 1, close: 2 },
    ]);
    expect(fitContent).toHaveBeenCalled();

    unmount();

    expect(remove).toHaveBeenCalled();
  });

  it("shows a loading overlay while candles load", () => {
    render(<ChartPanel state={{ status: "loading" }} />);

    expect(screen.getByTestId("chart-overlay")).toBeInTheDocument();
    expect(screen.getByText("Loading candles…")).toBeInTheDocument();
  });

  it("shows an empty overlay when no local data exists", () => {
    render(<ChartPanel state={{ status: "empty" }} />);

    expect(screen.getByTestId("chart-overlay")).toBeInTheDocument();
    expect(
      screen.getByText("No local data yet — download candles with the CLI first."),
    ).toBeInTheDocument();
  });

  it("shows an error overlay with the failure message", () => {
    render(
      <ChartPanel
        state={{ status: "error", message: "Cannot reach the API server." }}
      />,
    );

    expect(screen.getByTestId("chart-overlay")).toBeInTheDocument();
    expect(screen.getByText("Cannot reach the API server.")).toBeInTheDocument();
  });

  it("does not feed data to the chart outside the ready state", () => {
    setData.mockClear();

    render(<ChartPanel state={{ status: "loading" }} />);

    expect(setData).not.toHaveBeenCalled();
  });

  it("uses the terminal palette for the chart theme", () => {
    expect(CHART_THEME.candlestick.upColor).toBe("#26a69a");
    expect(CHART_THEME.candlestick.downColor).toBe("#ef5350");
    expect(CHART_THEME.layout.background.color).toBe("#0b0e14");
  });

  it("pins explicit zoom and scroll behavior", () => {
    expect(CHART_THEME.handleScale.mouseWheel).toBe(true);
    expect(CHART_THEME.handleScale.pinch).toBe(true);
    expect(CHART_THEME.handleScroll.horzTouchDrag).toBe(true);
    expect(CHART_THEME.handleScroll.vertTouchDrag).toBe(false);
  });
});
