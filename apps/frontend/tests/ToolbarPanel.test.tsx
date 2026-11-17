import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToolbarPanel from "../src/components/layout/ToolbarPanel";
import { CHART_INTERVALS, type ChartInterval } from "../src/components/layout/chart-intervals";

const INTERVAL_LABELS: Record<ChartInterval, string> = {
  "1m": "M1",
  "5m": "M5",
  "15m": "M15",
  "1h": "H1",
  "4h": "H4",
  "1d": "D1",
};

describe("ToolbarPanel", () => {
  it("renders every chart interval button", () => {
    render(<ToolbarPanel />);

    for (const interval of CHART_INTERVALS) {
      expect(
        screen.getByRole("button", { name: INTERVAL_LABELS[interval] }),
      ).toBeInTheDocument();
    }
  });

  it("marks the M1 interval as pressed by default", () => {
    render(<ToolbarPanel />);

    expect(screen.getByRole("button", { name: "M1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "H1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("moves the selection when an interval is clicked", () => {
    const onIntervalChange = vi.fn();

    render(<ToolbarPanel onIntervalChange={onIntervalChange} />);

    fireEvent.click(screen.getByRole("button", { name: "H4" }));

    expect(onIntervalChange).toHaveBeenCalledWith("4h");
  });

  it("keeps the settings placeholder disabled", () => {
    render(<ToolbarPanel />);

    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
  });

  it("renders every drawing tool", () => {
    render(<ToolbarPanel />);

    expect(screen.getByTestId("drawing-tools")).toBeInTheDocument();
    expect(screen.getByTestId("drawing-tool-trend")).toBeInTheDocument();
    expect(screen.getByTestId("drawing-tool-horizontal")).toBeInTheDocument();
    expect(screen.getByTestId("drawing-tool-vertical")).toBeInTheDocument();
    expect(screen.getByTestId("drawing-tool-rectangle")).toBeInTheDocument();
    expect(screen.getByTestId("drawing-tool-select")).toBeInTheDocument();
  });

  it("no drawing tool is active by default", () => {
    render(<ToolbarPanel />);

    for (const testid of [
      "drawing-tool-trend",
      "drawing-tool-horizontal",
      "drawing-tool-vertical",
      "drawing-tool-rectangle",
      "drawing-tool-select",
    ]) {
      expect(screen.getByTestId(testid)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("toggles a drawing tool on and off via the parent state", () => {
    const onDrawingToolChange = vi.fn();

    const { rerender } = render(
      <ToolbarPanel onDrawingToolChange={onDrawingToolChange} />,
    );

    fireEvent.click(screen.getByTestId("drawing-tool-trend"));

    expect(onDrawingToolChange).toHaveBeenCalledWith("trend");

    // The parent applies the change; clicking the now-active tool releases it.
    rerender(<ToolbarPanel drawingTool="trend" onDrawingToolChange={onDrawingToolChange} />);
    fireEvent.click(screen.getByTestId("drawing-tool-trend"));

    expect(onDrawingToolChange).toHaveBeenCalledWith(null);
  });

  it("marks the tool passed from the parent as active", () => {
    render(<ToolbarPanel drawingTool="horizontal" />);

    expect(screen.getByTestId("drawing-tool-horizontal")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("drawing-tool-trend")).toHaveAttribute("aria-pressed", "false");
  });
});
