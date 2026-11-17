export type DrawingTool = "trend" | "horizontal" | "vertical" | "rectangle" | "select";

export type DrawingType = Exclude<DrawingTool, "select">;

export interface DrawingPoint {
  /** Absolute chart time in seconds. */
  time: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  type: DrawingType;
  symbol: string;
  interval: string;
  /** Horizontal line / vertical line store one point; trend line and rectangle two. */
  points: DrawingPoint[];
}

const DRAWINGS_STORAGE_KEY = "htr-chart-drawings";

type DrawingStore = Record<string, ChartDrawing[]>;

export function drawingsKey(symbol: string, interval: string): string {
  return `${symbol}:${interval}`;
}

function readStore(): DrawingStore {
  try {
    const raw = window.localStorage.getItem(DRAWINGS_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as DrawingStore;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Corrupt storage is treated as empty rather than breaking the chart.
    return {};
  }
}

function writeStore(store: DrawingStore): void {
  window.localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(store));
}

/** Loads the drawings associated with one symbol and timeframe. */
export function loadDrawingsFor(symbol: string, interval: string): ChartDrawing[] {
  return readStore()[drawingsKey(symbol, interval)] ?? [];
}

/**
 * Persists a new drawing under its symbol and timeframe and returns
 * the updated list.
 */
export function persistDrawing(drawing: ChartDrawing): ChartDrawing[] {
  const key = drawingsKey(drawing.symbol, drawing.interval);
  const store = readStore();
  const list = [...(store[key] ?? []), drawing];

  store[key] = list;
  writeStore(store);

  return list;
}

/** Removes a drawing from its symbol/timeframe list. */
export function removePersistedDrawing(symbol: string, interval: string, id: string): ChartDrawing[] {
  const key = drawingsKey(symbol, interval);
  const store = readStore();
  const list = (store[key] ?? []).filter((drawing) => drawing.id !== id);

  store[key] = list;
  writeStore(store);

  return list;
}

export function nextDrawingId(): string {
  return `drawing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
