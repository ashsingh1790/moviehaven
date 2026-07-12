# Setup & first scan

Goal: get from zero to first export of findings on a fresh repo.

## Prerequisites

- Node.js 22+
- `pnpm` recommended (npm/yarn work but README uses pnpm)
- An API key for the AI provider — see `models-and-keys.md`. The fastest path is `AI_GATEWAY_API_KEY=vck_…` from Vercel AI Gateway, which covers both Claude and Codex with one key.
- The user must run all commands from the *root* of the repo they want to scan.

## Step-by-step

```bash
# From the repo root you want to scan:
npx deepsec init        # creates ./.deepsec/ with this repo as the first project
cd .deepsec
pnpm install            # installs deepsec from npm
```

Now the user's coding agent bootstraps INFO.md. Use the verbatim prompt from `SKILL.md` section "The setup bootstrap prompt". Don't skip this — INFO.md is injected into every AI batch and a generic placeholder costs the user real money in noise.

When INFO.md is filled in, ensure `.env.local` (inside `.deepsec/`) has the API key, then run the first scan:

```bash
# from inside .deepsec/
pnpm deepsec scan                    # ~15s for ~2k files; regex only, no AI
pnpm deepsec process --limit 50      # CALIBRATE: ~50 files, AI-driven, costs money
```

Inspect the limited run. If it looks reasonable:

```bash
pnpm deepsec process                 # full run; expensive
pnpm deepsec revalidate --min-severity HIGH   # optional, cuts FP rate ~50%+
pnpm deepsec export --format md-dir --out ./findings
```

`./findings/` will contain one `.md` per finding under `CRITICAL/`, `HIGH/`, etc.

## What `.deepsec/` contains

After `init`:

| Path | Purpose | Tracked? |
|---|---|---|
| `package.json` | Pins deepsec via `pnpm install` | yes |
| `deepsec.config.ts` | Project list + plugins; one entry pointing at `..` | yes |
| `data/<id>/INFO.md` | Project context — fill this in, see SKILL.md | yes |
| `data/<id>/SETUP.md` | Per-project instructions for the bootstrap agent | yes |
| `AGENTS.md` | Hints for coding agents inside `.deepsec/` | yes |
| `.env.local` | API keys; gitignored | no |
| `node_modules/deepsec/SKILL.md` | deepsec's own runtime skill — read this for internals | n/a |
| `data/<id>/files/`, `runs/`, `reports/` | Generated state | no (gitignored) |

The `<id>` defaults to the parent repo's directory basename. The user can override it in `deepsec.config.ts` (see `config.md`).

## Multiple projects in one workspace

A single `.deepsec/` can manage several repos:

```bash
pnpm deepsec init-project ../other-repo
```

Adds another entry to `projects[]` in `deepsec.config.ts` and a new `data/<otherId>/`. Most CLI commands accept `--project-id <id>` to disambiguate. If only one project is configured the flag is auto-resolved.

## INFO.md — the most important file

INFO.md is injected into every AI prompt during `process`, `revalidate`, and `triage`. The README's guidance is precise:

- **50–100 lines total.** Verbose context dilutes signal.
- **3–5 examples per section.** Not exhaustive enumeration.
- **Name primitives** — auth helpers, middleware, ORM patterns. **No line numbers** (they rot).
- **Skip generic CWE categories** — built-in matchers cover those.
- **Cover only what's project-specific** — known FP sources, threat model, what's intentionally insecure (e.g. internal admin route), what's already handled.

Good INFO.md sections to cover:
- What the codebase does (one paragraph)
- Auth/session/permission shape (which functions/middleware enforce it)
- Trust boundaries (what's user-supplied vs internal-only)
- Known false-positive sources (e.g. "we use raw SQL but sanitize via X")
- Threat model priorities

If the user already has an `AGENTS.md` or `CLAUDE.md`, much of the content can be sourced from there — but tighten heavily. INFO.md must be tighter than AGENTS.md.

## Common setup mistakes

- **Running deepsec from the wrong cwd.** `pnpm deepsec` must run from inside `.deepsec/` (or have config-walking find a `deepsec.config.*`). The `--root` flag overrides for one-offs.
- **Forgetting `pnpm install` inside `.deepsec/`.** `npx deepsec init` only scaffolds; it doesn't install.
- **Putting API keys in `.env`** instead of `.env.local`. Deepsec auto-loads `.env.local` from cwd.
- **Treating `.deepsec/data/` as throwaway.** It is partially gitignored, but `INFO.md`, `SETUP.md`, `config.json` (if any) are tracked.
