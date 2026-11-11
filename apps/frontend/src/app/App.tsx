import { useState } from "react";
import ToolbarPanel from "../components/layout/ToolbarPanel";
import ChartPanel from "../features/chart/ChartPanel";
import MarketWatchPanel from "../features/market-watch/MarketWatchPanel";
import {
  INITIAL_MARKET_WATCH_SYMBOLS,
} from "../features/market-watch/market-watch-model";
import TerminalPanel from "../features/trading/TerminalPanel";
import { useIsNarrowViewport } from "../hooks/useIsNarrowViewport";
import MobileTerminalLayout from "./MobileTerminalLayout";

/**
 * Root layout of the trading terminal.
 *
 * Below 1024px a dedicated mobile layout renders (icon top bar,
 * collapsed Market Watch dropdown, collapsible terminal, full-width
 * order bar). Above it, the MetaTrader-style desktop layout: toolbar
 * on top, Market Watch on the left, chart in the center, terminal
 * panel at the bottom.
 */
function App() {
  const isNarrow = useIsNarrowViewport();
  const [activeSymbol, setActiveSymbol] = useState(
    INITIAL_MARKET_WATCH_SYMBOLS[0].symbol,
  );

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
      <ToolbarPanel />

      <div className="flex min-h-0 flex-1">
        <MarketWatchPanel />
        <ChartPanel />
      </div>

      <TerminalPanel />
    </div>
  );
}

export default App;
