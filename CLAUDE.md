# CLAUDE.md — Movie Haven

> Root context for Claude Code. Kept intentionally **short**: gotchas and pointers only.
> Per-directory `CLAUDE.md` files add local detail — Claude loads them additively as it descends.
>
> **Companion files** (open directly when needed — not loaded automatically):
> - @README.md — project overview
> - @.claude/docs/PRD.md — product requirements
> - @.claude/docs/STORIES.md — user stories
> - @.claude/docs/TESTING.md — test strategy and examples
> - @.claude/settings.json — Claude Code permissions

---

## Critical gotchas

1. **`@clerk/nextjs` is installed but NOT used for auth.** Auth is custom JWT via `jose`. Never call `auth()`, `currentUser()`, or any Clerk hook — the middleware and API context do their own JWT verification. The package exists from an earlier scaffold and has not been removed.

2. **`apps/web` has two tRPC clients — use the right one.** `src/lib/trpc/server.ts` (`serverTrpc`) is a plain HTTP client for Server Components and API route handlers. `src/lib/trpc/client.tsx` (`trpc`) is the TanStack Query-backed client for Client Components only. Using `serverTrpc` in a Client Component (or `trpc` in a Server Component) causes build errors or missing auth headers.

3. **`JWT_SECRET` must be identical in both apps.** `apps/api/.env` and `apps/web/.env.local` both verify the same tokens with the same secret. A mismatch produces silent 401s on every protected call — nothing in the error message hints at a key mismatch.

4. **`@movie-haven/api` is a `devDependency` in `apps/web` — types only.** It is imported exclusively as `import type { AppRouter } from "@movie-haven/api"`. Never import a runtime value from it; the actual server runs separately on port 3001.

5. **Biome replaces both ESLint and Prettier.** Do not add `.eslintrc` files or run `prettier`. The single source of truth is `biome.json` at the repo root. Use `pnpm check` to lint + format-check, `pnpm format` to auto-fix formatting.

6. **Film filter state is URL-synced via nuqs, not React state.** `apps/web/src/hooks/use-film-filters.ts` reads and writes URL search params. Do not introduce a parallel `useState` for the same filters — it will desync from the URL on navigation.

---

## Codebase map

| Path | What lives here |
|------|-----------------|
| `apps/api/` | Fastify 5 + tRPC v11 server; port 3001. See `apps/api/CLAUDE.md`. |
| `apps/web/` | Next.js 15 App Router; port 3000. See `apps/web/CLAUDE.md`. |
| `packages/db/` | Drizzle ORM schema + Postgres client (`@movie-haven/db`). See `packages/db/CLAUDE.md`. |
| `packages/types/` | Shared TypeScript types: `Film`, `FilmCard`, `User`, `FilmSearchParams` (`@movie-haven/types`). |
| `packages/ui/` | Shared shadcn/ui components: Button, Badge, Card, Slider, etc. (`@movie-haven/ui`). |
| `packages/config/` | Shared tsconfig presets and Biome config (`@movie-haven/config`). |
| `.claude/docs/` | PRD, user stories, testing guide, implementation audit. Not auto-loaded. |
| `plans/` | Iterative-planner artifacts (findings, decisions, changelogs). Not auto-loaded. |

---

## Build & test commands

| Scope | Dev | Type-check | Lint/format |
|-------|-----|------------|-------------|
| API only | `pnpm --filter @movie-haven/api dev` | `pnpm --filter @movie-haven/api type-check` | `pnpm --filter @movie-haven/api lint` |
| Web only | `pnpm --filter @movie-haven/web dev` | `pnpm --filter @movie-haven/web type-check` | `pnpm --filter @movie-haven/web lint` |
| All apps | `pnpm dev` | `pnpm type-check` | `pnpm check` |
| DB migrations | — | — | `pnpm db:push` (dev) · `pnpm db:migrate` (prod) |
| Local infra | `pnpm infra:up` | — | `pnpm infra:down` · `pnpm infra:reset` |

Whole-repo `pnpm dev` starts both apps concurrently via Turborepo. Infra (Postgres + Redis) must be running first.

---

## Naming conventions

- **Files:** kebab-case (`film-card.tsx`, `use-film-filters.ts`)
- **Types / interfaces:** PascalCase (`FilmCard`, `AppRouter`)
- **Functions / variables:** camelCase (`serverTrpc`, `createContext`)
- **React components:** PascalCase filename, matching export (`FilmCard.tsx → export function FilmCard`)
- **Tests:** `*.test.ts` / `*.test.tsx` co-located with the file under test

Formatter (Biome) enforces formatting. Naming is enforced by code review.

---

<!--
Maintenance:
- Last reviewed: 2026-06-25
- Reviewed against model: claude-sonnet-4-6
-->
