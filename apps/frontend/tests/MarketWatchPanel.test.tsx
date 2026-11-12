import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketWatchPanel from "../src/features/market-watch/MarketWatchPanel";
import {
  formatChange,
  formatPrice,
  INITIAL_MARKET_WATCH_SYMBOLS,
} from "../src/features/market-watch/market-watch-model";

describe("MarketWatchPanel", () => {
  it("renders the default symbol rows", () => {
    render(<MarketWatchPanel />);

    expect(screen.getByTestId("market-watch-table")).toBeInTheDocument();

    for (const { symbol } of INITIAL_MARKET_WATCH_SYMBOLS) {
      expect(
        screen.getByTestId(`market-watch-row-${symbol}`),
      ).toBeInTheDocument();
    }
  });

  it("renders an empty panel when no symbols are given", () => {
    render(<MarketWatchPanel symbols={[]} />);

    expect(screen.getByTestId("market-watch-table")).toBeInTheDocument();
    expect(screen.queryByTestId("market-watch-row-BTCUSDT")).toBeNull();
  });

  it("colors positive changes green and negative changes red", () => {
    render(<MarketWatchPanel />);

    const upCell = screen.getByText("+0.43%");
    expect(upCell).toHaveClass("text-terminal-up");
    expect(upCell).not.toHaveClass("text-terminal-down");

    const downCell = screen.getByText("-0.61%");
    expect(downCell).toHaveClass("text-terminal-down");
    expect(downCell).not.toHaveClass("text-terminal-up");
  });

  it("marks the active symbol row as selected", () => {
    render(<MarketWatchPanel activeSymbol="ETHUSDT" />);

    expect(screen.getByTestId("market-watch-row-ETHUSDT")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("market-watch-row-BTCUSDT")).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByTestId("market-watch-row-ETHUSDT")).toHaveClass(
      "bg-terminal-panel-alt",
    );
  });

  it("reports symbol selection when a row is clicked", () => {
    const onSymbolSelect = vi.fn();

    render(<MarketWatchPanel activeSymbol="BTCUSDT" onSymbolSelect={onSymbolSelect} />);

    fireEvent.click(screen.getByTestId("market-watch-row-SOLUSDT"));

    expect(onSymbolSelect).toHaveBeenCalledWith("SOLUSDT");
  });
});

describe("formatPrice", () => {
  it("formats large prices with two decimals", () => {
    expect(formatPrice(105414.63)).toBe("105,414.63");
  });

  it("keeps four decimals for small prices", () => {
    expect(formatPrice(2.3841)).toBe("2.3841");
  });
});

describe("formatChange", () => {
  it("adds an explicit plus for gains", () => {
    expect(formatChange(3.98)).toBe("+3.98");
  });

  it("adds an explicit minus for losses", () => {
    expect(formatChange(-0.0192)).toBe("-0.0192");
  });
});
