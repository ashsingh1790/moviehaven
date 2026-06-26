import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import { redis } from "./lib/redis";

export type { AppRouter } from "./trpc/router";

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

await server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
  credentials: true,
});

await server.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: createContext(redis),
  },
});

server.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// Render (and most PaaS) inject PORT; fall back to API_PORT for local dev.
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await redis.connect();
  await server.listen({ port, host });
  console.log(`API server running at http://${host}:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
