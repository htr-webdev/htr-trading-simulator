import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDrawings } from "../src/hooks/useDrawings";
import { loadDrawingsFor } from "../src/features/chart/drawings-model";

const POINTS = [
  { time: 1_000, price: 100 },
  { time: 2_000, price: 110 },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe("useDrawings", () => {
  it("starts with no drawings, no tool and no selection", () => {
    const { result } = renderHook(() => useDrawings("BTCUSDT", "1m"));

    expect(result.current.drawings).toEqual([]);
    expect(result.current.activeTool).toBeNull();
    expect(result.current.selectedId).toBeNull();
  });

  it("adds a drawing, persists it and resets the tool", () => {
    const { result } = renderHook(() => useDrawings("BTCUSDT", "1m"));

    act(() => result.current.setActiveTool("trend"));
    act(() => result.current.addDrawing("trend", POINTS));

    expect(result.current.drawings).toHaveLength(1);
    expect(result.current.drawings[0]).toMatchObject({
      type: "trend",
      symbol: "BTCUSDT",
      interval: "1m",
      points: POINTS,
    });
    expect(loadDrawingsFor("BTCUSDT", "1m")).toHaveLength(1);
    expect(result.current.activeTool).toBe("trend");
  });

  it("removes a drawing and clears its selection", () => {
    const { result } = renderHook(() => useDrawings("BTCUSDT", "1m"));

    act(() => result.current.addDrawing("trend", POINTS));
    act(() => result.current.selectDrawing(result.current.drawings[0].id));
    act(() => result.current.removeDrawing(result.current.drawings[0].id));

    expect(result.current.drawings).toEqual([]);
    expect(result.current.selectedId).toBeNull();
    expect(loadDrawingsFor("BTCUSDT", "1m")).toEqual([]);
  });

  it("reloads the drawing set when symbol or interval changes", () => {
    const { result, rerender } = renderHook(
      ({ symbol, interval }: { symbol: string; interval: string }) =>
        useDrawings(symbol, interval),
      { initialProps: { symbol: "BTCUSDT", interval: "1m" } },
    );

    act(() => result.current.setActiveTool("rectangle"));
    act(() => result.current.addDrawing("rectangle", POINTS));

    rerender({ symbol: "ETHUSDT", interval: "1m" });

    expect(result.current.drawings).toEqual([]);
    expect(result.current.activeTool).toBeNull();

    rerender({ symbol: "BTCUSDT", interval: "5m" });

    expect(result.current.drawings).toEqual([]);

    rerender({ symbol: "BTCUSDT", interval: "1m" });

    expect(result.current.drawings).toHaveLength(1);
  });
});
