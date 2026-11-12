import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, fetchCandles } from "../src/services/candles-service";

function mockResponse(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      } as Response),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCandles", () => {
  it("returns success with candles on a non-empty response", async () => {
    mockResponse(200, [
      { time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 },
      { time: 2_000, open: 1.5, high: 2.5, low: 1, close: 2 },
    ]);

    const result = await fetchCandles("BTCUSDT", "1m", "2025-06-15", "2025-06-15");

    expect(result).toEqual({
      status: "success",
      candles: [
        { time: 1_000, open: 1, high: 2, low: 0.5, close: 1.5 },
        { time: 2_000, open: 1.5, high: 2.5, low: 1, close: 2 },
      ],
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/candles?symbol=BTCUSDT&interval=1m&start=2025-06-15&end=2025-06-15`,
    );
  });

  it("returns empty on an empty list", async () => {
    mockResponse(200, []);

    const result = await fetchCandles("BTCUSDT", "1m", "2025-06-15", "2025-06-15");

    expect(result).toEqual({ status: "empty" });
  });

  it("returns the backend error message on a 400 response", async () => {
    mockResponse(400, { error: "Invalid or missing symbol." });

    const result = await fetchCandles("bad", "1m", "2025-06-15", "2025-06-15");

    expect(result).toEqual({
      status: "error",
      message: "Invalid or missing symbol.",
    });
  });

  it("returns a connection error when the backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("connection refused"))),
    );

    const result = await fetchCandles("BTCUSDT", "1m", "2025-06-15", "2025-06-15");

    expect(result).toEqual({
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    });
  });
});
