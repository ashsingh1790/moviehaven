# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start all apps in dev mode
pnpm dev

# Run a single app/package
pnpm --filter @movie-haven/web dev
pnpm --filter @movie-haven/api dev

# Build, lint, type-check (all run via Turborepo)
pnpm build
pnpm lint
pnpm type-check
pnpm format

# Testing (Test-Driven Development)
pnpm test             # Run all tests (watch mode)
pnpm test:unit        # Run unit tests once
pnpm test:integration # Run integration tests once
pnpm test:e2e         # Run end-to-end tests (Playwright)
pnpm test:ui          # Open test UI dashboard
pnpm test:coverage    # Check test coverage
pnpm test:watch       # Run tests in watch mode
pnpm test:debug       # Debug tests in browser

# Local infrastructure (Postgres + Redis via Docker)
pnpm infra:up
pnpm infra:down
pnpm infra:reset      # wipes volumes

# Database (Drizzle ORM)
pnpm db:push          # push schema without migration file
pnpm db:generate      # generate migration file
pnpm db:migrate       # apply migrations
pnpm db:studio        # Drizzle Studio UI
```

Node 22+ and pnpm 9+ are required (see `.nvmrc`).

## Architecture

This is a **pnpm + Turborepo monorepo** with two apps and four packages.

### Apps

**`apps/api`** — Fastify 5 HTTP server running tRPC v11. Exports `AppRouter` as a TypeScript type (used by the web app for end-to-end type safety). Entry point: `src/index.ts`. Runs on port 3001.

- tRPC router: `src/trpc/router.ts` — combines `auth`, `films`, `users`, `lists`, `tmdb` sub-routers
- Context (`src/trpc/context.ts`): provides `db`, `redis`, and `userId` (extracted from Bearer JWT) to every procedure
- `publicProcedure` / `protectedProcedure` defined in `src/trpc/init.ts` — protected procedures throw UNAUTHORIZED if `userId` is null

**`apps/web`** — Next.js 15 App Router. Runs on port 3000.

- Route groups: `(auth)` for sign-in/sign-up, `(main)` for authenticated app
- Next.js middleware (`src/middleware.ts`): verifies JWT cookie at the edge; redirects unauthenticated users to `/sign-in`
- Two tRPC clients:
  - `src/lib/trpc/server.ts` — plain HTTP client for Server Components and API routes (no React Query)
  - `src/lib/trpc/client.tsx` + `provider.tsx` — TanStack Query-backed client for Client Components
- Auth state: `AuthProvider` (`src/contexts/auth-context.tsx`) is hydrated server-side in `layout.tsx` via `serverTrpc.auth.me`
- Film filter state is URL-synced via **nuqs** (`src/hooks/use-film-filters.ts`)

### Packages

| Package | Purpose |
|---|---|
| `@movie-haven/db` | Drizzle ORM schema + client. Tables: `users`, `films`, `ratings`, `lists`, `listItems`, `streamingAvailability` |
| `@movie-haven/types` | Shared TypeScript types: `Film`, `FilmCard`, `User`, `FilmSearchParams`, `SortChip`, `SearchResult` |
| `@movie-haven/ui` | Shared shadcn/ui components (Button, Badge, Card, Slider, etc.) |
| `@movie-haven/config` | Shared tsconfig presets and ESLint 9 flat configs |

### Auth flow

Auth uses **custom JWT** (via `jose`), not Clerk (the package is installed but not wired into auth logic).

1. Web API routes (`/api/auth/login`, `/api/auth/register`) call the tRPC API server-side and receive a JWT
2. JWT is set as a cookie (`movie_haven_session`) by the Next.js route handler
3. Middleware reads and verifies the cookie on every request
4. Client-side tRPC reads the cookie and forwards it as a `Authorization: Bearer` header to the API
5. API context extracts `userId` from the Bearer token for protected procedures

### Testing Strategy (Test-Driven Development)

Movie Haven uses **TDD (Test-Driven Development)**:
1. **Write tests first** (RED phase) — test will fail
2. **Write minimal code** (GREEN phase) — make test pass
3. **Refactor** (REFACTOR phase) — improve code while tests stay green

**Test Coverage:**
- **Unit tests** (60%) — Individual functions in isolation (Vitest)
- **Integration tests** (30%) — APIs with real DB (Vitest + test database)
- **E2E tests** (10%) — User flows in browser (Playwright)

**Coverage Targets:**
- Auth routes: 90%
- Recommendation engine: 85%
- Films API: 80%
- Overall: 80% minimum

See [TESTING.md](./TESTING.md) for detailed guide, examples, and best practices.

### Data sources

- **TMDB API** (`apps/api/src/lib/tmdb.ts`): film metadata seeding. Requires `TMDB_READ_ACCESS_TOKEN`.
- **Redis** (`apps/api/src/lib/redis.ts`): caching layer (streaming availability cache TTL ~24h planned).

## Environment Setup

Copy `.env.example` files and fill in values:

- `apps/api/.env`: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TMDB_READ_ACCESS_TOKEN`, `ALLOWED_ORIGINS`
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`, `JWT_SECRET`

The `JWT_SECRET` must match between `apps/api` and `apps/web` — both verify the same tokens.

Local defaults (with Docker infra running):
- `DATABASE_URL=postgresql://postgres:password@localhost:5432/movie_haven`
- `REDIS_URL=redis://localhost:6379`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
