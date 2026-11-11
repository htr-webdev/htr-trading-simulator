export const CHART_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number];

export const INTERVAL_LABELS: Record<ChartInterval, string> = {
  "1m": "M1",
  "5m": "M5",
  "15m": "M15",
  "1h": "H1",
  "4h": "H4",
  "1d": "D1",
};
