# Open Items — Action Queue

Things **pending on the maintainer**: decisions to make and manual actions only you can perform (secrets, repo settings). A **volatile working doc** — delete items as they clear. Not the backlog (see [FOLLOWUP.md](./FOLLOWUP.md)) or the completed log (see [PROGRESS.md](./PROGRESS.md)); GitHub Issues/PRs remain the source of truth.

**Last Updated:** 2026-07-12

---

## 1. PRs awaiting your review / merge

_None — queue clear._ (Batch-1 groundwork, batch-2 spikes, the IDOR fix, the `.claude` un-ignore, and the tracking docs are all merged.)

---

## 2. Decisions needed

- [ ] **`docs/okf/viz.html`** — keep or remove? Committed to `main` accidentally during the #79 conflict resolution. Harmless, but doesn't belong unless you want it.

---

## 3. Manual actions — only you can do these

- [ ] **Add repo secret `AI_GATEWAY_API_KEY`** (Vercel AI Gateway key) at **Settings → Secrets and variables → Actions**. Until added, the deepsec gate fail-softs (warns + skips, stays green). Adding it makes the scan actually run/block. Tracked-adjacent: FOLLOWUP F1.1.3 (#92) narrows what it scans.
- [x] ~~Enable branch protection on `main`~~ — **done** (#99): 4 required checks (strict, enforce-admins), no force-push/deletion. PR-review requirement deferred until the GW-B5 reviewer bot exists.

---

## 4. Ready to start / blocked

- **GW-B1–B6** (the six specialized agents) are **unblocked** now that #87 merged — ready to launch on your go.
- The **deepsec gate** doesn't enforce until `AI_GATEWAY_API_KEY` exists (§3).
- **Lighthouse `/films`** (FOLLOWUP F1.1.9 / #98) waits on the GW-C4 auth fixture.

---

_When an item clears, delete it from this file (history lives in git + the PR/issue trail)._
