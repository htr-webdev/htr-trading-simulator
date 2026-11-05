import { Command } from "commander";

const program = new Command();

program
  .name("htr-trading-simulator")
  .description("Command-line tools for HTR Trading Simulator")
  .version("0.1.0");

program
  .command("download")
  .description("Download historical market data")
  .requiredOption("--symbol <symbol>", "Trading pair symbol")
  .option("--interval <interval>", "Candlestick interval", "1m")
  .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
  .action((options) => {
    console.log("Download command received:");
    console.log(options);
  });

program.parse();
