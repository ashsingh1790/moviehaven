---
title: "GW-D3 Spike: Backend API Security Hardening Review"
issue: "#44"
status: decided
last_updated: 2026-07-11
---

# GW-D3 — Backend API Security Hardening Review

## Summary / Top Findings

Audit of the Fastify 5 + tRPC v11 surface in `apps/api`, grounded in the actual code (not generic OWASP advice). Builds on the existing threat model in `.deepsec/data/api/INFO.md` rather than duplicating it.

**Top 3 findings by severity:**

1. **CRITICAL — Broken Object-Level Authorization in `lists.removeFilm`.** `apps/api/src/trpc/routers/lists.ts:48-56` deletes a `list_items` row filtered only by `listId` + `filmId` — it never checks that the caller's `ctx.userId` owns that list. Any authenticated user can delete an arbitrary list item from *any other user's* watchlist by guessing/enumerating serial integer IDs. Contrast with the sibling `addFilm` mutation three lines above it, which does the ownership check correctly.
2. **HIGH — JWT lifetime is 30 days, not the documented 24 hours, with no revocation.** `apps/api/src/lib/jwt.ts:18` sets `.setExpirationTime("30d")`, but `.deepsec/data/api/INFO.md:9`, `apps/api/CLAUDE.md` (indirectly, via Story 1.7), and `docs/STORIES.md` all describe/assume a 24h token. Logout (`apps/web`) only deletes the client-side cookie — the API has no denylist/session table, so a stolen or logged-out token stays valid for up to 30 days.
3. **HIGH — No brute-force protection on auth endpoints.** The only rate limit is global (`apps/api/src/index.ts:22-25`, 100 req/min per IP) and applies uniformly to every tRPC procedure through the single `/trpc` prefix. `login`/`register` get no stricter treatment, and tRPC's batch link can pack many login attempts into one HTTP request, further diluting the per-request limit.

**Count of procedures with a missing ownership check: 1 of 19** (`lists.removeFilm`). All other 9 protected (ownership-sensitive) procedures scope correctly by `ctx.userId`.

---

## 1. Authz Audit Per Procedure

Legend: **Public** = `publicProcedure` (no auth); **Protected** = `protectedProcedure` (requires valid JWT, `ctx.userId: string`). "Ownership check" = does the query/mutation filter by `ctx.userId` (or an equivalent owned-resource join) rather than trusting a client-supplied ID alone.

| Router.Procedure | Type | File:Line | Resource ownership check | Verdict |
|---|---|---|---|---|
| `auth.register` | Public | `auth.ts:23-75` | N/A — creates own account, no existing resource touched | OK |
| `auth.login` | Public | `auth.ts:77-116` | N/A — read-only, returns only the matched user's own data | OK |
| `auth.me` | Protected | `auth.ts:118-132` | Filters `eq(users.id, ctx.userId)` | OK |
| `auth.checkUsername` | Public | `auth.ts:134-142` | N/A — returns only a boolean | OK |
| `auth.generateUsername` | Public | `auth.ts:144-146` | N/A — returns a random string | OK |
| `auth.suggestUsernames` | Public | `auth.ts:148-150` | N/A — returns random strings derived from input | OK |
| `films.search` | Public | `films.ts:28-79` | N/A — public catalog data | OK |
| `films.byId` | Public | `films.ts:81-91` | N/A — public catalog data | OK (see §2 for error-handling nit) |
| `films.byTmdbId` | Public | `films.ts:93-99` | N/A — public catalog data | OK |
| `lists.myLists` | Protected | `lists.ts:7-11` | Filters `eq(lists.userId, ctx.userId)` | OK |
| `lists.create` | Protected | `lists.ts:13-28` | Inserts with `userId: ctx.userId` — can't create on behalf of another user | OK |
| `lists.addFilm` | Protected | `lists.ts:30-46` | **Correct pattern**: line 33-35 queries `and(eq(lists.id, input.listId), eq(lists.userId, ctx.userId))` before inserting the item; throws if not found/owned | OK |
| `lists.removeFilm` | Protected | `lists.ts:48-56` | **None.** Deletes `and(eq(listItems.listId, input.listId), eq(listItems.filmId, input.filmId))` with no join/check against `lists.userId` | **CRITICAL — IDOR** |
| `users.me` | Protected | `users.ts:7-19` | Filters `eq(users.id, ctx.userId)` | OK (duplicate of `auth.me` — not a security issue, just redundant surface) |
| `users.rateFilm` | Protected | `users.ts:21-45` | Inserts with `userId: ctx.userId`; `onConflictDoUpdate` target is `[ratings.userId, ratings.filmId]`, so it can only ever touch the caller's own rating row | OK |
| `users.deleteRating` | Protected | `users.ts:47-55` | Filters `and(eq(ratings.userId, ctx.userId), eq(ratings.filmId, input.filmId))` | OK |
| `users.myRatings` | Protected | `users.ts:57-77` | Filters `eq(ratings.userId, ctx.userId)` | OK |
| `tmdb.popularMovies` | Public | `tmdb.ts:44-76` | N/A — public/cached catalog data | OK |
| `export.myLibraryOkf` | Protected | `export.ts:42-190` | Every query (`ratedRows`, `userLists`, `itemRows`) filters by `ctx.userId`/`listIds` derived from the caller's own lists | OK |

**Why `listItems` is exploitable without a join check:** `packages/db/src/schema/lists.ts` shows `listItems` has no `userId` column of its own — only `listId` (FK → `lists.id`) and `filmId`. Ownership is only derivable by joining to `lists.userId`. `addFilm` does this join; `removeFilm` does not. `list.id` and `film.id` are both `serial` (sequential integers, and `films.id` is enumerable via the public `films.search`/`byId` procedures), so exploitation requires no guessing beyond small integers — a script can iterate `listId` 1..N and silently strip items from other users' watchlists (or scan public `myLists`-style IDs alongside `films.search` results). **This is the single fix GW-D4 must land before anything else.**

---

## 2. Input Validation Audit

Overall Zod coverage is good — no procedure accepts a bare untyped payload, and there's no mass-assignment risk (every input schema hand-picks fields; nothing does `db.insert(table).values(input)` with an unvalidated superset). Gaps found:

| Gap | File:Line | Detail |
|---|---|---|
| No max length on password | `auth.ts:10-14` (`passwordSchema`) | `.min(8)` + regex checks, but no `.max(...)`. Not a crypto break (bcrypt truncates at 72 bytes and cost is independent of input length beyond that), but there's no ceiling on request body size for this field specifically — recommend `.max(128)` as defense-in-depth / consistency with other free-text fields in this codebase which do set max lengths. |
| No max length on `suggestUsernames` input | `auth.ts:148` — `z.object({ input: z.string() })` | Unbounded string accepted and echoed into 4 generated suggestions (`username-generator.ts:77-89`, string concatenation only, no injection risk) — still, an unbounded string is unnecessary attack surface for a public, unauthenticated procedure. Add `.max(50)` or similar. |
| No max length on `checkUsername` input | `auth.ts:135` — `z.object({ username: z.string().min(1) })` | Same class of gap as above; also public/unauthenticated. Add a `.max(30)` bound matching `usernameSchema`. |
| No max length on `films.search` free-text query | `films.ts:7` — `query: z.string().optional()` | Interpolated into `ilike(films.title, \`%${query}%\`)` (`films.ts:35`) via Drizzle's parameterized helper — **not** SQL-injectable — but an unbounded string is still an unnecessary resource-consumption vector on a public, unauthenticated, paginated search endpoint. Add a reasonable `.max(200)`. |
| Pagination bounds present but inconsistent defaults | `films.ts:23-24` (`page.min(1).default(1)`, `limit.min(1).max(100).default(24)`) vs `users.ts:58` (`limit.max(100)` but **no `.min(1)`**, so `limit: 0` or negative values are accepted and passed straight to Drizzle's `.limit()`/`.offset()`) | `users.myRatings`'s `limit` schema (`z.number().max(100).default(20)`) is missing the lower bound `films.search` has. A `limit: -5` or `limit: 0` request isn't a security hole (Postgres treats negative `LIMIT` as an error, returning a 500 rather than leaking data) but it's an inconsistency worth closing alongside the other fixes. |

**What's already solid:** `films.ts:14-22` constrains the sortable `field` to a `z.enum([...])` allowlist before it's used to index into `films` for `asc()/desc()` — this is exactly the right pattern to prevent arbitrary-column / SQL-injection-via-identifier issues, and it's followed correctly. `lists.create`'s `description` (`max(500)`) and `users.rateFilm`'s `review` (`max(2000)`) both have sensible bounds.

---

## 3. JWT Handling

**File:** `apps/api/src/lib/jwt.ts`, consumed by `apps/api/src/trpc/context.ts:12-25`.

- **Algorithm:** `signToken` (`jwt.ts:14-19`) explicitly sets `.setProtectedHeader({ alg: "HS256" })`. `verifyToken` (`jwt.ts:22-29`) calls `jwtVerify(token, secret())` **without an explicit `algorithms` allowlist option**. Because `secret()` returns a raw symmetric `Uint8Array` (not a `KeyLike`/asymmetric key), `jose`'s `jwtVerify` can only match it against HMAC algorithms (HS256/384/512) — the classic RS256→HS256 "algorithm confusion" attack (where a public key is fed back as an HMAC secret) **does not apply here** because there is no public/private keypair anywhere in this flow. That said, pinning `{ algorithms: ["HS256"] }` explicitly is still recommended as defense-in-depth so a future refactor (e.g., adding an asymmetric key elsewhere) can't silently widen what this verifier accepts.
- **Expiry enforcement:** `jwtVerify` enforces `exp` automatically (throws `JWTExpired` on expiry) and `verifyToken`'s try/catch (`jwt.ts:26-28`) swallows *any* verification failure (bad signature, malformed token, expired token) and returns `null` uniformly. `context.ts:17-21` then sets `userId = null`, and `protectedProcedure` (`init.ts:22-27`) throws `TRPCError({ code: "UNAUTHORIZED" })`. **This is correct** — a malformed or expired token cleanly produces a 401, never a 500, and never leaks *why* verification failed (no distinction between "expired" vs "tampered" vs "garbage" is exposed to the client — good, since that distinction is only useful to an attacker probing the verifier).
- **Secret handling:** `secret()` (`jwt.ts:8-12`) throws synchronously if `JWT_SECRET` is unset, so the server fails closed rather than silently signing/verifying with `undefined`. The same secret is shared between `apps/api` and `apps/web` by design (documented in root `CLAUDE.md` gotcha #3) — a real but accepted architectural tradeoff for this stack, not something GW-D4 should try to change.
- **Token lifetime — the real finding:** `jwt.ts:18` sets `.setExpirationTime("30d")`. This directly contradicts `.deepsec/data/api/INFO.md:9` ("24h expiry") and the JWT story's acceptance criteria in `docs/STORIES.md` ("Token includes... 24h expiry"). Whether 24h or 30d is the *intended* value, the code and the documentation disagree, and 30 days is a long time for a stateless, non-revocable bearer token to remain valid after a logout or a suspected compromise. **Recommend: either fix the code to match the documented 24h (re-authenticate more often, smaller blast radius) or, if 30d is intentional for UX reasons, update `INFO.md`/`STORIES.md` and add a server-side revocation mechanism (e.g., a `token_version` column on `users` checked in `createContext`, or a Redis denylist keyed by `jti`) so logout/compromise can actually invalidate a token before natural expiry.**

---

## 4. Rate Limiting & CORS

**File:** `apps/api/src/index.ts`

- **CORS (`index.ts:17-20`):** `origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"]`, `credentials: true`. The fallback is fail-closed (defaults to localhost, never to a wildcard), which is good. Two gaps:
  - `.split(",")` doesn't `.trim()` each entry — a config value like `"https://a.com, https://b.com"` (space after the comma, easy to introduce when editing an env var by hand) produces `" https://b.com"` with a leading space, which will never match the `Origin` header and silently break CORS for that origin rather than failing loudly. Low severity (self-inflicted misconfiguration, not attacker-controlled), but worth a `.map(o => o.trim())`.
  - No `trustProxy` option is set on the `Fastify({...})` instance (`index.ts:11-15`). This doesn't affect CORS directly but affects rate-limiting below.
- **Rate limiting (`index.ts:22-25`):** Single global registration, `max: 100, timeWindow: "1 minute"`, no per-route overrides anywhere in the codebase (confirmed — no other `rateLimit`/`config.rateLimit` references exist). Gaps:
  - **No stricter limit on `auth.login`/`auth.register`.** 100 requests/minute/IP is generous for a login endpoint — combined with tRPC's HTTP batch link (multiple procedure calls bundled into one POST body), an attacker can potentially submit several login attempts per counted request, further stretching the effective attempt budget past 100/min. `@fastify/rate-limit` has no visibility into "how many tRPC calls are in this batch," only "how many HTTP requests." Recommend a route-level (or tRPC-middleware-level, e.g., an IP+email-keyed Redis counter inside `auth.login`) stricter limit specifically for authentication mutations.
  - **`trustProxy` is not configured.** Fastify's `request.ip` (which `@fastify/rate-limit` keys on by default) reflects the immediate TCP peer unless `trustProxy` is set. Deployed behind a reverse proxy (Render/Railway, per the PRD's Phase 5 hosting plan), every request's peer IP is the proxy, so **all traffic shares one rate-limit bucket** — one busy legitimate user (or a single attacker) exhausts the limit for every other user simultaneously. This should be set (`trustProxy: true` or an explicit proxy IP/CIDR) once a hosting provider is chosen, and is a blocking prerequisite for the global rate limit to work as intended in production at all.

**What's already solid:** the CORS default is fail-closed, not fail-open, and `credentials: true` is paired with an explicit origin allowlist rather than `"*"` (which browsers would reject anyway when combined with credentials, but the code doesn't rely on that browser behavior for safety — the allowlist is the actual control).

---

## 5. Injection & Data Exposure

- **Raw SQL:** grepped `apps/api/src` and `packages/db/src` for `` sql` `` template usage — the only hit is `films.ts:67`, `` sql<number>`count(*)::int` ``, a literal cast with **no interpolated values**. No user input ever reaches a raw SQL template anywhere in the codebase. All filtering goes through Drizzle's `eq`/`and`/`ilike`/`gte`/`lte` helpers, which parameterize automatically. Combined with the already-cleared `drizzle-orm@^0.45.2` SQLi advisory, **SQL injection risk in this codebase is low.**
- **Error formatter (`init.ts:6-17`):** only ever adds a `zodError` field (the flattened Zod error, safe/structured) to the response shape; it does not add stack traces or raw `error.cause`. **This is a solid, deliberate design** — validation errors surface field-level detail to the client without leaking internals.
- **Error formatter gap — passthrough of arbitrary thrown-error messages:** tRPC's default behavior wraps *any* thrown non-`TRPCError` in an `INTERNAL_SERVER_ERROR` **using the original error's `.message`** as the client-visible message (the custom `errorFormatter` here doesn't override `shape.message`, only `shape.data`). Two concrete instances:
  - `apps/api/src/lib/tmdb.ts:24`: `` throw new Error(`TMDb API error ${res.status}: ${await res.text()}`) ``, propagated in `tmdb.ts` (router) `:64-68` via `message: err instanceof Error ? err.message : "..."`. This forwards TMDB's raw upstream response body straight to the API client on any TMDB failure. It does **not** include the `TMDB_READ_ACCESS_TOKEN` (never referenced in that string), so there is no token exfiltration — but it is an unfiltered upstream-error passthrough that could reveal TMDB-specific operational details (rate-limit messages, request-shape errors) to end users. Recommend catching and re-throwing a generic `TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch movie data" })` and logging the raw upstream text server-side only.
  - `apps/api/src/trpc/routers/films.ts:87` and `apps/api/src/trpc/routers/lists.ts:37`: both throw plain `new Error("Film not found")` / `new Error("List not found")` instead of `TRPCError({ code: "NOT_FOUND", ... })`. The message text itself isn't sensitive, but this turns what should be a 404 into a 500 `INTERNAL_SERVER_ERROR`, which is a correctness/consistency issue more than a security one — flagging because a 500 on every miss also makes it harder to distinguish genuine server errors from expected not-found cases in monitoring.
- **TMDB token exfiltration:** audited every `fetch(` call in `apps/api/src` — the only one is `tmdb.ts:16`, targeting the hardcoded `TMDB_BASE` constant with the caller-supplied `path`/`params` used only for TMDB's own query parameters (`sort_by`, `vote_count.gte`, etc. — all hardcoded literals in `discoverPopularThisWeek`, never user input). **No procedure accepts a URL, hostname, or path from the client and forwards it through `tmdbFetch`** — there is no SSRF surface, and the token is attached only in the `Authorization` header of that one hardcoded-destination call, never echoed back in any response. **This threat, called out explicitly in `.deepsec/data/api/INFO.md`, is solid as implemented.**
- **Logging of secrets:** `redis.ts:10-12` logs the raw error object on Redis connection failure (`console.error("[Redis] Connection error:", err)`); `index.ts:46` logs the raw startup error via `server.log.error(err)`. Neither logs `JWT_SECRET`/`REDIS_URL`/`TMDB_READ_ACCESS_TOKEN` directly, and ioredis connection errors don't include the auth URL's credentials in their default `.message`/`.stack` — low risk, but worth keeping in mind if `REDIS_URL`'s password ever needs to appear in a custom error wrapper later.

---

## 6. OWASP API Security Top 10 (2023) Mapping

| OWASP Category | Applicable finding | Status |
|---|---|---|
| **API1: Broken Object Level Authorization** | `lists.removeFilm` IDOR (§1) | **Gap — Critical** |
| **API2: Broken Authentication** | 30d/24h JWT lifetime mismatch + no revocation; no auth-specific rate limit (§3, §4) | **Gap — High** |
| **API3: Broken Object Property Level Authorization** | All input schemas hand-pick fields; no mass-assignment path found | Solid |
| **API4: Unrestricted Resource Consumption** | Missing max-lengths on several free-text inputs; global-only rate limit; `trustProxy` unset (§2, §4) | **Gap — Medium** |
| **API5: Broken Function Level Authorization** | `public`/`protected` split is clean and consistently applied; no admin-only functions exist yet to misconfigure | Solid |
| **API6: Unrestricted Access to Sensitive Business Flows** | Login/register share the generic global rate limit and are batchable (§4) | **Gap — Medium/High** (overlaps API2) |
| **API7: Server-Side Request Forgery** | No client-controlled URL/host reaches `fetch` anywhere (§5) | Solid |
| **API8: Security Misconfiguration** | `trustProxy` unset; CORS origin list not trimmed (§4) | **Gap — Medium** |
| **API9: Improper Inventory Management** | Single `appRouter` combining 6 sub-routers, no versioning scheme yet — not assessed further; out of scope until a v2 API is proposed | Not assessed (no current signal of a gap) |
| **API10: Unsafe Consumption of APIs** | TMDB response shape (`TmdbMovie`) is asserted via `as Promise<T>` (`tmdb.ts:27` lib) with no runtime validation of the upstream payload; combined with the raw-error passthrough in §5 | **Gap — Low/Medium** |

---

## Prioritized Fix List for GW-D4

| # | Severity | File | Change |
|---|---|---|---|
| 1 | **Critical** | `apps/api/src/trpc/routers/lists.ts:48-56` (`removeFilm`) | Add the same ownership check `addFilm` already uses: query `lists` with `and(eq(lists.id, input.listId), eq(lists.userId, ctx.userId))` before the delete; throw `TRPCError({ code: "NOT_FOUND" })` if absent. |
| 2 | **High** | `apps/api/src/lib/jwt.ts:18` | Reconcile the 30-day expiry with the documented 24h (either shorten to `"24h"` or update `INFO.md`/`STORIES.md` to match); if long-lived tokens are kept intentionally, add a revocation mechanism (Redis denylist keyed by `jti`, or a `tokenVersion` column checked in `context.ts`). |
| 3 | **High** | `apps/api/src/trpc/routers/auth.ts` (`login`, `register`) + `apps/api/src/index.ts` | Add a stricter, auth-specific rate limit (e.g., Redis-backed IP+email counter inside the `login`/`register` handlers, or a dedicated Fastify route-level `rateLimit` config if these are moved off the shared `/trpc` prefix) independent of the global 100/min bucket. |
| 4 | **Medium** | `apps/api/src/index.ts:11-15` | Set `trustProxy` appropriately once the Phase 5 hosting provider (Render/Railway) is chosen, so `@fastify/rate-limit` keys on the real client IP instead of the proxy's. |
| 5 | **Medium** | `apps/api/src/trpc/routers/auth.ts:10-14,135,148`; `apps/api/src/trpc/routers/films.ts:7` | Add `.max(...)` bounds: password (`128`), `checkUsername`/`suggestUsernames` input (`30`/`50`), `films.search.query` (`200`). |
| 6 | **Medium** | `apps/api/src/lib/tmdb.ts:24` + `apps/api/src/trpc/routers/tmdb.ts:64-68` | Stop forwarding the raw upstream TMDB error text to the client; log it server-side and throw a generic `TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch movie data" })`. |
| 7 | **Low** | `apps/api/src/trpc/routers/films.ts:87`; `apps/api/src/trpc/routers/lists.ts:37` | Replace plain `new Error(...)` with `TRPCError({ code: "NOT_FOUND", message: ... })` so misses return 404 instead of 500. |
| 8 | **Low** | `apps/api/src/lib/jwt.ts:24` (`verifyToken`) | Pin `jwtVerify(token, secret(), { algorithms: ["HS256"] })` explicitly as defense-in-depth. |
| 9 | **Low** | `apps/api/src/index.ts:18` | `.split(",").map(o => o.trim())` on `ALLOWED_ORIGINS` to avoid silent CORS breakage from stray whitespace. |
| 10 | **Low** | `apps/api/src/trpc/routers/users.ts:58` | Add `.min(1)` to `myRatings`'s `limit` schema to match `films.search`'s pagination bounds. |

---

## Security-Reviewer Checklist (for GW-B4)

For every backend PR diff touching `apps/api`, the security-reviewer agent should check:

1. **Every new/changed mutation on a user-owned table** (`ratings`, `lists`, `listItems`, or any future table with a `userId`/owner FK) **filters by `ctx.userId`** — either directly, or via a join/pre-check against the owning row (the `addFilm` vs `removeFilm` pattern in this doc is the canonical positive/negative example to compare against).
2. **Every new `protectedProcedure`** actually needs to be protected — check it isn't accidentally declared as `publicProcedure` while touching user data, and conversely that no genuinely public read got needlessly gated behind auth.
3. **Every new Zod input schema has explicit bounds** on strings (`.max(...)`) and numbers (`.min(...)`/`.max(...)`) — no bare `z.string()`/`z.number()` on a field that flows into a query, especially on public/unauthenticated procedures.
4. **No raw `` sql` `` template contains an interpolated (non-literal) value** — if one appears, verify it uses Drizzle's `sql.placeholder`/parameter binding, not string interpolation of `input.*`.
5. **No procedure throws a plain `Error`/`new Error(...)`** where a `TRPCError` with an appropriate code (`NOT_FOUND`, `CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN`) is more correct — plain errors become opaque 500s.
6. **No thrown error message embeds an upstream response body, secret, or internal identifier** verbatim — errors surfaced to clients should be generic; details belong in server-side logs only.
7. **JWT changes** (anything touching `lib/jwt.ts` or `trpc/context.ts`) preserve: fail-closed behavior on missing `JWT_SECRET`, `algorithms` pinning, and expiry enforcement — flag any change that widens what's accepted (e.g., adding `alg: "none"`, removing the try/catch that nulls out `userId` on any verification failure).
8. **Rate-limit exemptions or route-level overrides** are justified in the PR description — flag any new route that silently opts out of the global limit without a documented reason.
9. **`ALLOWED_ORIGINS`/CORS config changes** never introduce a wildcard (`"*"`) alongside `credentials: true`, and any new origin is a fully-qualified scheme+host, not a bare domain that could match unintended subdomains.
10. **No client-supplied value (URL, host, path) reaches a server-side `fetch`/HTTP client call** — any new outbound HTTP call in `apps/api` should target a hardcoded or allowlisted destination (mirrors the existing TMDB pattern; flag anything resembling a user-controlled proxy/webhook/callback URL as a potential SSRF).
11. **Secrets (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `TMDB_READ_ACCESS_TOKEN`) never appear in a log statement, error message, or response payload**, including indirectly via a caught error's default `.message`/`.stack`.
12. **New pagination inputs (`page`/`limit`/`offset`) have both a lower bound (`.min(1)` or `.min(0)` as appropriate) and an upper bound** (cap `limit` to a sane max, e.g. 100) to prevent unbounded scans.
13. **Password/credential handling changes** keep using the existing `hashPassword`/`verifyPassword` (bcrypt) wrappers and the constant-time dummy-hash comparison pattern in `login` — never compare passwords/tokens with `===`/`.includes()`.
14. **Any new dependency touching crypto, HTTP parsing, or the DB driver** is checked against known advisories (mirrors the `drizzle-orm@^0.45.2` SQLi-advisory clearance already done for this repo).
15. **Table/column changes in `packages/db/src/schema/*` that add a new owned resource** (a `userId`/owner FK) come with a matching entry in this checklist's item #1 — i.e., the security reviewer should treat "new owned table" as a trigger to specifically hunt for a corresponding missing-ownership-check mutation, since that's exactly the class of bug found in §1 of this review.

---

## Scope Notes

- Frontend-facing concerns (stored XSS in review text rendering, CSP, clickjacking, open-redirect on `next`) are explicitly out of scope for GW-D3 — they're owned by GW-D1 (OWASP FE threat model) and GW-D2 (Next.js security headers/CSP). The backend-side building block for those — `users.rateFilm`'s `review` field being stored as raw, unsanitized text (`users.ts:26`) — is called out here only as a heads-up for GW-D1/D2, not double-counted as a backend finding.
- No test suite exists yet in `apps/api` (confirmed: zero `*.test.ts`/`*.spec.ts` files) — GW-D4's fixes, especially the `removeFilm` IDOR fix, should ship with a regression test once GW-C4 (API integration test harness) lands; until then, GW-D4 should at minimum manually verify the fix via a caller-based reproduction (attempt `removeFilm` as user B against user A's list, assert `NOT_FOUND`).
