import { useState } from "react";
import IntervalSelector from "../components/layout/IntervalSelector";
import MobileTopBar from "../components/layout/MobileTopBar";
import type { ChartInterval } from "../components/layout/chart-intervals";
import MobileMarketWatch from "../features/market-watch/MobileMarketWatch";
import type { MarketWatchSymbol } from "../features/market-watch/market-watch-model";
import MobileOrderBar from "../features/trading/MobileOrderBar";
import PositionsTable from "../features/trading/PositionsTable";
import ChartPanel from "../features/chart/ChartPanel";
import { INITIAL_DATE_RANGE, useCandles } from "../hooks/useCandles";

interface MobileTerminalLayoutProps {
  symbols: MarketWatchSymbol[];
  activeSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

/**
 * Mobile layout of the trading terminal (below 1024px):
 * icon top bar, full-width interval row, collapsed Market Watch with
 * a symbol dropdown, chart area, collapsible terminal section and a
 * full-width order bar.
 */
function MobileTerminalLayout({
  symbols,
  activeSymbol,
  onSymbolSelect,
}: MobileTerminalLayoutProps) {
  const [activeInterval, setActiveInterval] = useState<ChartInterval>("1m");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const chartState = useCandles({
    symbol: activeSymbol,
    interval: activeInterval,
    ...INITIAL_DATE_RANGE,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-terminal-bg text-terminal-text">
      <MobileTopBar />

      <div className="shrink-0 border-b border-terminal-border bg-terminal-panel px-3 py-2">
        <IntervalSelector
          size="large"
          activeInterval={activeInterval}
          onSelect={setActiveInterval}
        />
      </div>

      <MobileMarketWatch
        symbols={symbols}
        activeSymbol={activeSymbol}
        onSymbolSelect={onSymbolSelect}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <ChartPanel state={chartState} />
      </div>

      <button
        type="button"
        data-testid="terminal-toggle"
        aria-expanded={isTerminalOpen}
        onClick={() => setIsTerminalOpen((open) => !open)}
        className="flex shrink-0 items-center justify-between border-t border-terminal-border bg-terminal-panel px-3 py-2 text-xs font-semibold text-terminal-muted hover:text-terminal-text"
      >
        Terminal
        <span aria-hidden="true">{isTerminalOpen ? "▼" : "▲"}</span>
      </button>

      {isTerminalOpen && (
        <div className="max-h-48 shrink-0 overflow-y-auto border-t border-terminal-border bg-terminal-panel">
          <PositionsTable />
        </div>
      )}

      <MobileOrderBar
        symbol={symbols.find((symbol) => symbol.symbol === activeSymbol)}
      />
    </div>
  );
}

export default MobileTerminalLayout;
