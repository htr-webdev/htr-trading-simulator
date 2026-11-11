import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/app/App";

describe("App", () => {
  it("renders all four terminal panels", () => {
    render(<App />);

    expect(screen.getByTestId("toolbar-panel")).toBeInTheDocument();
    expect(screen.getByTestId("market-watch-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chart-panel")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
    expect(screen.getByText("Market Watch")).toBeInTheDocument();
    expect(screen.getByText("Terminal")).toBeInTheDocument();
  });
});
