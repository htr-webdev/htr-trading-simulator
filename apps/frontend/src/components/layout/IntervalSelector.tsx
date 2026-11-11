import {
  CHART_INTERVALS,
  INTERVAL_LABELS,
  type ChartInterval,
} from "./chart-intervals";

interface IntervalSelectorProps {
  activeInterval: ChartInterval;
  onSelect: (interval: ChartInterval) => void;
  size?: "compact" | "large";
}

/**
 * Chart interval button group, shared by the desktop toolbar and the
 * mobile interval row.
 */
function IntervalSelector({
  activeInterval,
  onSelect,
  size = "compact",
}: IntervalSelectorProps) {
  const buttonClass =
    size === "large"
      ? "flex-1 rounded px-2 py-2 text-sm font-semibold"
      : "rounded px-2 py-0.5 text-xs font-semibold";

  return (
    <div
      data-testid="interval-group"
      className="flex items-center gap-1"
      role="group"
      aria-label="Chart interval"
    >
      {CHART_INTERVALS.map((interval) => {
        const isActive = interval === activeInterval;

        return (
          <button
            key={interval}
            type="button"
            aria-pressed={isActive}
            title={`Show ${INTERVAL_LABELS[interval]} candles`}
            onClick={() => onSelect(interval)}
            className={
              isActive
                ? `${buttonClass} bg-terminal-accent text-white`
                : `${buttonClass} text-terminal-muted hover:bg-terminal-panel-alt hover:text-terminal-text`
            }
          >
            {INTERVAL_LABELS[interval]}
          </button>
        );
      })}
    </div>
  );
}

export default IntervalSelector;
