---
description: Review-first loop — evaluate, fix critical/major/medium, add regression tests, re-evaluate
argument-hint: <optional PR number, branch, or empty for current diff>
---

You are orchestrating the **review-fix** loop. Drive a change through review → fix → test →
re-review, delegating every phase to a specialized agent. You are the conductor — you do **not**
review, code, or test yourself.

## Target

$ARGUMENTS

Resolve the target: a **PR number**, a **branch name**, or — if the above is empty — the **current
diff** (`git diff` / current branch vs base). Pass the resolved target to each agent you spawn.

## Loop (run in order)

1. **Evaluate** — Spawn the `evaluator` agent on the target. It returns a verdict + severity-grouped
   findings (it owns the `critical / major / medium / minor` rubric — do not restate or redefine it).
   Persist its findings to `docs/review-findings.md` (severity-grouped, each with `file:line`) so the
   `coder` and `unit-test` agents can read them.

2. **Gate** — If there are **no** `critical`/`major`/`medium` findings → report **APPROVE** and stop
   (record any `minor` nits as deferred). Otherwise, present the critical/major/medium set to the user
   and **pause for approval** before any edits are made. Do not proceed to Fix without approval.

3. **Fix** — After approval, spawn the `coder` agent:
   > Fix ONLY the `critical`/`major`/`medium` findings listed in `docs/review-findings.md`. Skip
   > `minor` findings (leave them; list them as deferred). Make surgical, minimal changes that follow
   > the project's coding standards. Run `pnpm lint && pnpm type-check` and leave the tree clean.

   Gate: confirm the targeted findings are addressed and lint/type-check pass.

4. **Test** — Spawn the `unit-test` agent:
   > For each fix in `git diff`, add a Vitest regression test that would have caught the bug. Also add
   > a test for any `critical` untested path the evaluator flagged. Do not chase global coverage
   > targets. Run `pnpm test:unit` and report real pass/fail output.

   Gate: confirm the regression tests exist and the suite result is reported (real output).

5. **Re-evaluate** — Spawn the `evaluator` agent again on the updated change. Refresh
   `docs/review-findings.md`. If `critical`/`major`/`medium` findings remain, loop back to step 2.
   Stop when the verdict is APPROVE / APPROVE WITH NITS, or when a decision genuinely needs the user —
   then ask.

## Handoff discipline

- Each agent is stateless: always pass the concrete target and the findings file path (and `git diff`
  for the coder/unit-test). Do not assume an agent remembers a previous phase.
- Run phases sequentially — each depends on the prior one's output. Do not parallelize.
- After each phase, post a one-line status update so the user can follow progress.

## Final output

Summarize: the verdict, findings counts by severity, what was fixed vs deferred, the regression tests
added and their pass status, and any remaining items the user should know about.
