# Reviewing & triaging findings

Findings live in `data/<id>/files/<path>.json` under each `FileRecord.findings[]`. The exported `md-dir` lays them out by severity:

```
findings/
├── CRITICAL/
├── HIGH/
├── MEDIUM/
├── HIGH_BUG/
├── BUG/
└── LOW/
```

Each `.md` file includes title, description, recommendation, file path, and (if `revalidate` ran) verdict + reasoning + adjusted severity.

`HIGH_BUG` and `BUG` are correctness/quality findings, not security — they show up because deepsec's prompts catch obvious code defects en passant. Treat them as bonus signal, not core deliverables.

## The two FP-reducers

Per the FAQ, the two interventions that move FP rate the most are:

1. **`pnpm deepsec revalidate --min-severity HIGH`** — re-reads code with git history, classifies each finding as `true-positive | false-positive | fixed | uncertain`. Drops FP rate by ~50% on HIGH+. Cost is similar to `process`, so scoping with `--min-severity` matters.
2. **A tight INFO.md.** If the same FP keeps recurring (e.g. "deepsec keeps flagging our internal admin route"), add a sentence to INFO.md naming the convention — much cheaper than a matcher tweak.

After revalidation, FP rate on `HIGH+` typically lands around 10–29% (per FAQ). Below that requires careful INFO.md curation.

## Triage for prioritization

`pnpm deepsec triage` is a separate cheap classifier (~1¢/finding, Claude Sonnet only). It adds:

- `priority: "P0" | "P1" | "P2" | "skip"`
- `exploitability` (rough 1–5 or low/med/high)
- `impact` (rough 1–5 or low/med/high)

Without re-reading code — it works off the existing finding text. Useful when you have many findings and want a sort order beyond severity.

Run order when wrangling a large finding pile:

```bash
pnpm deepsec revalidate --min-severity HIGH    # cut FPs first
pnpm deepsec triage                            # then prioritize
pnpm deepsec export --format md-dir --out ./findings
```

## Mixing agents for a second opinion

Different agents catch different bugs. Run process once with each, dedupe is automatic:

```bash
pnpm deepsec process --agent claude
pnpm deepsec process --agent codex --reinvestigate
```

Findings that survive both passes are higher confidence; findings that only one agent sees deserve scrutiny.

## Reading findings inline

When the user asks "what did deepsec find for X", read the per-file JSON directly rather than re-running anything:

```bash
jq '.findings[] | {title, severity, recommendation: .recommendation[:200]}' \
  .deepsec/data/<id>/files/src/api/users.ts.json
```

`metrics` and `report` give cross-cutting views without re-running:

```bash
pnpm deepsec metrics                  # aggregate counts
pnpm deepsec report --project-id my-app   # per-project markdown
```

## False-positive workflow

When a recurring FP shows up:

1. Add a one-line note to INFO.md naming the convention or the safe primitive. Re-run `revalidate --force` on the affected severities.
2. If still flagged, the convention may not be obvious enough — write a longer explanation including the *reason* it's safe (input validation, allowlist, etc.).
3. As a last resort, add the file to `data/<id>/config.json:ignorePaths`. Use sparingly — silenced FPs become silenced TPs when code changes.

## Refusals

Models occasionally refuse to investigate a batch (rate <1% with default agents). Refused batches stay `pending`. To recover, re-run with the *other* agent:

```bash
pnpm deepsec process --agent codex --reinvestigate    # if claude refused
```

If a single file refuses >5% of batches, isolate it with `--files <path> --batch-size 1` or add it to `ignorePaths`.
