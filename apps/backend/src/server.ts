import Fastify from "fastify";

const server = Fastify({
  logger: true,
});

server.get("/health", async () => {
  return {
    status: "ok",
    service: "HTR Trading Simulator API",
    timestamp: new Date().toISOString(),
  };
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

start();
