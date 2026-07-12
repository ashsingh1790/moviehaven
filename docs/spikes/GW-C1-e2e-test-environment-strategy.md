---
title: "GW-C1 Spike: E2E & Test-Environment Strategy (FE + BE)"
issue: "#35"
status: decided
last_updated: 2026-07-11
---

# GW-C1 — E2E & Test-Environment Strategy (FE + BE)

## Summary / Recommendation

| # | Decision | Recommendation |
|---|---|---|
| 1 | FE E2E tool + config shape | **Playwright (`@playwright/test`)**. Config lives at `apps/web/e2e/playwright.config.ts`, not root. `webServer` boots both `apps/api` (3001) and `apps/web` (3000) as an array. Auth via a `global-setup.ts` that registers a test user through the real API and saves `storageState`. |
| 2 | Browser matrix | **Chromium-only on PR gate; chromium+firefox+webkit on a scheduled nightly/weekly workflow.** Justified by PR wall-clock speed, not minutes (repo is public — Actions minutes are free either way). |
| 3 | BE integration/E2E approach | **`appRouter.createCaller(ctx)` as the primary tool** for router-logic tests; a thin, separate suite of real-HTTP tests (via Fastify's own `server.inject()` or a booted server + `fetch`) for CORS, rate-limiting, and JWT-header middleware that `createCaller` bypasses. |
| 4 | Test DB/Redis strategy | **Reuse `ci.yml`'s existing service containers** (already provisioned against `movie_haven_test`); locally, reuse `pnpm infra:up`'s `docker-compose.yml` Postgres/Redis with a second `movie_haven_test` database. Isolation: **transaction-per-test** (rollback) as the default for router/unit-level integration tests; **truncate-between-files** for Playwright/E2E runs that exercise the real HTTP stack (can't share an open transaction across process boundaries). |
| 5 | "E2E prerequisite" policy per story type | API story → router integration tests via `createCaller` (+ real-HTTP test only if it touches middleware/CORS/rate-limit). UI story → component tests + one Playwright spec covering the critical path. Full-stack story → both, plus one Playwright spec exercising the real API (not mocked). |
| 6 | CI wiring plan (feeds GW-C5) | **Separate `e2e` job**, not folded into the existing `ci` job — different service needs (booted Next.js + API servers) and different runtime profile (Playwright browser cache) than type-check/lint/unit. Cache `~/.cache/ms-playwright` keyed on the pinned Playwright version. Upload `apps/web/e2e/test-results/**` (traces, screenshots, videos) as a build artifact only `if: failure()`. Expected wall-clock: **~3–5 min** for the chromium-only PR gate; **~10–15 min** for the full nightly cross-browser matrix. |

The rest of this document grounds each decision in what's actually in the repo today and works through the tradeoffs.

---

## 1. FE E2E: Playwright vs. alternatives

**Alternatives briefly considered:**
- **Cypress** — mature, but weaker multi-tab/multi-origin support, no built-in multi-browser-engine parity (WebKit support is community-maintained, not first-class), and slower parallelization story without their paid Cloud product. Movie Haven's auth flow (redirect chains through `/sign-in?next=...`) and future cross-origin needs (OAuth in Phase 2) favor Playwright's native multi-context/multi-origin APIs.
- **WebdriverIO / Selenium-based** — heavier setup, slower, no meaningful advantage here; ruled out.
- **Playwright** — first-class Chromium/Firefox/WebKit engines from one API, built-in trace viewer, auto-waiting, native `webServer` orchestration for exactly the "boot two dev servers before testing" problem this monorepo has. This is also what `docs/TESTING.md` (already checked into the repo) and GW-E3/E4/E5 (cross-browser, axe-core, viewport tests — all Playwright-based) already assume. **Confirmed: Playwright.**

**Config shape — `apps/web/e2e/playwright.config.ts`, not root.**

Rationale: Vitest's root `vitest.config.ts` already uses `projects: ["packages/*", "apps/*"]` as its own workspace-discovery mechanism (from GW-C2/#58) — that's a Vitest-specific concept and Playwright doesn't share it. Playwright is exclusively an `apps/web` concern (there is no other app with a browser UI), so nesting its config under `apps/web` matches the "co-locate config with the thing it tests" pattern the repo already uses (`apps/web/next.config.ts`, `apps/web/biome` inherits from root). A root-level `playwright.config.ts` would imply multi-app E2E ownership that doesn't exist and would need `testDir` pointed back into `apps/web` anyway — same result, extra indirection.

```
apps/web/
  e2e/
    playwright.config.ts
    global-setup.ts        # registers + logs in a test user, saves storageState
    fixtures/
      auth.ts              # test.extend() wrapper injecting storageState
    specs/
      auth.spec.ts          # GW-C7 smoke suite lands here
      ...
    .auth/                  # gitignored — storageState.json output
```

**`webServer`: boot both apps.** Playwright's `webServer` option accepts an **array**, so both the API (3001) and the web app (3000) can be started and health-checked before any test runs:

```ts
// apps/web/e2e/playwright.config.ts
export default defineConfig({
  testDir: "./specs",
  globalSetup: require.resolve("./global-setup"),
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @movie-haven/api dev",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/movie_haven_test",
        REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
        JWT_SECRET: process.env.JWT_SECRET ?? "ci-test-secret-not-for-production",
        ALLOWED_ORIGINS: "http://localhost:3000",
        TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN,
      },
    },
    {
      command: "pnpm --filter @movie-haven/web build && pnpm --filter @movie-haven/web start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
        JWT_SECRET: process.env.JWT_SECRET ?? "ci-test-secret-not-for-production",
      },
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // firefox / webkit added as separate projects, gated to the nightly workflow — see §2
  ],
});
```

Gotcha carried over from root `CLAUDE.md`: `JWT_SECRET` must be identical for both `webServer` entries or every authenticated request will 401 silently — this is the exact failure mode already documented as a repo-wide gotcha, and it bites here too since the two processes are started independently.

Use **built (`next start`) not `next dev --turbopack`** for the web server in CI — dev-mode compile-on-request adds first-load latency that makes Playwright's default timeouts flaky; locally, either works but `reuseExistingServer` will pick up an already-running `pnpm dev` instance if one exists.

**Auth fixture: `storageState` from a seeded test user via the real register/login API — not a mocked session cookie.**

```ts
// apps/web/e2e/global-setup.ts
async function globalSetup() {
  const request = await apiRequest.newContext({ baseURL: "http://localhost:3001" });
  const email = "e2e-user@moviehaven.test";
  // register (ignore CONFLICT if already seeded) then login
  await request.post("/trpc/auth.register", { data: { json: { email, password: "E2eTestPass123!" } } }).catch(() => {});
  const login = await request.post("/trpc/auth.login", { data: { json: { email, password: "E2eTestPass123!" } } });
  const { token } = (await login.json()).result.data.json;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000");
  await page.context().addCookies([{ name: "movie_haven_session", value: token, url: "http://localhost:3000" }]);
  await page.context().storageState({ path: "e2e/.auth/user.json" });
  await browser.close();
}
```

Reasoning: hitting the real `auth.register`/`auth.login` procedures (rather than hand-crafting a JWT) exercises the actual code path a real signup goes through and stays correct automatically if the token shape, cookie name, or hashing scheme ever changes — no parallel "test-only" auth logic to keep in sync. This is also exactly the pattern `docs/TESTING.md`'s Playwright example already uses manually per-spec (`signInAs()`); centralizing it as `storageState` in `globalSetup` just avoids repeating the sign-in flow in every spec.

**Trace/screenshot policy on failure:** `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"` — captures diagnostic artifacts only on the failure path, since traces are the expensive one (slows every retried test) and this repo has no reason to pay that cost on green runs. Retries: `retries: process.env.CI ? 1 : 0` — one retry in CI absorbs infra flake (server not warmed up yet) without masking real bugs (a still-failing-after-retry test is a real failure, not noise).

---

## 2. Browser matrix

**Recommendation: Chromium-only for the PR gate (`ci.yml` / new `e2e` job); chromium + firefox + webkit on a separate scheduled workflow (nightly or weekly).**

The repo is public, so — per GW-A1's already-established finding — GitHub Actions minutes are free and unlimited on this repo. That removes cost as the deciding factor entirely, which is exactly why the prompt asks to justify by **runtime**, not cost:

- A Chromium-only run needs to boot the two `webServer` processes once and run the spec suite once. For the GW-C7 smoke suite (landing → sign-up → sign-in → logout) plus whatever GW-E4/E5 add later, this is a small, fast suite — realistically **1–3 minutes** of actual test execution once servers are warm.
- Running the same suite across three engines **triples** test execution time (WebKit in particular is measurably slower to cold-start on Linux CI runners than Chromium) and, more importantly, **triples the chance of a red PR gate from an engine-specific flake** (WebKit's font-rendering and focus-timing quirks are a well-known source of E2E flakiness that has nothing to do with the actual bug being tested). A PR gate that occasionally fails for reasons unrelated to the change under review erodes trust in the gate and encourages people to re-run-until-green, which is worse than not having the gate.
- **The PR gate needs to be fast and trustworthy on every push** — every commit to an open PR re-triggers it, so its cost is `(commits to the PR) × (runtime)`, not `1 × (runtime)`. A nightly/weekly run pays the cross-browser cost exactly once per period regardless of how many PRs merged that day.

This directly feeds **GW-E3** (cross-browser matrix ticket): GW-E3 should add `firefox` and `webkit` as additional Playwright `projects` in the *same* `playwright.config.ts`, but wire them into a **separate GitHub Actions workflow** (`e2e-nightly.yml` or similar, `on: schedule` + `workflow_dispatch`) rather than adding them to the `pull_request`-triggered job. Real Safari/iOS device testing is out of scope for free-tier CI (Playwright's WebKit is not Safari-on-iOS) — that gap is accepted and should be noted as a known limitation in GW-E3, not solved here.

---

## 3. BE integration/E2E: `createCaller` vs `server.inject()` vs real HTTP

**Current context surface** (`apps/api/src/trpc/context.ts`):

```ts
export type Context = { db: typeof db; redis: Redis; userId: string | null };
```

This context is trivially constructible by hand — no request/response objects baked into it — which is exactly what makes `appRouter.createCaller(ctx)` cheap and pleasant to use here. `docs/TESTING.md`'s own integration-test example already uses this pattern (`appRouter.createCaller({ db, redis, userId })`), so this recommendation formalizes what the aspirational doc already assumed.

**Recommendation: `createCaller` as the primary integration-test tool; a thin, separate suite of real-HTTP tests for what `createCaller` structurally cannot cover.**

| Approach | What it tests | What it misses |
|---|---|---|
| `appRouter.createCaller(ctx)` | Router/procedure logic against a real Postgres/Redis: input validation (Zod), business logic, DB reads/writes, `protectedProcedure`'s `userId` narrowing, TRPCError codes | Everything HTTP-layer: CORS headers, `@fastify/rate-limit`, JWT extraction from the `Authorization` header (`context.ts`'s own `req.headers.authorization` parsing), Fastify plugin ordering |
| `server.inject()` (Fastify's built-in, no real socket) | The above HTTP-layer concerns, without needing a bound port | Real network behavior (unlikely to matter here) |
| Real HTTP (`fetch` against a `server.listen()` instance) | Same as `inject()`, plus true end-to-end socket behavior | Slower, more moving parts, no real benefit over `inject()` for this repo's needs |

`createCaller` is recommended as primary because:
1. It's **already what `docs/TESTING.md` demonstrates** — no doc/practice split to reconcile.
2. It's fast (no HTTP layer, no Fastify boot) — this matters because per GW-B3, the Test Author agent needs to generate integration tests quickly and cheaply for every API story; `createCaller` tests run in the same Vitest process with no server lifecycle to manage.
3. `Context` (`{ db, redis, userId }`) is deliberately request-shape-agnostic — the codebase already made this easy on purpose.

But `createCaller` **bypasses the entire Fastify layer**, so it cannot exercise:
- **CORS** (`@fastify/cors` config, `ALLOWED_ORIGINS`) — a `createCaller` test can never catch a misconfigured origin allowlist.
- **Rate limiting** (`@fastify/rate-limit`, currently `max: 100` per minute globally) — this is pure Fastify-plugin behavior with no tRPC-level equivalent.
- **JWT header parsing edge cases** at the transport boundary (`context.ts`'s `authHeader?.startsWith("Bearer ")` branch) — `createCaller` tests hand-construct `ctx.userId` directly, skipping the header-parsing code path entirely. (GW-D4's "JWT edge cases: expired/malformed/tampered" acceptance criterion specifically needs this layer, not `createCaller`.)

So the recommendation is a **small, explicit second suite** — e.g. `apps/api/src/__tests__/http/*.test.ts` — that boots the real Fastify instance (`buildServer()` extracted as a reusable factory from `src/index.ts`, minus the `redis.connect()`/`server.listen()` side effects so it can bind an ephemeral port in tests) and issues real HTTP requests via `fetch` or `server.inject()`. `inject()` is preferred over a real bound socket where possible — same coverage, no port-conflict risk in parallel CI jobs. This suite stays deliberately thin: CORS behavior, rate-limit triggering, and the 3–4 JWT edge cases (missing/expired/malformed/tampered token) — not a duplicate of the router logic already covered by `createCaller`.

**Action item for GW-C4:** `apps/api/src/index.ts` currently builds and starts the server inline (no exported `buildServer()` factory). GW-C4 needs to extract server construction into a testable factory function before the HTTP-layer suite can be written — flagging this now since it's a small refactor this spike surfaces but doesn't do.

---

## 4. Test DB/Redis strategy

**CI: reuse `ci.yml`'s existing service containers.** `.github/workflows/ci.yml` already provisions `postgres:16` and `redis:7-alpine` service containers with health checks, and already points `DATABASE_URL` at a dedicated `movie_haven_test` database (not the dev `movie_haven` DB) — this was clearly set up in anticipation of exactly this ticket. **No new service-container config is needed**; GW-C5 just needs to add steps that run migrations against it and then run the integration/E2E suites, reusing the same `env:` block already defined at the job level.

**Local dev: reuse `pnpm infra:up`'s `docker-compose.yml`.** The existing root `docker-compose.yml` runs one `postgres:16-alpine` container with a single `movie_haven` database and one `redis:7-alpine` container, no test-specific service. Rather than standing up a second set of containers (more Docker resource usage, another compose file to keep in sync), the pragmatic move is: the *same* Postgres container gets a second database, `movie_haven_test`, created via a one-line `CREATE DATABASE` (either a `postgres-init` script mounted into the existing service, or a documented manual step: `docker compose exec postgres createdb -U postgres movie_haven_test`). Point `TEST_DATABASE_URL` at `postgresql://postgres:password@localhost:5432/movie_haven_test` in each developer's local `.env`. This mirrors exactly what CI already does (one Postgres container, `movie_haven_test` as a distinct DB name) — same shape locally and in CI, which is the property worth optimizing for so "works on my machine" and "works in CI" mean the same thing.

**Per-test-file isolation — two different mechanisms for two different test types, not one for both:**

- **Router/unit-level integration tests (`createCaller`-based, run under Vitest):** **transaction-per-test**, rolled back in `afterEach`. Drizzle supports wrapping each test in `db.transaction(async (tx) => { ... throw ROLLBACK ... })` (or the equivalent pattern of beginning a transaction in `beforeEach` and rolling it back in `afterEach`, passing `tx` as the `db` in the test's `Context`). This is the fastest and simplest option — no manual cleanup code to maintain, guaranteed isolation regardless of test-run order, and it's the standard pattern for this kind of test (already gestured at in `docs/TESTING.md`'s `setupTestDatabase`/`teardownTestDatabase` example, which this refines: those helpers should wrap a transaction rather than `DROP TABLE ... CASCADE` on every test, which is slower and races under parallel test files).
- **Playwright/E2E tests (real HTTP, real Fastify, separate OS process from the test runner):** transaction-per-test doesn't work here — the API server and the test process are different processes with different DB connections, so a transaction opened by one is invisible to the other. **Truncate-between-files** instead: a `globalSetup`/`beforeAll` step (or a small `pnpm --filter @movie-haven/api db:test:reset` script) truncates all tables and re-seeds only what each spec file needs, run once per spec file rather than per-test, since E2E tests are already the slow tier of the pyramid (per `docs/TESTING.md`'s 60/30/10 split) and don't need per-test transaction-level isolation — file-level isolation is enough given E2E specs are expected to be a small, deliberately curated set (smoke suite + critical paths), not exhaustive.

**Migration step for CI:** GW-C5 should run `pnpm db:push` (not `db:migrate`) against the `movie_haven_test` database before the test steps — `db:push` is already the documented "dev-mode" schema sync per `CLAUDE.md`'s command table, and a CI test DB is disposable-per-run, so there's no need for the slower, migration-history-tracking `db:migrate` path that production uses.

**Seeding:** GW-C6 ("Test Data Builders & Fixtures") is the right place to build reusable `createUser`/`createFilm`/`createRating` factories, exactly as sketched in `docs/TESTING.md`'s "Use Test Data Builders" section. This spike's dependency is one-directional — GW-C4's harness (this ticket's `createCaller`/HTTP suites) should be built assuming those builders will exist and import them once GW-C6 lands, rather than each ticket hand-rolling its own ad hoc fixture objects. Concretely: `apps/api/src/test/factories.ts` (GW-C6) exporting builders that both the `createCaller` suite and the Playwright `global-setup.ts` can import.

---

## 5. "E2E prerequisite" policy per story type

This becomes the literal contract for **GW-B3 (Test Author agent)** — the policy it must enforce before a story is considered done, and for **GW-A7 (merge gate)**, which turns "tests exist" into a required CI check.

| Story type | Must ship | Rationale |
|---|---|---|
| **API story** (touches `apps/api`/`packages/db` only — e.g. a new tRPC procedure) | 1+ `createCaller` integration test per new/changed procedure covering: happy path, each documented error case (`TRPCError` codes), and Zod input-validation rejection. **If** the change touches CORS, rate-limiting, or JWT/header parsing specifically, also add/extend the real-HTTP suite (§3). No Playwright spec required unless the story also has user-visible behavior. | Router logic is fully reachable via `createCaller`; requiring Playwright for a pure-backend change would test the same logic twice through a slower, flakier path for no additional coverage. |
| **UI story** (touches `apps/web`/`packages/ui` only, consumes an already-existing API) | Component tests (Vitest + Testing Library) for new/changed components' interactive behavior, **plus** one Playwright spec (or an addition to an existing spec) covering the story's critical path end-to-end against the real API — not mocked — per docs/TESTING.md's existing pattern. A UI story that only touches presentation with no new interaction (e.g. a copy change) can skip the Playwright addition if no critical-path behavior changed. | Component tests catch interaction-level regressions cheaply; the Playwright spec is what actually proves the feature works for a real user against the real stack, which component tests (mocked API) cannot prove. |
| **Full-stack story** (new API procedure + new UI consuming it) | Both of the above: `createCaller` integration test(s) for the new procedure, component tests for new UI, and one Playwright spec exercising the real flow end-to-end (real API, real DB, real UI). | This is the case docs/TESTING.md's testing pyramid was designed for — all three layers earn their keep because each catches a different class of regression (logic, interaction, integration). |
| **Spike** (`type:spike`, like this ticket) | A decision doc. No test requirement — a spike produces no shippable code by definition. | Spikes are research, not implementation; GW-A7's merge gate should exempt `type:spike`-labeled PRs from the test-coverage check (they'll typically touch only `docs/spikes/**`). |

**Boundary case:** a story that only touches `packages/db` (schema-only, no router change) should ship at minimum a `createCaller` smoke test against the router(s) that read/write the changed table, to catch schema-drift breakage — not a new category, just an application of "API story" since `packages/db` changes are inert without a consuming router.

---

## 6. CI wiring plan for GW-C5

**Job layout: a separate `e2e` job in `ci.yml` (or a sibling workflow file), not folded into the existing `ci` job.**

Why separate rather than adding steps to the existing `ci` job:
- The existing `ci` job's service containers, environment, and step sequence (`install → type-check → lint → unit`) is fast today specifically *because* it does none of: booting two long-running dev servers, installing browser binaries, or running a slower E2E suite. Bolting E2E onto the end of that job means every push pays E2E's cost even for changes that don't touch anything E2E-relevant (though see below re: path filtering) and means a flaky E2E run blocks the fast signal (type errors, lint) behind it in the same job's serial step list.
- A separate job runs **in parallel** with `ci` (both triggered by the same `pull_request`/`push` event), so total wall-clock to "all required checks green" is `max(ci, e2e)` rather than `ci + e2e`. This is a meaningful speed win for the PR gate, which is the whole justification requested in §2 above.
- It matches the shape GW-A7's "required checks matrix" already describes as separate line items (type-check, lint, unit, integration, E2E, deepsec diff, Lighthouse) — i.e., the merge-gate design already assumes these are independently reportable statuses, which requires them to be separate jobs (each job = one status check), not steps buried inside one job.

```yaml
jobs:
  ci:            # existing — type-check, lint, unit (Vitest, non-E2E)
    ...
  e2e:
    name: E2E (Playwright · chromium)
    runs-on: ubuntu-latest
    services:
      postgres: { ... same as ci job ... }
      redis: { ... same as ci job ... }
    env:
      DATABASE_URL: postgresql://postgres:password@localhost:5432/movie_haven_test
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: ci-test-secret-not-for-production
      TMDB_READ_ACCESS_TOKEN: ${{ secrets.TMDB_READ_ACCESS_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:push                       # sync schema into movie_haven_test
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm --filter @movie-haven/web exec playwright install --with-deps chromium
      - run: pnpm --filter @movie-haven/web exec playwright test --project=chromium
      - name: Upload trace/screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/e2e/test-results/**
          retention-days: 7
```

**Browser caching:** cache `~/.cache/ms-playwright` keyed on the lockfile hash (browsers are versioned to the `@playwright/test` package version, so a lockfile-hash key naturally invalidates on version bumps). Without this, every run re-downloads Chromium (~150–200MB); with it, cache hits skip the download entirely and only need `--with-deps` for OS-level dependencies (which `apt` layer-caches reasonably well on GitHub-hosted runners regardless).

**Artifact upload: `if: failure()` only**, targeting `apps/web/e2e/test-results/**` (Playwright's default output directory holding traces/screenshots/videos per the policy in §1). Uploading unconditionally would waste storage/time on every green run for artifacts nobody will ever open; `retention-days: 7` keeps storage bounded without manual cleanup (repo being public makes storage free-tier generous, but there's no reason to keep failure traces indefinitely).

**Nightly/weekly full-matrix job (feeds GW-E3):** a second, separate workflow file (`e2e-nightly.yml`), `on: { schedule: [cron: '0 6 * * 1'], workflow_dispatch: {} }`, running `playwright test` with no `--project` filter (all three engines) or explicit `--project=chromium --project=firefox --project=webkit`. Not a required PR status check — informational only, surfaced via a failure notification (issue comment or similar low-effort channel, consistent with GW-A1's established pattern for loop-failure visibility).

**Expected wall-clock:**
- **PR-gate `e2e` job (chromium only):** ~3–5 minutes — dominated by `pnpm install` (~30–60s, mitigated by pnpm cache), building `apps/web` for `next start` (~60–90s), Postgres/Redis health-check wait (~10–20s), and the GW-C7 smoke suite itself (~30–60s for a handful of specs). This runs in parallel with the existing `ci` job, so it does not serially add to today's PR-gate time.
- **Nightly cross-browser job:** ~10–15 minutes — same setup cost plus ~3x the spec execution time across three engines, plus WebKit's typically slower cold start on Linux. Acceptable because it runs on a schedule, not on every push.

---

## Open Questions / Follow-Ups for Downstream Tickets

- **GW-C3** should install `@playwright/test` as a `devDependency` of `apps/web` (not root — Playwright is an `apps/web`-only concern, consistent with the config-location reasoning in §1) and scaffold the `e2e/` directory shape from §1.
- **GW-C4** needs the `buildServer()` extraction from `apps/api/src/index.ts` flagged in §3 before the real-HTTP suite can be written.
- **GW-C6**'s test-data builders should be designed so both the Vitest `createCaller` suite and Playwright's `global-setup.ts` can import the same factory functions (§4) — avoid two parallel fixture systems.
- **GW-E3** adds `firefox`/`webkit` Playwright projects plus the separate nightly workflow described in §2/§6; does **not** change the PR-gate `e2e` job.
- **GW-B3** (Test Author agent) should treat §5's table as its literal acceptance-criteria checklist per story type.
- **GW-A7** (merge gate) should list `ci` and `e2e` as two independently required status checks, with `type:spike` PRs exempted from the `e2e` requirement.

---

## References

- `.github/workflows/ci.yml` — existing service containers (`postgres:16`, `redis:7-alpine`) and `movie_haven_test` DB name, reused as-is by this plan
- `vitest.config.ts` — root workspace-projects config (GW-C2 / #58), establishes the "config lives close to what it tests" precedent this doc follows for Playwright
- `docker-compose.yml` — local Postgres/Redis, extended locally with a second `movie_haven_test` database
- `docs/TESTING.md` — aspirational testing guide; this spike **aligns with** its `createCaller` pattern, Playwright usage, and testing-pyramid ratios, and **supersedes** its per-test `DROP TABLE ... CASCADE` teardown example in favor of transaction-rollback isolation (§4)
- `apps/api/src/trpc/context.ts`, `apps/api/src/index.ts` — current `Context` shape and Fastify server construction referenced in §3
- `docs/spikes/GW-A1-autonomy-runtime-selection.md` — established that this is a public repo with free/unlimited Actions minutes, which is why §2 and §6 justify choices by runtime/reliability rather than cost
