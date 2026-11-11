/**
 * Top toolbar of the trading terminal.
 *
 * Holds terminal-wide controls (symbol, interval, playback). Buttons are
 * wired up in later issues; the placement is final from the start.
 */
function ToolbarPanel() {
  return (
    <div
      data-testid="toolbar-panel"
      className="flex h-10 shrink-0 items-center gap-2 border-b border-terminal-border bg-terminal-panel px-2"
    >
      <span className="text-xs font-semibold text-terminal-muted">Toolbar</span>
    </div>
  );
}

export default ToolbarPanel;
