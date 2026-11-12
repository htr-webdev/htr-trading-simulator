/**
 * Chart theme wired to the terminal palette (src/styles/index.css).
 * Keep these values in sync with the `--color-terminal-*` tokens.
 */
export const CHART_THEME = {
  layout: {
    background: { color: "#0b0e14" },
    textColor: "#787b86",
    fontSize: 12,
  },
  grid: {
    vertLines: { color: "#1c2230" },
    horzLines: { color: "#1c2230" },
  },
  crosshair: {
    mode: 0,
  },
  // Explicit interaction behavior (issue #6 acceptance): horizontal
  // scrolling and wheel zoom on; vertical scrolling off (time-only data).
  handleScroll: {
    mouseWheel: false,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: false,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: {
      time: true,
      price: true,
    },
    axisDoubleClickReset: {
      time: true,
      price: true,
    },
  },
  timeScale: {
    borderColor: "#2a2e39",
  },
  rightPriceScale: {
    borderColor: "#2a2e39",
  },
  candlestick: {
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderUpColor: "#26a69a",
    borderDownColor: "#ef5350",
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  },
} as const;
