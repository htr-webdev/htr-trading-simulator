/**
 * Market Watch side panel.
 *
 * Lists tradable symbols with their prices. Symbol data is filled in
 * by the market-watch feature; this shell fixes the layout.
 */
function MarketWatchPanel() {
  return (
    <aside
      data-testid="market-watch-panel"
      className="flex w-56 shrink-0 flex-col border-r border-terminal-border bg-terminal-panel"
    >
      <h2 className="border-b border-terminal-border px-2 py-1.5 text-xs font-semibold text-terminal-muted">
        Market Watch
      </h2>

      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-terminal-muted">No symbols</span>
      </div>
    </aside>
  );
}

export default MarketWatchPanel;
