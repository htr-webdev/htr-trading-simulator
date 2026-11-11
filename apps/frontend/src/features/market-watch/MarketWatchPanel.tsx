import {
  formatChange,
  formatPrice,
  INITIAL_MARKET_WATCH_SYMBOLS,
  type MarketWatchSymbol,
} from "./market-watch-model";

const TABLE_HEADERS = ["Symbol", "Bid", "Ask", "Change"] as const;

interface MarketWatchPanelProps {
  symbols?: MarketWatchSymbol[];
}

/**
 * Market Watch side panel.
 *
 * Lists tradable symbols with their prices. Data comes from
 * `market-watch-model` (static until a live source exists).
 */
function MarketWatchPanel({ symbols = INITIAL_MARKET_WATCH_SYMBOLS }: MarketWatchPanelProps) {
  return (
    <aside
      data-testid="market-watch-panel"
      className="flex w-56 shrink-0 flex-col border-r border-terminal-border bg-terminal-panel"
    >
      <h2 className="border-b border-terminal-border px-2 py-1.5 text-xs font-semibold text-terminal-muted">
        Market Watch
      </h2>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full font-mono-terminal text-xs" data-testid="market-watch-table">
          <thead>
            <tr className="text-left text-terminal-muted">
              {TABLE_HEADERS.map((header) => (
                <th key={header} scope="col" className="px-2 py-1 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {symbols.map((symbol) => (
              <tr
                key={symbol.symbol}
                data-testid={`market-watch-row-${symbol.symbol}`}
                className="border-t border-terminal-border/60 text-terminal-text hover:bg-terminal-panel-alt"
              >
                <td className="px-2 py-1 font-sans font-semibold">{symbol.symbol}</td>
                <td className="px-2 py-1">{formatPrice(symbol.bid)}</td>
                <td className="px-2 py-1">{formatPrice(symbol.ask)}</td>
                <td
                  className={
                    symbol.change >= 0
                      ? "px-2 py-1 text-terminal-up"
                      : "px-2 py-1 text-terminal-down"
                  }
                >
                  {formatChange(symbol.changePercent)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

export default MarketWatchPanel;
