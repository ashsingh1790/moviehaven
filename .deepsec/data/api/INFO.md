# api

## What this codebase does

Fastify 5 HTTP server exposing a tRPC v11 API for Movie Haven — a film discovery platform. Handles user auth, film search/browse (Postgres DB seeded via TMDB), user ratings, reviews, and watchlists. Serves `apps/web` on port 3001. External calls: TMDB API (read-only), Redis (cache), Postgres (Drizzle ORM).

## Auth shape

- `signToken` / `verifyToken` — `src/lib/jwt.ts`; HS256 via `jose`, 24h expiry, payload `{ userId, email }`
- `createContext` — `src/trpc/context.ts`; extracts `userId` from `Authorization: Bearer` header; sets `ctx.userId = null` if token missing/invalid
- `publicProcedure` — open to unauthenticated callers
- `protectedProcedure` — `src/trpc/init.ts`; throws UNAUTHORIZED when `ctx.userId` is null; narrows type to `string`
- Password: bcrypt via `hashPassword`/`verifyPassword` (`src/lib/password.ts`); login uses constant-time dummy compare

## Threat model

1. **Broken object-level auth** — user-owned rows (ratings, reviews, lists) must be scoped to `ctx.userId`; a query filtering only by resource ID leaks other users' data
2. **Privilege escalation** — `publicProcedure` used where `protectedProcedure` is required; any mutation touching user data without auth guard
3. **TMDB key exfiltration** — `TMDB_READ_ACCESS_TOKEN` must never appear in any API response body

## Project-specific patterns to flag

- Mutations on `ratings`, `reviews`, or `lists` tables that filter by resource ID only — e.g. `eq(ratings.id, input.id)` without `and(eq(ratings.userId, ctx.userId))`
- Any procedure touching user-owned data using `publicProcedure` instead of `protectedProcedure`
- `sql\`...\`` template with user-supplied values interpolated outside Drizzle's parameterized helpers

## Known false-positives

- `dummyHash` constant in `src/trpc/routers/auth.ts` — intentional timing-attack mitigation, not a hardcoded credential
- `GET /health` — intentionally public; returns only `{ status, timestamp }`
- `generateUsername` and `suggestUsernames` auth procedures — intentionally public; return only random strings
- `ALLOWED_ORIGINS` split from env at startup — safe; not user-controlled at runtime
