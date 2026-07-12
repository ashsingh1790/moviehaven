#!/usr/bin/env bash
# PreToolUse(Edit|Write|MultiEdit) — deny edits to generated code and vendored
# deps with a contextual message. Static patterns (build/**, .next/**) are also
# in permissions.deny for cheap matching; this hook catches the contextual cases
# and explains *why* with a project-specific reason.

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"
read_hook_input

file="$(hook_field 'tool_input.file_path')"
[[ -z "$file" ]] && exit 0

root="${CLAUDE_PROJECT_DIR:-}"
rel="${file#"$root"/}"

case "$rel" in
  *.env|.env.*)
    deny "$rel looks like a secret. Don't edit it directly — ask the user to update it out of band."
    ;;
  pnpm-lock.yaml|package-lock.json|yarn.lock)
    deny "$rel is a lockfile. Regenerate it by running pnpm install; never hand-edit."
    ;;
  *.gen.*|*.generated.*)
    deny "$rel is a generated file. Edit the corresponding input and regenerate."
    ;;
esac

exit 0
