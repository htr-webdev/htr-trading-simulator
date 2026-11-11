# HTR Trading Simulator

A historical cryptocurrency market replay and paper trading platform designed to help traders analyze market movements, practice trading strategies, and evaluate trading decisions using historical market data — without risking real money.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-early%20development-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

## Overview

HTR Trading Simulator is a web-based platform for replaying historical cryptocurrency market data and practicing trading in a simulated environment.

The project aims to provide a trading terminal inspired by professional trading platforms, allowing users to explore historical price movements, control market playback, analyze candlestick charts, and manage simulated trading positions.

All trading activities are simulated. The platform does not execute real orders or risk real funds.

## Planned Features

- Historical cryptocurrency market data.
- Interactive candlestick charts.
- Date-based market replay.
- Adjustable playback speed and playback controls.
- Dynamic timeframe aggregation from historical minute data.
- Simulated trading and position management.
- Stop Loss and Take Profit.
- Chart drawing tools for technical analysis.
- Market Watch and trading terminal interface.

_These features are part of the project roadmap and are being developed incrementally._

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- TradingView Lightweight Charts (planned)
- Tailwind CSS (planned)

### Backend

- Node.js
- Fastify
- TypeScript

### Shared & Infrastructure

- npm Workspaces
- TypeScript shared packages
- ESLint
- SQLite (planned)
- Vitest (planned)

## Project Architecture

The project uses a modular monorepo architecture with separate workspaces for the frontend, backend, CLI, and shared code.

```text
htr-trading-simulator/
├── apps/
│   ├── frontend/       # React application
│   ├── backend/        # Fastify API server
│   └── cli/            # Command-line tools
│
├── packages/
│   ├── shared/         # Shared types and definitions
│   └── market-data/    # Historical market data providers and services
│
├── package.json
├── package-lock.json
├── tsconfig.base.json
└── README.md
```

Each workspace has its own responsibilities while shared types and definitions are maintained in a central package.

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/htr-webdev/htr-trading-simulator.git
cd htr-trading-simulator
```

Install dependencies:

```bash
npm install
```

### Development

Start the frontend:

```bash
npm run dev:frontend
```

Start the backend in a separate terminal:

```bash
npm run dev:backend
```

The frontend is served by Vite, while the backend runs on:

```text
http://127.0.0.1:3000
```

Check the backend health endpoint:

```text
http://127.0.0.1:3000/health
```

### CLI

Download historical BTCUSDT candles into a local CSV file:

```bash
npm run dev:cli -- download --symbol BTCUSDT --interval 1m --start 2025-06-01 --end 2025-06-30 --to-file data/btcusdt-2025-06.csv
```

Pass `--from-file` with a previously saved file to extend an existing dataset incrementally; fully covered months are not downloaded again.

Use `--database <path>` to store candles in a local SQLite database instead of (or alongside) CSV files; pass the same database on the next run to resume incrementally, and use the `candles` command to read stored data without downloading. The suggested location is the `data/` directory, which is ignored by Git.

### Build

Build all workspaces:

```bash
npm run build
```

The build process runs in the following order:

1. Shared
2. Market data
3. Backend
4. CLI
5. Frontend

### Code Quality

Run ESLint across all workspaces:

```bash
npm run lint
```

Run the test suite:

```bash
npm run test
```

## Roadmap

Development is organized into two main phases.

### Phase 1 — Project Foundation & Initial Chart

- [x] Initialize repository and project documentation.
- [x] Establish modular project architecture.
- [x] Implement historical market data downloader.
- [x] Implement local market data storage.
- [x] Build the initial trading terminal interface.
- [ ] Implement the historical candlestick chart.

### Phase 2 — Market Replay & Trading Simulation

- [ ] Implement the historical market replay engine.
- [ ] Implement dynamic timeframe aggregation.
- [ ] Implement paper trading and position management.
- [ ] Implement Stop Loss and Take Profit.
- [ ] Implement chart drawing tools.

## Project Status

**Version:** 0.1.0

**Development Stage:** Early Development

The project is currently focused on historical market data processing: downloading, validating, and incrementally extending historical candle data, with storage and replay coming next.

Features will be introduced incrementally as development progresses.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Habib Mirzaei**

- GitHub: [htr-webdev](https://github.com/htr-webdev)
- LinkedIn: [Habib Mirzaei](https://www.linkedin.com/in/habib-mirzaei1995/)

## Repository

[https://github.com/htr-webdev/htr-trading-simulator](https://github.com/htr-webdev/htr-trading-simulator)
