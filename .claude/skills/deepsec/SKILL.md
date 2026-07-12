---
name: deepsec
description: How to use Vercel's deepsec security scanner end-to-end — installing it, bootstrapping INFO.md, running scans cost-safely, gating PRs with `process --diff`, writing custom matchers, and triaging findings. Use this skill whenever the user mentions deepsec, asks to scan a repo for vulnerabilities/security issues with an agent, runs into `pnpm deepsec` commands, wants to add CI-based PR security review with deepsec, sees a `.deepsec/` directory, or asks about INFO.md / matchers / `process --diff` / `revalidate` — even if they don't name the tool. Deepsec scans are expensive (a single full scan can cost hundreds to tens of thousands of dollars) so the skill exists in part to keep the user from getting surprised.
---

# deepsec

[deepsec](https://github.com/vercel-labs/deepsec) is an agent-powered vulnerability scanner. It runs in stages — `scan` (regex matchers, fast, free), `process` (AI investigates each candidate, *expensive*), optional `triage` and `revalidate` passes, then `export`. It also has a one-shot `process --diff` mode for PR review.

The user is rarely interested in the internals — they want to scan their repo, gate a PR, or triage findings. Pick the right reference file below based on what they're trying to do, then follow the workflow there.

## Pick the right reference

| User intent | Read |
|---|---|
| "Set up deepsec / first scan / what's INFO.md" | `references/setup.md` |
| "Run a scan / process / export findings" | `references/scanning.md` |
| "Review a PR / gate CI / scan a diff" | `references/pr-review.md` |
| "Write a matcher / find more issues" | `references/matchers.md` |
| "Look at findings / cut false positives" | `references/triage.md` |
| "Configure deepsec.config.ts" | `references/config.md` |
| "Switch model / API keys / sandbox" | `references/models-and-keys.md` |
| "Something is broken / weird behavior" | `references/gotchas.md` |
| Deep internals (FileRecord schema, etc.) | `references/data-layout.md` |

If the user's request spans phases (e.g. "set up deepsec and run a first scan"), read `setup.md` *and* `scanning.md` together. They're short.

## Always-on principles

These apply across every workflow. Do not skip them.

### 1. Calibrate before scaling

A full `pnpm deepsec process` against a non-trivial repo can cost **hundreds to tens of thousands of dollars**. The README is explicit about this. Before running an unbounded `process`:

```bash
pnpm deepsec process --limit 50
```

Inspect the output, look at how long it took and how many findings it produced, then estimate full-repo cost from the file count (use `pnpm deepsec status`). Only then run the unbounded version. If the user is on a budget, surface the estimate before running.

There's a helper for this — `scripts/calibrate.sh` — that runs the limited scan and prints a back-of-envelope estimate. Use it.

### 2. Run the doctor when things look wrong

Common failure modes are unrelated to deepsec itself: missing `.env.local`, expired OIDC token (12-hour lifetime), wrong cwd, missing `pnpm install` in `.deepsec/`. Before deep-debugging, run:

```bash
bash scripts/doctor.sh /path/to/repo
```

It checks the basics and points at the specific reference section that covers the failure.

### 3. Pass `--agent` explicitly

Per `docs/models.md`, the implicit default backend is `codex` with `gpt-5.5`. The README and getting-started doc talk about "Claude Opus" because that's the default *within* the Claude backend, and the cost tables in the README are anchored on Claude — which is confusing when the backend default is actually codex.

Don't rely on the implicit default. Pass `--agent claude` or `--agent codex` explicitly on `process`/`revalidate`/`triage`, or set `defaultAgent` in `deepsec.config.ts`. When the user has no preference, ask them — the cost difference between Claude Opus and `gpt-5.5` is meaningful, and it's the kind of thing where guessing wrong wastes their money.

### 4. INFO.md is leverage

`.deepsec/data/<id>/INFO.md` is injected into every AI batch. A tight, project-specific INFO.md is one of the two biggest false-positive reducers (the other is `revalidate`). The README is firm: 50–100 lines, 3–5 examples per section, name primitives but no line numbers, skip generic CWEs. Any time a scan is producing noisy findings, suggest tightening INFO.md before reaching for matcher tweaks.

### 5. Idempotency

`scan`, `process`, and `revalidate` are all idempotent and resumable. `process` only touches `status: "pending"` files; `revalidate` only annotates findings without an existing `revalidation`. If a run is interrupted, just rerun the same command. To force re-investigation pass `--reinvestigate` (with optional wave number).

## The setup bootstrap prompt (verbatim from deepsec README)

When the user runs `npx deepsec init`, deepsec creates `.deepsec/data/<id>/INFO.md` as a template. The user's coding agent (you, in many cases) is supposed to fill it in. The README provides this bootstrap prompt — quote it verbatim, do not paraphrase, since it's what deepsec's own SKILL.md expects:

> Read `.deepsec/node_modules/deepsec/SKILL.md` to understand the tool. Then read `.deepsec/data/<id>/SETUP.md` and follow it: skim this repo's README, any AGENTS.md/CLAUDE.md, and a handful of representative code files, then replace each section of `.deepsec/data/<id>/INFO.md`.
>
> Keep it SHORT — target 50–100 lines total. Pick 3–5 examples per section, not exhaustive enumeration. Name primitives (auth helpers, middleware) but no line numbers. Skip generic CWE categories — built-in matchers cover those. Cover only what's project-specific. INFO.md is injected into every scan batch; verbose context dilutes signal.

When you run this prompt yourself, do the work from the *parent repo's* root (one level above `.deepsec/`), since you need to read the actual codebase.

## Bundled scripts

`scripts/` contains helpers for things every deepsec workflow needs:

- `scripts/calibrate.sh <repo-root>` — runs scan + `process --limit 50`, prints a cost estimate based on observed token usage and the full file count.
- `scripts/doctor.sh <repo-root>` — sanity checks `.deepsec/` exists, `pnpm install` ran, `.env.local` is populated, OIDC token isn't expired.
- `scripts/pr-gate.sh <base-ref>` — wraps `process --diff` with sensible defaults for CI, exits 1 on net-new findings.

Read `scripts/README.md` for usage details if needed; scripts work standalone with `--help`.

## Bundled assets

- `assets/github-actions-pr-review.yml` — drop-in `.github/workflows/` template for the two-job `analyze` + `comment` pattern. Read `references/pr-review.md` before adapting it.

## Working style

- Default to *terse* output when running deepsec commands. The user can tail logs themselves; relay the important deltas (findings count, severity breakdown, cost) rather than full transcripts.
- When the user is mid-scan and their `.deepsec/` already exists, don't re-init — re-init is destructive to local state.
- When the user asks "what does deepsec think of file X?", they probably want `pnpm deepsec process --files <X>` followed by reading the resulting `data/<id>/files/<X>.json`. Don't trigger a whole-repo scan.
- Treat `.deepsec/data/` as ground truth. The CLI subcommands are thin wrappers over file-system state — when the CLI seems wrong, read the actual JSON.
