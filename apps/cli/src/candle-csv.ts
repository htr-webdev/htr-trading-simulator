import type { Candle } from "@htr-trading-simulator/market-data";

export const CSV_HEADER = "openTime,open,high,low,close,volume,closeTime";

export function candlesToCsv(candles: Candle[]): string {
  const lines = candles.map(
    (candle) =>
      `${candle.openTime},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${candle.closeTime}`,
  );

  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

export function csvToCandles(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);

  if (lines[0] !== CSV_HEADER) {
    throw new Error("Candle file has an invalid header.");
  }

  const candles: Candle[] = [];

  for (const [index, line] of lines.slice(1).entries()) {
    const parts = line.split(",");

    if (parts.length !== 7 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[6])) {
      throw new Error(`Invalid candle record at line ${index + 2}.`);
    }

    candles.push({
      openTime: Number(parts[0]),
      open: parts[1],
      high: parts[2],
      low: parts[3],
      close: parts[4],
      volume: parts[5],
      closeTime: Number(parts[6]),
    });
  }

  return candles;
}
