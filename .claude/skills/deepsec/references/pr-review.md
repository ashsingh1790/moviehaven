# PR review & CI gating

`pnpm deepsec process --diff` collapses scan + process into one invocation, scoped to the files in a diff. It's the right tool for PR review and CI gates. Files that have no regex hits still get a holistic AI review (since a code change could *introduce* an entry point even when no matcher fires).

## Source flags (mutually exclusive)

```bash
pnpm deepsec process --diff origin/main         # diff against ref or range
pnpm deepsec process --diff HEAD~1..HEAD
pnpm deepsec process --diff-staged              # index vs HEAD
pnpm deepsec process --diff-working             # uncommitted + untracked
pnpm deepsec process --files src/a.ts,src/b.ts
pnpm deepsec process --files-from changed.txt   # newline-delimited; '-' for stdin
```

Add `--no-ignore` to bypass `.gitignore` filtering, `--root <path>` if not in the repo root, `--project-id <id>` if multiple projects.

## Exit codes (this is what makes CI gating work)

- **0** — no net-new findings on touched files.
- **1** — at least one net-new finding. Use this to fail the build.
- other — runtime error (network, OIDC, etc.)

"Net-new" means a finding on a file the diff actually touched. Pre-existing findings on those files don't trigger exit 1. **`--diff` exit code 1 is a finding signal, not a shell error** — don't conflate the two in scripts.

## Comment artifact

```bash
pnpm deepsec process --diff origin/main --comment-out comment.md
```

Writes a Markdown file suitable for posting as a PR comment. The file is written *only when findings exist*. Title/description/recommendation are truncated (600/400 chars per finding) to stay under GitHub's 65 KiB comment cap.

## CI shape — the two-job pattern

The default deepsec recommendation, also baked into `assets/github-actions-pr-review.yml`:

1. **`analyze` job**: runs the PR's code (so it has untrusted user input via dependencies). Has the AI Gateway secret. **No `pull-requests: write` permission.** Outputs `comment.md` as an artifact, exits 1 on findings.
2. **`comment` job**: only runs when `analyze.result == 'failure'`. Has `pull-requests: write` but does **not** check out PR code. Downloads the artifact, posts it via `gh pr comment`.

This split is critical: it prevents a malicious PR from exfiltrating the AI Gateway key or weaponizing write access to the repo.

Also include a same-repo gate to defang fork PRs entirely:

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

## Required checkout settings

`actions/checkout@v4` needs `fetch-depth: 0` so `git diff origin/<base-ref>` can resolve the merge base. Otherwise `--diff origin/main` errors with "unknown revision".

## Scoping cost

PR scans can still be expensive on large diffs since each touched file pays for one AI investigation. Scope generously:

```bash
git diff --name-only origin/main \
  | grep -v -E '^(generated|fixtures|test/snapshots)/' \
  | pnpm deepsec process --diff origin/main --files-from -
```

(Note `--diff` and `--files-from` together: `--diff` provides the *base*, `--files-from` narrows the target list.)

For monorepos, prefer scoping by `--project-id` over the file list — the per-project `INFO.md` and matchers are tuned for that subtree.

## What the data dir looks like after `--diff`

`process --diff` will auto-create `data/<id>/project.json` if missing — non-destructive, never edits `deepsec.config.ts`. It writes the same `data/<id>/files/<path>.json` records as a normal scan. So a `process --diff` run leaves the same on-disk state as scanning just those files.

## Bundled helper

`scripts/pr-gate.sh <base-ref>` is a thin wrapper that:
1. Runs `pnpm deepsec process --diff <base-ref> --comment-out comment.md`
2. Surfaces the exit code
3. Echoes the comment file location if findings exist

Use it for local "what would CI say?" checks.
