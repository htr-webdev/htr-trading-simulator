import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IChartApi, ISeriesApi } from "lightweight-charts";

// jsdom has no canvas support, so the chart library is mocked and the
// tests focus on the React wiring: container lifecycle, data updates
// and the drawing overlay interactions.
const setData = vi.fn();
const fitContent = vi.fn();
const remove = vi.fn();
const subscribeVisibleTimeRangeChange = vi.fn();
const unsubscribeVisibleTimeRangeChange = vi.fn();
// Deterministic pixel mapping for the drawing overlay:
// time 1 -> x 100, time 2 -> x 200; price 100 -> y 50, price 200 -> y 150.
const timeToCoordinate = vi.fn((time: number) => (time === 1 ? 100 : time === 2 ? 200 : null));
const coordinateToTime = vi.fn((x: number) => (x < 150 ? 1 : x <= 300 ? 2 : null));
const priceToCoordinate = vi.fn((price: number) => (price === 100 ? 50 : price === 200 ? 150 : null));
const coordinateToPrice = vi.fn((y: number) => (y < 100 ? 100 : y <= 200 ? 200 : null));

vi.mock("lightweight-charts", () => ({
  CandlestickSeries: { type: () => "candlestick" },
  createChart: vi.fn(() => {
    const chart = {
      addSeries: vi.fn(
        () =>
          ({
            setData,
            priceToCoordinate,
            coordinateToPrice,
          }) as unknown as ISeriesApi<"Candlestick">,
      ),
      timeScale: vi.fn(() => ({
        fitContent,
        subscribeVisibleTimeRangeChange,
        unsubscribeVisibleTimeRangeChange,
        timeToCoordinate,
        coordinateToTime,
      })),
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

describe("ChartPanel drawing overlay", () => {
  function drawingProps() {
    return {
      drawings: [],
      drawingTool: null,
      selectedDrawingId: null,
      onDrawingAdd: vi.fn(),
      onDrawingSelect: vi.fn(),
      onDrawingDelete: vi.fn(),
    };
  }

  function clickCanvas(clientX: number, clientY: number) {
    const canvas = screen.getByTestId("chart-drawing-overlay");

    fireEvent.click(canvas, { clientX, clientY, bubbles: true });
  }

  it("does not render the overlay without drawing handlers", () => {
    render(<ChartPanel state={READY_STATE} />);

    expect(screen.queryByTestId("chart-drawing-overlay")).toBeNull();
  });

  it("renders the overlay over a ready chart", () => {
    render(<ChartPanel state={READY_STATE} {...drawingProps()} />);

    expect(screen.getByTestId("chart-drawing-overlay")).toBeInTheDocument();
  });

  it("captures clicks when a tool is active and adds a horizontal line", () => {
    const { onDrawingAdd } = drawingProps();
    const props = { ...drawingProps(), drawingTool: "horizontal" as const, onDrawingAdd };

    render(<ChartPanel state={READY_STATE} {...props} />);

    clickCanvas(120, 60);

    expect(onDrawingAdd).toHaveBeenCalledWith("horizontal", [{ time: 1, price: 100 }]);
  });

  it("adds a vertical line from one click", () => {
    const { onDrawingAdd } = drawingProps();
    const props = { ...drawingProps(), drawingTool: "vertical" as const, onDrawingAdd };

    render(<ChartPanel state={READY_STATE} {...props} />);

    clickCanvas(200, 120);

    expect(onDrawingAdd).toHaveBeenCalledWith("vertical", [{ time: 2, price: 200 }]);
  });

  it("builds a trend line from two clicks", () => {
    const { onDrawingAdd } = drawingProps();
    const props = { ...drawingProps(), drawingTool: "trend" as const, onDrawingAdd };

    render(<ChartPanel state={READY_STATE} {...props} />);

    clickCanvas(100, 50);
    clickCanvas(200, 150);

    expect(onDrawingAdd).toHaveBeenCalledWith("trend", [
      { time: 1, price: 100 },
      { time: 2, price: 200 },
    ]);
  });

  it("builds a rectangle from two clicks", () => {
    const { onDrawingAdd } = drawingProps();
    const props = { ...drawingProps(), drawingTool: "rectangle" as const, onDrawingAdd };

    render(<ChartPanel state={READY_STATE} {...props} />);

    clickCanvas(100, 50);
    clickCanvas(200, 150);

    expect(onDrawingAdd).toHaveBeenCalledWith("rectangle", [
      { time: 1, price: 100 },
      { time: 2, price: 200 },
    ]);
  });

  it("selects a drawing with the select tool", () => {
    const { onDrawingSelect } = drawingProps();
    const props = {
      ...drawingProps(),
      drawingTool: "select" as const,
      onDrawingSelect,
      drawings: [
        {
          id: "drawing-1",
          type: "horizontal" as const,
          symbol: "BTCUSDT",
          interval: "1m",
          points: [{ time: 1, price: 100 }],
        },
      ],
    };

    render(<ChartPanel state={READY_STATE} {...props} />);

    // y = 60 is 10px from the horizontal line at y = 50 -> no hit.
    clickCanvas(120, 60);
    expect(onDrawingSelect).toHaveBeenLastCalledWith(null);

    // y = 54 is within the 6px threshold -> selects it.
    clickCanvas(120, 54);
    expect(onDrawingSelect).toHaveBeenLastCalledWith("drawing-1");
  });

  it("deletes the selected drawing with the Delete key", () => {
    const { onDrawingDelete } = drawingProps();
    const props = { ...drawingProps(), selectedDrawingId: "drawing-1", onDrawingDelete };

    render(<ChartPanel state={READY_STATE} {...props} />);

    fireEvent.keyDown(window, { key: "Delete" });

    expect(onDrawingDelete).toHaveBeenCalledWith("drawing-1");
  });
});
