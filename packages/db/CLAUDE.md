# CLAUDE.md — packages/db

Drizzle ORM schema + Postgres client. Imported as `@movie-haven/db`. Only `apps/api` imports runtime values from this package.

## Critical gotchas

1. **Schema changes require a migration step before they take effect.** After editing any file in `src/schema/`, run `pnpm db:push` (dev, applies directly) or `pnpm db:generate` then `pnpm db:migrate` (prod, generates SQL files). Skipping this leaves the Postgres schema out of sync with TypeScript types.

2. **`db` is a singleton — it throws at import if `DATABASE_URL` is not set.** The client in `src/client.ts` calls `drizzle()` at module load time. Any test or script that imports `@movie-haven/db` without a valid `DATABASE_URL` in env will crash immediately.

3. **`apps/web` does NOT import `@movie-haven/db`.** All DB access goes through `apps/api` over tRPC. If you find yourself adding `@movie-haven/db` as a dependency in `apps/web`, stop — use a tRPC procedure instead.

## Schema tables

| File | Tables |
|------|--------|
| `schema/users.ts` | `users` |
| `schema/films.ts` | `films` |
| `schema/ratings.ts` | `ratings` |
| `schema/lists.ts` | `lists`, `listItems` |
| `schema/streaming.ts` | `streamingAvailability` |

## Commands

```bash
pnpm db:push       # drizzle-kit push (dev: apply schema to running DB directly)
pnpm db:generate   # drizzle-kit generate (generate SQL migration files)
pnpm db:migrate    # drizzle-kit migrate (apply generated migrations)
pnpm db:studio     # drizzle-kit studio (browser GUI for the DB)
```

Run these from the repo root — they are forwarded to this package via `--filter @movie-haven/db`.
