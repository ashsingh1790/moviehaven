# Data layout (deep reference)

Load this only when you need to inspect or modify deepsec's on-disk state directly. For routine workflows, the CLI is enough.

The source of truth is `packages/core/src/types.ts` in the deepsec repo. This is a digest.

## Directory layout

```
.deepsec/
└── data/
    └── <id>/
        ├── INFO.md            # tracked; injected into AI prompts
        ├── SETUP.md           # tracked; bootstrap instructions
        ├── config.json        # tracked; per-project overrides (legacy)
        ├── project.json       # auto-created by --diff; ProjectConfig
        ├── tech.json          # detected tech stack
        ├── files/
        │   └── <path>.json    # FileRecord per source file
        ├── runs/
        │   └── <runId>.json   # RunMeta per CLI invocation
        └── reports/
            └── …               # output of `deepsec report`
```

`<runId>` format: `<YYYYMMDDHHMMSS>-<rand4>` (e.g. `20251215143022-x7q9`).

## `FileRecord` (data/<id>/files/<path>.json)

Per-file state, atomically written. Roughly:

```ts
{
  path: string,
  status: "pending" | "processing" | "analyzed" | "error",
  candidates: Array<{ matcher: string, line?: number, message?: string }>,
  findings: Array<{
    title: string,
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "HIGH_BUG" | "BUG" | "LOW",
    description: string,
    recommendation: string,
    slug: string,
    revalidation?: {
      verdict: "true-positive" | "false-positive" | "fixed" | "uncertain",
      reasoning: string,
      adjustedSeverity?: string,
    },
    triage?: {
      priority: "P0" | "P1" | "P2" | "skip",
      exploitability: "low" | "med" | "high",
      impact: "low" | "med" | "high",
    },
    enrichment?: { committers: [...], owners: [...] },
  }>,
  analysisHistory: Array<{ runId, agent, model, wave?, turns, cost }>,
  gitInfo?: { lastCommit, lastAuthor, lastDate },
  lockedByRunId?: string,
}
```

Status lifecycle: `pending` → `processing` → `analyzed` (or `error`).

Findings are deduplicated by `slug + title` across runs — re-processing won't double-count, and `--reinvestigate` appends to `analysisHistory[]` rather than replacing.

## `RunMeta` (data/<id>/runs/<runId>.json)

Per-invocation metadata. Field names matter — they appear in `jq` recipes:

```ts
{
  runId: string,             // <YYYYMMDDHHMMSS>-<rand4>; sortable
  projectId: string,
  rootPath: string,
  createdAt: string,         // ISO
  completedAt?: string,      // ISO, absent while running
  type: "scan" | "process" | "revalidate",
  phase: "running" | "done" | "error",
  scannerConfig?: { matcherSlugs },             // scan runs
  processorConfig?: { agentType, model, modelConfig },  // process / revalidate
  stats: {
    filesScanned: number,
    candidatesFound: number,
    findingsCount: number,
    totalCostUsd: number,
    truePositives: number,
    falsePositives: number,
    // ...
  },
}
```

Per-file cost is on `FileRecord.analysisHistory[].costUsd`. Total project spend:

```bash
jq -s 'map(.analysisHistory[].costUsd // 0) | add' data/<id>/files/**/*.json
```

## Idempotency contract

This is the model that lets all stages be re-run safely:

- **`scan`** — re-running merges new candidates into existing FileRecords. Doesn't flip already-analyzed files back to pending.
- **`process`** — only touches `status: "pending"`. To force, use `--reinvestigate` (optionally with a wave number for tracking).
- **`revalidate`** — only annotates findings without an existing `revalidation`. `--force` overrides.
- **`triage`** — only annotates findings without an existing `triage`.

This means partial runs are always recoverable: just re-run the same command. The locking is atomic per FileRecord (`lockedByRunId`), so concurrent workers don't double-process.

## Direct file inspection

When the CLI seems wrong, read the JSON. `jq` is your friend:

```bash
# All findings on a specific file:
jq '.findings' .deepsec/data/my-app/files/src/api/users.ts.json

# All HIGH findings across the project:
jq -r '.findings[] | select(.severity=="HIGH") | "\(.title)\t\(.recommendation[:80])"' \
  .deepsec/data/my-app/files/**/*.json

# Files that errored:
jq -r 'select(.status=="error") | .path' .deepsec/data/my-app/files/**/*.json
```

## Modifying state by hand

Generally don't. But if you must (e.g. clearing a stale lock):

```bash
jq 'del(.lockedByRunId)' file.json | sponge file.json
```

Use `sponge` (moreutils) or write to a temp file — partial writes break the atomic-write contract.
