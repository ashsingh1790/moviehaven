# Backend API Quality Criteria

> Evaluator type: AI agent | Scoring: 1-10 per dimension
> Weighting: API Design and Data Layer are weighted **1.5x** relative to Error Handling and Security.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence (tRPC procedures, Drizzle queries, Redis usage, Zod schemas, error codes). If unsure whether something meets a threshold, score it lower and explain why.

## Context

Movie Haven's backend is **Fastify 5 + tRPC v11** (`apps/api/`, port 3001) backed by **PostgreSQL via Drizzle ORM** (`packages/db/`) using the `postgres-js` driver with a connection pool of 10. Redis is used for caching. Auth is custom JWT via `jose` (cookie: `movie_haven_session`).

**Schema at a glance:**
- `users` — UUID primary key, email (unique), password_hash, optional username/display_name
- `films` — serial PK, tmdb_id (unique), JSONB columns for `genres`, `cast`, `directors`, `origin_countries`, `spoken_languages`; indexes on tmdb_id, release_year, tmdb_score, popularity
- `ratings` — serial PK, FK→users (cascade delete), FK→films (cascade delete), unique(user_id, film_id); indexes on user_id, film_id
- `lists` / `list_items` — serial PKs, FK→users / FK→films (cascade delete), unique(list_id, film_id) on items; index on list_id

## Dimensions

### 1. API Design (Weight: 1.5x)

Are tRPC procedures well-designed? Correct use of `publicProcedure` vs `protectedProcedure`, sensible input/output shapes, appropriate router separation, and no over-fetching or under-fetching.

| Score | Description |
|-------|-------------|
| 9-10  | Clean, well-structured procedures. Public vs protected correctly applied everywhere. All inputs validated with Zod. Output shapes match what the UI needs — no overfetching. Routers grouped logically by domain (`films`, `auth`, `ratings`, `lists`, `tmdb`). |
| 7-8   | Solid design with minor issues. Correct auth boundaries. A few procedures return more data than needed or have slightly awkward Zod schemas. |
| 5-6   | Functional but inconsistent. Some auth boundary confusion, loose input validation, or one router doing unrelated things. |
| 3-4   | Poor design. Protected routes without `protectedProcedure`, unvalidated inputs, procedures doing unrelated things. |
| 1-2   | Fundamentally broken. Auth not enforced, no input validation, would require a rewrite to be safe. |

### 2. Data Layer (Weight: 1.5x)

Is the database access layer well-designed? Correct Drizzle ORM usage, efficient queries that leverage existing indexes, proper handling of JSONB columns, use of transactions where needed, and Redis caching for expensive reads.

| Score | Description |
|-------|-------------|
| 9-10  | Correct Drizzle usage throughout. Queries use the indexes that exist (tmdb_id, release_year, tmdb_score, user_id, film_id). JSONB columns (`genres`, `cast`, `directors`) queried correctly. Transactions used where multiple writes must be atomic (e.g. rating + list update). Redis caching applied to TMDB responses and film list queries with appropriate TTLs. No N+1 patterns. |
| 7-8   | Well-structured with minor issues. Queries correct, caching applied to obvious cases, occasional missed optimization. |
| 5-6   | Functional but inefficient. Missing caching on expensive TMDB calls, N+1 on film list queries, transactions absent where cascade deletes aren't enough. |
| 3-4   | Disorganized. Queries ignore available indexes, JSONB fields accessed naively, no caching, raw SQL mixed with ORM. |
| 1-2   | Data layer barely works. Queries wrong, connection pool misused, would degrade immediately under real traffic. |

### 3. Error Handling (Weight: 1x)

Does the API handle failures correctly? Appropriate `TRPCError` codes, no raw throws leaking internals, and graceful handling of external failures (TMDB API down, Redis unavailable, DB constraint violations).

| Score | Description |
|-------|-------------|
| 9-10  | Comprehensive. Every failure path throws `TRPCError` with the correct code: `UNAUTHORIZED` (no/expired JWT), `NOT_FOUND` (missing film/list), `CONFLICT` (duplicate rating — violates unique constraint), `BAD_REQUEST` (invalid input), `INTERNAL_SERVER_ERROR` (DB/Redis failure). External API failures caught and handled gracefully. DB unique constraint violations caught and surfaced as `CONFLICT`, not 500s. |
| 7-8   | Good coverage. Most failures handled correctly. Occasional generic `INTERNAL_SERVER_ERROR` where a specific code would be appropriate. |
| 5-6   | Basic handling. Happy path works, but DB constraint violations (e.g. duplicate rating) crash with unhandled errors, or TMDB failures propagate as 500s. |
| 3-4   | Minimal. Bare throws, unhandled promise rejections, internal Postgres error messages exposed to clients. |
| 1-2   | No error handling. Failures crash the server or leak DB internals to the client. |

### 4. Security (Weight: 1x)

Are endpoints secure? No protected data accessible without auth, all inputs Zod-validated, no secrets in logs, JWT verified correctly, and no injection vectors.

| Score | Description |
|-------|-------------|
| 9-10  | Fully secure. Every protected route uses `protectedProcedure`. All inputs validated with Zod (including TMDB IDs, scores clamped 1–10, text length limits). No SQL injection possible — Drizzle parameterizes all queries. No secrets or PII (passwords, tokens) in logs. JWT verified on every protected call via `jose`. CORS allows only `ALLOWED_ORIGINS`. |
| 7-8   | Secure with minor gaps. Auth boundaries correct. A few Zod schemas looser than ideal (e.g. score not clamped) but no real injection vectors. |
| 5-6   | Mostly secure. Auth enforced on main routes but one or two gaps — e.g. a ratings or list endpoint reachable without a valid JWT. |
| 3-4   | Security issues present. Some protected data accessible without auth, inputs passed to queries without validation, password hashes visible in API responses. |
| 1-2   | Fundamentally insecure. Auth not enforced, injectable queries, secrets exposed in logs or responses. |

## Scoring Formula

```
Weighted Score = ((API Design * 1.5) + (Data Layer * 1.5) + Error Handling + Security) / 5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Security scoring **4 or below** also triggers a fail — an insecure API cannot ship regardless of other scores.
