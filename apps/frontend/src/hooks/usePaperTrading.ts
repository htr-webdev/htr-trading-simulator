import { useCallback, useEffect, useRef, useState } from "react";
import type { PaperAccountState, TradeDirection } from "@htr-trading-simulator/shared";
import {
  closePaperPosition,
  fetchPaperAccount,
  submitPaperOrder,
  setPaperProtectiveLevels,
  type ProtectiveLevelsInput,
} from "../services/paper-trading-service";

export interface UsePaperTradingResult {
  account: PaperAccountState | null;
  error: string | null;
  isBusy: boolean;
  submitOrder: (direction: TradeDirection, size: number) => Promise<boolean>;
  closePosition: (positionId: string) => Promise<boolean>;
  setProtectiveLevels: (positionId: string, levels: ProtectiveLevelsInput) => Promise<boolean>;
}

interface UsePaperTradingOptions {
  sessionId: string | null;
  /** While the replay plays, the account refreshes on an interval. */
  isPlaying: boolean;
  /** Replay clock position; a change re-values the account. */
  replayTime?: number | null;
}

/** Refresh interval for account valuation while the replay plays. */
const PLAY_POLL_MS = 1000;

interface AccountSnapshot {
  sessionId: string;
  account: PaperAccountState | null;
  error: string | null;
}

/**
 * Owns the paper trading account of the active replay session:
 * loading its state, submitting market orders and closing positions.
 * Fills happen on the backend at the current replay price.
 *
 * Account data is stored per session id; a snapshot from another
 * session renders as null until the first fetch lands.
 */
export function usePaperTrading({
  sessionId,
  isPlaying,
  replayTime = null,
}: UsePaperTradingOptions): UsePaperTradingResult {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const store = useCallback(
    (id: string, result: { status: string; message?: string; account?: PaperAccountState }) => {
      setSnapshot((previous): AccountSnapshot | null => {
        // Ignore stale responses from a session we already left.
        if (previous !== null && previous.sessionId !== id) {
          return previous;
        }

        if (result.status !== "success") {
          return {
            sessionId: id,
            account: previous?.account ?? null,
            error: result.message ?? "Unknown trading error.",
          };
        }

        return { sessionId: id, account: result.account as PaperAccountState, error: null };
      });
    },
    [],
  );

  const refresh = useCallback(
    (id: string) => {
      return fetchPaperAccount(id).then((result) => {
        store(id, result);
      });
    },
    [store],
  );

  // Load the account once per session and refresh while playing so
  // equity and unrealized PnL follow the replay price.
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void refreshRef.current(sessionId);
  }, [sessionId, replayTime]);

  useEffect(() => {
    if (!sessionId || !isPlaying) {
      return;
    }

    const timer = setInterval(() => {
      void refreshRef.current(sessionId);
    }, PLAY_POLL_MS);

    return () => clearInterval(timer);
  }, [sessionId, isPlaying]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setIsBusy(true);

    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const submitOrder = useCallback(
    (direction: TradeDirection, size: number) => {
      if (!sessionId) {
        return Promise.resolve(false);
      }

      return run(async () => {
        const result = await submitPaperOrder(sessionId, direction, size);

        store(sessionId, result);
      }).then(() => true);
    },
    [run, sessionId, store],
  );

  const closePosition = useCallback(
    (positionId: string) => {
      if (!sessionId) {
        return Promise.resolve(false);
      }

      return run(async () => {
        const result = await closePaperPosition(sessionId, positionId);

        store(sessionId, result);
      }).then(() => true);
    },
    [run, sessionId, store],
  );

  const setProtectiveLevels = useCallback(
    (positionId: string, levels: ProtectiveLevelsInput) => {
      if (!sessionId) {
        return Promise.resolve(false);
      }

      return run(async () => {
        const result = await setPaperProtectiveLevels(sessionId, positionId, levels);

        store(sessionId, result);
      }).then(() => true);
    },
    [run, sessionId, store],
  );

  const account = snapshot !== null && snapshot.sessionId === sessionId ? snapshot.account : null;
  const error = snapshot !== null && snapshot.sessionId === sessionId ? snapshot.error : null;

  return { account, error, isBusy, submitOrder, closePosition, setProtectiveLevels };
}
