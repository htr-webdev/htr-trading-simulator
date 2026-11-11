import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/app/App";

describe("App", () => {
  it("renders the terminal shell on a dark canvas", () => {
    render(<App />);

    expect(screen.getByText("HTR Trading Simulator")).toBeInTheDocument();
  });
});
