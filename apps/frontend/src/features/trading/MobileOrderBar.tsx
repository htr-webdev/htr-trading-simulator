import { useState } from "react";
import {
  formatPrice,
  type MarketWatchSymbol,
} from "../market-watch/market-watch-model";
import type { UsePaperTradingResult } from "../../hooks/usePaperTrading";

interface MobileOrderBarProps {
  symbol?: MarketWatchSymbol;
  trading?: UsePaperTradingResult;
  /** Trading is only available while a replay session is active. */
  hasSession?: boolean;
}

/**
 * Mobile bottom order bar: size input between full-width sell and buy
 * buttons. Orders are paper trades filled by the backend at the
 * current replay price, so both buttons stay disabled until a replay
 * session is started.
 */
function MobileOrderBar({ symbol, trading, hasSession = false }: MobileOrderBarProps) {
  const [orderSize, setOrderSize] = useState("1");

  const canTrade = hasSession && trading !== undefined && !trading.isBusy;
  const size = Number(orderSize);
  const sizeValid = Number.isFinite(size) && size > 0;

  const submit = (direction: "long" | "short") => {
    if (canTrade && sizeValid && trading) {
      void trading.submitOrder(direction, size);
    }
  };

  return (
    <div
      data-testid="mobile-order-bar"
      className="flex shrink-0 gap-2 border-t border-terminal-border bg-terminal-panel p-2"
    >
      <button
        type="button"
        disabled={!canTrade || !sizeValid}
        data-testid="mobile-sell-button"
        onClick={() => submit("short")}
        title={
          hasSession
            ? `Sell ${symbol?.symbol ?? ""} at the replay price`
            : "Start a replay session to trade"
        }
        className="flex-1 rounded bg-terminal-down px-3 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Sell
        <span className="ml-1 font-mono-terminal font-normal">
          {symbol ? formatPrice(symbol.bid) : "—"}
        </span>
      </button>

      <label className="flex items-center gap-1 text-xs text-terminal-muted">
        Size
        <input
          type="number"
          min="0"
          step="0.1"
          value={orderSize}
          onChange={(event) => setOrderSize(event.target.value)}
          data-testid="mobile-order-size-input"
          className="w-16 rounded border border-terminal-border bg-terminal-bg px-1.5 py-1 font-mono-terminal text-terminal-text"
        />
      </label>

      <button
        type="button"
        disabled={!canTrade || !sizeValid}
        data-testid="mobile-buy-button"
        onClick={() => submit("long")}
        title={
          hasSession
            ? `Buy ${symbol?.symbol ?? ""} at the replay price`
            : "Start a replay session to trade"
        }
        className="flex-1 rounded bg-terminal-up px-3 py-3 text-sm font-semibold text-white disabled:opacity-70"
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
