import { Command } from "commander";
import { BinanceArchiveService } from "@htr-trading-simulator/market-data";

const program = new Command();

const ALLOWED_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "1d"] as const;

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
      );

      console.log(`Downloaded ${candles.length} candles.`);

      if (candles.length > 0) {
        const first = new Date(candles[0].openTime).toISOString();
        const last = new Date(candles[candles.length - 1].openTime).toISOString();
        console.log(`Range: ${first} -> ${last}`);
      }
    } catch (error) {
      console.error(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  });

program.parseAsync();
