import { useCallback, useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { ChartDrawing, DrawingTool } from "./drawings-model";

const DRAW_COLOR = "#2962ff";
const SELECTED_COLOR = "#d1d4dc";
const HIT_THRESHOLD_PX = 6;

interface PendingPoint {
  time: number;
  price: number;
  /** Pixel position, kept for the two-click preview. */
  x: number;
  y: number;
}

interface ChartDrawingOverlayProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
  drawings: ChartDrawing[];
  activeTool: DrawingTool | null;
  selectedId: string | null;
  onDrawingAdd: (type: Exclude<DrawingTool, "select">, points: ChartDrawing["points"]) => void;
  onDrawingSelect: (id: string | null) => void;
  onDrawingDelete: (id: string) => void;
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));

  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * Canvas overlay that renders and edits chart drawings (trend line,
 * horizontal line, vertical line, rectangle) on top of the chart.
 *
 * Coordinates come from the chart library itself, so drawings stay
 * pinned to their price/time even when the user zooms or pans. The
 * overlay only captures mouse events while a drawing tool is active;
 * otherwise events pass through to the chart. The "select" tool and
 * the Delete key remove drawings.
 */
function ChartDrawingOverlay({
  chartRef,
  seriesRef,
  drawings,
  activeTool,
  selectedId,
  onDrawingAdd,
  onDrawingSelect,
  onDrawingDelete,
}: ChartDrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pendingRef = useRef<PendingPoint | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const toPixels = useCallback(
    (point: { time: number; price: number }): { x: number; y: number } | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;

      if (!chart || !series) {
        return null;
      }

      const x = chart.timeScale().timeToCoordinate(point.time as Time);
      const y = series.priceToCoordinate(point.price);

      if (x === null || y === null) {
        return null;
      }

      return { x, y };
    },
    [chartRef, seriesRef],
  );

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, drawing: ChartDrawing): boolean => {
      const pixels = drawing.points.map(toPixels);

      if (pixels.some((pixel) => pixel === null)) {
        return false;
      }

      const selected = drawing.id === selectedId;
      const [{ x: x1, y: y1 }, p2] = pixels as { x: number; y: number }[];

      ctx.strokeStyle = selected ? SELECTED_COLOR : DRAW_COLOR;
      ctx.lineWidth = selected ? 2 : 1.5;

      ctx.beginPath();

      switch (drawing.type) {
        case "trend":
          ctx.moveTo(x1, y1);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          break;
        case "rectangle":
          ctx.strokeRect(x1, y1, p2.x - x1, p2.y - y1);
          break;
        case "horizontal": {
          const width = sizeRef.current.width;
          ctx.moveTo(0, y1);
          ctx.lineTo(width, y1);
          ctx.stroke();
          break;
        }
        case "vertical": {
          const height = sizeRef.current.height;
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, height);
          ctx.stroke();
          break;
        }
      }

      return true;
    },
    [selectedId, toPixels],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;

    if (!canvas || !container) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (sizeRef.current.width !== width || sizeRef.current.height !== height) {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.scale(ratio, ratio);
      sizeRef.current = { width, height };
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (const drawing of drawings) {
      drawShape(ctx, drawing);
    }

    // Preview line from the pending anchor to the current crosshair.
    const pending = pendingRef.current;
    const series = seriesRef.current;
    const chart = chartRef.current;

    if (pending && activeTool && (activeTool === "trend" || activeTool === "rectangle")) {
      const mouse = (canvas as HTMLCanvasElement & { __lastMouse?: { x: number; y: number } }).__lastMouse;

      if (mouse && series && chart) {
        ctx.strokeStyle = DRAW_COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        if (activeTool === "trend") {
          ctx.moveTo(pending.x, pending.y);
          ctx.lineTo(mouse.x, mouse.y);
        } else {
          ctx.strokeRect(pending.x, pending.y, mouse.x - pending.x, mouse.y - pending.y);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [drawings, drawShape, activeTool, seriesRef, chartRef]);

  const hitTest = useCallback(
    (x: number, y: number): string | null => {
      for (const drawing of drawings) {
        const pixels = drawing.points.map(toPixels);

        if (pixels.some((pixel) => pixel === null)) {
          continue;
        }

        const [{ x: x1, y: y1 }, p2] = pixels as { x: number; y: number }[];
        let hit = false;

        switch (drawing.type) {
          case "trend":
            hit = distanceToSegment(x, y, x1, y1, p2.x, p2.y) <= HIT_THRESHOLD_PX;
            break;
          case "rectangle":
            hit =
              distanceToSegment(x, y, x1, y1, p2.x, y1) <= HIT_THRESHOLD_PX ||
              distanceToSegment(x, y, x1, y1, x1, p2.y) <= HIT_THRESHOLD_PX ||
              distanceToSegment(x, y, p2.x, p2.y, p2.x, y1) <= HIT_THRESHOLD_PX ||
              distanceToSegment(x, y, p2.x, p2.y, x1, p2.y) <= HIT_THRESHOLD_PX;
            break;
          case "horizontal":
            hit = Math.abs(y - y1) <= HIT_THRESHOLD_PX;
            break;
          case "vertical":
            hit = Math.abs(x - x1) <= HIT_THRESHOLD_PX;
            break;
        }

        if (hit) {
          return drawing.id;
        }
      }

      return null;
    },
    [drawings, toPixels],
  );

  const pointFromEvent = useCallback(
    (event: MouseEvent): PendingPoint | null => {
      const canvas = canvasRef.current;
      const chart = chartRef.current;
      const series = seriesRef.current;

      if (!canvas || !chart || !series) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) {
        return null;
      }

      return { time: time as number, price, x, y };
    },
    [chartRef, seriesRef],
  );

  // Track the crosshair for the two-click preview.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();

      (canvas as HTMLCanvasElement & { __lastMouse?: { x: number; y: number } }).__lastMouse = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      redraw();
    };

    canvas.addEventListener("mousemove", onMouseMove);

    return () => canvas.removeEventListener("mousemove", onMouseMove);
  }, [redraw]);

  // Redraw whenever anything visual changes or the chart moves.
  useEffect(() => {
    redraw();

    const chart = chartRef.current;

    chart?.timeScale().subscribeVisibleTimeRangeChange(redraw);
    window.addEventListener("resize", redraw);

    return () => {
      chart?.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      window.removeEventListener("resize", redraw);
    };
  }, [redraw, chartRef]);

  // Delete the selected drawing with the keyboard.
  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        onDrawingDelete(selectedId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, onDrawingDelete]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event.nativeEvent);

    if (!point) {
      return;
    }

    if (!activeTool) {
      onDrawingSelect(hitTest(point.x, point.y));
      return;
    }

    if (activeTool === "select") {
      onDrawingSelect(hitTest(point.x, point.y));
      return;
    }

    if (activeTool === "horizontal" || activeTool === "vertical") {
      onDrawingAdd(activeTool, [{ time: point.time, price: point.price }]);
      return;
    }

    // Two-click tools: trend line and rectangle.
    const pending = pendingRef.current;

    if (!pending) {
      pendingRef.current = point;
      return;
    }

    pendingRef.current = null;
    onDrawingAdd(activeTool, [
      { time: pending.time, price: pending.price },
      { time: point.time, price: point.price },
    ]);
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="chart-drawing-overlay"
      onClick={handleClick}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: activeTool ? "auto" : "none", cursor: activeTool ? "crosshair" : "default" }}
    />
  );
}

export default ChartDrawingOverlay;
