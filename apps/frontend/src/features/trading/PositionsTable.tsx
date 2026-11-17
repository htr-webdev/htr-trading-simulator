import { useState } from "react";
import type { PaperPosition } from "@htr-trading-simulator/shared";

const POSITION_HEADERS = [
  "Symbol",
  "Volume",
  "Entry",
  "Current",
  "P/L",
  "SL/TP",
  "Close",
] as const;

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLevel(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatMoney(value);
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
  onSetProtectiveLevels: (
    positionId: string,
    levels: { stopLoss?: number | null; takeProfit?: number | null },
  ) => void;
  /** Disables the action buttons, e.g. while a request is in flight. */
  isBusy?: boolean;
}

/**
 * One inline SL/TP editor row rendered under the position it edits.
 */
function SlTpEditor({
  position,
  onSave,
  onCancel,
  isBusy,
}: {
  position: PaperPosition;
  onSave: (stopLoss: number | null, takeProfit: number | null) => void;
  onCancel: () => void;
  isBusy: boolean;
}) {
  const [stopLoss, setStopLoss] = useState(
    position.stopLoss === null ? "" : String(position.stopLoss),
  );
  const [takeProfit, setTakeProfit] = useState(
    position.takeProfit === null ? "" : String(position.takeProfit),
  );

  const parseLevel = (value: string): number | null | undefined => {
    const trimmed = value.trim();

    if (trimmed === "") {
      return null; // cleared
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const validStopLoss = parseLevel(stopLoss) !== undefined;
  const validTakeProfit = parseLevel(takeProfit) !== undefined;
  const valid = validStopLoss && validTakeProfit;

  return (
    <tr data-testid={`sltp-editor-${position.id}`} className="bg-terminal-bg/50">
      <td colSpan={POSITION_HEADERS.length} className="px-2 py-1.5">
        <div className="flex items-center gap-2 text-xs text-terminal-muted">
          <span className="font-mono-terminal">SL</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={stopLoss}
            onChange={(event) => setStopLoss(event.target.value)}
            data-testid={`sltp-stop-loss-${position.id}`}
            className="w-24 rounded border border-terminal-border bg-terminal-bg px-1.5 py-0.5 font-mono-terminal text-terminal-text"
            title="Stop-loss price; empty clears the level"
          />
          <span className="font-mono-terminal">TP</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={takeProfit}
            onChange={(event) => setTakeProfit(event.target.value)}
            data-testid={`sltp-take-profit-${position.id}`}
            className="w-24 rounded border border-terminal-border bg-terminal-bg px-1.5 py-0.5 font-mono-terminal text-terminal-text"
            title="Take-profit price; empty clears the level"
          />
          <button
            type="button"
            data-testid={`sltp-save-${position.id}`}
            onClick={() => onSave(parseLevel(stopLoss) ?? null, parseLevel(takeProfit) ?? null)}
            disabled={isBusy || !valid}
            className="rounded border border-terminal-border px-2 py-0.5 text-terminal-text hover:bg-terminal-border/40 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            data-testid={`sltp-cancel-${position.id}`}
            onClick={onCancel}
            disabled={isBusy}
            className="rounded border border-terminal-border px-2 py-0.5 text-terminal-muted hover:bg-terminal-border/40 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Positions table shared by the desktop terminal panel and the mobile
 * terminal section. Shows open paper trading positions with live P/L
 * valued at the current replay price, per-position stop-loss /
 * take-profit levels with an inline editor, and close buttons.
 */
function PositionsTable({
  positions,
  currentPrice,
  onClosePosition,
  onSetProtectiveLevels,
  isBusy = false,
}: PositionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

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
          positions.flatMap((position) => {
            const pnl = positionPnl(position, currentPrice);

            const rows = [
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
                <td className="px-2 py-1" data-testid={`sltp-values-${position.id}`}>
                  <button
                    type="button"
                    data-testid={`sltp-edit-${position.id}`}
                    onClick={() => setEditingId(editingId === position.id ? null : position.id)}
                    disabled={isBusy}
                    className="font-mono-terminal text-terminal-text hover:text-terminal-muted disabled:opacity-50"
                    title="Edit stop-loss / take-profit"
                  >
                    {formatLevel(position.stopLoss)} / {formatLevel(position.takeProfit)}
                  </button>
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
              </tr>,
            ];

            if (editingId === position.id) {
              rows.push(
                <SlTpEditor
                  key={`${position.id}-editor`}
                  position={position}
                  isBusy={isBusy}
                  onCancel={() => setEditingId(null)}
                  onSave={(stopLoss, takeProfit) => {
                    onSetProtectiveLevels(position.id, { stopLoss, takeProfit });
                    setEditingId(null);
                  }}
                />,
              );
            }

            return rows;
          })
        )}
      </tbody>
    </table>
  );
}

export default PositionsTable;
