import Fastify from "fastify";
import cors from "@fastify/cors";
import { existsSync } from "node:fs";
import type { HealthResponse } from "@htr-trading-simulator/shared";
import { CandleDatabase } from "@htr-trading-simulator/market-data";
import { getCandles, parseCandleQuery } from "./candles.js";

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
