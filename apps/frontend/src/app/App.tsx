import ToolbarPanel from "../components/layout/ToolbarPanel";
import ChartPanel from "../features/chart/ChartPanel";
import MarketWatchPanel from "../features/market-watch/MarketWatchPanel";
import TerminalPanel from "../features/trading/TerminalPanel";

/**
 * Root layout of the trading terminal (MetaTrader-style):
 * toolbar on top, Market Watch on the left, chart in the center,
 * terminal panel at the bottom.
 */
function App() {
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
