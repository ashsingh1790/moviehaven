# web

## What this codebase does

Next.js 15 App Router frontend for Movie Haven. Authenticated users browse/filter films, manage ratings and watchlists. Auth is custom JWT — `@clerk/nextjs` is installed but completely unused (dead package from earlier scaffold). API calls go to `apps/api` on port 3001 via tRPC.

## Auth shape

- `movie_haven_session` cookie — JWT set by Next.js API routes (`src/app/api/auth/`); `httpOnly: false` intentionally (client reads it to set Authorization header)
- `middleware.ts` — verifies cookie via `jwtVerify` (jose) at the edge; redirects unauthenticated requests to `/sign-in`; public paths: `/`, `/sign-in`, `/sign-up`
- `serverTrpc` — `src/lib/trpc/server.ts`; plain HTTP client for Server Components and API routes; no React Query
- `trpc` — `src/lib/trpc/client.tsx`; TanStack Query client for Client Components; reads cookie and sends `Authorization: Bearer` header
- `SESSION_COOKIE` constant — `src/lib/auth-constants.ts`; `"movie_haven_session"`

## Threat model

1. **Auth bypass** — new routes added to `PUBLIC_PATHS` that should be protected, or routes under `(main)/` that skip middleware
2. **Cookie theft / XSS** — cookie is not httpOnly; any XSS on the domain reads the JWT directly
3. **CSRF on API routes** — Next.js API routes under `src/app/api/auth/` set cookies; missing origin/CSRF checks could allow cross-site session fixation

## Project-specific patterns to flag

- Any import from `@clerk/nextjs` — the package is present but must never be used; Clerk hooks would silently bypass custom auth
- New entries in `PUBLIC_PATHS` in `src/middleware.ts` that expose routes requiring auth
- Next.js API routes that set `movie_haven_session` without checking `sameSite` or `secure` in production
- Server Components calling `trpc.*` (the React Query client) instead of `serverTrpc.*`

## Known false-positives

- `httpOnly: false` on `movie_haven_session` in API route handlers — intentional; client must read the cookie to set the Authorization header for tRPC calls
- `process.env.JWT_SECRET` accessed without null check in `middleware.ts` — throws at request time, not a silent failure; acceptable for edge middleware
- `src/app/(auth)/` route group — intentionally unauthenticated; middleware `isPublic()` covers these paths
