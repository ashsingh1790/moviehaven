# CLAUDE.md — apps/api

Fastify 5 HTTP server running tRPC v11. Port 3001. Entry point: `src/index.ts`.

## Critical gotchas

1. **`protectedProcedure` re-narrows `userId` to `string` (non-null).** The base `Context` has `userId: string | null`. The protected middleware asserts non-null and passes `{ ...ctx, userId: ctx.userId }` — so inside a protected procedure `ctx.userId` is always `string`. Don't add redundant null checks.

2. **All tRPC procedures use `SuperJSON` as the transformer.** This is set in `src/trpc/init.ts`. Any new router or procedure that returns non-JSON-serializable values (Date, Map, BigInt) is handled automatically — don't stringify them manually.

3. **Redis is injected into context at startup, not imported per-request.** The `createContext` factory closes over the `redis` instance created in `src/index.ts`. Don't import `redis` directly in routers; always use `ctx.redis`.

4. **`TMDB_READ_ACCESS_TOKEN` is required at startup.** `src/lib/tmdb.ts` throws if the env var is missing. The server won't boot without it even if you're not hitting TMDB routes.

## Structure

```
src/
  index.ts               ← Fastify server setup, CORS, rate-limit, tRPC adapter
  lib/
    jwt.ts               ← signToken / verifyToken (jose)
    password.ts          ← bcrypt hash/compare helpers
    redis.ts             ← ioredis client
    tmdb.ts              ← TMDB API client (film metadata seeding)
    username-generator.ts← random username on registration
  trpc/
    init.ts              ← t, router, publicProcedure, protectedProcedure
    context.ts           ← Context type + createContext factory
    router.ts            ← AppRouter (combines sub-routers)
    routers/
      auth.ts            ← register, login, me
      films.ts           ← list, search, getById
      lists.ts           ← CRUD for user lists
      tmdb.ts            ← seed/sync from TMDB
      users.ts           ← profile, ratings
```

## Commands

```bash
pnpm --filter @movie-haven/api dev          # tsx watch (hot-reload)
pnpm --filter @movie-haven/api type-check   # tsc --noEmit
pnpm --filter @movie-haven/api lint         # biome lint --write
pnpm --filter @movie-haven/api build        # tsc → dist/
```

## Environment

Required in `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/movie_haven
REDIS_URL=redis://localhost:6379
JWT_SECRET=<must match apps/web/.env.local>
TMDB_READ_ACCESS_TOKEN=<from api.themoviedb.org>
ALLOWED_ORIGINS=http://localhost:3000
```
