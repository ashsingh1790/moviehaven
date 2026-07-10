# User Stories by Phase

This document breaks down Movie Haven features into granular user stories. Each story is ready for implementation by an AI agent.

**Format:** Each story includes acceptance criteria, technical scope, affected files, and dependencies.

---

## Phase 1: Foundations & Agentic Dev Harness (Groundwork)

**Phase Goal (REVISED):** Lay the foundations that must exist before feature development can run through an autonomous agentic harness. This covers the harness + orchestration, six specialized agents (frontend coder, backend coder, test author, security reviewer, PR reviewer, orchestrator), an E2E + unit testing foundation for both frontend and backend, security guardrails (OWASP Top 10 for FE, hardening for BE), and frontend quality gates (Lighthouse budgets, cross-browser, accessibility, mobile responsiveness). These groundwork tickets are worked **manually**; full autonomy is the *target* for later feature work. The already-built landing page, auth, JWT middleware, and logout (Stories 1.1, 1.5–1.8) remain part of Phase 1. Feature stories (TMDB lists 1.2–1.4, demo/seed/protected-films 1.9–1.12) have **moved to Phase 2**. The shadcn/ui migration (1.13–1.18) stays in Phase 1 as UI groundwork.  
**Estimated Duration:** 4–5 weeks  
**Status:** 🟢 In Progress — auth/landing done; groundwork (GW-A1…GW-E6) newly added

> **Scope change note:** Phase 1 was repurposed from feature work to groundwork via a stochastic multi-agent consensus analysis (10 agents, median confidence 7/10). Tickets live in GitHub Issues (source of truth); the milestone assignment there is authoritative. See the **Feature: Phase 1 Groundwork** section below.

---

### Feature: Phase 1 Groundwork — Autonomous Agentic Dev Harness

**Context:** Feature development for Movie Haven is meant to run through an autonomous agentic harness (pick ticket → code → commit/push → PR → review/approve → close). None of the scaffolding that makes that safe or *verifiable* exists yet: CI runs zero real tests, there is one generic coder agent, no E2E, no CSP/security headers, and `.deepsec/` is configured but unwired. These 33 groundwork tickets build that foundation. They are worked **manually**. Structure is **spike-then-build**: a `[Spike]` produces a decision/recommendation doc; a `[Build]` produces working config/code plus a passing check. Everything targets **free tier**.

**Ticket IDs** use `GW-<theme><n>` (A=harness, B=agents, C=testing, D=security, E=frontend quality) and map 1:1 to GitHub Issues. Dependencies reference other GW IDs.

#### GW-A1 · [Spike] Autonomy Runtime Selection
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:harness`
Decide where the future feature-dev loop runs: local orchestrator vs GitHub Actions vs hybrid — the mandated first ticket; all harness-build tickets depend on its outcome.
- [ ] Compare local long-running orchestrator, GitHub Actions–triggered, and hybrid against free-tier limits (Actions minutes, always-on cost, API budget)
- [ ] Recommendation doc with chosen runtime + rationale + rough cost model
- [ ] Identify what each downstream harness ticket (GW-A3, A4, A6) needs from the runtime

#### GW-A2 · [Spike] Agent Handoff & Context Protocol
**Status:** 🟡 PENDING · **Deps:** GW-A1 · **Labels:** `type:spike, area:harness`
Design how ticket state/context passes across spec-planner → coder → test-author → security-reviewer → PR-reviewer, and how tickets route to the right agent.
- [ ] Decide handoff medium (scratch files vs issue comments vs branch/commit metadata)
- [ ] Define ticket→agent routing rules (labels vs changed-path heuristics)
- [ ] Document the state object each agent reads/writes

#### GW-A3 · [Build] Orchestrator Runtime Scaffold + Ticket-Pickup Loop
**Status:** 🟡 PENDING · **Deps:** GW-A1, GW-A2 · **Labels:** `type:feature, area:harness`
Stand up the chosen runtime and implement pickup: poll issues labeled `status:ready`, claim via `status:in-progress`, dispatch.
- [ ] Runtime skeleton can invoke a Claude agent programmatically against GitHub Issues
- [ ] Atomic claim avoids double-pickup
- [ ] Loop dispatches a claimed ticket to a (stub) agent end-to-end for one issue

#### GW-A4 · [Build] Autonomous Branch/Commit/PR Lifecycle Wiring
**Status:** 🟡 PENDING · **Deps:** GW-A3 · **Labels:** `type:feature, area:harness`
Wire the loop to create `feature/{issue#}-slug`, commit, push, and open a PR with `Closes #N`, reusing existing `pr-labels.yml` automation.
- [ ] Branch naming + commit + push automated
- [ ] PR opens with `Closes #N`; label transitions fire via existing automation

#### GW-A5 · [Spike] Failure / Retry / Escalation Policy
**Status:** 🟡 PENDING · **Deps:** GW-A1 · **Labels:** `type:spike, area:harness`
Define behavior when an agent crashes, loops, or produces a failing PR.
- [ ] Retry caps + stuck-agent/timeout detection defined
- [ ] `status:blocked` human-escalation path defined
- [ ] Decision doc covering abandon vs retry vs escalate

#### GW-A6 · [Build] Autonomy Safety Guardrails (Budget + Kill-Switch + Branch Protection)
**Status:** 🟡 PENDING · **Deps:** GW-A3, GW-A5 · **Labels:** `type:feature, area:harness`
Implement the hard safety limits so an autonomous loop can't run away or bypass review.
- [ ] Per-ticket cost/time/iteration caps + manual kill-switch (e.g. workflow toggle or label)
- [ ] `main` branch protection: required checks, required review, no force-push, no self-merge bypass

#### GW-A7 · [Build] Merge Gate / Definition-of-Done Policy
**Status:** 🟡 PENDING · **Deps:** GW-C5, GW-D5, GW-E2 · **Labels:** `type:chore, area:harness`
Define the single required-checks matrix that gates every merge (the keystone tying testing/security/quality together).
- [ ] Required checks documented: type-check, lint, unit, integration, E2E, deepsec diff, Lighthouse budget
- [ ] Wired as GitHub branch-protection required status checks

#### GW-B0 · [Spike] Agent Specialization Boundaries
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:agents`
Decide directory/tool ownership so the single generic coder splits cleanly into frontend/backend, and scope the test-author/security/PR-reviewer roles.
- [ ] Path ownership map (FE: `apps/web`+`packages/ui`; BE: `apps/api`+`packages/db`)
- [ ] Per-agent tool allowlist + scope; note where existing `reviewer`/`evaluator`/`develop-story` agents are reused

#### GW-B1 · [Build] Frontend Coder Agent
**Status:** 🟡 PENDING · **Deps:** GW-B0 · **Labels:** `type:feature, area:agents`
Define `.claude/agents/frontend-coder.md` scoped to `apps/web` + `packages/ui`, encoding Next.js/Tailwind/shadcn + nuqs/trpc-client gotchas.
- [ ] Agent definition with restricted toolset/scope
- [ ] Refuses to edit `apps/api`/`packages/db`

#### GW-B2 · [Build] Backend Coder Agent
**Status:** 🟡 PENDING · **Deps:** GW-B0 · **Labels:** `type:feature, area:agents`
Define `.claude/agents/backend-coder.md` scoped to `apps/api` + `packages/db`, encoding Fastify/tRPC/Drizzle/JWT gotchas.
- [ ] Agent definition with restricted toolset/scope
- [ ] Refuses to edit `apps/web`/`packages/ui`

#### GW-B3 · [Build] Test Author Agent
**Status:** 🟡 PENDING · **Deps:** GW-B0, GW-C2, GW-C3 · **Labels:** `type:feature, area:agents`
Define an agent that writes Vitest + Playwright tests from the plan only (TDD red phase), independent of implementation. Fork the existing `unit-test`/`develop-story` pipeline where possible.
- [ ] Produces failing tests from acceptance criteria before code exists
- [ ] Covers unit + integration + E2E per TESTING.md

#### GW-B4 · [Build] Security Reviewer Agent
**Status:** 🟡 PENDING · **Deps:** GW-B0, GW-D5 · **Labels:** `type:feature, area:agents`
Define an agent that runs deepsec `--diff` + an OWASP checklist against a PR diff and blocks on critical findings.
- [ ] Consumes the FE/BE security checklists from GW-D1/GW-D3
- [ ] Requests changes on critical/high findings

#### GW-B5 · [Build] PR Reviewer Agent
**Status:** 🟡 PENDING · **Deps:** GW-B0, GW-C5 · **Labels:** `type:feature, area:agents`
Final review-gate agent (correctness + acceptance-criteria check). **Fork/reuse the existing `reviewer`/`evaluator` agents** — do not build net-new.
- [ ] Approves or requests changes and drives the label automation
- [ ] Verifies required checks are green before approving

#### GW-B6 · [Build] Orchestrator Agent Definition
**Status:** 🟡 PENDING · **Deps:** GW-A3, GW-A2, GW-B1, GW-B2, GW-B3, GW-B4, GW-B5 · **Labels:** `type:feature, area:agents`
Define the agent that sequences the five specialists per ticket atop the runtime.
- [ ] Routes a ticket through plan → coder → test-author → security → PR-reviewer
- [ ] Handles handoff per GW-A2

#### GW-C1 · [Spike] E2E & Test-Environment Strategy (FE + BE)
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:testing`
Confirm Playwright for FE, pick the API integration approach (tRPC caller vs Fastify `inject`), decide ephemeral test Postgres/Redis strategy, and define what "E2E prerequisite" means per story type.
- [ ] Decision doc: FE E2E tool + browser matrix, BE integration approach, test-DB/Redis provisioning, free-tier CI budget

#### GW-C2 · [Build] Vitest Root Config + Coverage Thresholds
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:feature, area:testing`
Add real root/per-package Vitest config and **replace the no-op root `pnpm test --if-present`** so tests actually run.
- [ ] Root + per-package config; coverage provider + thresholds per TESTING.md
- [ ] `pnpm test` runs and reports; the one existing `packages/okf` test is picked up

#### GW-C3 · [Build] Install & Configure Playwright (FE)
**Status:** 🟡 PENDING · **Deps:** GW-C1 · **Labels:** `type:feature, area:testing`
Install `@playwright/test`, add `playwright.config.ts`, an auth fixture, and one smoke spec.
- [ ] Playwright installed + configured for the chosen browser matrix
- [ ] One passing smoke spec runs locally and in CI

#### GW-C4 · [Build] API Integration / E2E Test Harness (BE)
**Status:** 🟡 PENDING · **Deps:** GW-C1, GW-C2 · **Labels:** `type:feature, area:testing`
Stand up ephemeral test Postgres/Redis with setup/teardown and a first auth-router integration test.
- [ ] Dockerized/ephemeral test DB + Redis with clean setup/teardown
- [ ] First tRPC integration test (auth register/login) passes

#### GW-C5 · [Build] Wire Real Tests into CI (required, blocking)
**Status:** 🟡 PENDING · **Deps:** GW-C2, GW-C3, GW-C4 · **Labels:** `type:feature, area:testing`
Update `ci.yml` to run unit + integration + E2E against the Postgres/Redis services and fail the build on red.
- [ ] CI runs all suites; the current no-op is gone
- [ ] Failing tests block the PR (required status check)

#### GW-C6 · [Build] Test Data Builders & Fixtures
**Status:** 🟡 PENDING · **Deps:** GW-C2, GW-C4 · **Labels:** `type:feature, area:testing`
Implement shared factories (`createUser`, `createFilm`, `createRating`) per TESTING.md, consumed by the Test Author agent.
- [ ] Reusable builders used by integration + E2E tests

#### GW-C7 · [Build] Critical-Path E2E Smoke Suite
**Status:** 🟡 PENDING · **Deps:** GW-C3 · **Labels:** `type:feature, area:testing`
First real coverage: landing → sign-up → sign-in → logout Playwright spec.
- [ ] Full auth critical path green in CI

#### GW-D1 · [Spike] OWASP Top 10 Frontend Threat Model
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:security`
Map OWASP risks onto the Next.js app: stored XSS (review text), CSRF, JWT-cookie handling, clickjacking, open-redirect on the `next` param, IDOR on ratings/lists, dependency risk.
- [ ] Prioritized FE mitigation list feeding GW-D2 and the Security Reviewer agent

#### GW-D2 · [Build] Next.js Security Headers & CSP
**Status:** 🟡 PENDING · **Deps:** GW-D1 · **Labels:** `type:feature, area:security`
Implement CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy; sanitize user-generated review text.
- [ ] Headers applied via `next.config`/middleware; CSP verified on key routes
- [ ] Review-text rendering is XSS-safe

#### GW-D3 · [Spike] Backend API Security Hardening Review
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:security`
Audit the Fastify/tRPC surface beyond existing rate-limit + CORS: per-procedure authz, Zod coverage, JWT edge cases, injection surface.
- [ ] Gap list mapped to OWASP API Top 10, feeding GW-D4

#### GW-D4 · [Build] Backend Hardening Implementation
**Status:** 🟡 PENDING · **Deps:** GW-D3, GW-C4 · **Labels:** `type:feature, area:security`
Close the gaps found in GW-D3.
- [ ] Zod validation on all mutations; stricter route-specific rate limits
- [ ] JWT edge cases (expired/malformed/tampered) tested; non-leaking error responses

#### GW-D5 · [Build] Wire Deepsec into CI as PR Diff-Gate
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:feature, area:security`
Activate the already-configured root `.deepsec/` workspace as a `deepsec process --diff` required PR check (procedure documented in the deepsec skill — no spike needed).
- [ ] CI runs deepsec on the PR diff; blocks on critical findings
- [ ] Baseline established; known false-positives from `INFO.md` respected

#### GW-D6 · [Build] Dependency + Secret Scanning
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:feature, area:security`
Add free dependency + secret scanning so autonomous agents can't ship vulns or commit credentials.
- [ ] Dependabot alerts and/or `pnpm audit` CI gate on high/critical
- [ ] gitleaks (or equivalent) pre-commit/CI secret scan; complements existing `.env` write-guard hook

#### GW-E1 · [Spike] Lighthouse / LHCI Strategy + Baseline Audit
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:spike, area:frontend`
Confirm free `@lhci/cli`-in-Actions setup, capture current baseline scores, and set perf/a11y/best-practices/SEO **budgets**. "Perfect score" is the aspiration, enforced as a ratcheting budget (not a literal 100 against near-empty pages).
- [ ] LHCI feasibility confirmed on free tier; baseline recorded; budgets defined

#### GW-E2 · [Build] Wire LHCI into CI with Score Budgets
**Status:** 🟡 PENDING · **Deps:** GW-E1 · **Labels:** `type:feature, area:frontend`
Run Lighthouse in CI against key routes and fail the PR below budget.
- [ ] LHCI config + per-category assertions; PR fails under budget; budgets ratchet upward over time

#### GW-E3 · [Build] Cross-Browser Playwright Matrix + browserslist
**Status:** 🟡 PENDING · **Deps:** GW-C3 · **Labels:** `type:feature, area:frontend`
Add chromium/firefox/webkit Playwright projects and a `.browserslistrc` for Tailwind/Autoprefixer target consistency (config, not research). Real Safari/iOS device gaps noted as free-tier limitation.
- [ ] E2E suite runs across the three engines in CI
- [ ] `.browserslistrc` aligned to the target matrix

#### GW-E4 · [Build] axe-core Accessibility Gate
**Status:** 🟡 PENDING · **Deps:** GW-C3 · **Labels:** `type:feature, area:frontend`
Add `@axe-core/playwright` assertions on key routes; fail CI on new violations.
- [ ] axe checks on landing/auth/films; zero new critical violations enforced

#### GW-E5 · [Build] Responsive Breakpoints + Mobile Viewport Tests
**Status:** 🟡 PENDING · **Deps:** GW-C3 · **Labels:** `type:feature, area:frontend`
Define custom Tailwind breakpoints (none exist today) and add Playwright mobile/tablet/desktop viewport smoke tests.
- [ ] Documented breakpoint scale
- [ ] Viewport matrix tests for landing + films + auth flows

#### GW-E6 · [Build] Bundle Analysis & Size Budget
**Status:** 🟡 PENDING · **Deps:** none · **Labels:** `type:feature, area:frontend`
Wire `@next/bundle-analyzer` + a `size-limit` CI budget to prevent performance regressions over time.
- [ ] Bundle report available; CI fails if key-route bundle exceeds budget

**Execution order (dependency waves; parallelize within a wave):**
- **Wave 0 (no deps):** GW-A1, B0, C1, C2, D1, D3, D5, D6, E1, E6
- **Wave 1:** GW-A2, A5, C3, C4, B1, B2, D2, D4, E2, E3, E4, E5
- **Wave 2:** GW-A3, C5, C6, C7, B3, B4, B5
- **Wave 3:** GW-A4, A6, B6
- **Wave 4:** GW-A7 (merge gate) → autonomous lifecycle live

> A1 is mandated first *for the harness track*, but the testing (C), security (D), and quality (E) lanes are independent and can start in parallel on day one. Don't let "spike first" stall the cheap, high-leverage builds (GW-C2, D5, E6).

---

### Feature: Landing Page

#### Story 1.1: Build Landing Page Hero Section

**Description:** Create the landing page with hero section featuring modern design and compelling tagline.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Landing page loads at `GET /` (public route)
- [x] Hero section displays:
  - Tagline: "Discover films the way you think about them"
  - CTAs: "Browse all films" + "Create free account" 
  - Modern aesthetic with gradient background and smooth transitions
- [x] CTA buttons route correctly:
  - "Browse all films" → `/films` (protected)
  - "Create free account" → `/sign-up` (public)
- [x] Navigation bar with conditional display (Sign In / Get Started for unauthenticated, Browse Films for authenticated)
- [x] Mobile responsive (works on desktop and mobile)
- [x] Footer with Movie Haven branding
- [x] Page is polished and professional

**Technical Details:**
- File: `apps/web/src/app/(auth)/page.tsx` (new landing page route)
- Component: `LandingHero` in `packages/ui/components/landing-hero.tsx`
- No API calls needed yet
- Unauthenticated route (no JWT required)

**Dependencies:**
- None (can start immediately)

**Affected Files:**
- `apps/web/src/app/(auth)/page.tsx` — New page
- `packages/ui/components/landing-hero.tsx` — New component

---

#### Story 1.2: Display Current Movies in Theater (NOW_PLAYING)

**Description:** Fetch and display current movies from TMDB's now playing endpoint on landing page.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #7) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] Fetch current movies from TMDB API (`GET /movie/now_playing`)
- [ ] Create tRPC endpoint: `tmdb.nowPlayingMovies`
- [ ] Display as horizontal scrollable carousel below hero section
- [ ] Show movie poster, title, genre tag, and IMDb rating
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] List title: "In Theaters Now"
- [ ] Gracefully handle API failures (show empty state)
- [ ] Results cached in Redis for 24 hours
- [ ] Responsive on mobile (adjust card size)

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('nowPlayingMovies')`
- TMDB API: `GET /movie/now_playing?language=en-US&region=US`
- Cache key: `tmdb:now-playing-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]` (see tmdb.ts for shape)

**Client:**
- File: `apps/web/src/app/page.tsx` (already implemented)
- Component: `PopularMoviesSection` (already exists)
- API call: `serverTrpc.tmdb.nowPlayingMovies.query()`

**Dependencies:**
- Story 1.1 (landing page exists ✅)
- TMDB API token must be configured ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/api/src/lib/tmdb.ts` — May need helper function for now playing

---

#### Story 1.3: Display Top Movies by Box Office Revenue

**Description:** Fetch and display top-grossing movies from TMDB on landing page.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #8) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] Fetch top-grossing movies from TMDB API (by revenue)
- [ ] Create tRPC endpoint: `tmdb.topBoxOfficeMovies`
- [ ] Display as horizontal scrollable carousel
- [ ] Show movie poster, title, genre tag, and IMDb rating
- [ ] List title: "Box Office Leaders"
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] Gracefully handle API failures
- [ ] Results cached in Redis for 24 hours

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('topBoxOfficeMovies')`
- TMDB API: Use `discover` endpoint sorted by revenue or use `GET /movie/top_rated`
- Cache key: `tmdb:box-office-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]`

**Client:**
- Use existing `PopularMoviesSection` carousel component
- Add to landing page below "In Theaters Now"

**Dependencies:**
- Story 1.1 (landing page structure) ✅
- Story 1.2 (carousel pattern established) ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/web/src/app/page.tsx` — Add carousel section

---

#### Story 1.4: Display Top Movies by IMDb Rating

**Description:** Fetch and display top-rated movies from TMDB on landing page.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #9) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] Fetch top-rated movies from TMDB API (`GET /movie/top_rated`)
- [ ] Create tRPC endpoint: `tmdb.topRatedMovies`
- [ ] Display as horizontal scrollable carousel
- [ ] Show movie poster, title, genre tag, and IMDb rating (prominently)
- [ ] List title: "Top Rated Movies"
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] Sorted by rating descending
- [ ] Gracefully handle API failures
- [ ] Results cached in Redis for 24 hours

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('topRatedMovies')`
- TMDB API: `GET /movie/top_rated?language=en-US`
- Cache key: `tmdb:top-rated-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]`

**Client:**
- Use existing `PopularMoviesSection` carousel component
- Add to landing page below "Box Office Leaders"

**Dependencies:**
- Story 1.1, 1.2, 1.3 ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/web/src/app/page.tsx` — Add carousel section

---

### Feature: Authentication

#### Story 1.5: User Registration (Email/Password)

**Description:** Allow users to sign up with email, optional username, and password.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Registration form at `/sign-up`
- [x] Fields: Email, Password, Username (optional)
- [x] Email validation (valid email format)
- [x] Password validation: min 8 chars, 1 uppercase, 1 number
- [x] Username validation: 3-30 chars, alphanumeric + underscore
- [x] Real-time username availability checking
- [x] Username generation button for convenience
- [x] Username suggestions if chosen name is taken
- [x] Submit button disabled until all fields valid
- [x] Error messages for validation failures
- [x] API call to `POST /api/auth/register`
- [x] On success: Create user in DB, set JWT cookie, redirect to `/films`
- [x] On error: Display error message (e.g., "Email already exists")
- [x] Password strength indicator (visual feedback)
- [x] Duplicate email prevention via unique constraint

**Technical Details:**

**Backend:**
- File: `apps/api/src/routers/auth.ts` (or API route)
- Endpoint: `POST /api/auth/register`
- Handler: `registerHandler(email: string, password: string)`
  - Hash password with bcrypt
  - Check if email exists → throw CONFLICT error
  - Insert user into `users` table
  - Generate JWT token (via `jose`)
  - Return: `{ userId: string, token: string }`

**Frontend:**
- File: `apps/web/src/app/(auth)/sign-up/page.tsx`
- Component: `SignUpForm` in `packages/ui/components/auth/sign-up-form.tsx`
- Form validation with React Hook Form + Zod
- tRPC mutation: `trpc.auth.register.useMutation()`
- On success: Store JWT in cookie (httpOnly, secure), redirect

**Database:**
- Table: `users` (already exists in schema)
- Ensure: `email` unique constraint, `password_hash` field

**Dependencies:**
- Database schema exists (`users` table)
- JWT secret configured in `.env`

**Affected Files:**
- `apps/api/src/routers/auth.ts` — Register endpoint
- `apps/web/src/app/(auth)/sign-up/page.tsx` — Sign-up page
- `packages/ui/components/auth/sign-up-form.tsx` — Form component
- `packages/db/schema.ts` — Ensure `users` table has required fields

---

#### Story 1.6: User Login

**Description:** Allow users to log in with email and password.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Login form at `/sign-in`
- [x] Fields: Email, Password
- [x] Email and password required
- [x] API call to `POST /api/auth/login`
- [x] On success: Set JWT cookie, redirect to `/films`
- [x] On error: Display error (generic "Invalid email or password")
- [x] Error doesn't reveal which field is wrong (timing attack resistant)
- [x] "Forgot Password" link (placeholder, TBD in Phase 2)
- [x] "Sign Up" link for new users
- [x] Remember me checkbox (optional, TBD)
- [x] Form validation prevents submission of invalid data

**Technical Details:**

**Backend:**
- File: `apps/api/src/routers/auth.ts`
- Endpoint: `POST /api/auth/login`
- Handler: `loginHandler(email: string, password: string)`
  - Query `users` table by email
  - If not found OR password doesn't match → throw UNAUTHORIZED (same message for both)
  - Generate JWT token
  - Return: `{ userId: string, token: string }`

**Frontend:**
- File: `apps/web/src/app/(auth)/sign-in/page.tsx`
- Component: `LoginForm` in `packages/ui/components/auth/login-form.tsx`
- Form validation with React Hook Form + Zod
- tRPC mutation: `trpc.auth.login.useMutation()`
- On success: Store JWT in cookie, redirect to `/app`

**Dependencies:**
- Story 1.5 (auth infrastructure in place)

**Affected Files:**
- `apps/api/src/routers/auth.ts` — Login endpoint
- `apps/web/src/app/(auth)/sign-in/page.tsx` — Login page
- `packages/ui/components/auth/login-form.tsx` — Form component

---

#### Story 1.7: JWT Token Management & Middleware

**Description:** Implement JWT token generation, validation, and route protection.

**Status:** ✅ DONE (Bug fixed: /films now protected)

**Acceptance Criteria:**
- [x] JWT created on login/register, stored in cookie (`movie_haven_session`)
- [x] Token signed with JWT_SECRET from `.env` using `jose` library
- [x] Token includes: `userId`, `email`, `iat`, `exp` (24h expiry)
- [x] Middleware at `apps/web/src/middleware.ts` verifies JWT on every request
- [x] Unauthenticated users redirected to `/sign-in` with `next` parameter
- [x] Authenticated users can access protected routes
- [x] Public paths: `/`, `/sign-in`, `/sign-up` (not `/films`)
- [x] Protected paths: `/films`, `/app/*` (require valid JWT)
- [x] Expired tokens delete cookie and redirect to `/sign-in`
- [x] API extracts `userId` from JWT payload in context
- [x] `protectedProcedure` throws UNAUTHORIZED if `userId` is null
- [x] tRPC client automatically adds `Authorization: Bearer {token}` header

**Technical Details:**

**Backend:**
- Use `jose` library for JWT operations
- Function: `generateJWT(userId: string) → token: string`
  - Payload: `{ userId, iat: now, exp: now + 24h }`
  - Sign with `JWT_SECRET`
- Function: `verifyJWT(token: string) → { userId: string } | null`
  - Verify signature
  - Check expiry
  - Return userId or null

**Frontend Middleware:**
- File: `apps/web/src/middleware.ts` (already exists in CLAUDE.md)
- On every request:
  - Read `movie_haven_session` cookie
  - Verify JWT validity
  - If invalid/expired: redirect to `/sign-in`
  - If valid: attach `userId` to request

**Client-Side tRPC:**
- File: `apps/web/src/lib/trpc/client.tsx`
- Automatically include JWT as `Authorization: Bearer {token}` header in all tRPC calls

**API Context:**
- File: `apps/api/src/trpc/context.ts` (already exists)
- Extract `userId` from Bearer token
- Pass to all procedures

**Dependencies:**
- Stories 1.5, 1.6 (auth endpoints exist)

**Affected Files:**
- `apps/api/src/lib/jwt.ts` (new) — JWT utilities
- `apps/web/src/middleware.ts` — Route protection
- `apps/api/src/trpc/context.ts` — Token extraction
- `apps/web/src/lib/trpc/client.tsx` — Add Authorization header
- `.env.example` files — Document JWT_SECRET

---

#### Story 1.8: Logout Functionality

**Description:** Allow users to log out and clear session.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Logout button in app header/navbar
- [x] On click: Clear JWT cookie and redirect to `/` (home)
- [x] API endpoint: `POST /api/auth/logout` (stateless, just clears cookie)
- [x] No data persisted on backend (stateless auth)
- [x] User state cleared in context on logout
- [x] Refreshing page after logout shows home/sign-in page (via middleware)

**Technical Details:**

**Backend:**
- Endpoint: `POST /api/auth/logout`
- Handler: Clears `movie_haven_session` cookie
- Returns: `{ success: true }`

**Frontend:**
- Logout button in auth context (`useAuth().logout()`)
- On click: Call `/api/auth/logout`, clear user state, redirect to `/`
- Integration: Added to layouts/headers as needed

**Dependencies:**
- Story 1.7 (JWT in place) ✅

**Affected Files:**
- `apps/web/src/app/api/auth/logout/route.ts` — Logout endpoint ✅
- `apps/web/src/contexts/auth-context.tsx` — Logout function ✅

---

### Feature: Demo Profile

#### Story 1.9: Seed Demo Database with 500 Movies & 100 Ratings

**Description:** Create a database script that populates demo data: 500 movies and 100 sample ratings for the demo profile.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #10) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] 500 movies seeded into `films` table (from TMDB API, paginated fetch)
- [ ] Movies span multiple genres, decades, release years, ratings
- [ ] 100 sample ratings created in `ratings` table
- [ ] Sample data tied to a demo user account (`demo@moviehaven.test`)
- [ ] Demo data is deterministic (reproducible seeding)
- [ ] Seed script is idempotent (safe to run multiple times)
- [ ] Data includes: title, plot, runtime, release date, cast, genres, TMDB rating, posters
- [ ] Demo user created with known credentials

**Technical Details:**

**Implementation:**
- Create Node.js script: `apps/api/scripts/seed-demo.ts`
- Approach: Fetch top movies from TMDB across categories, insert into DB
  
**Steps:**
1. Create demo user if not exists:
   - Email: `demo@moviehaven.test`
   - Username: `demo_user`
   - Password: `DemoPass123!`
2. Fetch 500 movies from TMDB:
   - Page through popular, top-rated, upcoming movies
   - Avoid duplicates
   - Ensure all required fields populated
3. Create 100 ratings tied to demo user:
   - Random movies from the 500
   - Ratings 1-10 (varied distribution)
   - Optional reviews for some ratings
4. Verify data integrity

**Running the Script:**
```bash
# From project root
pnpm --filter @movie-haven/api seed:demo
```

**Dependencies:**
- Database schema finalized ✅
- TMDB API key available ✅
- Database connection configured ✅

**Affected Files:**
- `apps/api/scripts/seed-demo.ts` — New seed script
- `apps/api/package.json` — Add script command
- `.env.example` — Document demo credentials

---

#### Story 1.10: Create Demo Profile Page & Button

**Description:** Create a public demo profile page showcasing the demo user with a button on landing page.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #11) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] Route accessible at `/demo` without authentication
- [ ] Demo button on landing page (top right corner or prominent location)
- [ ] Button routes to `/demo` on click
- [ ] Demo profile displays:
  - User header with avatar, email, stats (# ratings, # lists)
  - Tabs: Ratings, Watchlist, Reviews
  - All 100 sample ratings displayed with user ratings/reviews
  - Sample watchlist shown (5-10 curated movies)
- [ ] Shows filters (Genre, Actor, Director, Country, Streaming) as UI
- [ ] Shows sorting options (Rating, Release Year, Added Date)
- [ ] Mobile responsive
- [ ] Demonstrates full feature set (even if partially placeholders)

**Technical Details:**

**Backend:**
- Endpoint: `publicProcedure.query('demo.profile')`
  - Returns: Demo user data + all ratings + sample watchlist
  - No authentication required
- Endpoint: `publicProcedure.query('demo.ratings')`
  - Returns paginated ratings for demo user

**Frontend:**
- File: `apps/web/src/app/demo/page.tsx` (new public route)
- Components:
  - `DemoProfile` — Main page showing user stats
  - `DemoRatingsTab` — List of ratings with filters/sorts
  - `DemoWatchlistTab` — Sample watchlist display
- Landing page (`apps/web/src/app/page.tsx`):
  - Add "Demo Profile" button (small, top right)
  - Link to `/demo`

**Dependencies:**
- Story 1.9 (demo data seeded)

**Affected Files:**
- `apps/web/src/app/demo/page.tsx` — New demo page
- `apps/api/src/trpc/routers/public.ts` or new `demo.ts` router
- `apps/web/src/app/page.tsx` — Add demo button

---

#### Story 1.11: Display Demo Ratings with Filters & Sorts (UI Layer)

**Description:** Build UI to display demo user's ratings with interactive filters and sorts.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #12) — deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [ ] Display all 100 ratings in a table/grid layout with pagination or infinite scroll
- [ ] Columns: Movie Poster, Title, User Rating (1-10 stars), IMDb Rating, Release Year
- [ ] Filter sidebar shows (functional):
  - Genre dropdown (functional filter)
  - Actor dropdown (functional filter)
  - Director dropdown (functional filter)
  - Country dropdown (functional filter)
- [ ] Sort dropdown with options (functional):
  - IMDb rating (ascending/descending)
  - Release year (ascending/descending)
  - User rating (ascending/descending)
- [ ] Filters and sorts work together (AND logic)
- [ ] Clear filters button
- [ ] Show count: "Showing X of 100"
- [ ] Mobile responsive (card layout on mobile, table on desktop)
- [ ] Matches design style of `/films` browser (reuse components)

**Technical Details:**

**Frontend:**
- File: `apps/web/src/app/demo/page.tsx` — Reuse existing `/films` layout
- Components: Reuse `FiltersPanel`, `SortChips`, `RatingsTable` from `/films`
- State: Use URL query params for filters/sorts (shareable links)
  - Example: `/demo?genre=Action&sort=rating&order=desc`
  - Use `nuqs` library (already in project)
- Filter logic: Client-side filtering (all 100 ratings loaded)

**Backend:**
- Endpoint: `publicProcedure.query('demo.ratings')`
  - Input: filters, sorts, page, limit
  - Returns: Ratings with full movie metadata, pagination info
  - No DB filtering needed (small dataset)

**Dependencies:**
- Story 1.10 (demo profile page)
- Story 1.9 (demo data exists)
- Existing filter components from `/films` ✅

**Affected Files:**
- `apps/web/src/app/demo/page.tsx` — Add ratings tab
- `apps/api/src/trpc/routers/public.ts` — Add demo.ratings query
- Reuse: `FiltersPanel`, `SortChips` from existing code

---

#### Story 1.12: Protected /films Route & Main App Layout

**Description:** Ensure `/films` route is properly protected and add authenticated app layout with navigation.

**Status:** ⏭️ MOVED TO PHASE 2 (GitHub #13) — route protection already done ✅; remaining nav/layout work deferred so Phase 1 groundwork lands first

**Acceptance Criteria:**
- [x] Route at `/films` requires JWT authentication
- [x] Unauthenticated users redirected to `/sign-in`
- [x] Authenticated users see films browser with filters/sorts
- [ ] Navigation bar with:
  - Movie Haven logo (links to `/films` for authenticated, `/` for unauthenticated)
  - Search bar (TBD)
  - User menu with:
    - Profile link (Phase 2)
    - Settings link (Phase 2)
    - Logout button
- [ ] Sidebar or main navigation showing:
  - My Ratings (Phase 2)
  - My Watchlists (Phase 2)
  - Recommendations (Phase 4)
- [ ] Mobile-friendly navigation (hamburger menu)
- [ ] User greeting/display (name or email)

**Technical Details:**

**Backend:**
- Endpoint: `protectedProcedure.query('auth.me')` ✅ Exists in auth router
  - Returns current user info: `{ userId, email, username, displayName }`
  - Throws UNAUTHORIZED if no token

**Frontend:**
- File: `apps/web/src/app/(main)/films/page.tsx` ✅ Exists
- Layout: `apps/web/src/app/(main)/layout.tsx` (exists, may need refinement)
  - Header with navigation
  - Logout button in header
- Main `/films` page already has films browser with filters/sorts ✅

**Routing:**
- `(main)` route group for authenticated pages ✅
- Middleware protects all routes under `/main/*` ✅
- Public paths: `/`, `/sign-in`, `/sign-up` ✅

**Dependencies:**
- Stories 1.5, 1.6, 1.7 (auth complete) ✅

**Affected Files:**
- `apps/web/src/app/(main)/layout.tsx` — Refine navigation
- `apps/web/src/app/(main)/films/page.tsx` — Already done ✅
- `apps/api/src/trpc/routers/auth.ts` — auth.me query ✅

---

### Feature: shadcn/ui Migration

**Context:** The UI currently uses Tailwind v4 with OKLCH design tokens and several hand-rolled components (slide-in drawer, dropdown menus, sort popovers, form inputs) that reinvent Radix primitives. The `shadcn` CLI (v4.13) is installed but never initialized. This migration adds a proper `components.json`, replaces every hand-rolled component with the shadcn equivalent, and preserves the existing visual design exactly. All Radix packages are already installed; this is mostly wiring and replacement work.

**Key constraint:** Visual output must be identical before and after. This is an internal quality migration, not a redesign.

---

#### Story 1.13: Initialize shadcn CLI and Register Existing Components

**Description:** Run `shadcn init` for Tailwind v4, create `components.json`, and register the 7 existing `packages/ui` components so the CLI can manage them going forward.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `apps/web/components.json` created with correct paths pointing at `packages/ui/src/components/`
- [ ] Tailwind v4 style selected (`--style default`, CSS variables mode)
- [ ] Existing OKLCH token system (`globals.css @theme` block) preserved — no token values changed
- [ ] Custom tokens (`--color-gold`, `--color-gold-dim`, `--color-gold-bg`, `--color-streaming-dot`) preserved
- [ ] All 7 existing components (Button, Badge, Card, ScrollArea, Separator, Slider, Tooltip) registered in `components.json`
- [ ] `shadcn add <component>` works without error (verified by adding one new component)
- [ ] `pnpm type-check` and `pnpm lint` pass

**Technical Details:**

**Init command:**
```bash
cd apps/web && pnpm shadcn init
```
- Style: `default`
- Base color: do not overwrite — existing OKLCH tokens are already correct
- Components path: `../../packages/ui/src/components` (monorepo path)
- Utils path: `../../packages/ui/src/lib/utils`

**Gotcha — Tailwind v4:** shadcn v4.13 supports Tailwind v4 natively. The `@theme` block syntax in `globals.css` maps directly to shadcn's CSS variable expectations. Do NOT run with `--legacy` flag.

**Gotcha — Badge `gold` variant:** The existing `Badge` component has a custom `gold` variant not in stock shadcn. It must be preserved when registering. Do not overwrite the file.

**Affected Files:**
- `apps/web/components.json` (new)
- `apps/web/src/app/globals.css` (verify, must not change token values)

**Dependencies:** None

**Definition of Done:**
- [ ] `components.json` present and valid
- [ ] `shadcn add input` installs successfully to `packages/ui`
- [ ] No type errors, no lint errors

---

#### Story 1.14: Add Input + Label Components; Replace All Raw Form Inputs

**Description:** Add `Input` and `Label` shadcn components to `packages/ui`, then replace every raw `<input>` and `<label>` in the app with them.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `Input` component added to `packages/ui/src/components/input.tsx`
- [ ] `Label` component added to `packages/ui/src/components/label.tsx`
- [ ] Raw `<input>` replaced in:
  - `apps/web/src/app/(auth)/sign-in/page.tsx`
  - `apps/web/src/app/(auth)/sign-up/page.tsx`
  - `apps/web/src/components/filters/country-filter.tsx` (inline search)
- [ ] Raw `<label>` replaced with `Label` in sign-in and sign-up forms
- [ ] Visual appearance identical (same sizing, border, focus ring color = gold `--color-ring`)
- [ ] `pnpm type-check` passes

**Technical Details:**

**Install:**
```bash
cd apps/web && pnpm shadcn add input label
```

**Usage pattern:**
```tsx
import { Input } from "@movie-haven/ui"
import { Label } from "@movie-haven/ui"
```

**Gotcha:** The existing sign-in/sign-up forms apply custom focus styles (`focus:ring-gold`). The shadcn `Input` uses `ring-ring` which maps to `--color-ring` — already set to gold in `globals.css`. No extra CSS needed.

**Affected Files:**
- `packages/ui/src/components/input.tsx` (new)
- `packages/ui/src/components/label.tsx` (new)
- `packages/ui/index.ts` — export Input, Label
- `apps/web/src/app/(auth)/sign-in/page.tsx`
- `apps/web/src/app/(auth)/sign-up/page.tsx`
- `apps/web/src/components/filters/country-filter.tsx`

**Dependencies:** Story 1.13 (shadcn initialized) ✅

**Definition of Done:**
- [ ] All raw inputs replaced
- [ ] Forms look identical in browser
- [ ] No regressions on sign-in / sign-up flows

---

#### Story 1.15: Add DropdownMenu; Replace Hand-Rolled Header User Menu

**Description:** Add the `DropdownMenu` shadcn component and replace the header's hand-rolled mousedown-listener dropdown with the Radix-backed equivalent.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `DropdownMenu` added to `packages/ui/src/components/dropdown-menu.tsx`
- [ ] `apps/web/src/components/layout/header.tsx` refactored:
  - Remove `menuRef` + `useEffect` mousedown listener
  - Replace with `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
- [ ] Menu items: Profile (placeholder), Settings (placeholder), Logout
- [ ] Visual appearance identical — avatar trigger, same positioning, same background (`--color-popover`)
- [ ] Keyboard accessible (Escape closes, arrow keys navigate)
- [ ] `pnpm type-check` passes

**Technical Details:**

**Install:**
```bash
cd apps/web && pnpm shadcn add dropdown-menu
```

**Current implementation to remove:** `header.tsx` lines using `menuRef`, `setMenuOpen`, `useEffect` with `mousedown` listener — replace entirely with Radix `DropdownMenu`.

**Radix package:** `@radix-ui/react-dropdown-menu` is already installed in `packages/ui/package.json`. shadcn just wraps it.

**Affected Files:**
- `packages/ui/src/components/dropdown-menu.tsx` (new)
- `packages/ui/index.ts` — export DropdownMenu parts
- `apps/web/src/components/layout/header.tsx`

**Dependencies:** Story 1.13

**Definition of Done:**
- [ ] No `mousedown` event listener in header
- [ ] Keyboard navigation works
- [ ] Visual output identical

---

#### Story 1.16: Add Sheet; Replace Hand-Rolled FiltersDrawer

**Description:** Add the `Sheet` shadcn component and replace the mobile filters drawer's hand-rolled CSS `translate-x` slide animation.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `Sheet` component added to `packages/ui/src/components/sheet.tsx`
- [ ] `apps/web/src/components/filters/filters-drawer.tsx` refactored:
  - Remove manual `translate-x`, backdrop div, `body.style.overflow` lock, Escape key handler
  - Replace with `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`
- [ ] Drawer slides in from the right (same as current)
- [ ] Backdrop/overlay present and dismisses on click
- [ ] Body scroll locked while drawer open
- [ ] Escape key closes drawer
- [ ] Mobile only (visible < lg breakpoint — same as current)
- [ ] `pnpm type-check` passes

**Technical Details:**

**Install:**
```bash
cd apps/web && pnpm shadcn add sheet
```

**Note:** `Sheet` is built on `@radix-ui/react-dialog` (already installed). It handles overlay, scroll-lock, and keyboard dismiss natively.

**Affected Files:**
- `packages/ui/src/components/sheet.tsx` (new)
- `packages/ui/index.ts` — export Sheet parts
- `apps/web/src/components/filters/filters-drawer.tsx`

**Dependencies:** Story 1.13

**Definition of Done:**
- [ ] No manual translate/backdrop/overflow code in FiltersDrawer
- [ ] Drawer opens/closes correctly on mobile
- [ ] Escape and backdrop-click dismiss

---

#### Story 1.17: Add Popover + Command; Replace SortChips "Add Sort" Hack

**Description:** Add `Popover` and `Command` shadcn components and replace the CSS `group-hover:block` hack in SortChips with a proper accessible popover.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `Popover` added to `packages/ui/src/components/popover.tsx`
- [ ] `Command` added to `packages/ui/src/components/command.tsx`
- [ ] `apps/web/src/components/filters/sort-chips.tsx` refactored:
  - Remove CSS `group-hover:block` / `group` trick for "Add sort" dropdown
  - Replace with `Popover` + `PopoverTrigger` + `PopoverContent` containing a `Command` list
- [ ] Visual appearance same — "Add sort +" button opens a small popover with field options
- [ ] Click outside or Escape closes popover
- [ ] Keyboard accessible
- [ ] `pnpm type-check` passes

**Technical Details:**

**Install:**
```bash
cd apps/web && pnpm shadcn add popover command
```

**Affected Files:**
- `packages/ui/src/components/popover.tsx` (new)
- `packages/ui/src/components/command.tsx` (new)
- `packages/ui/index.ts` — export Popover + Command parts
- `apps/web/src/components/filters/sort-chips.tsx`

**Dependencies:** Story 1.13

**Definition of Done:**
- [ ] No `group-hover` CSS trick in sort-chips
- [ ] Popover opens/closes reliably
- [ ] Sort fields selectable from popover

---

#### Story 1.18: Add Pagination; Replace Hand-Rolled Films Pagination

**Description:** Add the `Pagination` shadcn component and replace the hand-rolled pagination controls on the `/films` page.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] `Pagination` added to `packages/ui/src/components/pagination.tsx`
- [ ] Films page pagination refactored to use `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`
- [ ] Visual appearance same — prev/next arrows + page numbers with current page highlighted in gold
- [ ] Keyboard accessible
- [ ] URL-synced page state preserved (via `nuqs`)
- [ ] `pnpm type-check` passes

**Technical Details:**

**Install:**
```bash
cd apps/web && pnpm shadcn add pagination
```

**Note:** shadcn `Pagination` is pure HTML — no Radix primitive. It uses `<nav>` + `<a>` elements styled with Tailwind. The active page highlight should use `--color-primary` (gold) to match the existing design.

**Affected Files:**
- `packages/ui/src/components/pagination.tsx` (new)
- `packages/ui/index.ts` — export Pagination parts
- `apps/web/src/app/(main)/films/page.tsx` (or pagination subcomponent)

**Dependencies:** Story 1.13

**Definition of Done:**
- [ ] Hand-rolled pagination removed
- [ ] shadcn Pagination renders correctly
- [ ] Page navigation works; URL updates

---

## Research Spikes

**Purpose:** Timeboxed investigations (1-3 days) to answer critical questions about complex features *before* building them.

**When to use:** For features with high uncertainty, multiple options, or significant architectural impact.

---

### Spike 1.S1: LLM Provider Evaluation for Recommendations

**Description:** Evaluate Claude, OpenAI, and Google Gemini for generating recommendation explanations. Determine cost, quality, latency, and best practices.

**Status:** 🟡 PENDING (needed before Phase 4)

**Goal:** Answer these questions before Phase 4 implementation:
- [ ] Which provider has best explanation quality?
- [ ] Which is most cost-effective with caching?
- [ ] What's the latency for each provider?
- [ ] Does prompt caching work as expected in Node.js SDK?
- [ ] What fallback strategy if LLM API fails?

**Deliverables:**
- Cost breakdown for 1000 users, 10 recommendations each (per provider)
- Sample explanations from each provider (quality comparison)
- Latency measurements (p50, p95, p99)
- Recommended provider + setup instructions
- Code example for chosen provider

**Suggested Approach:**
1. Create test script: `apps/api/scripts/test-llm-providers.ts`
2. Set up API keys for Claude, OpenAI, Google
3. Generate 20 sample explanations from each
4. Measure: cost, latency, quality
5. Document findings in `LLM_INTEGRATION.md` ✅ (already done!)

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] All 3 providers tested with real recommendations
- [ ] Cost spreadsheet created (monthly projections)
- [ ] Latency benchmarks recorded
- [ ] Quality comparison document (with sample outputs)
- [ ] Recommended provider selected + rationale documented
- [ ] Decision logged in PRD.md

---

### Spike 1.S2: Streaming Availability API Integration

**Description:** Investigate JustWatch and TMDB APIs for real-time streaming availability by region.

**Status:** 🟡 PENDING (needed before Phase 3)

**Goal:** Answer these questions:
- [ ] Which API has best coverage (movies, regions, providers)?
- [ ] What's the rate limit and cost?
- [ ] How fresh is the data (update frequency)?
- [ ] Can we cache availability (24h TTL)?
- [ ] What's needed for region detection (IP, user setting)?

**Deliverables:**
- API comparison matrix (coverage, freshness, cost, rate limits)
- Sample data from each API (structure, completeness)
- Region detection strategy (user setting vs. IP-based)
- Caching plan (24h TTL, invalidation strategy)
- Implementation plan for Phase 3

**Suggested Approach:**
1. Sign up for JustWatch and TMDB developer accounts
2. Test APIs with sample movies (10-20 films)
3. Compare response structure, completeness, latency
4. Document rate limits and pricing
5. Build small prototype: fetch + cache availability for 10 movies

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] Both APIs tested and documented
- [ ] Sample API responses captured
- [ ] Pricing/rate limit comparison created
- [ ] Region detection approach decided
- [ ] Caching strategy documented
- [ ] Implementation plan ready for Phase 3

---

### Spike 1.S3: IMDb Data Import Strategy

**Description:** Research IMDb export formats, data mapping, and bulk import process for user watchlists and ratings.

**Status:** 🟡 PENDING (needed before Phase 2)

**Goal:** Answer these questions:
- [ ] What export formats does IMDb support (CSV, JSON, XML)?
- [ ] How complete is the exported data (movie IDs, ratings, dates)?
- [ ] Can we reliably map IMDb movie IDs to TMDB IDs?
- [ ] What's the bulk import performance (1000 ratings in how long)?
- [ ] How do we handle missing movies (not in our DB)?

**Deliverables:**
- IMDb export format documentation (sample file)
- Mapping strategy (IMDb ID → TMDB ID)
- SQL schema for bulk import
- Performance benchmarks (import speed for 1K, 10K ratings)
- Error handling strategy (missing movies, invalid data)
- User-facing import instructions

**Suggested Approach:**
1. Export your own IMDb watchlist and ratings (test data)
2. Analyze the CSV/JSON structure
3. Research IMDb ID ↔ TMDB ID mapping APIs
4. Build import script: `apps/api/scripts/import-imdb-data.ts`
5. Benchmark with 100, 500, 1000 ratings
6. Document any data loss or edge cases

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] IMDb export formats documented (with samples)
- [ ] TMDB mapping strategy tested (success rate documented)
- [ ] Import script created and benchmarked
- [ ] Error handling for missing movies implemented
- [ ] User guide written (how to export from IMDb)
- [ ] Ready for Phase 2 implementation

---

### Spike 2.S1: ML Recommendation Engine Algorithm Selection

**Description:** Research and prototype collaborative filtering and content-based filtering algorithms to find best approach for Movie Haven.

**Status:** 🟡 PENDING (needed before Phase 4)

**Goal:** Answer these questions:
- [ ] What algorithm gives best recommendation quality?
- [ ] Is collaborative filtering alone sufficient or do we need hybrid?
- [ ] How much data (ratings) do we need before recommendations are good?
- [ ] Can we compute recommendations in Node.js or need Python/ML service?
- [ ] What's the computational cost for 1000, 10K, 100K users?

**Deliverables:**
- Algorithm comparison (collaborative vs. content-based vs. hybrid)
- Prototype implementation in Node.js
- Performance benchmarks (speed, accuracy)
- Dataset requirements (minimum ratings for good recommendations)
- Recommendation quality metrics (precision, recall, diversity)
- Architecture decision (Node.js vs. Python worker vs. ML service)

**Suggested Approach:**
1. Study collaborative filtering basics (user-user, item-item, matrix factorization)
2. Build prototype in Node.js using basic math libraries
3. Use your demo data (500 movies, 100 ratings) as test set
4. Measure: How many users like movie X? How similar are two movies?
5. Generate sample recommendations and manually evaluate quality
6. Compare with simpler rule-based recommendations (baseline)

**Time estimate:** 3-5 days  
**Responsible team:** 1-2 agents

**Definition of Done:**
- [ ] Algorithm research document completed
- [ ] Prototype implementations created (at least 2 algorithms)
- [ ] Performance benchmarks on demo data
- [ ] Recommendation quality evaluation (manual review of top 10)
- [ ] Architecture recommendation (Node.js vs. external)
- [ ] Ready for Phase 4 implementation

---

### Spike 4.S1: LLM Prompt Engineering for Recommendations

**Description:** Develop and optimize prompts to generate high-quality, natural-sounding movie recommendation explanations.

**Status:** 🟡 PENDING (part of Phase 4)

**Goal:** Answer these questions:
- [ ] What prompt structure produces best explanations?
- [ ] How many user preferences should we include (vs. too much context)?
- [ ] Should we use different prompts for different movies/genres?
- [ ] How much does explanation quality vary with model (Sonnet vs. Opus)?
- [ ] Can we measure explanation quality programmatically?

**Deliverables:**
- 5-10 prompt variations tested and compared
- Sample explanations showing quality differences
- Final prompt template (for Phase 4 implementation)
- Style guide (tone, length, specificity)
- Quality evaluation rubric (for manual review)
- Cost analysis (tokens per explanation with final prompt)

**Suggested Approach:**
1. Start with basic prompt (see LLM_INTEGRATION.md Example 1)
2. Iterate: Add user context, adjust tone, add examples
3. Generate explanations for 20 test cases (varied movies/genres)
4. Manually review for quality (is it specific? does it reference user taste? etc.)
5. Measure token usage per prompt version
6. Pick best prompt and document rationale

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent + user feedback

**Definition of Done:**
- [ ] 10+ prompt variations tested
- [ ] Quality comparison spreadsheet created
- [ ] Final prompt template selected and documented
- [ ] Sample outputs showing quality level
- [ ] Style guide for explanations (tone, length, specificity)
- [ ] Token cost per explanation measured
- [ ] Ready for Phase 4 implementation

---

## Phase 2: Profile Builder & Data Import

> Full Phase 2 stories (profile builder, IMDb import, ratings/reviews, watchlists, social auth) will be added after Phase 1 groundwork is complete. Detailed acceptance criteria for the moved feature stories below remain in their original locations in the Phase 1 section — only their **phase/milestone** changed.

**Feature stories moved here from Phase 1** (deferred so the agentic-harness groundwork lands first; GitHub Issues are the source of truth):

| Story | Title | GitHub |
|---|---|---|
| 1.2 | Display Current Movies in Theater (NOW_PLAYING) | #7 |
| 1.3 | Display Top Movies by Box Office Revenue | #8 |
| 1.4 | Display Top Movies by IMDb Rating | #9 |
| 1.9 | Seed Demo Database with 500 Movies & 100 Ratings | #10 |
| 1.10 | Create Demo Profile Page & Button | #11 |
| 1.11 | Display Demo Ratings with Filters & Sorts (UI Layer) | #12 |
| 1.12 | Protected /films Route & Main App Layout (route protection already done ✅) | #13 |

---

## Implementation Guidelines for Agents

### Before Starting

1. **Read the PRD** — Understand the feature context from [PRD.md](./PRD.md)
2. **Check dependencies** — Ensure all prerequisite stories are completed
3. **Review the schema** — Check `packages/db/schema.ts` for table structures
4. **Check existing code** — Review similar patterns in `apps/api/src/routers/` and `apps/web/src/`

### During Implementation (Test-Driven Development)

**1. Write Tests First (RED phase):**
- Write unit tests for new functions before implementing them
- Write integration tests for API endpoints
- Write component tests for new React components
- Tests will FAIL initially (this is expected)
- See [TESTING.md](./TESTING.md) for examples

**2. Implement Minimal Code (GREEN phase):**
- Write minimal code to make tests pass
- No over-engineering; solve exactly what the test requires
- All tests should PASS

**3. Code Quality:**
- **Follow conventions** — Match code style in existing routers/components
- **Use TypeScript** — Strict type checking, no `any`
- **Error handling** — Throw appropriate tRPC errors (`UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, etc.)
- **Database queries** — Use Drizzle ORM, not raw SQL
- **API responses** — Always return typed objects, use `packages/types/` for shared types
- **Environment variables** — Add to `.env.example` files

**4. Test Quality:**
- Unit tests for pure functions (utilities, validators, formatters)
- Integration tests for API endpoints (with real DB)
- Component tests for React components (user interactions)
- E2E tests for critical user flows (sign up → browse → rate)
- Test error cases (missing data, validation failures, API errors)
- Test edge cases (empty input, null values, special characters)
- All tests must PASS before committing

**5. Coverage Requirements:**
- Critical paths (auth, recommendations): 90% coverage
- Core features (films, ratings): 80% coverage
- UI components: 70% coverage
- Overall: 80% coverage minimum

See [TESTING.md](./TESTING.md) for detailed testing guide with examples.

### Completion Checklist (Test-Driven Development)

**RED Phase (Write Tests First):**
- [ ] Unit tests written for new functions
- [ ] Integration tests written for API endpoints
- [ ] Component tests written for new React components
- [ ] All tests FAIL (code doesn't exist yet)

**GREEN Phase (Write Minimal Code):**
- [ ] Write minimal code to make tests pass
- [ ] All tests PASS
- [ ] Code compiles without errors
- [ ] No TypeScript errors (`pnpm type-check`)

**REFACTOR Phase (Improve Code):**
- [ ] Refactor for clarity and efficiency
- [ ] All tests still PASS
- [ ] No linting issues (`pnpm lint`)
- [ ] Code review comments addressed

**VERIFICATION Phase (Ensure It Works):**
- [ ] All acceptance criteria met
- [ ] Feature tested in browser (manual)
- [ ] Edge cases tested (error states, empty input, etc.)
- [ ] No regressions in existing tests
- [ ] Coverage maintained (no decrease)

**FINAL:**
- [ ] Commit message explains the "why" and references tests
- [ ] All CI/CD checks pass

**Testing Coverage by Story:**
- Auth stories (1.5-1.8): **90% coverage required**
- Data import stories: **80% coverage required**
- UI stories: **70% coverage required**
- Recommendation stories: **85% coverage required**

---

**Last Updated:** May 24, 2026  
**Next Phase:** Phase 2 stories will be added after Phase 1 completion
