# Gotchas & footguns

Things that quietly waste money, time, or trust. When something looks broken, scan this list before deeper debugging.

## Cost surprises

- **Unbounded `process` on a large repo.** A 5k-file scan on Claude Opus is in the four-figure range. Always run `--limit 50` first and project upward. `scripts/calibrate.sh` does the math.
- **Wide PR diffs.** `process --diff` charges per touched file. Filter generated/fixtures via `--files-from <(...)` before letting it loose.
- **Re-investigation surprise.** `--reinvestigate` re-processes *every* analyzed file. Combine it with `--files` or `--files-from` if you only want a subset re-run.

## Auth & env

- **`401` on `process`/`revalidate`** = no gateway credential loaded. Check `.env.local` is in the cwd deepsec was invoked from (usually `.deepsec/`).
- **OIDC token expires every 12 hours.** `npx vercel env pull` to refresh. Requires `.vercel/project.json` to exist (run `npx vercel link` once).
- **Local subscription reuse** only works for non-sandbox runs and only if the user is logged into the agent CLI on the host. CI never reuses a subscription.

## Defaults to be explicit about

- **Default agent.** Per `docs/models.md`, the implicit backend default is `codex`/`gpt-5.5`. The README's cost tables are anchored on Claude Opus, which can read like Claude is the default — it isn't. Pass `--agent` explicitly or set `defaultAgent` in config.

## Refusals

- Models occasionally refuse a batch (<1% with default agents). Refused batches stay `pending`. Re-run with the other agent (`--agent codex --reinvestigate` if Claude refused, or vice versa). Findings dedupe across agents, so this is also useful as a "second opinion".
- If one specific file refuses >5% of the time, isolate it with `--files <path> --batch-size 1` or add to `ignorePaths` in `data/<id>/config.json`.

## Matchers

- **Slug collisions silently override built-ins.** A typo in a custom matcher slug can disable a default. Validate new matchers with `pnpm deepsec scan --matchers <slug>` and look at hit counts.
- **`noisy` matchers wedge the scanner** with broad globs (`**/*.{ts,tsx}`). Anchor by directory or specific subtree.
- **`scan` only flips files to `pending` when matchers fire.** A file with no matcher hits won't be re-investigated even after edits unless you pass `--reinvestigate`.

## CI

- **`fetch-depth: 0`** in `actions/checkout@v4` is mandatory for `--diff origin/<base-ref>`. Without it, git can't resolve the merge base and `--diff` errors with "unknown revision".
- **`--diff` exit code 1 means findings, not error.** Don't conflate in shell `set -e` blocks. Use explicit handling: `pnpm deepsec process --diff ... || code=$?` then act on `$code`.
- **Don't grant `pull-requests: write` to a job that runs PR code.** Use the two-job split in `assets/github-actions-pr-review.yml`. The AI Gateway secret is exposed during PR-controlled `pnpm install`, so add a same-repo gate (`github.event.pull_request.head.repo.full_name == github.repository`) and consider a label-based gate for fork PRs.
- **Set `CLAUDE_CODE_EXECUTABLE=claude` in CI** after `npm install -g @anthropic-ai/claude-code`, otherwise `--agent claude` can't find the binary.

## Config

- **`infoMarkdown` in `deepsec.config.ts` overrides `data/<id>/INFO.md` silently.** Edits to the file have no effect when the config sets a value. When debugging "why is INFO.md not applied", check the config first.
- **Per-project `data/<id>/config.json` is legacy** but still wins over `projects[]` entries when present. `ignorePaths` only lives here, nowhere else.
- **Direct `--diff` mode auto-creates `data/<id>/project.json`** but never edits `deepsec.config.ts`. The persistence is partial — re-running normal commands still needs a config-level project entry.

## Working directory & paths

- **`pnpm deepsec` walks up looking for `deepsec.config.*`.** Run from inside `.deepsec/` (or anywhere below) and config discovery works. From outside, pass `--root` or `cd` first.
- **Atomic locks per file.** If you see `lockedByRunId` on a FileRecord, a previous run died mid-file. Locks expire on the next run; just re-run the same command.

## Codex specifics

- **Cost shows "missing"** when a non-default Codex model lacks an entry in `MODEL_PRICING_USD_PER_M_TOKENS`. The run still works.
- **Codex sandbox mode requires Vercel Sandbox.** Local Codex runs use the subscription, but for distributed execution Codex needs the sandbox path.

## Language coverage

- **Non-default ecosystems get less from the regex layer.** Rust/JVM/.NET/Koa/etc are tag-only — the AI carries more weight, and writing a few starter matchers (`references/matchers.md`) front-loads file selection meaningfully.
