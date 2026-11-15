import type { PaperPosition } from "@htr-trading-simulator/shared";

const POSITION_HEADERS = [
  "Symbol",
  "Volume",
  "Entry",
  "Current",
  "P/L",
  "Close",
] as const;

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function positionPnl(position: PaperPosition, currentPrice: number | null): number | null {
  if (currentPrice === null) {
    return null;
  }

  return position.direction === "long"
    ? (currentPrice - position.entryPrice) * position.size
    : (position.entryPrice - currentPrice) * position.size;
}

interface PositionsTableProps {
  positions: PaperPosition[];
  /** Latest replay price used to value positions. */
  currentPrice: number | null;
  onClosePosition: (positionId: string) => void;
  /** Disables the close buttons, e.g. while a request is in flight. */
  isBusy?: boolean;
}

/**
 * Positions table shared by the desktop terminal panel and the mobile
 * terminal section. Shows open paper trading positions with live P/L
 * valued at the current replay price, or an empty placeholder.
 */
function PositionsTable({
  positions,
  currentPrice,
  onClosePosition,
  isBusy = false,
}: PositionsTableProps) {
  return (
    <table className="w-full font-mono-terminal text-xs" data-testid="positions-table">
      <thead>
        <tr className="text-left text-terminal-muted">
          {POSITION_HEADERS.map((header) => (
            <th key={header} scope="col" className="px-2 py-1 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {positions.length === 0 ? (
          <tr>
            <td
              colSpan={POSITION_HEADERS.length}
              className="px-2 py-4 text-center text-terminal-muted"
            >
              No positions
            </td>
          </tr>
        ) : (
          positions.map((position) => {
            const pnl = positionPnl(position, currentPrice);

            return (
              <tr key={position.id} data-testid={`position-row-${position.id}`}>
                <td className="px-2 py-1">{position.symbol}</td>
                <td className="px-2 py-1">{position.size}</td>
                <td className="px-2 py-1">{formatMoney(position.entryPrice)}</td>
                <td className="px-2 py-1">
                  {currentPrice === null ? "—" : formatMoney(currentPrice)}
                </td>
                <td
                  className={`px-2 py-1 ${
                    pnl === null ? "text-terminal-muted" : pnl >= 0 ? "text-terminal-up" : "text-terminal-down"
                  }`}
                >
                  {pnl === null ? "—" : formatMoney(pnl)}
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    data-testid={`close-position-${position.id}`}
                    onClick={() => onClosePosition(position.id)}
                    disabled={isBusy}
                    className="rounded border border-terminal-border px-1.5 py-0.5 text-terminal-text hover:bg-terminal-border/40 disabled:opacity-50"
                  >
                    Close
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default PositionsTable;
