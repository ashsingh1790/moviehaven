import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "@movie-haven/db";
import type { Redis } from "ioredis";
import { verifyToken } from "../lib/jwt";

export type Context = {
  db: typeof db;
  redis: Redis;
  userId: string | null;
};

export function createContext(redis: Redis) {
  return async ({ req }: CreateFastifyContextOptions): Promise<Context> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;
    if (token) {
      const payload = await verifyToken(token);
      userId = payload?.userId ?? null;
    }

    return { db, redis, userId };
  };
}
