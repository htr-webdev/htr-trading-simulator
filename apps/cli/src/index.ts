import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import {
  BinanceArchiveService,
  CandleDatabase,
  detectCandleGaps,
  type Candle,
} from "@htr-trading-simulator/market-data";
import { candlesToCsv, csvToCandles } from "./candle-csv.js";

const program = new Command();

const ALLOWED_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "1d"] as const;

function readCandleFile(filePath: string): Candle[] {
  const csv = readFileSync(filePath, "utf8");

  return csvToCandles(csv);
}

function writeCandleFile(filePath: string, candles: Candle[]): void {
  writeFileSync(filePath, candlesToCsv(candles), { encoding: "utf8" });
}


function openCandleDatabase(filePath: string): CandleDatabase {
  try {
    return new CandleDatabase(filePath);
  } catch (error) {
    console.error(
      `Failed to open candle database: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
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
  .option("--database <path>", "SQLite database to load existing candles from and store the result in")
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

    let database: CandleDatabase | null = null;
    let existingCandles: Candle[] = [];

    if (options.database) {
      database = openCandleDatabase(String(options.database));
      existingCandles = database.getCandles(
        symbol,
        interval,
        0,
        Number.MAX_SAFE_INTEGER,
      );
      console.log(`Loaded ${existingCandles.length} existing candles from database.`);
    }

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

      if (database) {
        const inserted = database.insertCandles(symbol, interval, candles);
        console.log(
          `Database: ${inserted} new candles stored, ${database.countCandles(symbol, interval)} total.`,
        );
        database.close();
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

program
  .command("candles")
  .description("Read stored candles from a local database without downloading")
  .requiredOption("--symbol <symbol>", "Trading pair symbol")
  .option("--interval <interval>", "Candlestick interval", "1m")
  .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
  .requiredOption("--database <path>", "SQLite database file")
  .action((options) => {
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

    const database = openCandleDatabase(String(options.database));

    try {
      const startTime = Date.parse(`${options.start}T00:00:00.000Z`);
      const endTime = Date.parse(`${options.end}T23:59:59.999Z`);

      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
        console.error("Invalid date range.");
        process.exitCode = 1;
        return;
      }

      const candles = database.getCandles(symbol, interval, startTime, endTime);

      process.stdout.write(candlesToCsv(candles));
    } finally {
      database.close();
    }
  });

program.parseAsync();
