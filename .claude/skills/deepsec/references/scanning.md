# Scanning workflow

The pipeline is `scan → process → triage → revalidate → enrich → export`. Each stage is idempotent and additive. Re-running merges; nothing destroys prior state. Stages can be re-run independently.

All commands below run from inside `.deepsec/` unless noted. Add `--project-id <id>` if the workspace has more than one project.

## Stage reference

| Command | What it does | Cost | When to run |
|---|---|---|---|
| `pnpm deepsec scan` | Runs ~110 regex matchers across the repo. No AI. ~15s for 2k files. Writes `data/<id>/files/<path>.json` (`FileRecord`) with `status: "pending"`. | Free | First. Re-run after edits or after adding matchers. |
| `pnpm deepsec process` | AI investigates each `pending` FileRecord and emits `Finding[]` with `analysisHistory`. | **Expensive.** | After scan. Always pass `--limit 50` first. |
| `pnpm deepsec triage` | Cheap classifier (Claude Sonnet) — adds P0/P1/P2/skip + exploitability/impact without re-reading code. | ~1¢/finding | Optional, after process, for prioritization. |
| `pnpm deepsec revalidate` | Re-reads code + git history; emits `verdict: true-positive | false-positive | fixed | uncertain` with reasoning. | ≈ process | Highly recommended; cuts FP rate 50%+. Use `--min-severity HIGH`. |
| `pnpm deepsec enrich` | Adds git-blame committer info + (with plugin) ownership. | Free | Optional, before export. |
| `pnpm deepsec export` | Final output. | Free | Last. |
| `pnpm deepsec status` | Per-project file counts and run snapshot. | Free | Anytime. |
| `pnpm deepsec metrics` | Cross-project counts: severities, vuln types, TPs. | Free | Anytime. |
| `pnpm deepsec report` | Per-project markdown + JSON summary. | Free | Anytime. |

## The `--limit 50` calibration ritual

The wall between calibrated and uncalibrated runs is the single most important pattern in this skill. Always do this before an unbounded `process`:

```bash
pnpm deepsec process --limit 50
pnpm deepsec status                  # see total candidate count
```

Read the limited-run output. Compute rough cost: `(observed cost per 50 files) * (total files / 50)`. Quote that to the user before launching the full run. If it's outside their budget, talk to them — there are knobs (`--min-severity`, `--matchers`, `--files`) that scope the work.

`scripts/calibrate.sh` automates the math.

## Flags that matter

- `--concurrency 5` — batches in flight at once. Default 5. Raise to 10–20 for large jobs if rate limits allow.
- `--batch-size 5` — files per batch. Default 5. Lower for "dense" files; higher for many small ones.
- `--limit N` — cap files investigated this invocation. Use for calibration.
- `--project-id <id>` — auto-resolved when only one project.
- `--root <path>` — override cwd-walking for config discovery.
- `--agent {claude,codex}` — explicit; do not rely on default. See SKILL.md note about doc contradiction.
- `--model <id>` — override agent's default model.
- `--max-turns N` — cap agent loop length per file.
- `--reinvestigate` or `--reinvestigate <waveN>` — force re-process of files already analyzed (otherwise `process` only touches `pending`). Use to mix agents — run once with `--agent claude`, then `--agent codex --reinvestigate` for a second opinion.
- `--matchers <slug1>,<slug2>` — restrict scan to specific matchers. Useful when validating a new matcher.
- `--force` — on `revalidate`, re-revalidate findings already revalidated.

## Targeting subsets

Three ways to scope work:

```bash
pnpm deepsec process --files src/api/users.ts,src/api/admin.ts
pnpm deepsec process --files-from changed-files.txt           # one path per line
pnpm deepsec process --files-from -                            # stdin
```

The `--files-from -` form is the right pattern for ad-hoc filtering — pipe `git diff --name-only`, `find`, etc. into it.

## Export formats

```bash
pnpm deepsec export --format md-dir --out ./findings           # one .md per finding
pnpm deepsec export --format json   --out findings.json        # single JSON array
```

`md-dir` lays out severity directories: `CRITICAL/`, `HIGH/`, `MEDIUM/`, `HIGH_BUG/`, `BUG/`, `LOW/`. Each finding includes title, description, recommendation, file path, and (post-revalidate) verdict + reasoning.

## Running again after code changes

Re-scan, then re-process only the touched files:

```bash
pnpm deepsec scan
pnpm deepsec process     # only files with status: "pending"
```

If a file's findings should be re-investigated even though scan didn't flip it back to pending (e.g. you tightened INFO.md), use `--reinvestigate` with `--files`:

```bash
pnpm deepsec process --reinvestigate 2 --files src/api/users.ts
```

The numeric argument is a wave marker stored on `analysisHistory[]`, useful for tracking investigation passes.

## Resumability

All three expensive stages (`process`, `revalidate`, `triage`) can be interrupted (Ctrl-C, lost network, OIDC expiry) and restarted. State is persisted per file via atomic `lockedByRunId` locks — when a previous run dies, locks expire and the next run picks up. Just re-run the same command.
