---
title: "GW-A1 Spike: Autonomy Runtime Selection"
issue: "#21"
status: decided
last_updated: 2026-07-10
---

# GW-A1 — Autonomy Runtime Selection

## Summary / Recommendation

**Recommendation: Hybrid (Option C) — local Claude Code loop does the coding; GitHub Actions runs the verification gates on every PR.**

Key fact that shapes this decision: **`ashsingh1790/moviehaven` is a public repository.** GitHub Actions minutes are free and unlimited for public repos (no 2,000-minute private-tier budget to manage), so the "free tier" constraint essentially disappears for CI/verification work — it does *not* disappear for Anthropic API token spend, which costs the same dollar amount no matter which machine runs the loop. That reframes the real decision: it isn't "which runtime is cheaper," it's "which runtime is more reliable and less effort to build, given token cost is a wash."

Given that reframe:
- A **pure local loop** is cheap and reuses the existing `.claude/` harness (hooks, skills, MCP servers, macOS Homebrew paths) exactly as configured, but stalls whenever the laptop is asleep/closed — a bad fit for something billed as "autonomous."
- A **pure GitHub Actions loop** (via `anthropics/claude-code-action`) is available 24/7 regardless of laptop state and gets concurrency control, secrets management, and log visibility for free — but the existing harness is macOS/Homebrew-flavored (per this repo's own `CLAUDE.md` gotchas: `/opt/homebrew/bin` not on PATH, hook scripts assume zsh/macOS) and would need real porting work to run correctly on an Ubuntu runner. It also raises an open Anthropic ToS question if the coding step is meant to run under a Max/Pro subscription rather than metered API billing (see Risks).
- The **hybrid** keeps the coding step where it already works today (local, full harness, either subscription or API billing at the developer's discretion) and pushes the part that's *already* free, stateless, and portable — CI checks (`pnpm type-check`, `pnpm check`/Biome, later Lighthouse/security) — onto Actions, which already runs `ci.yml` on every PR. This requires no new porting work, keeps reliability risk contained to "coding happens next time the laptop is open" (acceptable at 2–5 tickets/week), and gives every PR an independent, laptop-independent verification gate before an agent reviews/approves it.

Pure GitHub Actions is the better long-term target once the harness is made Linux-portable (tracked as a natural follow-on, not blocking GW-A3/A4/A6) — it removes the laptop-availability risk entirely. For now, Hybrid is the pragmatic default: lowest effort, no ToS ambiguity, and it uses infrastructure (`ci.yml`, `pr-labels.yml`) that already exists.

---

## Options Compared

| Dimension | (a) Local orchestrator | (b) GitHub Actions (`claude-code-action`) | (c) Hybrid (local codes, Actions verifies) |
|---|---|---|---|
| **Free-tier cost** | $0 compute (dev's own Mac); Anthropic spend only | $0 compute — repo is **public**, so Actions minutes are unlimited/free; Anthropic spend only | $0 compute on both sides (public repo); Anthropic spend only for the local coding step |
| **Reliability (laptop asleep)** | Loop stalls entirely while Mac sleeps/is closed — breaks the "autonomous" premise | Unaffected by laptop state; runner is always available on trigger | Coding step waits for laptop to be open (acceptable at low ticket velocity); verification/CI always available regardless of laptop state |
| **Secrets handling** | `ANTHROPIC_API_KEY` in local `.env`/keychain; never leaves the dev's machine, but relies on the dev's own machine hygiene | `ANTHROPIC_API_KEY` as an encrypted GitHub Actions secret; standard, auditable, rotate-able, scoped to workflow runs | Same as (a) for the key that matters (coding step keeps using local key); Actions side needs no LLM secret at all for plain CI (type-check/lint), only if verification later calls Claude for review |
| **Concurrency / double-pickup risk** | Must hand-build a claim/lock mechanism (e.g., re-check + relabel before starting); a second local process or a restart can double-pick an issue | Built-in: `concurrency: group:` keyed on issue number prevents two workflow runs from touching the same issue | Local side still needs the same hand-built lock as (a); Actions side is naturally single-purpose per PR (no double-pickup concept for CI) |
| **Failure visibility** | Custom logging required (stdout/file); no built-in alerting — dev must actively check | Built into the Actions tab (run history, logs, ✅/❌ status, can add Slack/email on failure) | Coding-step failures are only as visible as the local logging (custom); PR-verification failures are fully visible via the existing `ci.yml` checks/status badges |
| **Effort to build (for this spike's downstream tickets)** | Highest — must build poll loop, process supervision (`launchd`/cron), sleep/wake handling, locking, logging from scratch | Medium — `claude-code-action` is off-the-shelf, but the *existing* `.claude/` harness (hooks assuming macOS/Homebrew paths, MCP servers, skills) needs porting to an Ubuntu runner before Agent Mode can use it faithfully | Lowest — coding step is "run Claude Code locally like today"; verification step already exists (`ci.yml`) and needs no new harness porting |
| **Fits existing infra** | Partial — reuses local harness as-is | Partial — reuses `pr-labels.yml`/`ci.yml` triggers but needs harness ported | Full — reuses local harness untouched *and* existing `ci.yml`/`pr-labels.yml` untouched |

---

## Free-Tier Cost Model

**Compute (CI minutes):** $0 for all three options, because `ashsingh1790/moviehaven` is a **public** repository — GitHub Actions is free and unlimited on GitHub-hosted runners for public repos (no 2,000 min/month cap, which only applies to private repos on the Free plan). Concurrency cap is 20 simultaneous jobs on the Free plan, far above what 2–5 tickets/week will ever need.

**LLM spend (the actual dollar cost, identical regardless of runtime):**
Assuming **2–5 feature tickets/week** (≈9–20/month), each ticket involving roughly: 1 coding session (story-plan → implement → self-verify) + 1 PR-review/approve pass by a reviewer agent.

- *If billed through the developer's existing Claude Max/Pro subscription* (flat monthly fee already being paid for interactive Claude Code use): **$0 marginal cost** per ticket, bounded only by the subscription's rate limits. This is the assumption for the local coding step in the Hybrid recommendation.
- *If billed through the metered Anthropic API* (`ANTHROPIC_API_KEY`, Sonnet-class model, with prompt caching enabled): rough estimate of 50–150K tokens per ticket end-to-end (plan + implement + review, with cache hits on repeated context) at ~$3/$15 per MTok (in/out) works out to roughly **$0.50–$3 per ticket**. At 9–20 tickets/month that's **≈$5–$60/month**. This would apply to any verification-side Claude calls (e.g., an automated reviewer step) that are billed via API key rather than subscription.

**Bottom line:** the "free tier" requirement is fully satisfiable — GitHub Actions costs nothing on this public repo either way, and LLM spend is a function of ticket volume and billing method, not of which machine runs the loop. Budget for **$0–$60/month** depending on whether the coding/review steps ride on an existing subscription or a metered API key, and enforce a hard ceiling via GW-A6.

---

## Risks & Mitigations

| Risk | Applies to | Mitigation |
|---|---|---|
| Laptop asleep/closed stalls the coding loop | (a) Local, (c) Hybrid (coding side) | Acceptable at 2–5 tickets/week; document that pickup happens next time the loop runs, not instantly. If this becomes unacceptable, migrate the coding step to Actions once harness is ported. |
| `.claude/` harness (hooks, Homebrew paths, macOS assumptions) breaks on an Ubuntu Actions runner | (b) pure Actions | Don't attempt (b) until hooks are audited/rewritten for Linux, or hooks are made conditional/no-ops in CI context. Not required for GW-A3/A4/A6 under the Hybrid recommendation. |
| Anthropic ToS ambiguity: using a Claude Max/Pro **OAuth token** for unattended/automated runs (vs. interactive use) is explicitly called out as a gray area (Feb 2026 ToS clarification prohibits OAuth-token use "outside official tools"; Anthropic separately tried, then paused, splitting programmatic/Agent-SDK/GitHub-Actions usage into its own billing pool) | (a), (b), (c) — anywhere a subscription token is used non-interactively | Prefer `ANTHROPIC_API_KEY` (metered, unambiguous ToS) for any step that runs unattended/on a schedule, even if it costs real dollars per the cost model above. Reserve subscription/OAuth billing for the parts of the loop a human is actively watching. |
| Double-pickup: two loop iterations (or a local run + a manual run) claim the same issue | (a), (c) local side | Enforce atomically: re-fetch labels immediately before claiming, flip `status:ready` → `status:in-progress` in the same `gh issue edit` call, and treat any issue not still labeled `status:ready` at claim-time as already taken. Actions side gets this for free via `concurrency: group: issue-${{ github.event.issue.number }}`. |
| Runaway loop / cost blowout with no visibility | (a), (b), (c) | See GW-A6 requirements below — needs an app-level kill switch, since GitHub's own $0 spending-limit safety net does not apply to this repo (public repos aren't billed for Actions minutes, so there's no automatic circuit breaker on the compute side; the actual risk is uncapped Anthropic API spend). |
| Failure invisibility on the local coding step | (a), (c) local side | Log every loop iteration's outcome (claimed/skipped/succeeded/failed) to a file or issue comment; don't rely on someone tailing a terminal. |
| GitHub Actions `GITHUB_TOKEN`-authored actions (labels, PRs) don't re-trigger downstream workflows | (b), (c) if any part of PR creation moves server-side later | Not a blocker today since PR creation happens locally via the dev's own `gh` auth (a PAT-equivalent), which does trigger `pr-labels.yml` normally. Flag for GW-A4 if that step ever moves into an Actions job. |

---

## Requirements for Downstream Tickets

### GW-A3 — Orchestrator scaffold + pickup loop
- Poll target: `gh issue list --label status:ready --json number,title,labels,createdAt` (already in the allowed Bash list per `.claude/settings.json`... note: `gh issue list *` is on the allowlist).
- **Atomic claim step**: before starting work, re-check the issue still has `status:ready`, then relabel to `status:in-progress` in one call — this is the double-pickup lock referenced above; no separate lock file needed if this ordering is strict.
- Since this is the Hybrid model, the loop runs **locally** (cron/launchd or long-running process) — it must tolerate the laptop being asleep by simply resuming/re-polling on next run, not assuming continuous uptime. Log every cycle's decision (claimed / skipped / idle) somewhere durable (file or issue comment), per the failure-visibility gap identified above.
- Needs a config knob for which label ordering to use (oldest-first vs. `phase:*` priority) — not decided by this spike; flag as an open question for GW-A3.

### GW-A4 — Branch/PR wiring
- Branch naming `feature/{issue#}-slug`, PR body must contain `Closes #{N}` — already the house convention (see root `CLAUDE.md`).
- PR creation happens via the developer's own local `gh` auth (personal token/SSO), which **does** trigger `pr-labels.yml` normally — confirm this at implementation time; do not switch PR creation to run inside an Actions job using the default `GITHUB_TOKEN`, since that would silently stop `pr-labels.yml` from firing (see risk table).
- Verification side: no new workflow needed — `ci.yml` already runs on `pull_request`; GW-A4 just needs to confirm it doesn't need edits to also apply to agent-authored PRs (it shouldn't, since it triggers on the `pull_request` event regardless of author).

### GW-A6 — Kill-switch / budget caps
- Needs an **app-level** kill switch — GitHub's built-in $0 spending-limit safety net does not apply here (public repo ⇒ unlimited free Actions minutes ⇒ no automatic circuit breaker on compute). The real uncapped variable is Anthropic API/token spend, so the cap has to live in the orchestrator itself.
- Concretely: a checked-in "pause" signal the loop checks every cycle before claiming any issue (e.g., a `status:paused`-style label/marker or a simple flag file), plus a hard per-day or per-week ticket-count ceiling enforced in code.
- If/when any step is invoked via Claude Code headless mode (`claude -p`), use its built-in `--max-turns` and `--max-budget-usd` flags as a second layer of defense per-invocation, independent of the orchestrator-level switch.
- Needs visibility: alert (issue comment, or similar low-effort channel) when the kill switch trips or a budget cap is hit, so a stuck/runaway loop doesn't fail silently.

---

## References

- [GitHub Actions billing and usage — GitHub Docs](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [Is GitHub Actions Free? Free Tier Limits Explained (2026) — CICDCalculator.com](https://cicdcalculator.com/github-actions-free-tier)
- [Is there a limit on usage by public repos? — GitHub Community Discussion #70492](https://github.com/orgs/community/discussions/70492)
- [GitHub Actions Reference — Actions limits (concurrency, job duration) — GitHub Docs](https://docs.github.com/en/actions/reference/limits)
- [anthropics/claude-code-action — GitHub repository](https://github.com/anthropics/claude-code-action)
- [Claude Code GitHub Actions — Claude Code Docs](https://code.claude.com/docs/en/github-actions)
- [claude-code-action setup docs](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md)
- [anthropics/claude-code-base-action — GitHub repository](https://github.com/anthropics/claude-code-base-action)
- [Run Claude Code programmatically (headless mode) — Claude Code Docs](https://code.claude.com/docs/en/headless)
- [Manage costs effectively — Claude Code Docs](https://code.claude.com/docs/en/costs)
- [Events that trigger workflows — GitHub Docs (issues `labeled` activity type)](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
- [Triggering a workflow — GitHub Docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
