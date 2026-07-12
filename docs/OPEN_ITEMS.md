# Open Items — Action Queue

Things **pending on the maintainer**: PRs to review/merge, decisions to make, and manual actions only you can perform (secrets, repo settings). This is a **volatile working doc** — it changes as items clear. It is *not* the backlog (see [FOLLOWUP.md](./FOLLOWUP.md)) or the completed log (see [PROGRESS.md](./PROGRESS.md)); GitHub Issues/PRs remain the source of truth.

**Last Updated:** 2026-07-12

---

## 1. PRs awaiting your review / merge

All green unless noted. The five `docs/spikes/` PRs barely overlap, so merge order is free.

| PR | Ticket | What | Note |
|---|---|---|---|
| #89 | Bug #88 | `lists.removeFilm` IDOR fix | Security — merge soon |
| #87 | Chore #86 | Version-control `.claude` harness | **Unblocks GW-B1–B6** — merge to start the agent builds |
| #90 | — | PROGRESS.md + FOLLOWUP.md + this file | Tracking docs |
| #85 | GW-E1 #48 | Lighthouse strategy + measured baseline | spike doc |
| #84 | GW-D5 #46 | Deepsec CI diff-gate | fail-soft until secret added (see §3) |
| #83 | GW-D3 #44 | Backend security audit | spike doc |
| #82 | GW-D1 #42 | OWASP frontend threat model | spike doc |
| #81 | GW-B0 #28 | Agent specialization boundaries | spike doc |
| #80 | GW-C1 #35 | E2E & test-environment strategy | spike doc |

---

## 2. Decisions needed

- [ ] **`docs/okf/viz.html`** — keep or remove? It was committed to `main` accidentally during the #79 conflict resolution (`git add -A` swept in an untracked file). Harmless, but doesn't belong unless you want it.

---

## 3. Manual actions — only you can do these

- [ ] **Add repo secret `AI_GATEWAY_API_KEY`** (Vercel AI Gateway key) at **Settings → Secrets and variables → Actions**. Until added, the deepsec gate (#84) fail-softs (warns + skips, stays green). Adding it makes the scan actually run/block.
- [ ] **(Recommended) Enable branch protection on `main`** — tracked as FOLLOWUP F1.1.1. Currently `protected: false`, which is why PRs could merge over red CI during the repair. I can apply it via `gh api` on your go: require `CI` + `Security` + `Build web · Check bundle budget` + 1 review, block force-push.

---

## 4. Blocked on the above

- **GW-B1–B6** (the six specialized agents) are blocked until **#87** merges (they ship `.claude/agents/*` files into the now-gitignored dir).
- The **deepsec gate** doesn't enforce until the **`AI_GATEWAY_API_KEY`** secret exists (§3).
- **Lighthouse `/films`** (FOLLOWUP F1.1.9) waits on the GW-C4 auth fixture.

---

_When an item clears, delete it from this file (history lives in git + the PR/issue trail)._
