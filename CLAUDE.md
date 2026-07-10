# CLAUDE.md — Movie Haven

Movie Haven is an intelligent film discovery platform — personalized recommendations, watchlists, ratings, reviews, and streaming availability in one place. This repo is a **pnpm + Turborepo monorepo** containing the web frontend (`apps/web`), the API server (`apps/api`), and shared packages for the database schema, types, UI components, and config (`packages/*`). See [`README.md`](./README.md) for the full overview.

---

> Root context for Claude Code. Kept intentionally **short**: gotchas and pointers only.
> Per-directory `CLAUDE.md` files add local detail — Claude loads them additively as it descends.
>
> **Companion files** (open directly when needed — not loaded automatically):
> - @README.md — project overview
> - @docs/PRD.md — product requirements
> - @docs/STORIES.md — user stories
> - @docs/TESTING.md — test strategy and examples
> - @.claude/settings.json — Claude Code permissions

---

## Coding guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### Verify before reporting complete

Before reporting any task as complete, verify it actually works:

- Run the tests, execute the script, check the output yourself.
- For TypeScript: run `tsc --noEmit` and fix every type error.
- For builds: run the build command and confirm it succeeds.
- If you cannot verify (no test exists, can't run the code), say so explicitly. Don't imply success.

---

## Installed CLI tools (use these, not the defaults)

`/opt/homebrew/bin` is not on Claude Code's PATH — use full paths for Homebrew tools or prefix with `/opt/homebrew/bin/`.

- `ripgrep` (`rg`) is installed — prefer over `grep` (on PATH)
- `fd` is installed — prefer over `find` (use `/opt/homebrew/bin/fd`)
- `sd` is installed — prefer over `sed` (use `/opt/homebrew/bin/sd`)
- `jq` is installed — use for JSON processing (use `/opt/homebrew/bin/jq`)
- `gh` is installed — use for all GitHub operations (use `/opt/homebrew/bin/gh`)

---

## Learn from corrections

Persistent lessons live in [`learnings.md`](./.claude/learnings.md) — read it at the start of every task and follow every rule there.

When the user corrects a mistake you made:

1. Apply the correction.
2. Append a rule to `learnings.md` so the same mistake doesn't recur.
3. Show the user the new rule before continuing.

---

## Critical gotchas

1. **`@clerk/nextjs` is installed but NOT used for auth.** Auth is custom JWT via `jose`. Never call `auth()`, `currentUser()`, or any Clerk hook — the middleware and API context do their own JWT verification. The package exists from an earlier scaffold and has not been removed.

2. **`apps/web` has two tRPC clients — use the right one.** `src/lib/trpc/server.ts` (`serverTrpc`) is a plain HTTP client for Server Components and API route handlers. `src/lib/trpc/client.tsx` (`trpc`) is the TanStack Query-backed client for Client Components only. Using `serverTrpc` in a Client Component (or `trpc` in a Server Component) causes build errors or missing auth headers.

3. **`JWT_SECRET` must be identical in both apps.** `apps/api/.env` and `apps/web/.env.local` both verify the same tokens with the same secret. A mismatch produces silent 401s on every protected call — nothing in the error message hints at a key mismatch.

4. **`@movie-haven/api` is a `devDependency` in `apps/web` — types only.** It is imported exclusively as `import type { AppRouter } from "@movie-haven/api"`. Never import a runtime value from it; the actual server runs separately on port 3001.

5. **Biome replaces both ESLint and Prettier.** Do not add `.eslintrc` files or run `prettier`. The single source of truth is `biome.json` at the repo root. Use `pnpm check` to lint + format-check, `pnpm format` to auto-fix formatting. Note: `pnpm check` is **not** a clean gate today — the baseline has ~200 pre-existing errors (recommended rules like `noNonNullAssertion`, `useButtonType` are on). Keep new code clean; don't expect a passing baseline.

7. **Deepsec workspace belongs at the repo root, not per-app.** A single `.deepsec/` at the monorepo root manages both `apps/api` and `apps/web` as separate projects (`{ id: "api", root: "apps/api" }`, `{ id: "web", root: "apps/web" }`). Per-app workspaces (`apps/api/.deepsec/`) are non-standard and should be removed.

6. **Film filter state is URL-synced via nuqs, not React state.** `apps/web/src/hooks/use-film-filters.ts` reads and writes URL search params. Do not introduce a parallel `useState` for the same filters — it will desync from the URL on navigation.

7. **Tickets live in GitHub Issues (`ashsingh1790/moviehaven`), not local files.** Phase 1 is now the **groundwork** phase — the agentic-harness foundation, issues #21–#53 (`GW-A1`…`GW-E6`); feature stories #7–#13 moved to the **Phase 2** milestone. Label taxonomy: `status:{backlog,ready,in-progress,review,done,blocked}`, `phase:{1-5}`, `type:{feature,bug,spike,chore}`, `area:{harness,agents,testing,security,frontend}`. Agent ticket lifecycle: label `status:in-progress` → branch `feature/{issue#}-slug` → PR body `Closes #{N}` → label automation handles the rest. Use the `gh` CLI (already in `settings.json` allowlist).

---

## Codebase map

| Path | What lives here |
|------|-----------------|
| `apps/api/` | Fastify 5 + tRPC v11 server; port 3001. See `apps/api/CLAUDE.md`. |
| `apps/web/` | Next.js 15 App Router; port 3000. See `apps/web/CLAUDE.md`. |
| `packages/db/` | Drizzle ORM schema + Postgres client (`@movie-haven/db`). See `packages/db/CLAUDE.md`. |
| `packages/types/` | Shared TypeScript types: `Film`, `FilmCard`, `User`, `FilmSearchParams` (`@movie-haven/types`). |
| `packages/ui/` | Shared shadcn/ui components: Button, Badge, Card, Slider, etc. (`@movie-haven/ui`). |
| `packages/okf/` | Open Knowledge Format v0.1 emitter + conformance validator (`@movie-haven/okf`). Powers both the dev catalog and the user-library export. |
| `packages/config/` | Shared tsconfig presets and Biome config (`@movie-haven/config`). |
| `docs/` | PRD, user stories, testing guide, implementation audit. Not auto-loaded. |
| `docs/okf/` | **OKF knowledge catalog** (generated). Read this index-first for schema/domain/API context — see "OKF Knowledge Catalog" below. Generated by `pnpm okf:build`; never hand-edit. |
| `.claude/docs/` | Harness procedures: setup checklist, LSP setup, maintenance guide. Not auto-loaded. |
| `plans/` | Iterative-planner artifacts (findings, decisions, changelogs). Not auto-loaded. |
| `.deepsec/` | Deepsec security scanner workspace (config, `data/`, findings). Should be a **single root workspace** managing both apps as projects — do not create per-app `.deepsec/` dirs. Skill reference: `~/dev/AI_Projects/ai-labs-pro/deepsec`. |
| `.github/` | CI workflows (`ci.yml`, `pr-labels.yml`, `release.yml`) and issue templates (story, bug, spike). |

---

## OKF Knowledge Catalog

`docs/okf/` is an **Open Knowledge Format (OKF) v0.1** bundle — a curated, index-first knowledge base of Movie Haven's data domain, schema, and API surface. It exists so you can answer structural questions **cheaply** without grepping the whole repo. Prefer it over a full-text search when the question is about the schema, an entity, or a router.

**How to navigate it (index-first — this is the whole point):**

1. Start at `docs/okf/index.md`. It lists the sub-areas: `schema/`, `domain/`, `api/`, `product/`.
2. Open the relevant `<dir>/index.md`. Each bullet is a concept with a one-line description — read these first to decide what's worth opening.
3. Only then open the specific concept `.md`. Its YAML frontmatter (`type`, `description`) tells you what it holds before you read the body; follow bundle-relative links like `[users](/schema/users.md)` to traverse.

**What's inside:** `schema/*` (one `type: DB Table` doc per Postgres table, auto-introspected from Drizzle — columns, FKs, unique constraints), `domain/*` (`type: Entity` concepts), `api/*` (`type: API Surface` per tRPC router), `product/*` (`type: Product Doc`).

**Regenerating:** `pnpm okf:build` rebuilds the bundle from the live schema + curated prose in `apps/api/scripts/okf-build.ts`, then validates it. `pnpm okf:validate` runs the independent Python OKF validator. **Never hand-edit `docs/okf/`** — schema docs are generated; edit the script instead. Conformance rule: every non-reserved `.md` must have parseable frontmatter with a non-empty `type`.

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
