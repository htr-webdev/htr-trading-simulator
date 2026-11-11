import { useState } from "react";
import {
  CHART_INTERVALS,
  INTERVAL_LABELS,
  type ChartInterval,
} from "./chart-intervals";

const PLACEHOLDER_ACTIONS = [
  { id: "drawings", label: "Drawings" },
  { id: "settings", label: "Settings" },
] as const;

interface ToolbarPanelProps {
  selectedInterval?: ChartInterval;
  onIntervalChange?: (interval: ChartInterval) => void;
}

/**
 * Top toolbar of the trading terminal.
 *
 * Interval buttons switch the visual selection only; wiring them to
 * chart data happens with the chart issue. Placeholder actions stay
 * disabled until their features exist.
 */
function ToolbarPanel({
  selectedInterval,
  onIntervalChange,
}: ToolbarPanelProps) {
  const [activeInterval, setActiveInterval] = useState<ChartInterval>("1m");

  const currentInterval = selectedInterval ?? activeInterval;

  return (
    <div
      data-testid="toolbar-panel"
      className="flex h-10 shrink-0 items-center gap-2 border-b border-terminal-border bg-terminal-panel px-2"
    >
      <span className="px-2 text-xs font-semibold text-terminal-muted">
        HTR Terminal
      </span>

      <div className="mx-2 h-5 w-px bg-terminal-border" role="separator" />

      <div
        data-testid="interval-group"
        className="flex items-center gap-1"
        role="group"
        aria-label="Chart interval"
      >
        {CHART_INTERVALS.map((interval) => {
          const isActive = interval === currentInterval;

          return (
            <button
              key={interval}
              type="button"
              aria-pressed={isActive}
              title={`Show ${INTERVAL_LABELS[interval]} candles`}
              onClick={() => {
                setActiveInterval(interval);
                onIntervalChange?.(interval);
              }}
              className={
                isActive
                  ? "rounded bg-terminal-accent px-2 py-0.5 text-xs font-semibold text-white"
                  : "rounded px-2 py-0.5 text-xs text-terminal-muted hover:bg-terminal-panel-alt hover:text-terminal-text"
              }
            >
              {INTERVAL_LABELS[interval]}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {PLACEHOLDER_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled
            title={`${action.label} — available in a later issue`}
            className="rounded px-2 py-0.5 text-xs text-terminal-muted opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ToolbarPanel;
