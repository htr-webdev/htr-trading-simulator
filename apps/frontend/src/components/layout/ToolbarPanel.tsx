import { useState } from "react";
import IntervalSelector from "./IntervalSelector";
import type { ChartInterval } from "./chart-intervals";
import type { DrawingTool } from "../../features/chart/drawings-model";

const DRAWING_TOOLS: { id: Exclude<DrawingTool, "select">; label: string; hint: string }[] = [
  { id: "trend", label: "Trend", hint: "Trend line — click two points" },
  { id: "horizontal", label: "H-Line", hint: "Horizontal line — click one point" },
  { id: "vertical", label: "V-Line", hint: "Vertical line — click one point" },
  { id: "rectangle", label: "Rect", hint: "Rectangle — click two corners" },
];

const SELECT_TOOL: { id: Extract<DrawingTool, "select">; label: string; hint: string } = {
  id: "select",
  label: "Select",
  hint: "Select a drawing, then press Delete to remove it",
};

interface ToolbarPanelProps {
  selectedInterval?: ChartInterval;
  onIntervalChange?: (interval: ChartInterval) => void;
  /** Active chart drawing tool; null = no tool (chart interactions only). */
  drawingTool?: DrawingTool | null;
  onDrawingToolChange?: (tool: DrawingTool | null) => void;
}

/**
 * Top toolbar of the trading terminal (desktop layout).
 *
 * Interval buttons switch the chart timeframe; the drawing tool group
 * activates chart drawing tools (click the active tool again to
 * release it). The settings action stays a placeholder until its
 * feature exists.
 */
function ToolbarPanel({
  selectedInterval,
  onIntervalChange,
  drawingTool = null,
  onDrawingToolChange,
}: ToolbarPanelProps) {
  const [activeInterval, setActiveInterval] = useState<ChartInterval>("1m");

  const currentInterval = selectedInterval ?? activeInterval;

  const toggleTool = (tool: DrawingTool) => {
    onDrawingToolChange?.(drawingTool === tool ? null : tool);
  };

  const toolButtonClass = (tool: DrawingTool) =>
    `rounded px-2 py-0.5 text-xs ${
      drawingTool === tool
        ? "bg-terminal-accent text-white"
        : "text-terminal-muted hover:text-terminal-text"
    }`;

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

      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Chart drawing tools"
        data-testid="drawing-tools"
      >
        {DRAWING_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            data-testid={`drawing-tool-${tool.id}`}
            title={tool.hint}
            aria-pressed={drawingTool === tool.id}
            onClick={() => toggleTool(tool.id)}
            className={toolButtonClass(tool.id)}
          >
            {tool.label}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-terminal-border" role="separator" />

        <button
          type="button"
          data-testid="drawing-tool-select"
          title={SELECT_TOOL.hint}
          aria-pressed={drawingTool === SELECT_TOOL.id}
          onClick={() => toggleTool(SELECT_TOOL.id)}
          className={toolButtonClass(SELECT_TOOL.id)}
        >
          {SELECT_TOOL.label}
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-terminal-border" role="separator" />

      <button
        type="button"
        disabled
        title="Settings — available in a later issue"
        className="rounded px-2 py-0.5 text-xs text-terminal-muted opacity-50"
      >
        Settings
      </button>
    </div>
  );
}

export default ToolbarPanel;
