import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PaperPosition } from "@htr-trading-simulator/shared";
import PositionsTable from "../src/features/trading/PositionsTable";

function position(overrides: Partial<PaperPosition> = {}): PaperPosition {
  return {
    id: "pos-1",
    symbol: "BTCUSDT",
    direction: "long",
    size: 0.5,
    entryPrice: 100,
    openedAtReplayTime: 1_000,
    stopLoss: null,
    takeProfit: null,
    ...overrides,
  };
}

const noop = () => undefined;

describe("PositionsTable", () => {
  it("shows the empty placeholder without positions", () => {
    render(
      <PositionsTable
        positions={[]}
        currentPrice={null}
        onClosePosition={noop}
        onSetProtectiveLevels={noop}
      />,
    );

    expect(screen.getByText("No positions")).toBeInTheDocument();
  });

  it("renders a position with live PnL and SL/TP placeholders", () => {
    render(
      <PositionsTable
        positions={[position()]}
        currentPrice={104}
        onClosePosition={noop}
        onSetProtectiveLevels={noop}
      />,
    );

    const row = screen.getByTestId("position-row-pos-1");
    expect(row).toHaveTextContent("BTCUSDT");
    expect(row).toHaveTextContent("2.00"); // (104 - 100) * 0.5
    expect(screen.getByTestId("sltp-values-pos-1")).toHaveTextContent("— / —");
  });

  it("opens the editor, saves levels and closes it", async () => {
    const onSetProtectiveLevels = vi.fn();

    render(
      <PositionsTable
        positions={[position()]}
        currentPrice={100}
        onClosePosition={noop}
        onSetProtectiveLevels={onSetProtectiveLevels}
      />,
    );

    expect(screen.queryByTestId("sltp-editor-pos-1")).toBeNull();

    fireEvent.click(screen.getByTestId("sltp-edit-pos-1"));
    expect(screen.getByTestId("sltp-editor-pos-1")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("sltp-stop-loss-pos-1"), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByTestId("sltp-take-profit-pos-1"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByTestId("sltp-save-pos-1"));

    expect(onSetProtectiveLevels).toHaveBeenCalledWith("pos-1", {
      stopLoss: 95,
      takeProfit: 120,
    });
    expect(screen.queryByTestId("sltp-editor-pos-1")).toBeNull();
  });

  it("sends null for emptied inputs so levels get cleared", () => {
    const onSetProtectiveLevels = vi.fn();

    render(
      <PositionsTable
        positions={[position({ stopLoss: 95, takeProfit: 120 })]}
        currentPrice={100}
        onClosePosition={noop}
        onSetProtectiveLevels={onSetProtectiveLevels}
      />,
    );

    fireEvent.click(screen.getByTestId("sltp-edit-pos-1"));
    fireEvent.change(screen.getByTestId("sltp-take-profit-pos-1"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByTestId("sltp-save-pos-1"));

    expect(onSetProtectiveLevels).toHaveBeenCalledWith("pos-1", {
      stopLoss: 95,
      takeProfit: null,
    });
  });

  it("disables saving when a level is not a positive number", () => {
    render(
      <PositionsTable
        positions={[position()]}
        currentPrice={100}
        onClosePosition={noop}
        onSetProtectiveLevels={noop}
      />,
    );

    fireEvent.click(screen.getByTestId("sltp-edit-pos-1"));
    fireEvent.change(screen.getByTestId("sltp-stop-loss-pos-1"), {
      target: { value: "-1" },
    });

    expect(screen.getByTestId("sltp-save-pos-1")).toBeDisabled();
  });

  it("calls the close handler", () => {
    const onClosePosition = vi.fn();

    render(
      <PositionsTable
        positions={[position()]}
        currentPrice={100}
        onClosePosition={onClosePosition}
        onSetProtectiveLevels={noop}
      />,
    );

    fireEvent.click(screen.getByTestId("close-position-pos-1"));

    expect(onClosePosition).toHaveBeenCalledWith("pos-1");
  });
});
