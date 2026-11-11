import {
  formatPrice,
  type MarketWatchSymbol,
} from "../market-watch/market-watch-model";

interface MobileOrderBarProps {
  symbol?: MarketWatchSymbol;
}

/**
 * Mobile bottom order bar: full-width sell and buy buttons.
 *
 * Order execution is wired up by the paper trading issue; buttons
 * stay disabled until then. Prices come from Market Watch data.
 */
function MobileOrderBar({ symbol }: MobileOrderBarProps) {
  return (
    <div
      data-testid="mobile-order-bar"
      className="flex shrink-0 gap-2 border-t border-terminal-border bg-terminal-panel p-2"
    >
      <button
        type="button"
        disabled
        data-testid="mobile-sell-button"
        title={`Sell ${symbol?.symbol ?? ""} — trading arrives in a later issue`}
        className="flex-1 rounded bg-terminal-down px-3 py-3 text-sm font-semibold text-white opacity-70"
      >
        Sell
        <span className="ml-1 font-mono-terminal font-normal">
          {symbol ? formatPrice(symbol.bid) : "—"}
        </span>
      </button>

      <button
        type="button"
        disabled
        data-testid="mobile-buy-button"
        title={`Buy ${symbol?.symbol ?? ""} — trading arrives in a later issue`}
        className="flex-1 rounded bg-terminal-up px-3 py-3 text-sm font-semibold text-white opacity-70"
      >
        Buy
        <span className="ml-1 font-mono-terminal font-normal">
          {symbol ? formatPrice(symbol.ask) : "—"}
        </span>
      </button>
    </div>
  );
}

export default MobileOrderBar;
