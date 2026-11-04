import type { HealthResponse } from "@htr-trading-simulator/shared";
import "./App.css";

const initialHealth: HealthResponse = {
  status: "ok",
  service: "HTR Trading Simulator API",
  timestamp: new Date().toISOString(),
};

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
          <p>API Status: {initialHealth.status}</p>
        </section>
      </div>
    </main>
  );
}

export default App;
