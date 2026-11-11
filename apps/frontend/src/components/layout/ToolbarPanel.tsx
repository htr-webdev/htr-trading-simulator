import { useState } from "react";
import IntervalSelector from "./IntervalSelector";
import type { ChartInterval } from "./chart-intervals";

const PLACEHOLDER_ACTIONS = [
  { id: "drawings", label: "Drawings" },
  { id: "settings", label: "Settings" },
] as const;

interface ToolbarPanelProps {
  selectedInterval?: ChartInterval;
  onIntervalChange?: (interval: ChartInterval) => void;
}

/**
 * Top toolbar of the trading terminal (desktop layout).
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

      <IntervalSelector
        activeInterval={currentInterval}
        onSelect={(interval) => {
          setActiveInterval(interval);
          onIntervalChange?.(interval);
        }}
      />

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
