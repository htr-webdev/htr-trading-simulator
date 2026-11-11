/**
 * Root shell of the trading terminal.
 *
 * Panel composition (Market Watch, chart, terminal) is built up in
 * separate components; this file only holds the dark canvas.
 */
function App() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-terminal-bg text-terminal-text">
      <h1 className="px-4 py-3 text-sm font-semibold text-terminal-muted">
        HTR Trading Simulator
      </h1>
    </div>
  );
}

export default App;
