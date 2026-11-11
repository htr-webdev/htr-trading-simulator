/**
 * Central chart area.
 *
 * Hosts the historical candlestick chart (issue #6). Until then it
 * shows an empty labeled placeholder that fills the available space.
 */
function ChartPanel() {
  return (
    <section
      data-testid="chart-panel"
      className="flex flex-1 flex-col bg-terminal-bg"
    >
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-terminal-muted">Chart — coming soon</span>
      </div>
    </section>
  );
}

export default ChartPanel;
