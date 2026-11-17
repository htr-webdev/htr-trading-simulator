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

## Features

Implemented so far:

- Historical cryptocurrency market data (CLI downloader, local SQLite storage).
- Interactive candlestick charts (TradingView Lightweight Charts).
- Date-based market replay with play/pause, single-candle stepping and 0.25x–10x playback speeds.
- Future candles stay hidden during replay — exactly like real market conditions.
- Dynamic timeframe aggregation: 1m to 1D charts generated from the same 1-minute data, no extra downloads.
- Paper trading with market orders (long/short), multiple simultaneous positions, live unrealized/realized PnL, balance and equity.
- Stop Loss / Take Profit per position: set, edit or clear levels from the terminal; positions close automatically when the replay hits a level, and the trade records the exit reason and execution price.
- Market Watch and a trading terminal interface (desktop and mobile layouts).

Planned next:

- Stop Loss and Take Profit.
- Chart drawing tools for technical analysis.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- TradingView Lightweight Charts
- Tailwind CSS

### Backend

- Node.js
- Fastify
- TypeScript

### Shared & Infrastructure

- npm Workspaces
- TypeScript shared packages
- ESLint
- SQLite
- Vitest

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

### Using the Terminal

Replay and paper trading read candles from the local database, so the
backend needs to know where it lives:

```bash
# PowerShell
$env:CANDLE_DATABASE_PATH = "path\to\candles.sqlite"
npm run dev:backend
```

Then open the frontend, press **Start** in the REPLAY bar to begin a
replay session, and use the playback controls (play/pause, step,
speed) to move through history. Buy and Sell buttons open paper
positions at the current replay price; the terminal panel tracks
balance, equity, unrealized/realized PnL and lets you close positions
at any time.

### Paper Trading Execution Rules

Positions are filled and valued only with candles already revealed by
the replay clock. Stop-loss / take-profit levels follow these
deterministic rules:

- Levels are monitored candle by candle, in chronological order, over
  each fully closed candle's high/low range. The newest revealed
  candle (the forming one) is evaluated once the replay clock moves
  past it.
- A position closes exactly at its trigger price — execution is
  pessimistic, never fills at a better price.
- If both the stop-loss and the take-profit fall inside a single
  candle's range, the stop-loss is assumed to hit first (the
  conservative worst case).
- Valid levels: for a long position, stop-loss below the entry price
  and take-profit above it; mirrored for shorts. Levels can be set,
  edited or cleared any time while the position is open, and every
  closed trade records its exit reason (`manual`, `stop-loss` or
  `take-profit`) alongside the execution price.

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
- [x] Implement the historical candlestick chart.

### Phase 2 — Market Replay & Trading Simulation

- [x] Implement the historical market replay engine.
- [x] Implement dynamic timeframe aggregation.
- [x] Implement paper trading and position management.
- [x] Implement Stop Loss and Take Profit.
- [ ] Implement chart drawing tools.

## Project Status

**Version:** 0.1.0

**Development Stage:** Early Development

The foundation is in place: historical data downloading and storage, the trading terminal interface, candlestick charts, the market replay engine, dynamic timeframe aggregation, and paper trading with position management. Development now focuses on trade risk management (Stop Loss / Take Profit) and chart drawing tools.

Features will be introduced incrementally as development progresses.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Habib Mirzaei**

- GitHub: [htr-webdev](https://github.com/htr-webdev)
- LinkedIn: [Habib Mirzaei](https://www.linkedin.com/in/habib-mirzaei1995/)

## Repository

[https://github.com/htr-webdev/htr-trading-simulator](https://github.com/htr-webdev/htr-trading-simulator)
