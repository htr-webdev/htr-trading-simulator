import { useState } from "react";
import {
  INITIAL_MARKET_WATCH_SYMBOLS,
  formatPrice,
  type MarketWatchSymbol,
} from "../market-watch/market-watch-model";
import type { UsePaperTradingResult } from "../../hooks/usePaperTrading";
import PositionsTable from "./PositionsTable";

const ORDER_BUTTON_BASE =
  "flex-1 rounded px-3 py-2 text-sm font-semibold text-white";

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TerminalPanelProps {
  symbols?: MarketWatchSymbol[];
  trading?: UsePaperTradingResult;
  /** Trading is only available while a replay session is active. */
  hasSession?: boolean;
}

/**
 * Bottom terminal panel (desktop layout): account summary, open
 * positions and the buy/sell order buttons. Orders are paper trades
 * filled by the backend at the current replay price, so both buttons
 * stay disabled until a replay session is started.
 */
function TerminalPanel({
  symbols = INITIAL_MARKET_WATCH_SYMBOLS,
  trading,
  hasSession = false,
}: TerminalPanelProps) {
  const activeSymbol = symbols[0];
  const [orderSize, setOrderSize] = useState("1");

  const canTrade = hasSession && trading !== undefined && !trading.isBusy;
  const size = Number(orderSize);
  const sizeValid = Number.isFinite(size) && size > 0;
  const account = trading?.account ?? null;

  const submit = (direction: "long" | "short") => {
    if (canTrade && sizeValid && trading) {
      void trading.submitOrder(direction, size);
    }
  };

  return (
    <section
      data-testid="terminal-panel"
      className="flex h-40 shrink-0 border-t border-terminal-border bg-terminal-panel max-lg:h-32"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-terminal-border px-2 py-1.5">
          <h2 className="text-xs font-semibold text-terminal-muted">Terminal</h2>

          {account && (
            <div
              data-testid="account-summary"
              className="flex gap-3 font-mono-terminal text-xs text-terminal-muted"
            >
              <span>
                Balance <span className="text-terminal-text">{formatMoney(account.balance)}</span>
              </span>
              <span>
                Equity <span className="text-terminal-text">{formatMoney(account.equity)}</span>
              </span>
              <span>
                Unrealized{" "}
                <span className={account.unrealizedPnl >= 0 ? "text-terminal-up" : "text-terminal-down"}>
                  {formatMoney(account.unrealizedPnl)}
                </span>
              </span>
              <span>
                Realized{" "}
                <span className={account.realizedPnl >= 0 ? "text-terminal-up" : "text-terminal-down"}>
                  {formatMoney(account.realizedPnl)}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PositionsTable
            positions={account?.openPositions ?? []}
            currentPrice={account?.markPrice ?? null}
            onClosePosition={(id) => void trading?.closePosition(id)}
            onSetProtectiveLevels={(id, levels) =>
              void trading?.setProtectiveLevels(id, levels)
            }
            isBusy={trading?.isBusy ?? false}
          />
        </div>
      </div>

      <div className="flex w-48 shrink-0 flex-col gap-2 border-l border-terminal-border p-2 max-lg:w-36">
        <label className="flex items-center gap-1 text-xs text-terminal-muted">
          Size
          <input
            type="number"
            min="0"
            step="0.1"
            value={orderSize}
            onChange={(event) => setOrderSize(event.target.value)}
            data-testid="order-size-input"
            className="w-full rounded border border-terminal-border bg-terminal-bg px-1.5 py-0.5 font-mono-terminal text-terminal-text"
          />
        </label>

        <button
          type="button"
          disabled={!canTrade || !sizeValid}
          data-testid="buy-button"
          onClick={() => submit("long")}
          title={
            hasSession
              ? `Buy ${activeSymbol?.symbol ?? ""} at the replay price`
              : "Start a replay session to trade"
          }
          className={`${ORDER_BUTTON_BASE} ${canTrade ? "bg-terminal-up" : "bg-terminal-up opacity-60"}`}
        >
          Buy
          <span className="ml-1 font-mono-terminal font-normal">
            {activeSymbol ? formatPrice(activeSymbol.ask) : "—"}
          </span>
        </button>

        <button
          type="button"
          disabled={!canTrade || !sizeValid}
          data-testid="sell-button"
          onClick={() => submit("short")}
          title={
            hasSession
              ? `Sell ${activeSymbol?.symbol ?? ""} at the replay price`
              : "Start a replay session to trade"
          }
          className={`${ORDER_BUTTON_BASE} ${canTrade ? "bg-terminal-down" : "bg-terminal-down opacity-60"}`}
        >
          Sell
          <span className="ml-1 font-mono-terminal font-normal">
            {activeSymbol ? formatPrice(activeSymbol.bid) : "—"}
          </span>
        </button>

        {trading?.error && (
          <span data-testid="trading-error" className="text-xs text-terminal-down">
            {trading.error}
          </span>
        )}
      </div>
    </section>
  );
}

export default TerminalPanel;
