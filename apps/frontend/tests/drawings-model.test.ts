import { describe, beforeEach, expect, it } from "vitest";
import {
  drawingsKey,
  loadDrawingsFor,
  nextDrawingId,
  persistDrawing,
  removePersistedDrawing,
  type ChartDrawing,
} from "../src/features/chart/drawings-model";

function drawing(overrides: Partial<ChartDrawing> = {}): ChartDrawing {
  return {
    id: "drawing-1",
    type: "trend",
    symbol: "BTCUSDT",
    interval: "1m",
    points: [
      { time: 1_000, price: 100 },
      { time: 2_000, price: 110 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("drawings-model persistence", () => {
  it("starts empty for a symbol and timeframe with no drawings", () => {
    expect(loadDrawingsFor("BTCUSDT", "1m")).toEqual([]);
  });

  it("persists a drawing and loads it back", () => {
    const saved = persistDrawing(drawing());

    expect(saved).toHaveLength(1);
    expect(loadDrawingsFor("BTCUSDT", "1m")).toEqual(saved);
  });

  it("associates drawings with their symbol and timeframe", () => {
    persistDrawing(drawing());
    persistDrawing(drawing({ id: "drawing-2", symbol: "ETHUSDT" }));
    persistDrawing(drawing({ id: "drawing-3", interval: "5m" }));

    expect(loadDrawingsFor("BTCUSDT", "1m")).toHaveLength(1);
    expect(loadDrawingsFor("ETHUSDT", "1m")).toHaveLength(1);
    expect(loadDrawingsFor("BTCUSDT", "5m")).toHaveLength(1);
    expect(loadDrawingsFor("SOLUSDT", "1m")).toEqual([]);
    expect(drawingsKey("BTCUSDT", "5m")).toBe("BTCUSDT:5m");
  });

  it("removes a drawing and keeps the rest", () => {
    persistDrawing(drawing());
    persistDrawing(drawing({ id: "drawing-2" }));

    const remaining = removePersistedDrawing("BTCUSDT", "1m", "drawing-1");

    expect(remaining.map((item) => item.id)).toEqual(["drawing-2"]);
    expect(loadDrawingsFor("BTCUSDT", "1m")).toHaveLength(1);
  });

  it("tolerates corrupt storage", () => {
    window.localStorage.setItem("htr-chart-drawings", "not json");

    expect(loadDrawingsFor("BTCUSDT", "1m")).toEqual([]);
    expect(() => persistDrawing(drawing())).not.toThrow();
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => nextDrawingId()));

    expect(ids.size).toBe(50);
  });
});
