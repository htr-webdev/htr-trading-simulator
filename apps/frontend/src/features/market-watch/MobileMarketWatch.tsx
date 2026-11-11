import { useState } from "react";
import {
  formatPrice,
  type MarketWatchSymbol,
} from "./market-watch-model";

interface MobileMarketWatchProps {
  symbols: MarketWatchSymbol[];
  activeSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

/**
 * Mobile Market Watch: collapsed by default.
 *
 * Shows a dropdown button with the active symbol and its bid/ask
 * prices. Tapping it opens a menu with all symbols to choose from.
 */
function MobileMarketWatch({
  symbols,
  activeSymbol,
  onSymbolSelect,
}: MobileMarketWatchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = symbols.find((symbol) => symbol.symbol === activeSymbol);

  return (
    <div
      data-testid="mobile-market-watch"
      className="shrink-0 border-b border-terminal-border bg-terminal-panel"
    >
      <span className="block px-3 pt-2 text-xs text-terminal-muted">
        Market Watch
      </span>

      <div className="relative px-3 pb-2 pt-1">
        <button
          type="button"
          data-testid="symbol-dropdown"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded border border-terminal-border bg-terminal-panel-alt px-3 py-2 text-left"
        >
          <span className="text-sm font-semibold">
            {active?.symbol ?? "Select symbol"}
          </span>

          <span className="font-mono-terminal text-xs">
            {active ? (
              <>
                {formatPrice(active.bid)}
                <span className="text-terminal-muted"> / </span>
                {formatPrice(active.ask)}
              </>
            ) : (
              "—"
            )}
          </span>
        </button>

        {isOpen && (
          <ul
            data-testid="symbol-menu"
            role="listbox"
            aria-label="Symbols"
            className="absolute inset-x-3 z-10 max-h-64 overflow-y-auto rounded border border-terminal-border bg-terminal-panel-alt shadow-lg"
          >
            {symbols.map((symbol) => (
              <li key={symbol.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={symbol.symbol === activeSymbol}
                  data-testid={`symbol-option-${symbol.symbol}`}
                  onClick={() => {
                    onSymbolSelect(symbol.symbol);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-terminal-border/40"
                >
                  <span className="font-semibold">{symbol.symbol}</span>

                  <span className="font-mono-terminal text-xs">
                    {formatPrice(symbol.bid)}
                    <span className="text-terminal-muted"> / </span>
                    {formatPrice(symbol.ask)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MobileMarketWatch;
