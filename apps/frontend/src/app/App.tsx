import { useState } from "react";
import type { ChartInterval } from "../components/layout/chart-intervals";
import ToolbarPanel from "../components/layout/ToolbarPanel";
import ChartPanel from "../features/chart/ChartPanel";
import MarketWatchPanel from "../features/market-watch/MarketWatchPanel";
import {
  INITIAL_MARKET_WATCH_SYMBOLS,
} from "../features/market-watch/market-watch-model";
import TerminalPanel from "../features/trading/TerminalPanel";
import { useIsNarrowViewport } from "../hooks/useIsNarrowViewport";
import { INITIAL_DATE_RANGE, useCandles } from "../hooks/useCandles";
import { useReplay } from "../hooks/useReplay";
import ReplayControls from "../features/replay/ReplayControls";
import MobileTerminalLayout from "./MobileTerminalLayout";

/**
 * Root layout of the trading terminal.
 *
 * Below 1024px a dedicated mobile layout renders (icon top bar,
 * collapsed Market Watch dropdown, collapsible terminal, full-width
 * order bar). Above it, the MetaTrader-style desktop layout: toolbar
 * on top, Market Watch on the left, chart in the center, terminal
 * panel at the bottom. Both layouts share the active symbol state and
 * load chart candles from the backend.
 */
function App() {
  const isNarrow = useIsNarrowViewport();
  const [activeSymbol, setActiveSymbol] = useState(
    INITIAL_MARKET_WATCH_SYMBOLS[0].symbol,
  );
  const [desktopInterval, setDesktopInterval] = useState<ChartInterval>("1m");

  const chartState = useCandles({
    symbol: activeSymbol,
    interval: desktopInterval,
    ...INITIAL_DATE_RANGE,
  });

  const replay = useReplay({
    symbol: activeSymbol,
    interval: desktopInterval,
    ...INITIAL_DATE_RANGE,
  });

  if (isNarrow) {
    return (
      <MobileTerminalLayout
        symbols={INITIAL_MARKET_WATCH_SYMBOLS}
        activeSymbol={activeSymbol}
        onSymbolSelect={setActiveSymbol}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-terminal-bg text-terminal-text">
      <ToolbarPanel
        selectedInterval={desktopInterval}
        onIntervalChange={setDesktopInterval}
      />

      <ReplayControls replay={replay} interval={desktopInterval} />

      <div className="flex min-h-0 flex-1">
        <MarketWatchPanel
          activeSymbol={activeSymbol}
          onSymbolSelect={setActiveSymbol}
        />
        <ChartPanel
          state={chartState}
          label={`${activeSymbol} — ${desktopInterval.toUpperCase()}`}
        />
      </div>

      <TerminalPanel />
    </div>
  );
}

export default App;
