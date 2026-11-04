import "./App.css";

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand__name">HTR Trading Simulator</span>
          <span className="app-brand__version">v0.1.0</span>
        </div>
      </header>

      <div className="app-content">
        <section className="app-welcome">
          <h1>Trading Terminal</h1>
          <p>Historical market replay and paper trading platform.</p>
        </section>
      </div>
    </main>
  );
}

export default App;
