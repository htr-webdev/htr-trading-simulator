import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("TerminalPanel paper trading", () => {
  function makeTrading(overrides = {}) {
    const noop = () => Promise.resolve();

    return {
      account: null,
      error: null,
      isBusy: false,
      submitOrder: noop,
      closePosition: noop,
      ...overrides,
    };
  }

  it("enables the order buttons while a replay session is active", () => {
    render(<TerminalPanel trading={makeTrading()} hasSession />);

    expect(screen.getByTestId("buy-button")).toBeEnabled();
    expect(screen.getByTestId("sell-button")).toBeEnabled();
    expect(screen.getByTestId("order-size-input")).toHaveValue(1);
  });

  it("submits buy and sell orders with the entered size", async () => {
    const submitOrder = vi.fn(() => Promise.resolve(true));
    render(<TerminalPanel trading={makeTrading({ submitOrder })} hasSession />);

    fireEvent.change(screen.getByTestId("order-size-input"), { target: { value: "0.5" } });
    fireEvent.click(screen.getByTestId("buy-button"));
    fireEvent.click(screen.getByTestId("sell-button"));

    expect(submitOrder).toHaveBeenCalledTimes(2);
    expect(submitOrder).toHaveBeenNthCalledWith(1, "long", 0.5);
    expect(submitOrder).toHaveBeenNthCalledWith(2, "short", 0.5);
  });

  it("shows the account summary and open positions", () => {
    render(
      <TerminalPanel
        trading={makeTrading({
          account: {
            markPrice: 101,
            balance: 10_020,
            unrealizedPnl: 2,
            equity: 10_022,
            realizedPnl: 20,
            openPositions: [
              {
                id: "pos-1",
                symbol: "BTCUSDT",
                direction: "long",
                size: 2,
                entryPrice: 100,
                openedAtReplayTime: 1_000,
              },
            ],
            closedTrades: [],
          },
        })}
        hasSession
      />,
    );

    expect(screen.getByTestId("account-summary")).toHaveTextContent("10,020.00");
    expect(screen.getByTestId("account-summary")).toHaveTextContent("10,022.00");
    expect(screen.getByTestId("position-row-pos-1")).toBeInTheDocument();
    expect(screen.getByTestId("close-position-pos-1")).toBeEnabled();
    expect(screen.queryByText("No positions")).not.toBeInTheDocument();
  });

  it("shows trading errors", () => {
    render(
      <TerminalPanel
        trading={makeTrading({ error: "Insufficient balance for this position." })}
        hasSession
      />,
    );

    expect(screen.getByTestId("trading-error")).toHaveTextContent("Insufficient balance");
  });
});
