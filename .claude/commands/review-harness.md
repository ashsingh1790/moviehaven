---
description: Audit the Claude Code harness — CLAUDE.md, hooks, settings, and docs — and propose pruning or updates. Reads .claude/docs/06-maintenance.md and walks every step.
---

The user invoked `/review-harness`. Run the full quarterly review per `docs/06-maintenance.md`.

Procedure:
1. Open `.claude/docs/06-maintenance.md` and walk every step in order.
2. Establish baseline: current model, date of last review (from CLAUDE.md footer), models shipped since.
3. Audit CLAUDE.md, codebase map, hooks, commands, learnings.md, and settings.json.
4. Aggregate all proposed changes into a single diff at the end.
5. Present the diff to the user. Do not apply any changes until they approve.
6. After approval, apply changes, update the `Last reviewed` footer in CLAUDE.md, and report what shipped.

Stop scope: harness only. Do not refactor application code. If you spot drift between CLAUDE.md and the codebase, flag it as a follow-up.
