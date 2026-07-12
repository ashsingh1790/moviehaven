# Models, API keys, and Vercel Sandbox

## Backends

| Backend | Default model | Used by |
|---|---|---|
| `codex` | `gpt-5.5` | `process`, `revalidate` |
| `claude` | `claude-opus-4-7` | `process`, `revalidate` |
| `claude` (triage) | `claude-sonnet-4-6` | `triage` (Claude-only) |

**The implicit default backend is `codex` with `gpt-5.5`** (per `docs/models.md`). The README's cost tables are anchored on Claude Opus, which can mislead users into thinking Claude is the default — it isn't. Pass `--agent` explicitly or set `defaultAgent` in `deepsec.config.ts`. When the user has no preference, ask them rather than guessing — the cost gap is significant.

## API key precedence

Deepsec auto-loads `.env.local` from cwd. Precedence:

1. **Explicit env vars always win.** If `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `OPENAI_API_KEY`, or `OPENAI_BASE_URL` are set, those are used.
2. **`AI_GATEWAY_API_KEY=vck_…`** — at startup, expands into the four vars above (Anthropic + OpenAI base URLs default to the Vercel AI Gateway). The shortcut for "I just want one key for both providers".
3. **`VERCEL_OIDC_TOKEN`** — falls back to OIDC if `AI_GATEWAY_API_KEY` is unset. Pulled via `vercel env pull` after `vercel link`. **Expires every 12 hours** — re-pull on auth errors.
4. **Local subscription reuse.** If `claude` or `codex` CLI is logged in locally, *non-sandbox* runs (`process`/`revalidate`/`triage` directly on the host) skip the token and reuse the subscription.

For direct Anthropic API:

```
ANTHROPIC_AUTH_TOKEN=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

For direct OpenAI:

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Other env vars

- `DEEPSEC_AGENT_DEBUG=1` — verbose agent logs.
- `DEEPSEC_DATA_ROOT` — override `dataDir` from config.
- `CLAUDE_CODE_EXECUTABLE=claude` — required in CI when using `claude` agent (after `npm install -g @anthropic-ai/claude-code`).

## Cost expectations (Claude Opus, default settings)

| Files | Approx cost | Wall time |
|---|---|---|
| 100   | $25–60     | 5–15 min |
| 500   | $130–300   | 25–60 min |
| 2,000 | $500–1,200 | 1.5–4 hr |

Costs swing 2–3× depending on file complexity and INFO.md quality. **Always start with `--limit 50` to calibrate.** README warns scans can cost "thousands or even tens-of-thousands of dollars" on large repos.

`triage` is ~1¢ per finding. `revalidate` is roughly the same as `process`.

## Vercel Sandbox (distributed execution)

For repos large enough to saturate one machine. Skip otherwise — local is simpler and uses subscriptions.

```bash
pnpm deepsec sandbox process --project-id my-app --sandboxes 10 --concurrency 4
```

Any subcommand can be prefixed with `sandbox`.

### Auth modes

**OIDC token (local interactive use):**

```bash
npx vercel link
npx vercel env pull             # writes VERCEL_OIDC_TOKEN to .env.local
```

Token expires every 12 hours. Re-pull on auth errors. The OIDC token also auto-authenticates AI Gateway, so this single flow covers both.

**Access token (CI/unattended):**

```
VERCEL_TOKEN=...
VERCEL_TEAM_ID=team_...
VERCEL_PROJECT_ID=prj_...
```

The Vercel SDK prefers `VERCEL_OIDC_TOKEN` when present, else falls back to access-token mode.

### What gets uploaded

The local working tree is tarballed and uploaded to each sandbox; **`.git` is excluded**. This means:
- Operations needing git history (`revalidate` notes "fixed" verdicts based on git log) won't get full context inside sandbox runs unless you explicitly carry that data forward.
- Local uncommitted changes do go in. So sandbox runs reflect your working state, not just what's pushed.

### Sandbox security model

API keys for the coding agents are injected from outside the sandbox — they aren't visible to in-sandbox code, so a malicious file can't exfiltrate them. Network egress from the worker is restricted to coding-agent hosts.

This makes sandbox runs safer than local runs when scanning third-party or untrusted code. (Local runs hand the agent your full env.)

## Switching model mid-workflow

```bash
pnpm deepsec process --agent claude --model claude-opus-4-7
pnpm deepsec process --agent codex  --model gpt-5.5 --reinvestigate
```

The `--model` value is passed through to the SDK; check the agent's docs for valid IDs. Codex models without an entry in `MODEL_PRICING_USD_PER_M_TOKENS` (in `packages/processor/src/agents/codex-sdk.ts`) will run but report cost as "missing" — not an error.
