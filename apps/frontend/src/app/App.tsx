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
import { useReplayCandles } from "../hooks/useReplayCandles";
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

  const replay = useReplay({
    symbol: activeSymbol,
    interval: desktopInterval,
    ...INITIAL_DATE_RANGE,
  });

  const chartState = useCandles({
    symbol: activeSymbol,
    interval: desktopInterval,
    ...INITIAL_DATE_RANGE,
    enabled: replay.sessionId === null,
  });

  const replayChartState = useReplayCandles(replay.sessionId, replay.state);

  // While a replay session is active the chart is fed by the replay
  // engine; otherwise it shows the static historical range.
  const activeChartState = replay.sessionId ? replayChartState : chartState;

  // A symbol or interval switch must reach the replay engine too, so
  // an active session restarts at the new configuration's start.
  const selectSymbol = (symbol: string) => {
    setActiveSymbol(symbol);
    void replay.restart({ symbol });
  };

  const changeInterval = (interval: ChartInterval) => {
    setDesktopInterval(interval);
    void replay.restart({ interval });
  };

  if (isNarrow) {
    return (
      <MobileTerminalLayout
        symbols={INITIAL_MARKET_WATCH_SYMBOLS}
        activeSymbol={activeSymbol}
        onSymbolSelect={selectSymbol}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-terminal-bg text-terminal-text">
      <ToolbarPanel
        selectedInterval={desktopInterval}
        onIntervalChange={changeInterval}
      />

      <ReplayControls replay={replay} interval={desktopInterval} />

      <div className="flex min-h-0 flex-1">
        <MarketWatchPanel
          activeSymbol={activeSymbol}
          onSymbolSelect={selectSymbol}
        />
        <ChartPanel
          state={activeChartState}
          label={`${activeSymbol} — ${desktopInterval.toUpperCase()}`}
        />
      </div>

      <TerminalPanel />
    </div>
  );
}

export default App;
