import {
  INITIAL_MARKET_WATCH_SYMBOLS,
  formatPrice,
  type MarketWatchSymbol,
} from "../market-watch/market-watch-model";
import PositionsTable from "./PositionsTable";

const ORDER_BUTTON_BASE =
  "flex-1 rounded px-3 py-2 text-sm font-semibold text-white";

interface TerminalPanelProps {
  symbols?: MarketWatchSymbol[];
}

/**
 * Bottom terminal panel (desktop layout): empty positions table plus
 * order buttons.
 *
 * Order execution is wired up by the paper trading issue; buttons
 * stay disabled until then. Prices shown come from Market Watch data.
 */
function TerminalPanel({ symbols = INITIAL_MARKET_WATCH_SYMBOLS }: TerminalPanelProps) {
  const activeSymbol = symbols[0];

  return (
    <section
      data-testid="terminal-panel"
      className="flex h-40 shrink-0 border-t border-terminal-border bg-terminal-panel max-lg:h-32"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="border-b border-terminal-border px-2 py-1.5 text-xs font-semibold text-terminal-muted">
          Terminal
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PositionsTable />
        </div>
      </div>

      <div className="flex w-48 shrink-0 flex-col gap-2 border-l border-terminal-border p-2 max-lg:w-36">
        <button
          type="button"
          disabled
          data-testid="buy-button"
          title={`Buy ${activeSymbol?.symbol ?? ""} — trading arrives in a later issue`}
          className={`${ORDER_BUTTON_BASE} bg-terminal-up opacity-60`}
        >
          Buy
          <span className="ml-1 font-mono-terminal font-normal">
            {activeSymbol ? formatPrice(activeSymbol.ask) : "—"}
          </span>
        </button>

        <button
          type="button"
          disabled
          data-testid="sell-button"
          title={`Sell ${activeSymbol?.symbol ?? ""} — trading arrives in a later issue`}
          className={`${ORDER_BUTTON_BASE} bg-terminal-down opacity-60`}
        >
          Sell
          <span className="ml-1 font-mono-terminal font-normal">
            {activeSymbol ? formatPrice(activeSymbol.bid) : "—"}
          </span>
        </button>
      </div>
    </section>
  );
}

export default TerminalPanel;
