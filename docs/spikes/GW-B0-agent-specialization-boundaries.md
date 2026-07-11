---
title: "GW-B0 Spike: Agent Specialization Boundaries"
issue: "#28"
status: decided
last_updated: 2026-07-11
---

# GW-B0 — Agent Specialization Boundaries

## Summary / Recommendation

Today there are three repo-level agents (`.claude/agents/spec-planner.md`, `generator.md`, `evaluator.md`) plus four **global** (user-level, `~/.claude/agents/`) agents that already form a `story-planner → unit-test → coder → reviewer` pipeline, driven by the `develop-story` command (`~/.claude/commands/develop-story.md`). None of these are path-scoped — `generator` and `coder` are both free to touch the whole tree. The six-agent plan (frontend coder, backend coder, test author, security reviewer, PR reviewer, orchestrator) needs to split that undifferentiated authority along the one seam the codebase already enforces by convention: **`apps/web` + `packages/ui` (+ `packages/types` for consumption) vs. `apps/api` + `packages/db` (+ `packages/types` for ownership)**, contract-first through tRPC.

**The five decisions this spike makes:**

1. **Path ownership**: FE coder owns `apps/web/**`, `packages/ui/**`; BE coder owns `apps/api/**`, `packages/db/**`. `packages/types` is **BE-owned, FE-consumed** (BE writes/extends types as part of landing a router change; FE never edits it standalone). `AppRouter` type exports, `packages/okf`, `.github/workflows`, and `docs/` are cross-cutting and excluded from both coders' default scope — see §1.
2. **Contract-first sequencing**: any feature touching both a tRPC endpoint and UI is **one ticket, two sequential agent turns** — BE coder lands the router + Zod schema + `packages/types` update first (buildable/testable on its own), then FE coder consumes `AppRouter`'s inferred types. Not two separate tickets, not parallel.
3. **Tool scoping**: coders get `Read, Grep, Glob, Edit, Write, Bash` (mirrors `~/.claude/agents/coder.md`) but never `Agent`, and never push/merge. Test author gets `Write/Edit` restricted to test-file globs. Security reviewer and PR reviewer are **read-only** (`Read, Grep, Glob, Bash, WebFetch`) — they can run `deepsec`/`gh pr diff`/tests but cannot `Edit`/`Write` production code, and only PR reviewer's approval triggers `pr-labels.yml`'s `status:done` transition.
4. **Reuse over invention**: every new agent forks an existing file rather than starting blank — test author forks `~/.claude/agents/unit-test.md`, PR reviewer forks `.claude/agents/evaluator.md` (Mode 2) merged with `~/.claude/agents/reviewer.md`, coders fork `~/.claude/agents/coder.md` split by directory + the `.claude/agents/generator.md` stack-reference table, orchestrator forks `~/.claude/commands/develop-story.md`'s sequencing logic. See §3 for exact source file per target.
5. **Enforcement is a prompt instruction + a new PreToolUse hook, not GitHub CODEOWNERS.** There is no `CODEOWNERS` file in this repo today, and per GW-A1 the loop is a local hybrid (Claude Code locally, Actions for verification) — a repo-native GitHub review-required-by-path mechanism doesn't fit that model cleanly for solo-maintained OSS. The enforceable-today mechanism is: each agent's own frontmatter/system-prompt states its boundary, a new `.claude/hooks/enforce-agent-path-scope.sh` PreToolUse(Edit|Write) hook denies out-of-scope writes by checking `CLAUDE_AGENT_NAME` (or an equivalent env/context signal) against a path allowlist, and PR reviewer does a final diff-path check before approving. See §4.

---

## 1. Path Ownership Map

### Ownership table

| Path | Owner | Rationale |
|---|---|---|
| `apps/web/**` | **Frontend coder** | Next.js 15 App Router, all client/server components, `apps/web/src/lib/trpc/*` clients. |
| `packages/ui/**` | **Frontend coder** | Shared shadcn/ui components (`Button`, `Badge`, `Card`, etc.) — consumed only by `apps/web` today. |
| `apps/api/**` | **Backend coder** | Fastify 5 + tRPC v11 server, routers, JWT/auth, Redis caching. |
| `packages/db/**` | **Backend coder** | Drizzle ORM schema + Postgres client. Per `packages/db/CLAUDE.md`: "Only `apps/api` imports runtime values from this package" — `apps/web` must never depend on it, which is exactly why FE has no business editing it either. |
| `packages/types/**` | **Backend coder owns; frontend coder consumes read-only** | These are hand-written shared types (`Film`, `FilmCard`, `User`, `FilmSearchParams`) that mirror the DB/API shape, not generated `AppRouter` output. Since the shape originates from the schema/router contract, the BE coder is the one with the context to change them correctly when a schema or endpoint changes. FE coder may propose a change but lands it via the same ticket's BE turn (see §1 cross-cutting rule below), not by editing the package unilaterally. |
| `packages/config/**` | **Neither coder by default — cross-cutting** | Shared tsconfig/Biome presets used by both apps. Treat as infra, not feature work; changes here are rare enough to route through the PR reviewer / orchestrator rather than pre-assign to one coder. |
| `AppRouter` type export (`apps/api/src/trpc/router.ts` and its re-export as `import type { AppRouter } from "@movie-haven/api"`) | **Backend coder produces it; frontend coder only imports the type** | `@movie-haven/api` is a `devDependency` in `apps/web` for types only (root `CLAUDE.md` gotcha #4). BE coder is the only one who can change router shape; FE coder's tRPC client code reacts to it but never edits `apps/api`. |
| `packages/okf/**` and `docs/okf/**` | **Backend coder generates; nobody hand-edits `docs/okf/`** | `packages/okf` is powered by `apps/api/scripts/okf-build.ts`, which introspects the live Drizzle schema — a BE concern. `docs/okf/` itself is fully generated (`pnpm okf:build`) and already has a `PostToolUse` hook (`okf-rebuild-on-schema-change.sh`) that regenerates it automatically on schema edits. No coder agent should hand-edit `docs/okf/**`; treat edits there as a hook-fired side effect, not a ticket deliverable. |
| `.github/workflows/**` | **Orchestrator / human, not either coder** | CI, security, label-automation, and release workflows are harness infrastructure, not feature code. Scope this to the orchestrator agent (GW-B6) or explicit human review — a coder agent editing its own CI gate is a self-defeating trust boundary. |
| `docs/PRD.md`, `docs/STORIES.md` | **spec-planner only** (pre-existing convention, unchanged) | Neither new coder should touch these; they're the contract coders build from, not something they own. |
| `docs/spikes/**`, `docs/TESTING.md`, root `README.md`/`CLAUDE.md` | **Cross-cutting / orchestrator-mediated** | Low-frequency, high-blast-radius docs. No default owner; edits happen via explicit ticket scope (like this one) rather than falling under a coder's standing grant. |

### Rule for cross-cutting tickets (feature needs both a tRPC endpoint AND UI)

**Recommendation: one ticket, contract-first, sequential handoff — backend lands first.**

Rationale, grounded in what already exists:
- `generator.md`'s own "Implementation order within a story" (lines 32–38) already states the sequence Movie Haven uses today: schema/types → API layer → server components/data fetching → client components → polish. Splitting FE/BE coders doesn't change that order, it just assigns each stage to a different agent instead of one agent doing both.
- `apps/web`'s two-tRPC-client gotcha (root `CLAUDE.md` gotcha #2) and the `AppRouter`-types-only gotcha (#4) both assume the router already exists with its final shape by the time web code is written — FE code is written *against* inferred types, so BE must land first for FE's type inference to be meaningful (not stubbed/guessed).
- Splitting into two independent tickets (one FE, one BE) invites drift: FE could guess at a response shape that doesn't match what BE ships, especially across two separate PRs merged independently. A single ticket with two sequential agent turns keeps one acceptance-criteria contract and one PR-reviewer gate for the whole feature.

Concretely: the ticket stays a single unit; the *implementation* is two ordered subtasks — "BE coder: router + Zod input schema + `packages/types` update, buildable and testable standalone (`pnpm --filter @movie-haven/api build`)" then "FE coder: consumes `serverTrpc`/`trpc` against the new `AppRouter` shape." The orchestrator (GW-B6) is what sequences this handoff; it is out of scope for GW-B0 to design the handoff protocol itself (that's GW-A2, "Agent Handoff & Context Protocol") — this spike only decides *which agent goes first and why*.

---

## 2. Tool / Permission Scoping

Modeled directly on the global agents' existing frontmatter pattern (`tools:` + `disallowedTools:` in `~/.claude/agents/*.md`), which none of the three *repo-level* agents (`spec-planner`, `generator`, `evaluator`) currently use — they all default to broad/all-tools access. The six new agents should adopt the stricter global-agent pattern, not the repo-level agents' looser one.

| Agent | Tools | May push / open PR? | Never does |
|---|---|---|---|
| **Frontend coder** | `Read, Grep, Glob, Edit, Write, Bash` | Commits to its feature branch; does not open/merge the PR itself (orchestrator or human does via `gh pr create` per root `CLAUDE.md`'s ticket lifecycle) | Never edits `apps/api/**`, `packages/db/**`, `.github/workflows/**`; never edits `packages/types/**` (consumes only); never runs `pnpm db:push`/`db:migrate`; never calls Clerk hooks (per gotcha #1) |
| **Backend coder** | `Read, Grep, Glob, Edit, Write, Bash` | Same as FE coder — commits, doesn't merge | Never edits `apps/web/**`, `packages/ui/**`; never edits `.github/workflows/**`; never hand-edits `docs/okf/**` (generated) |
| **Test author** | `Read, Grep, Glob, Write, Edit, Bash` — `Write`/`Edit` restricted to test-file globs (`*.test.ts`, `*.test.tsx`, `e2e/**`) | No push/PR authority of its own; its output is committed as part of the ticket's branch, alongside coder changes | Never edits production source (mirrors `~/.claude/agents/unit-test.md`'s "independence rule" — tests derive from the plan, not from reading implementation); never weakens/deletes a failing test to force green (that's the coder's call to flag, per `coder.md`'s boundaries) |
| **Security reviewer** | `Read, Grep, Glob, Bash, WebFetch` (read-only; `Bash` scoped to running `deepsec process --diff`, `pnpm audit`, not arbitrary shell) | No push/PR authority; posts findings as a review/comment | Never edits code to "fix" a finding itself; never approves — can only block (REQUEST CHANGES) on critical/high findings, per GW-B4's own acceptance criteria ("Requests changes on critical/high findings") |
| **PR reviewer** | `Read, Grep, Glob, Bash, WebFetch` (mirrors `~/.claude/agents/reviewer.md` and `.claude/agents/evaluator.md` Mode 2 exactly — both are already `disallowedTools: Edit, Write, NotebookEdit, Agent` or tools-list-excludes-Edit/Write) | **This is the only agent whose approval is meant to drive `pr-labels.yml`'s `status:done` transition** (that workflow fires on `pull_request_review: submitted` with `state == 'approved'`) | Never edits code; never merges the PR (root `CLAUDE.md`'s ticket lifecycle says "label automation handles the rest" — merge is still a human/automation-outside-Claude action, not this agent clicking merge) |
| **Orchestrator** | `Agent(frontend-coder, backend-coder, test-author, security-reviewer, pr-reviewer)`, plus `Read, Write, Edit, Bash, Grep, Glob` for its own bookkeeping (mirrors `iterative-planner-orchestrator`'s `tools:` shape exactly — an `Agent(...)` allowlist scoped to only its five subagents) | Runs `gh issue edit`/`gh pr create` per the ticket lifecycle (root `CLAUDE.md`: label `status:in-progress` → branch → PR → `Closes #{N}`) | Never writes production code or tests directly — it only sequences the five specialists (GW-B6's own goal statement: "Define the agent that sequences the five specialists per ticket") |

**How Claude Code's frontmatter mechanism enforces this today:** the `tools:`/`disallowedTools:` YAML keys in agent definition files are read by the harness at agent-invocation time and restrict which tool calls are even offered to the model — this is the same mechanism already used by `~/.claude/agents/story-planner.md` (`disallowedTools: Edit, Write, NotebookEdit, Agent`) and `reviewer.md` (identical). It's necessary but not sufficient for *path* scoping, since `tools: Edit, Write` still permits editing anywhere in the repo — hence §4's additional hook.

---

## 3. Reuse Mapping

No new agent should start from a blank file. Concrete fork sources:

| New agent (`.claude/agents/*.md`) | Forks from | What to take, what to change |
|---|---|---|
| `frontend-coder.md` (GW-B1) | `~/.claude/agents/coder.md` (global) | Take: functional-style/self-documenting-names/branch-comments/production-logging standards verbatim, and the "read plan → follow conventions → implement → make tests green → self-check" process. Change: scope `tools`/prompt to `apps/web` + `packages/ui` only; fold in `generator.md`'s Next.js/nuqs/two-tRPC-client/shadcn gotchas (root `CLAUDE.md` gotchas #2 and #6, plus `generator.md`'s stack-reference table rows for Frontend/Shared UI). |
| `backend-coder.md` (GW-B2) | `~/.claude/agents/coder.md` (global) | Same base as FE coder. Change: scope to `apps/api` + `packages/db`; fold in `generator.md`'s Fastify/tRPC v11/Drizzle/JWT gotchas (root `CLAUDE.md` gotchas #1, #3; `packages/db/CLAUDE.md`'s four gotchas verbatim, especially "schema changes require `pnpm db:push`/`db:generate`" and "`apps/web` does NOT import `@movie-haven/db`"). |
| `test-author.md` (GW-B3) | `~/.claude/agents/unit-test.md` (global) | Take: the entire "independence rule" (derive tests from the plan's functional requirements, never from reading implementation) and the Arrange-Act-Assert / mock-external-deps quality bar verbatim — this is exactly GW-B3's "writes tests from the plan only... independent of implementation" requirement. Change: extend scope from unit-only to unit + integration + E2E per `docs/TESTING.md`'s testing pyramid (currently `unit-test.md` doesn't mention Playwright at all — add it, referencing `docs/TESTING.md`'s E2E section). |
| `security-reviewer.md` (GW-B4) | `.claude/agents/evaluator.md` Mode 2 ("Code / Diff Review") | Take: the severity rubric (critical/major/medium/minor) and the "MovieHaven-Specific Checks" list (tRPC error codes, `protectedProcedure`, Zod validation, no secrets/PII, Drizzle migrations, Biome) almost verbatim — these are already security-adjacent checks. Change: replace generic code-quality focus with a `deepsec --diff` invocation (per the `deepsec` skill already in `.claude/skills/deepsec/`) plus an explicit OWASP-style checklist, and change the verdict semantics from APPROVE/REQUEST CHANGES on quality to a hard block on critical/high security findings only (GW-B4's stated scope is narrower than the general reviewer). |
| `pr-reviewer.md` (GW-B5) | `~/.claude/agents/reviewer.md` (global) **merged with** `.claude/agents/evaluator.md` Mode 2 | Take: `reviewer.md`'s traceability-table structure (requirement → implemented? → tested? → status) and Verdict vocabulary (APPROVE / APPROVE WITH NITS / REQUEST CHANGES) as the primary skeleton — it's already scoped as "the final gate." Layer in `evaluator.md`'s PR-specific mechanics (`gh pr diff <n>`, `gh pr view <n>`) since `reviewer.md` doesn't currently specify *how* to fetch a live PR's diff. GW-B5 explicitly says "fork/reuse the existing reviewer/evaluator agents — do not build net-new," so this is a direct instruction, not just a suggestion. |
| `orchestrator.md` (GW-B6) | `~/.claude/commands/develop-story.md` (global command) **and** `~/.claude/agents/iterative-planner-orchestrator.md`'s `tools:` shape | Take: `develop-story.md`'s strict-sequence pipeline logic, its "gate" checks between phases, and its loop-back rules (reviewer REQUEST CHANGES → back to coder/test-author; flawed plan → back to planner) — directly analogous to routing "plan → coder → test-author → security → PR-reviewer" (GW-B6's stated scope). Take `iterative-planner-orchestrator`'s `Agent(...)` allowlist syntax to scope which five subagents it may invoke. Change: `develop-story` assumes one generic `coder`; GW-B6 must add a branch point — pick `frontend-coder` vs `backend-coder` vs both (per §1's contract-first rule) based on which paths the ticket's plan touches. |

`spec-planner.md` and `generator.md`/`evaluator.md` (repo-level, existing) are not forked further — they remain the planning and (until GW-B1/B2 replace it) fallback general-purpose implementation/evaluation agents. Once GW-B1/B2 land, `generator.md`'s role narrows to orchestration-adjacent bootstrapping or is superseded by GW-B6; that transition is out of scope for this spike.

---

## 4. Enforcement Mechanics

Three layers, in increasing strictness, mirroring how `protect-generated-and-vendored.sh` already enforces a *different* boundary (generated/vendored files) today:

1. **Prompt-level instruction (weakest, but necessary).** Each coder's system prompt states its owned paths explicitly and instructs it to refuse out-of-scope edits and hand off instead (this is how GW-B1/B2's acceptance criteria are phrased: "Refuses to edit apps/api / packages/db" / "Refuses to edit apps/web / packages/ui"). Cheap, but relies on the model complying — not a hard boundary.

2. **PreToolUse hook (the enforceable layer — recommend building this).** Add `.claude/hooks/enforce-agent-path-scope.sh`, registered in `.claude/settings.json` alongside the existing `protect-generated-and-vendored.sh` hook (same `PreToolUse` matcher: `Write|Edit|MultiEdit`). Mechanics:
   - The hook reads `tool_input.file_path` (same `hook_field` helper already used by `protect-generated-and-vendored.sh`, via `.claude/hooks/lib/common.sh`).
   - It needs to know *which agent* is running. Claude Code subagent invocations expose this via the transcript/session context; the pragmatic implementation is to have each subagent's own prompt set an env var or sentinel file (e.g. `CLAUDE_AGENT_NAME=frontend-coder`) at the start of its turn, since hooks execute as plain shell and don't natively receive "current agent name" today. This is a real gap — flag it as an open question for whichever ticket wires up GW-B6, since the exact signal available depends on GW-A2's handoff/context protocol (still pending).
   - Given an agent name, the hook checks the file path against a small allowlist table (mirroring §1) and `deny`s (using the existing `deny` helper) with a message like: "frontend-coder may only edit apps/web/** and packages/ui/**; this ticket needs a backend-coder turn for apps/api/**."
   - This is a **repo-level, always-on** guard — it doesn't depend on which agent *claims* to be running being honest, since it's evaluated against the actual file path on every Edit/Write, same as the generated-file guard is today.

3. **PR review check (last line of defense).** The PR reviewer agent (GW-B5), as part of its traceability pass, additionally verifies the diff's file list against the ticket's stated scope (FE-only ticket touching `apps/api/**` is a REQUEST CHANGES-worthy finding on its own, independent of code correctness). This catches anything that slipped past the hook (e.g., if the agent-name signal in layer 2 wasn't available) and is the natural place to enforce cross-cutting-ticket sequencing from §1 (verify BE's router/types commit precedes FE's consuming commit, not the reverse).

**Recommended minimal enforceable set for Phase 1:** layers 1 and 3 are pure prompt/reasoning work that ships with GW-B1–B5 regardless (no extra ticket needed — it's just how those agents are written). **Layer 2 (the hook) is the one concrete new artifact this spike recommends** and should be scoped as its own small ticket (not silently bundled into GW-B1/B2) because it depends on an agent-identity signal that doesn't fully exist until GW-A2/GW-B6 are further along — building it now risks guessing at a mechanism GW-A2 will define differently. Recommendation: land layers 1+3 as part of GW-B1–B5 as written, and open a follow-on ticket for the hook once GW-A2 (Agent Handoff & Context Protocol) settles how agent identity is threaded through a session — do not block GW-B1–B5 on it.

---

## 5. Inputs Each Downstream Ticket Needs

### GW-B1 — Frontend Coder Agent
- **Owned paths**: `apps/web/**`, `packages/ui/**` (§1). Consumes `packages/types/**` and `AppRouter` but never edits either.
- **Fork source**: `~/.claude/agents/coder.md`, extended with `generator.md`'s Next.js/nuqs/shadcn/two-tRPC-client gotchas (§3).
- **Tools**: `Read, Grep, Glob, Edit, Write, Bash`; no `Agent`; commits but doesn't PR/merge (§2).
- **Refusal behavior**: must decline edits to `apps/api/**`/`packages/db/**` per its own acceptance criteria — write this as an explicit prompt rule, not just an implicit assumption.

### GW-B2 — Backend Coder Agent
- **Owned paths**: `apps/api/**`, `packages/db/**`, and (as the writer, not FE) `packages/types/**` when a schema/router change requires a type update (§1).
- **Fork source**: `~/.claude/agents/coder.md`, extended with `packages/db/CLAUDE.md`'s gotchas and root `CLAUDE.md` gotchas #1/#3 (§3).
- **Tools**: same shape as FE coder (§2).
- **Refusal behavior**: must decline edits to `apps/web/**`/`packages/ui/**`, and must not hand-edit `docs/okf/**` (generated by a hook off schema changes it makes).

### GW-B3 — Test Author Agent
- **Fork source**: `~/.claude/agents/unit-test.md` verbatim for the independence rule and TDD-red-phase behavior; extend scope to integration + E2E (Playwright) per `docs/TESTING.md`'s pyramid, since the global `unit-test.md` today only covers unit tests (§3).
- **Depends on GW-C2/GW-C3** (test-runtime/coverage-tooling tickets, per issue #31's stated dependencies) — this spike does not decide those; GW-B3's own ticket must confirm what test infra those tickets land before assuming Playwright/Vitest wiring is ready.
- **Tools**: `Write`/`Edit` scoped to test-file globs only, never production source (§2).

### GW-B4 — Security Reviewer Agent
- **Fork source**: `.claude/agents/evaluator.md` Mode 2's severity rubric + MovieHaven-specific checks, layered with a `deepsec --diff` run (via the existing `.claude/skills/deepsec/` skill) and an OWASP checklist (§3).
- **Depends on GW-D5** (per issue #32) for whatever FE/BE security checklists GW-D1/D3 produce — this spike only decides that the agent is read-only and blocks on critical/high, not what the checklist contents are.
- **Tools**: read-only (`Read, Grep, Glob, Bash, WebFetch`); can only REQUEST CHANGES, never approves (§2).

### GW-B5 — PR Reviewer Agent
- **Fork source**: `~/.claude/agents/reviewer.md` merged with `.claude/agents/evaluator.md` Mode 2's PR-fetch mechanics (`gh pr diff`, `gh pr view`) — explicitly "fork/reuse, do not build net-new" per issue #33 (§3).
- **Unique responsibility**: this is the only agent whose approval should drive `pr-labels.yml`'s `status:review` → `status:done` transition (§2) — confirm this wiring when GW-B5 is implemented, since `pr-labels.yml` currently reacts to *any* `pull_request_review: submitted` with `state == 'approved'`, regardless of reviewer identity.
- **Additional check this spike assigns it**: verify the diff's touched paths match the ticket's declared FE/BE scope (§4, layer 3) — this is a new responsibility beyond what `reviewer.md`/`evaluator.md` do today, since neither currently checks path ownership.

### GW-B6 — Orchestrator Agent Definition
- **Fork source**: `~/.claude/commands/develop-story.md`'s sequencing/gating/loop-back logic, with `iterative-planner-orchestrator.md`'s `Agent(...)` tool-scoping syntax (§3).
- **Sequencing decision from this spike**: route each ticket through frontend-coder and/or backend-coder based on which paths its plan touches (§1) — for cross-cutting tickets, backend-coder's turn happens before frontend-coder's turn, never the reverse, never parallel.
- **Depends on GW-A3, GW-A2, GW-B1..B5** (per issue #34) — GW-A2 in particular (Agent Handoff & Context Protocol, still pending) will determine the concrete mechanism for passing plan/diff artifacts between the five specialists; this spike assumes that protocol exists but does not design it.
- **Out of scope here**: the agent-identity signal needed for §4's PreToolUse hook — flag as an open dependency when GW-B6 is scoped.

---

## References

- `.claude/agents/spec-planner.md`, `generator.md`, `evaluator.md` (repo-level, existing three-agent pipeline)
- `~/.claude/agents/story-planner.md`, `unit-test.md`, `coder.md`, `reviewer.md` (global, existing `develop-story` four-agent pipeline)
- `~/.claude/commands/develop-story.md` (pipeline orchestration logic)
- `~/.claude/agents/iterative-planner-orchestrator.md` (existing `Agent(...)` tool-scoping precedent)
- Root `CLAUDE.md` — critical gotchas #1–#7, codebase map, ticket lifecycle
- `packages/db/CLAUDE.md` — DB ownership and schema-change gotchas
- `.claude/hooks/protect-generated-and-vendored.sh`, `.claude/hooks/lib/common.sh` — existing PreToolUse hook pattern this spike extends
- `.claude/criteria/*.md` — five existing review-rubric files (backend-api-quality, code-architecture, frontend-ui-design, performance-accessibility, ux-user-flows)
- `.github/workflows/ci.yml`, `security.yml`, `pr-labels.yml` — existing CI/label-automation this spike does not change
- `docs/spikes/GW-A1-autonomy-runtime-selection.md` — prior spike establishing the local-hybrid runtime model this spike's enforcement recommendations assume
- GitHub issues #21–#27 (GW-A1–A7), #28 (GW-B0, this spike), #29–#34 (GW-B1–B6)
