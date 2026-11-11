import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TerminalPanel from "../src/features/trading/TerminalPanel";

describe("TerminalPanel", () => {
  it("renders the empty positions table with its columns", () => {
    render(<TerminalPanel />);

    expect(screen.getByTestId("positions-table")).toBeInTheDocument();

    for (const header of ["Symbol", "Volume", "Entry", "Current", "P/L", "Close"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }

    expect(screen.getByText("No positions")).toBeInTheDocument();
  });

  it("renders disabled buy and sell buttons with active symbol prices", () => {
    render(<TerminalPanel />);

    const buy = screen.getByTestId("buy-button");
    const sell = screen.getByTestId("sell-button");

    expect(buy).toBeDisabled();
    expect(sell).toBeDisabled();
    expect(buy).toHaveTextContent("105,425.93");
    expect(sell).toHaveTextContent("105,414.63");
  });

  it("renders order buttons without prices when no symbols exist", () => {
    render(<TerminalPanel symbols={[]} />);

    expect(screen.getByTestId("buy-button")).toHaveTextContent("—");
    expect(screen.getByTestId("sell-button")).toHaveTextContent("—");
  });
});
