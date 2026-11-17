import { useCallback, useState } from "react";
import {
  drawingsKey,
  loadDrawingsFor,
  nextDrawingId,
  persistDrawing,
  removePersistedDrawing,
  type ChartDrawing,
  type DrawingTool,
} from "../features/chart/drawings-model";

export interface UseDrawingsResult {
  drawings: ChartDrawing[];
  activeTool: DrawingTool | null;
  selectedId: string | null;
  setActiveTool: (tool: DrawingTool | null) => void;
  addDrawing: (type: Exclude<DrawingTool, "select">, points: ChartDrawing["points"]) => void;
  removeDrawing: (id: string) => void;
  selectDrawing: (id: string | null) => void;
}

interface ToolState {
  key: string;
  tool: DrawingTool | null;
}

interface SelectionState {
  key: string;
  id: string | null;
}

interface DrawingsSnapshot {
  key: string;
  drawings: ChartDrawing[];
}

/**
 * Chart drawings for one symbol and timeframe, persisted to
 * localStorage so they survive chart reloads. Switching the symbol
 * or interval swaps the drawing set and resets the tool/selection —
 * tool, selection and drawings are all keyed by the chart context,
 * so state never leaks across charts and no effect cascades are
 * needed.
 */
export function useDrawings(symbol: string, interval: string): UseDrawingsResult {
  const contextKey = drawingsKey(symbol, interval);

  const [snapshot, setSnapshot] = useState<DrawingsSnapshot>(() => ({
    key: contextKey,
    drawings: loadDrawingsFor(symbol, interval),
  }));

  // A snapshot from another chart context renders as a fresh read.
  const drawings =
    snapshot.key === contextKey ? snapshot.drawings : loadDrawingsFor(symbol, interval);

  const [toolState, setToolState] = useState<ToolState>({ key: contextKey, tool: null });
  const [selection, setSelection] = useState<SelectionState>({ key: contextKey, id: null });

  const activeTool = toolState.key === contextKey ? toolState.tool : null;
  const selectedId = selection.key === contextKey ? selection.id : null;

  const setActiveTool = useCallback(
    (tool: DrawingTool | null) => {
      setToolState({ key: contextKey, tool });
    },
    [contextKey],
  );

  const addDrawing = useCallback(
    (type: Exclude<DrawingTool, "select">, points: ChartDrawing["points"]) => {
      const drawing: ChartDrawing = {
        id: nextDrawingId(),
        type,
        symbol,
        interval,
        points,
      };

      setSnapshot({ key: contextKey, drawings: persistDrawing(drawing) });
    },
    [symbol, interval, contextKey],
  );

  const removeDrawing = useCallback(
    (id: string) => {
      setSnapshot({
        key: contextKey,
        drawings: removePersistedDrawing(symbol, interval, id),
      });
      setSelection({ key: contextKey, id: null });
    },
    [symbol, interval, contextKey],
  );

  const selectDrawing = useCallback(
    (id: string | null) => {
      setSelection({ key: contextKey, id });
    },
    [contextKey],
  );

  return {
    drawings,
    activeTool,
    selectedId,
    setActiveTool,
    addDrawing,
    removeDrawing,
    selectDrawing,
  };
}
