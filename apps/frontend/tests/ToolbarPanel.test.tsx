import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToolbarPanel from "../src/components/layout/ToolbarPanel";
import {
  CHART_INTERVALS,
  INTERVAL_LABELS,
  type ChartInterval,
} from "../src/components/layout/chart-intervals";

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

  it("keeps placeholder actions disabled", () => {
    render(<ToolbarPanel />);

    expect(screen.getByRole("button", { name: "Drawings" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
  });
});
