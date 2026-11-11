/**
 * Bottom terminal panel.
 *
 * Hosts the trading controls (positions, orders) built up by the
 * trading feature; this shell fixes the layout.
 */
function TerminalPanel() {
  return (
    <section
      data-testid="terminal-panel"
      className="flex h-40 shrink-0 flex-col border-t border-terminal-border bg-terminal-panel"
    >
      <h2 className="border-b border-terminal-border px-2 py-1.5 text-xs font-semibold text-terminal-muted">
        Terminal
      </h2>

      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-terminal-muted">No positions</span>
      </div>
    </section>
  );
}

export default TerminalPanel;
