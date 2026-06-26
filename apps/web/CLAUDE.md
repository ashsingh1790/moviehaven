# CLAUDE.md — apps/web

Next.js 15 App Router. Port 3000. Entry point: `src/app/layout.tsx`.

## Critical gotchas

1. **Two tRPC clients — wrong client in wrong context breaks builds or drops auth.** `src/lib/trpc/server.ts` exports `serverTrpc`: plain HTTP, no React Query, for Server Components and API route handlers. `src/lib/trpc/client.tsx` exports `trpc`: TanStack Query-backed, for Client Components only (`"use client"`). Mixing them causes either a "hooks called outside React" build error or requests that silently omit the auth cookie.

2. **`AuthProvider` is hydrated server-side — don't fetch `auth.me` again client-side.** `src/app/layout.tsx` calls `serverTrpc.auth.me` and passes the result into `AuthProvider` as `initialUser`. Adding a `trpc.auth.me.useQuery()` call in a child component causes a redundant network request and a flash of logged-out state.

3. **Middleware runs at the edge — no Node.js APIs, no `db`, no `redis`.** `src/middleware.ts` uses only `jose` (WebCrypto). If you need server-side data during auth, use a Server Component or API route instead.

4. **Film filter state lives in the URL via nuqs.** `src/hooks/use-film-filters.ts` reads/writes search params. Don't shadow filter values with `useState` — it will desync from the URL on browser back/forward.

5. **`@clerk/nextjs` is installed but not wired up.** Do not import or use any Clerk helpers. Auth is fully custom JWT.

## Structure

```
src/
  app/
    layout.tsx              ← root layout; hydrates AuthProvider server-side
    page.tsx                ← root redirect (→ /films)
    (auth)/                 ← unauthenticated route group (no middleware check)
      sign-in/
      sign-up/
    (main)/                 ← authenticated route group
      films/                ← film browser (faceted search)
    api/auth/               ← Next.js API routes that set/clear the JWT cookie
      login/
      register/
      logout/
  components/
    film-card/              ← FilmCard component
    filters/                ← FacetedFilter, SortChips, RangeFilter, etc.
    layout/                 ← Header, Sidebar
  contexts/
    auth-context.tsx        ← AuthProvider + useAuth hook
  hooks/
    use-film-filters.ts     ← nuqs-backed URL filter state
  lib/
    auth.ts                 ← client-side cookie helpers
    auth-constants.ts       ← SESSION_COOKIE name
    trpc/
      server.ts             ← serverTrpc (Server Components / API routes)
      client.tsx            ← trpc (Client Components)
      provider.tsx          ← TRPCReactProvider (wraps TanStack QueryClient)
    utils.ts                ← cn() helper (clsx + tailwind-merge)
  middleware.ts             ← JWT verification at edge; redirects to /sign-in
```

## Auth flow (web side)

1. `POST /api/auth/login` or `/api/auth/register` → calls API server-side → sets `movie_haven_session` cookie
2. Middleware verifies the cookie on every non-public request
3. `serverTrpc` (server.ts) makes plain HTTP calls — no auth header; used for server-side hydration only
4. `trpc` (client.tsx) adds the cookie as `Authorization: Bearer` header via the TanStack Query link

## Commands

```bash
pnpm --filter @movie-haven/web dev          # next dev --turbopack
pnpm --filter @movie-haven/web type-check   # tsc --noEmit
pnpm --filter @movie-haven/web lint         # biome lint --write
pnpm --filter @movie-haven/web build        # next build
```

## Environment

Required in `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=<must match apps/api/.env>
```
