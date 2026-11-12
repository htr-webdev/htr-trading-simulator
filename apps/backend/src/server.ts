import Fastify, { type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { existsSync } from "node:fs";
import type { HealthResponse } from "@htr-trading-simulator/shared";
import { CandleDatabase } from "@htr-trading-simulator/market-data";
import { getCandles, parseCandleQuery } from "./candles.js";
import { ReplayService } from "./replay-service.js";

const DEFAULT_DATABASE_PATH = "data/candles.sqlite";

const DEFAULT_ALLOWED_ORIGIN = "http://127.0.0.1:5199";

const server = Fastify({
  logger: true,
});

/**
 * Allows the frontend dev origin to call the API. The origin is
 * configurable for later deployments via CORS_ALLOWED_ORIGIN.
 */
await server.register(cors, {
  origin: process.env.CORS_ALLOWED_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN,
});

/**
 * Opens the local candle database. A missing file means no data has
 * been downloaded yet; /candles then answers with an empty list
 * instead of failing.
 */
function openCandleDatabase(): CandleDatabase | null {
  const filePath = process.env.CANDLE_DATABASE_PATH ?? DEFAULT_DATABASE_PATH;

  if (!existsSync(filePath)) {
    server.log.info(`Candle database not found at ${filePath}; serving empty data.`);
    return null;
  }

  return new CandleDatabase(filePath);
}

const candleDatabase = openCandleDatabase();

const replayService = new ReplayService();

server.get<{ Reply: HealthResponse }>("/health", async () => {
  return {
    status: "ok",
    service: "HTR Trading Simulator API",
    timestamp: new Date().toISOString(),
  };
});

server.get<{ Querystring: Record<string, string> }>("/candles", async (request, reply) => {
  const parsed = parseCandleQuery(request.query);

  if ("error" in parsed) {
    await reply.status(400).send({ error: parsed.error });
    return;
  }

  return getCandles(candleDatabase, parsed.query);
});

server.post<{ Body: Record<string, unknown> }>("/replay/sessions", async (request, reply) => {
  const body = request.body ?? {};

  const result = replayService.create({
    symbol: typeof body.symbol === "string" ? body.symbol : undefined,
    interval: typeof body.interval === "string" ? body.interval : undefined,
    start: typeof body.start === "string" ? body.start : undefined,
    end: typeof body.end === "string" ? body.end : undefined,
    speed: typeof body.speed === "number" ? body.speed : undefined,
  });

  if ("error" in result) {
    await reply.status(result.status).send({ error: result.error });
    return;
  }

  await reply.status(201).send(result.session);
});

const REPLAY_NOT_FOUND = { error: "Replay session not found." };

function requireSessionId(reply: FastifyReply, sessionId: string): boolean {
  if (!sessionId || replayService.getState(sessionId) === null) {
    void reply.status(404).send(REPLAY_NOT_FOUND);
    return false;
  }

  return true;
}

server.get<{ Params: { sessionId: string } }>("/replay/sessions/:sessionId", async (request, reply) => {
  const state = replayService.getState(request.params.sessionId);

  if (!state) {
    await reply.status(404).send(REPLAY_NOT_FOUND);
    return;
  }

  return state;
});

server.post<{ Params: { sessionId: string } }>("/replay/sessions/:sessionId/play", async (request, reply) => {
  if (!requireSessionId(reply, request.params.sessionId)) {
    return;
  }

  return replayService.play(request.params.sessionId);
});

server.post<{ Params: { sessionId: string } }>("/replay/sessions/:sessionId/pause", async (request, reply) => {
  if (!requireSessionId(reply, request.params.sessionId)) {
    return;
  }

  return replayService.pause(request.params.sessionId);
});

server.post<{ Params: { sessionId: string } }>("/replay/sessions/:sessionId/step", async (request, reply) => {
  if (!requireSessionId(reply, request.params.sessionId)) {
    return;
  }

  return replayService.stepForward(request.params.sessionId);
});

server.post<{ Params: { sessionId: string }; Body: Record<string, unknown> }>(
  "/replay/sessions/:sessionId/speed",
  async (request, reply) => {
    if (!requireSessionId(reply, request.params.sessionId)) {
      return;
    }

    const speed = request.body?.speed;

    if (typeof speed !== "number") {
      await reply.status(400).send({ error: "Missing or invalid speed. Expected a number." });
      return;
    }

    const result = replayService.setSpeed(request.params.sessionId, speed);

    if (!result) {
      await reply.status(404).send(REPLAY_NOT_FOUND);
      return;
    }

    if ("error" in result) {
      await reply.status(400).send({ error: result.error });
      return;
    }

    return result;
  },
);

server.get<{ Params: { sessionId: string } }>("/replay/sessions/:sessionId/candles", async (request, reply) => {
  const result = replayService.getCandlesUntilNow(request.params.sessionId, candleDatabase);

  if ("error" in result) {
    await reply.status(result.status).send({ error: result.error });
    return;
  }

  return result;
});

const start = async (): Promise<void> => {
  try {
    await server.listen({
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || "127.0.0.1",
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    candleDatabase?.close();
  });
}

start();
