import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import {
  BinanceArchiveService,
  detectCandleGaps,
  type Candle,
} from "@htr-trading-simulator/market-data";

const program = new Command();

const ALLOWED_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "1d"] as const;

const CSV_HEADER = "openTime,open,high,low,close,volume,closeTime";

function candlesToCsv(candles: Candle[]): string {
  const lines = candles.map(
    (candle) =>
      `${candle.openTime},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${candle.closeTime}`,
  );

  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

function csvToCandles(csv: string): Candle[] {
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

function readCandleFile(filePath: string): Candle[] {
  const csv = readFileSync(filePath, "utf8");

  return csvToCandles(csv);
}

function writeCandleFile(filePath: string, candles: Candle[]): void {
  writeFileSync(filePath, candlesToCsv(candles), { encoding: "utf8" });
}

program
  .name("htr-trading-simulator")
  .description("Command-line tools for HTR Trading Simulator")
  .version("0.1.0");

program
  .command("download")
  .description("Download historical market data from Binance archives")
  .requiredOption("--symbol <symbol>", "Trading pair symbol")
  .option("--interval <interval>", "Candlestick interval", "1m")
  .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
  .option("--from-file <path>", "Existing candle CSV to merge with (incremental download)")
  .option("--to-file <path>", "Save merged candles to CSV file")
  .action(async (options) => {
    const symbol = String(options.symbol).toUpperCase();

    if (!/^[A-Z0-9]{4,20}$/.test(symbol)) {
      console.error(`Invalid symbol: ${options.symbol}`);
      process.exitCode = 1;
      return;
    }

    const interval = String(options.interval);

    if (!ALLOWED_INTERVALS.includes(interval as (typeof ALLOWED_INTERVALS)[number])) {
      console.error(
        `Unsupported interval: ${interval}. Allowed: ${ALLOWED_INTERVALS.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }

    let existingCandles: Candle[] = [];

    if (options.fromFile) {
      try {
        existingCandles = readCandleFile(String(options.fromFile));
        console.log(`Loaded ${existingCandles.length} existing candles.`);
      } catch (error) {
        console.error(
          `Failed to read candle file: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
        return;
      }
    }

    console.log(
      `Downloading ${symbol} ${interval} candles from ${options.start} to ${options.end}...`,
    );

    try {
      const service = new BinanceArchiveService();
      const candles = await service.getCandles(
        symbol,
        interval,
        String(options.start),
        String(options.end),
        existingCandles,
      );

      console.log(`Total candles after merge: ${candles.length}.`);

      if (options.toFile) {
        writeCandleFile(String(options.toFile), candles);
        console.log(`Saved to ${options.toFile}`);
      }

      if (candles.length > 0) {
        const first = new Date(candles[0].openTime).toISOString();
        const last = new Date(candles[candles.length - 1].openTime).toISOString();
        console.log(`Range: ${first} -> ${last}`);

        const gaps = detectCandleGaps(candles, interval);

        if (gaps.length > 0) {
          const missingTotal = gaps.reduce((sum, gap) => sum + gap.missingCount, 0);
          console.warn(
            `WARNING: ${missingTotal} missing candles across ${gaps.length} gap(s).`,
          );

          for (const gap of gaps.slice(0, 10)) {
            console.warn(
              `  Gap: ${new Date(gap.start).toISOString()} -> ${new Date(gap.end).toISOString()} (${gap.missingCount} candles)`,
            );
          }

          if (gaps.length > 10) {
            console.warn(`  ... and ${gaps.length - 10} more gap(s).`);
          }
        } else {
          console.log("No gaps detected.");
        }
      }
    } catch (error) {
      console.error(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  });

program.parseAsync();
