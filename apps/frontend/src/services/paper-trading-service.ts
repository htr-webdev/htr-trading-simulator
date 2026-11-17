import type { PaperAccountState, TradeDirection } from "@htr-trading-simulator/shared";
import { API_BASE_URL } from "./candles-service";

export type PaperAccountResult =
  | { status: "success"; account: PaperAccountState }
  | { status: "error"; message: string };

/**
 * Shared error handling for paper trading API calls: connection
 * failures and backend error messages surface as an error result.
 */
async function requestAccount(url: string, init?: RequestInit): Promise<PaperAccountResult> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    return {
      status: "error",
      message: "Cannot reach the API server. Is the backend running?",
    };
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const body = (await response.json()) as { error?: string };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the generic status message.
    }

    return { status: "error", message };
  }

  const account = (await response.json()) as PaperAccountState;

  return { status: "success", account };
}

/** Fetches the paper trading account of a replay session. */
export async function fetchPaperAccount(sessionId: string): Promise<PaperAccountResult> {
  return requestAccount(`${API_BASE_URL}/replay/sessions/${sessionId}/account`);
}

/** Submits a market order (buy = long, sell = short) to the session. */
export async function submitPaperOrder(
  sessionId: string,
  direction: TradeDirection,
  size: number,
): Promise<PaperAccountResult> {
  return requestAccount(`${API_BASE_URL}/replay/sessions/${sessionId}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction, size }),
  });
}

/** Closes an open position at the current replay price. */
export async function closePaperPosition(
  sessionId: string,
  positionId: string,
): Promise<PaperAccountResult> {
  return requestAccount(
    `${API_BASE_URL}/replay/sessions/${sessionId}/positions/${positionId}/close`,
    { method: "POST" },
  );
}

export interface ProtectiveLevelsInput {
  /** Number to set, null to clear, undefined to leave unchanged. */
  stopLoss?: number | null;
  /** Number to set, null to clear, undefined to leave unchanged. */
  takeProfit?: number | null;
}

/** Sets, edits or clears a position's stop-loss / take-profit levels. */
export async function setPaperProtectiveLevels(
  sessionId: string,
  positionId: string,
  levels: ProtectiveLevelsInput,
): Promise<PaperAccountResult> {
  return requestAccount(
    `${API_BASE_URL}/replay/sessions/${sessionId}/positions/${positionId}/sl-tp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(levels),
    },
  );
}
