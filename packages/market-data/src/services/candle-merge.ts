import type { Candle } from "../types/candle.js";
import { validateCandles } from "./candle-validator.js";

/**
 * Merges previously downloaded candles with freshly downloaded ones,
 * removing duplicates and restoring chronological order.
 */
export function mergeCandles(existing: Candle[], incoming: Candle[]): Candle[] {
  return validateCandles([...existing, ...incoming]);
}
