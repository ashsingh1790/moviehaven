# Progress Log

Tracks **completed** work per phase, with notes where the actual implementation went beyond the story's acceptance criteria. Companion to [STORIES.md](./STORIES.md) (the spec) and [FOLLOWUP.md](./FOLLOWUP.md) (the follow-up backlog). GitHub Issues remain the live status source of truth; this file is the human-readable record of what shipped and what changed along the way.

**Last Updated:** 2026-07-12

---

## Phase 1: Foundations & Agentic Dev Harness (Groundwork)

**Status:** 🟢 In progress. CI + security + testing foundation merged and green; Wave-0 spikes drafted (in review).

### Completed — merged to `main`

| Story | Issue / PR | Summary | Beyond acceptance criteria |
|---|---|---|---|
| GW-A1 · Autonomy Runtime Selection (spike) | #21 / #55 | Chose **Hybrid** (local coding loop + Actions gates). Repo is public → Actions minutes free. | Flagged a Claude-subscription-token ToS gray area for unattended runs; recommended metered API key. |
| GW-C2 · Vitest root config | #36 / #58 | Root `vitest.config.ts` (`projects`), real `pnpm test` — CI no longer a no-op. | Coverage provider wired but thresholds deliberately **not** enforced yet (would make CI permanently red with ~1 tested pkg) → tracked in [FOLLOWUP.md](./FOLLOWUP.md) F1.1.5. |
| GW-D6 · Dependency + secret scanning | #47 / #56 | Dependabot + `pnpm audit` + gitleaks workflow. | Audit shipped as warn-only due to pre-existing debt, then **flipped to a hard gate** once the tree was cleaned (see #61). |
| GW-E6 · Bundle analysis + size budget | #53 / #60 | `@next/bundle-analyzer` + measured CI budgets for `/`, `/films`, `/sign-in`. | Uncovered a pre-existing build bug (see Bug #54); re-measured budgets after the `next` bump. |
| Bug · `useSearchParams` without Suspense | #54 / #59 | Wrapped auth + films pages in `<Suspense>`; `next build` was broken on `main`. | Scope was larger than reported — **3 pages** affected (`/films` too, via nuqs), not 2. Invisible because CI never ran `next build`. |
| Security cleanup · remove Clerk, harden audit | #57 / #61 | Removed unused `@clerk/nextjs`, bumped `next`→15.5.18 & `drizzle-orm`→0.45.2, added `pnpm.overrides` for `shell-quote`/`fast-uri`. | Cleared **15 high + 1 critical** → 0/0 and **flipped the audit CI job to a hard gate**. |
| CI infra · pnpm version + Biome build-output | #71, #73 / #72 | Removed `pnpm/action-setup` `version:` pin (moving-tag break); added Biome top-level `files.ignore` for build dirs. | Diagnosed a **3-layer CI outage** — `main` CI had *never* actually been green; both fixes were prerequisites nothing else could pass without. |
| Biome lint baseline | #74 / #77 | Made `pnpm check` a real green gate: format sweep + fixed every lint violation in code (no rule downgrades). | Grew well past "format sweep": **77 real issues** incl. an a11y refactor (`<aside role=dialog>` → native `<dialog>` with UA-stylesheet resets: `p-0 m-0 border-0 max-w-none text-foreground`), 20 `useButtonType`, stable React keys. Padding regression caught in review, not CI. |
| Dependency updates | #78, #62→#79 | Grouped minor/patch (27 updates) merged; 7 **major** bumps deferred to a deliberate upgrade-pass ticket (#78). | Established the policy: majors are reviewed one-at-a-time on green CI, never auto-merged (esp. Biome 2 which breaks config). |

### In review — open PRs (move to Completed on merge)

| Story | PR | Deliverable |
|---|---|---|
| GW-C1 · E2E & test-env strategy (spike) | #80 | Playwright at `apps/web/e2e`, chromium PR-gate + nightly full matrix, `createCaller` + thin `inject()` for BE, per-story-type test contract |
| GW-B0 · Agent specialization boundaries (spike) | #81 | Path ownership map, contract-first sequencing, tool scoping, fork-from-existing reuse plan for GW-B1–B6 |
| GW-D1 · OWASP frontend threat model (spike) | #82 | Code-grounded threat table + CSP proposal + FE reviewer checklist |
| GW-D3 · Backend API security review (spike) | #83 | Per-procedure authz/IDOR audit + Zod gaps + BE reviewer checklist |
| GW-D5 · Deepsec CI diff-gate (build) | #84 | `deepsec.yml` PR gate (cost-safe, fail-soft until `AI_GATEWAY_API_KEY` secret added) |
| GW-E1 · Lighthouse strategy + baseline (spike) | #85 | Measured baseline (public pages 0.98–0.99 perf; auth a11y 0.79), `lighthouserc` budgets, ratchet policy |
| Chore · version-control `.claude` harness | #87 | Un-ignored agents/hooks/skills/commands/settings.json (unblocks GW-B1–B6) |
| Bug · `lists.removeFilm` IDOR | #89 | Added ownership guard (any user could delete others' list items) |

### Notable cross-cutting learnings (Phase 1)
- **CI had latent, stacked breakage** that only surfaced when each layer above it was fixed. Paid down once; future PRs land on green with real gates.
- **A repo-wide format/lint sweep must land *before* feature PRs** — #77 collided with in-flight #59 and forced a regenerate-on-main. Sequence many-file groundwork ahead of feature work.
- **`pnpm check` passing ≠ visually correct.** The `<dialog>` padding regression passed lint/type-check; only human/browser review caught it. → the PR-reviewer agent (GW-B5) and E2E smoke (GW-C7) must include real rendering.
- **Two independent security audits (GW-D1, GW-D3) converged on the same critical IDOR** — good signal on audit quality; also became a reviewer-checklist trigger ("every list/rating mutation scopes by `ctx.userId`").

---

## Phase 2: Feature Development

_Not started. Feature stories (TMDB lists, demo profile, seed, profile builder, imports) deferred here — see [STORIES.md](./STORIES.md) Phase 2 and the Phase 2 milestone._
