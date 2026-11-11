import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/app/App";

function setViewportWidth(width: number): void {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);

  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App (desktop)", () => {
  it("renders the desktop panels on wide screens", () => {
    setViewportWidth(1440);
    render(<App />);

    expect(screen.getByTestId("toolbar-panel")).toBeInTheDocument();
    expect(screen.getByTestId("market-watch-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chart-panel")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-top-bar")).toBeNull();
  });
});

describe("App (mobile)", () => {
  it("renders the mobile layout on narrow screens", () => {
    setViewportWidth(640);
    render(<App />);

    expect(screen.getByTestId("mobile-top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("symbol-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-order-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("market-watch-panel")).toBeNull();
    expect(screen.queryByTestId("toolbar-panel")).toBeNull();
  });

  it("keeps the symbol list hidden until the dropdown opens", () => {
    setViewportWidth(640);
    render(<App />);

    expect(screen.queryByTestId("symbol-menu")).toBeNull();

    fireEvent.click(screen.getByTestId("symbol-dropdown"));

    expect(screen.getByTestId("symbol-menu")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("selects a symbol from the dropdown menu", () => {
    setViewportWidth(640);
    render(<App />);

    fireEvent.click(screen.getByTestId("symbol-dropdown"));
    fireEvent.click(screen.getByTestId("symbol-option-ETHUSDT"));

    expect(screen.queryByTestId("symbol-menu")).toBeNull();
    expect(screen.getByTestId("symbol-dropdown")).toHaveTextContent("ETHUSDT");
  });

  it("keeps the terminal section hidden until toggled", () => {
    setViewportWidth(640);
    render(<App />);

    expect(screen.queryByTestId("positions-table")).toBeNull();

    fireEvent.click(screen.getByTestId("terminal-toggle"));

    expect(screen.getByTestId("positions-table")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("terminal-toggle"));

    expect(screen.queryByTestId("positions-table")).toBeNull();
  });

  it("renders full-width order buttons with the active symbol prices", () => {
    setViewportWidth(640);
    render(<App />);

    expect(screen.getByTestId("mobile-sell-button")).toBeDisabled();
    expect(screen.getByTestId("mobile-buy-button")).toBeDisabled();
    expect(screen.getByTestId("mobile-buy-button")).toHaveTextContent("105,425.93");
  });
});
