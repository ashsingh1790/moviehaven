#!/usr/bin/env bash
# Stop — ask the model to reflect on the session and propose CLAUDE.md updates
# while context is fresh. Dedupes per session via a marker so this fires at
# most once per session_id (without the marker the Stop would re-fire after
# the model replies, creating an infinite loop).

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"
read_hook_input

session_id="$(hook_field 'session_id')"

reason="Before ending the session, reflect on what happened and propose CLAUDE.md updates while the context is fresh.

Scan this session for any of the following that are NOT already captured in the relevant CLAUDE.md:
  1. Gotchas — failures, surprises, or non-obvious behavior we ran into.
  2. Build / test / lint commands that turned out to be the right ones.
  3. Conventions or invariants that came up in code review or correction.
  4. New top-level directories, modules, or tools (root CLAUDE.md needs them).
  5. Memories the user explicitly asked you to remember about this repo.

For each finding:
  - Identify the MOST-SPECIFIC CLAUDE.md where it belongs (a subdirectory file beats the root).
  - Propose a concrete edit (Edit tool call with old_string / new_string), do not just describe it.
  - Keep additions terse — one line under an existing section beats a new section.

If nothing meaningful was learned this session, say so in one sentence and stop — do not invent updates."

stop_with_reflection "$session_id" "$reason"
