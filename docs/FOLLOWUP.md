# Follow-up Backlog

Follow-up stories discovered **during** a phase's work that weren't in the original scope. Companion to [STORIES.md](./STORIES.md) (the spec) and [PROGRESS.md](./PROGRESS.md) (completed log).

**Process:** After a phase completes, its follow-up sub-phase is worked **next**, before commencing the next major phase. Follow-ups for Phase 1 live under **Phase 1.1**; if more accumulate later they go under 1.2, 1.3, … Same for Phase 2 → 2.1, etc. Each story is tracked as a GitHub Issue under the **Phase 1.1 milestone** (issues are the live status source of truth); the number is linked in each story below.

**Last Updated:** 2026-07-12

---

## Phase 1.1 — Follow-ups from Phase 1 Groundwork

Discovered while executing the Phase 1 CI/security/testing groundwork. Ordered by priority (High → Low). Take these before starting Phase 2.

### 🔴 High

#### F1.1.1 · Enable branch protection on `main`
**Status:** ✅ DONE (#99) · **Source:** this session
Applied via `gh api` — the green gates now enforce on `main`.
- [x] Require status checks before merge: `Type-check · Lint · Test`, `Dependency audit (pnpm audit)`, `Secret scan (gitleaks)`, `Build web · Check bundle budget`
- [x] Strict (branches up to date) + enforce for admins
- [x] Block force-push and deletion of `main`
- [ ] Require ≥1 approving review — deferred until the GW-B5 reviewer bot exists (would block solo self-merge today)

#### F1.1.2 · Frontend quality quick-wins (SEO + a11y)
**Status:** 🟡 PENDING (#91) · **Source:** GW-E1 / #85 (Lighthouse baseline)
Small, measurable fixes surfaced by the Lighthouse audit; raise auth-page a11y from 0.79.
- [ ] Add `apps/web/public/robots.txt` (closes two failing SEO audits at once)
- [ ] Add `aria-label` to the password show/hide toggle button on sign-in and sign-up (the main a11y gap)
- [ ] Re-run Lighthouse; confirm SEO and accessibility improve on `/`, `/sign-in`, `/sign-up`

#### F1.1.3 · Register `packages/*` in deepsec config
**Status:** 🟡 PENDING (#92) · **Source:** GW-D5 / #84
`packages/**` changes trigger the deepsec workflow (paths filter) but aren't actually scanned — only `apps/api` and `apps/web` are registered projects.
- [ ] Decide scope: register `packages/db`, `packages/types`, `packages/ui`, `packages/okf` as deepsec projects, or narrow the workflow paths filter to only scanned dirs
- [ ] Update `.deepsec/deepsec.config.ts` and/or `.github/workflows/deepsec.yml` accordingly
- [ ] Verify a `packages/**`-only diff scans (or is correctly skipped) as intended

### 🟠 Medium

#### F1.1.4 · Agent path-scope enforcement hook
**Status:** 🟡 PENDING (#93) · **Source:** GW-B0 / #81 (deferred) · **Deps:** GW-A2 (agent identity)
A PreToolUse hook (`enforce-agent-path-scope.sh`) that blocks a coder agent from editing outside its owned paths (FE: `apps/web`+`packages/ui`; BE: `apps/api`+`packages/db`).
- [ ] Hook reads the acting agent's identity/scope (needs GW-A2's handoff signal) and denies Edit/Write outside owned globs
- [ ] Wired into `.claude/settings.json` PreToolUse (Write|Edit|MultiEdit)
- [ ] Complements the prompt-level + PR-reviewer path checks that ship with GW-B1–B5

#### F1.1.5 · Coverage threshold enforcement
**Status:** 🟡 PENDING (#94) · **Source:** GW-C2 (deferred) · **Deps:** GW-C4, GW-C7 (real tests exist)
GW-C2 wired the v8 coverage provider but did not enforce thresholds (would make CI permanently red with almost no tests). Turn on gates once real suites land.
- [ ] Set per-package coverage thresholds per docs/TESTING.md (auth 90%, core 80%, UI 70%, overall 80%)
- [ ] Make the coverage check blocking in CI once GW-C4/C7 provide baseline coverage
- [ ] Ratchet policy documented (never lower without an issue)

#### F1.1.6 · Pin GitHub Actions to commit SHAs
**Status:** 🟡 PENDING (#95) · **Source:** this session (#71/#72 moving-tag break)
The `pnpm/action-setup@v4` moving tag silently changed behavior and broke all CI. Pin actions to full commit SHAs for reproducibility + supply-chain safety.
- [ ] Pin `actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/github-script`, `gitleaks/gitleaks-action`, LHCI, etc. to SHAs (with a version comment)
- [ ] Across `ci.yml`, `security.yml`, `bundle-size.yml`, `deepsec.yml`, `pr-labels.yml`, `release.yml`
- [ ] Optionally enable Dependabot `github-actions` ecosystem to bump the pins

### 🟢 Low

#### F1.1.7 · Reconcile `docs/TESTING.md` with the decided E2E strategy
**Status:** 🟡 PENDING (#96) · **Source:** GW-C1 / #80
The aspirational TESTING.md predates GW-C1's decisions (Playwright layout, browser matrix, `createCaller` vs `inject`, DB isolation). Align or supersede it so it isn't misleading.
- [ ] Update TESTING.md to match GW-C1's decisions (or add a pointer to the spike doc)
- [ ] Remove/annotate examples that no longer reflect the chosen approach

#### F1.1.8 · Clean stray `apps/web/.claude/skills`
**Status:** 🟡 PENDING (#97) · **Source:** this session
An accidental nested `apps/web/.claude/skills` directory exists (untracked). Confirm it's an artifact and remove; check for other stray nested `.claude` dirs.
- [ ] Verify contents are not needed
- [ ] Remove; confirm no other nested `.claude` artifacts under `apps/**` or `packages/**`

#### F1.1.9 · Lighthouse the authenticated `/films` page
**Status:** 🟡 PENDING (#98) · **Source:** GW-E1 / #85 · **Deps:** GW-C4 (auth fixture)
`/films` couldn't be measured (JWT + live API/DB required, no auth fixture yet). Add it to the LHCI run once the Playwright auth fixture exists.
- [ ] Reuse the seeded-test-user storageState/cookie approach from GW-C1/GW-C4 to authenticate LHCI against `/films`
- [ ] Capture baseline + add its budgets to `lighthouserc`

---

## Phase 2.1 — Follow-ups from Phase 2

_None yet._
