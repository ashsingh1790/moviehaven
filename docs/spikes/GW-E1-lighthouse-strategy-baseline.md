---
title: "GW-E1 Spike: Lighthouse / LHCI Strategy + Baseline Audit"
issue: "#48"
status: decided
last_updated: 2026-07-11
---

# GW-E1 — Lighthouse / LHCI Strategy + Baseline Audit

## Summary / Recommendation

**`@lhci/cli` in a GitHub Actions job is feasible on the free tier** (the repo is public → unlimited Actions minutes, same fact established in GW-A1). A real baseline was measured locally against a production `next start` build for the three pages that don't require auth (`/`, `/sign-in`, `/sign-up`). `/films` requires a logged-in session plus the API + Postgres, neither of which exist in this sandbox — it is deferred to a follow-up ticket (see "Auth'd Page Strategy" below); GW-E2 should gate on the three public pages first.

The maintainer's "perfect Lighthouse score" goal is implemented as a **ratcheting budget**: `minScore` starts at measured-baseline-minus-2-points per category, and metric budgets (LCP/TBT/CLS) start at measured-median-plus-10%, with an explicit rule for raising (never silently lowering) budgets over time. See "Ratchet Policy."

**Important caveat on the numbers below:** they were measured on a local macOS laptop, not the Ubuntu GitHub Actions runner GW-E2 will actually run on. Lighthouse performance timings (LCP, TBT) are CPU/IO-dependent and will differ — likely be slower and noisier — on a shared CI runner. Category **scores** for accessibility/best-practices/SEO are DOM/audit-based and not hardware-sensitive, so those transfer directly. **GW-E2 must re-run this same measurement once on its actual CI runner and adjust the metric budgets (not the category minScores) before turning on enforcement.** This is flagged, not hidden — see the "What GW-E2 Implements" checklist.

---

## Measured Baseline

**Methodology:**
- `pnpm install --frozen-lockfile` at repo root (Node 26.4, matches `.nvmrc` intent), `apps/web/.env.local` created from `.env.example` with dummy values (`NEXT_PUBLIC_API_URL=http://localhost:3001`, `JWT_SECRET=<dummy>` — not committed, gitignored).
- `pnpm --filter @movie-haven/web build` → production build succeeded (one pre-existing Edge Runtime warning from `jose`'s `CompressionStream` usage, unrelated to this spike, not a build failure).
- `pnpm --filter @movie-haven/web start` → `next start` on port 3000. No API/DB running; `/`, `/sign-in`, `/sign-up` render fully client-independent (the landing page's `PopularMoviesSection` calls `serverTrpc.tmdb.popularMovies` and gracefully falls back to an empty-state message on failure, which is what was measured — this is a **worse-than-real-data** baseline, i.e. conservative).
- `npx lighthouse <url> --output=json --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance,accessibility,best-practices,seo --quiet` (Chrome via `google-chrome-stable`/local Google Chrome.app, auto-detected by the `chrome-launcher` dependency lighthouse installs). Worked without issue — no fallback to `@lhci/cli collect` was needed.
- **n=3 runs per page**, median reported per LHCI convention (median run by performance score, but since scores were stable, plain per-metric median is used here for simplicity — GW-E2 should use LHCI's built-in median-run selection).

**Scores (median of 3 runs):**

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 0.98 | 0.95 | 0.96 | 0.91 |
| `/sign-in` | 0.99 | 0.79 | 0.96 | 0.91 |
| `/sign-up` | 0.99 | 0.79 | 0.96 | 0.91 |

**Core Web Vitals (median of 3 runs, lab data, no throttling override beyond Lighthouse defaults):**

| Page | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|
| `/` | 2307 | 78 | 0 |
| `/sign-in` | 1959 | 9 | 0 |
| `/sign-up` | 1806 | 11.5 | 0 |

Raw per-run values (home: 2321/2307/2307ms LCP, 90/70/78ms TBT; sign-in: 1963/1659/1959ms LCP, 56/9/9ms TBT; sign-up: 1959/1715/1806ms LCP, 8/69/11.5ms TBT) show TBT is noisy at these small magnitudes (single-digit-to-low-double-digit ms) — expected on a lightly-loaded local machine measuring near-instant pages. CI numbers will likely be both higher and more consistent (shared runner, no other processes competing for CPU/scheduling).

**`/films`:** Not measured. It sits behind JWT auth and needs live Postgres + Redis + `apps/api` running with a seeded user — none of which exist in this sandbox per the ticket's own guidance. Marked **CI-only** — see "Auth'd Page Strategy."

---

## LHCI Setup Decision (for GW-E2)

**Recommendation: `@lhci/cli` as a GitHub Actions job, collecting against a production `next start`, n=3 runs, median-based assertion, dual-upload (temporary-public-storage + GH artifact).**

- **Collect:** Use LHCI's built-in `collect.startServerCommand` / `collect.url` (it starts the server, polls until ready via `startServerReadyPattern`, runs Lighthouse, then tears the server down) — no custom `wait-on` script needed, no port-collision risk with parallel jobs since each job gets its own runner.
- **n=3, median:** LHCI's default `numberOfRuns` is 1; explicitly set to `3` so the assertion step uses the median run per URL, matching this spike's methodology and reducing single-run flakiness (see TBT noise above).
- **Assert:** `lighthouserc.json` with per-page `assertMatrix` entries (see proposal below) — pages have different budgets because `/sign-in`/`/sign-up` have a known, real accessibility gap (0.79) baked into the honest baseline; a single global `minScore` would either be too loose for `/` or immediately fail CI for the auth pages.
- **Upload — dual strategy, not either/or:**
  - **Primary: `target: "temporary-public-storage"`.** This is LHCI's own free, zero-config, officially-supported hosted-report feature — every PR check gets a clickable link straight to the full HTML report (filmstrip, opportunity list, trace) with no extra infrastructure. Reports expire after ~7 days, and the repo is already public, so there's no confidentiality concern with a temporary public URL.
  - **Secondary: also upload the `.lighthouseci/` JSON output as a plain `actions/upload-artifact`.** This survives past the 7-day LHCI storage window (default GH artifact retention is 90 days) for later trend analysis/debugging, and doesn't depend on a third-party service staying up. This costs nothing extra (public repo, unlimited Actions minutes+storage is generous) and is a few lines of workflow YAML.
  - Artifact-only-with-no-hosted-link was considered and rejected: it works but loses the one-click "look at the actual report" UX for whoever's reviewing the PR, for zero cost savings (both are free here).

### `lighthouserc.json` proposal

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/sign-in",
        "http://localhost:3000/sign-up"
      ],
      "startServerCommand": "pnpm --filter @movie-haven/web start",
      "startServerReadyPattern": "Ready in",
      "startServerReadyTimeout": 30000,
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--headless --no-sandbox --disable-gpu",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo"]
      }
    },
    "assert": {
      "assertMatrix": [
        {
          "matchingUrlPattern": "^http://localhost:3000/$",
          "assertions": {
            "categories:performance": ["error", { "minScore": 0.96 }],
            "categories:accessibility": ["error", { "minScore": 0.93 }],
            "categories:best-practices": ["error", { "minScore": 0.94 }],
            "categories:seo": ["error", { "minScore": 0.89 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 2550 }],
            "total-blocking-time": ["error", { "maxNumericValue": 150 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
          }
        },
        {
          "matchingUrlPattern": "^http://localhost:3000/sign-in$",
          "assertions": {
            "categories:performance": ["error", { "minScore": 0.97 }],
            "categories:accessibility": ["error", { "minScore": 0.77 }],
            "categories:best-practices": ["error", { "minScore": 0.94 }],
            "categories:seo": ["error", { "minScore": 0.89 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 2200 }],
            "total-blocking-time": ["error", { "maxNumericValue": 150 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
          }
        },
        {
          "matchingUrlPattern": "^http://localhost:3000/sign-up$",
          "assertions": {
            "categories:performance": ["error", { "minScore": 0.97 }],
            "categories:accessibility": ["error", { "minScore": 0.77 }],
            "categories:best-practices": ["error", { "minScore": 0.94 }],
            "categories:seo": ["error", { "minScore": 0.89 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
            "total-blocking-time": ["error", { "maxNumericValue": 150 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
          }
        }
      ]
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Notes on the numbers above:**
- Category `minScore` = measured baseline − 2 points on the 0–100 scale (e.g. `/` performance 0.98 → 0.96; `/sign-in` accessibility 0.79 → 0.77). This gives ±2-point headroom for CI run-to-run noise without hiding a real regression.
- LCP `maxNumericValue` = measured median × 1.10, rounded to a clean number.
- TBT is set to a flat **150ms** ceiling across all three pages rather than median×1.10. At single-digit-to-low-double-digit millisecond magnitudes, a 10%-headroom rule amplifies measurement noise (a 9ms median becomes a ~10ms budget, which nearly any CI jitter will blow through). 150ms is still comfortably inside Lighthouse's own "good" TBT threshold (<200ms) and gives real headroom until there's enough real client JS on these pages to need a tighter number.
- CLS is set to Lighthouse's standard "good" threshold (0.1) rather than 0×1.10=0, since a strict-zero budget is not meaningful/actionable and any budget of exactly 0 will false-positive on the smallest layout nudge.
- **These are starting values for GW-E2 to sanity-check against one real CI run before turning `assert` from advisory to blocking** — see the CI-hardware caveat above.

---

## Ratchet Policy

The budgets above are a floor, not a ceiling on ambition — "perfect score" stays the aspiration, reached incrementally:

1. **Raise, never silently lower.** A budget in `lighthouserc.json` may only increase (tighter minScore / lower metric ceiling) or stay flat. Lowering a budget (loosening it) requires an explicit GitHub issue explaining the regression and is never done inside the same PR that caused it.
2. **When to raise:** if a merged PR's LHCI run shows a category score improving by **more than 2 points** compared to the current budget's baseline, **for 2 consecutive PR runs after that merge** (to rule out a one-off lucky run), raise that category's `minScore` to (new median − 2 points) in a follow-up PR that touches only `lighthouserc.json` plus a one-line changelog note of old→new value and why.
3. **Metric budgets (LCP/TBT/CLS) ratchet the same way**: if the median over 2 consecutive post-merge runs beats the current ceiling by >10%, tighten the ceiling to new-median×1.10.
4. **No budget is raised speculatively** — only in response to a measured, sustained improvement. This keeps the budget file an honest reflection of "what we've actually verified this app can do," not a wishlist.
5. **Ownership:** whoever's PR caused the improvement should raise the budget in the same PR (or immediately after) — don't let ratcheting drift to a separate, forgotten cleanup task.

---

## Auth'd Page Strategy (`/films`)

**Recommendation: defer `/films` to a follow-up ticket; gate the three public pages first in GW-E2.**

Rationale:
- `/films` requires a valid JWT session cookie (`movie_haven_session`), which requires the API server, Postgres, and a seeded test user to exist in CI — none of which GW-E2's scope currently guarantees. GW-C4 (API integration/E2E test harness — ephemeral Postgres/Redis) and GW-C7 (critical-path E2E smoke suite) are the tickets that stand up exactly that infrastructure; wiring `/films` into Lighthouse before they land means duplicating that setup inside the Lighthouse job instead of reusing it.
- **No Playwright auth fixture exists yet in this repo** (`GW-C1`, the E2E strategy spike, and `GW-C3`, Playwright install, are both still `PENDING` per `docs/STORIES.md` — there is no `playwright.config.ts` or `*.spec.ts` in `apps/web` today). The ticket's suggestion to "align with the Playwright auth fixture from GW-C1" can't be done yet because that fixture doesn't exist; this spike instead documents the *planned* shape so GW-C1/C3 and a later Lighthouse-for-`/films` ticket can implement it consistently.

**Planned approach once the auth fixture exists (not implemented by this ticket):**
1. In CI, before the Lighthouse job, seed one deterministic test user (reuse whatever `createUser` factory GW-C6 builds) and log in via the same API call the app itself uses (`POST /api/auth/login`), capturing the returned JWT.
2. LHCI's `collect.settings` supports `extraHeaders` (e.g. `{"Cookie": "movie_haven_session=<token>"}`) applied to every request Lighthouse makes for that URL — this is the mechanism to use, since LHCI doesn't have first-class Playwright `storageState` import, but a raw `Cookie` header achieves the same effect for a JWT-in-cookie scheme.
3. Add a fourth `assertMatrix` entry for `http://localhost:3000/films` once (a) GW-C4's ephemeral DB/Redis setup is available to the Lighthouse job's `services:` block and (b) a seeded user + token-mint step exists in a reusable script.
4. Until then, `/films` is explicitly **out of scope / TBD-in-CI** — not measured, not budgeted, not gated. This is called out here rather than silently ignored so GW-A7 (merge gate) doesn't assume `/films` is covered by the Lighthouse check.

---

## Perfect-Score Gap List

Concrete, per-audit items blocking 100 in each category, pulled directly from the measured reports (these seed future fix tickets — not fixed by this spike):

**Accessibility (0.79 on `/sign-in`, `/sign-up`; 0.95 on `/`):**
- `button-name` — the password show/hide toggle button (`<button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 ...">` wrapping the Eye icon) has no accessible name (no `aria-label`, no visually-hidden text). This is the single biggest a11y gap on both auth pages.
- `target-size` — the same show/hide button's touch target is smaller than the recommended 24×24px (or lacks adequate spacing from adjacent targets).
- `landmark-one-main` — neither auth page wraps its content in a `<main>` landmark.
- `link-in-text-block` — the "Create one" / "Sign in" links in the auth-page footer text rely on color alone to be distinguishable from surrounding text (no underline/weight difference outside of `:hover`).
- `color-contrast` — insufficient contrast on `text-muted-foreground` text against the page background (hit on all three pages; the "Powered by TMDb" caption on `/` and the helper/footer copy on both auth pages).

**SEO (0.91 on all three pages):**
- `robots-txt` — **there is no `robots.txt` file in `apps/web`.** Next.js falls through to the app's own 404-then-redirect-to-sign-in handling, so requesting `/robots.txt` returns the *sign-in page's HTML* with a `next=%2Frobots.txt` param baked in, which Lighthouse's `robots-txt` audit correctly flags as "not valid" (parses as `Unknown directive`) — and this same fetch is what trips the `errors-in-console` best-practices audit (`network: Failed to load resource: 404`) on every page. **This is the single fix that closes two failing audits at once** (add `apps/web/src/app/robots.ts` per Next.js's Metadata API, or a static `public/robots.txt`).
- All other SEO audits (`is-crawlable`, `document-title`, `meta-description`, `http-status-code`, `link-text`, `crawlable-anchors`, `image-alt`, `hreflang`, `canonical`, `structured-data`) already pass — SEO's gap is narrowly the missing `robots.txt`.

**Best Practices (0.96 on all three pages):**
- `errors-in-console` — same root cause as the `robots-txt` gap above (404 on `/robots.txt` logged as a console error); fixing `robots.txt` should close this too.
- `bf-cache` — the page prevents back/forward-cache restoration (commonly caused by an unload/beforeunload listener, or a still-open connection — worth a follow-up investigation, TMDB image lazy-loading and tRPC's fetch links are the likely suspects but weren't root-caused in this spike).

**Performance (0.98–0.99, already near the ceiling):**
- `unused-javascript` on `/` — ~49 KiB of estimated unused JS (likely shared chunks that include code not exercised by this specific route); candidate for GW-E6's bundle-analysis work rather than a Lighthouse-specific fix.
- No other performance opportunities flagged; LCP/TBT/CLS are all comfortably within "good" thresholds already.

---

## What GW-E2 Implements

- [ ] `.github/workflows/lighthouse.yml` — new job, triggers on `pull_request`, builds web with the same dummy-env pattern as `bundle-size.yml`, runs `@lhci/cli autorun` against `lighthouserc.json` (checked into `apps/web/`).
- [ ] `apps/web/lighthouserc.json` seeded from the proposal above.
- [ ] **Re-measure once on the actual GitHub Actions runner** and adjust LCP/TBT ceilings (not category minScores, which are hardware-independent) before flipping assertions from advisory to blocking.
- [ ] Dual upload: `temporary-public-storage` (PR-visible link) + `actions/upload-artifact` of the raw `.lighthouseci/` JSON (durability past LHCI's 7-day window).
- [ ] Wire the ratchet policy above as a one-paragraph contributor note (e.g. a comment atop `lighthouserc.json`) so future PRs raising budgets know the rule.
- [ ] Leave `/films` unmeasured/ungated until GW-C4 (ephemeral test DB) and a seeded-user token-mint script exist; add it as a fourth `assertMatrix` entry with `extraHeaders` cookie injection once those land.
- [ ] Optionally open follow-up tickets for the gap-list items above (robots.txt fix closes 2 audits at once; button-name/target-size/landmark-one-main/color-contrast on auth pages closes the accessibility gap) — not required for GW-E2 itself, but natural next work once budgets are live.
