#!/usr/bin/env bash
# SessionStart — inject an inventory of CLAUDE.md files in the repo so the
# model knows which subdirectory contexts will load progressively as it
# descends the tree.

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" 2>/dev/null || exit 0

files=$(find . -maxdepth 5 -name CLAUDE.md \
          -not -path './node_modules/*' \
          -not -path './.next/*' \
          -not -path './dist/*' \
          -not -path './build/*' 2>/dev/null \
        | sed 's|^\./||' | sort)

[[ -z "$files" ]] && exit 0

count=$(printf '%s\n' "$files" | grep -c .)

ctx="${count} CLAUDE.md files are present and will load additively as you descend the tree:

$(printf '%s\n' "$files" | sed 's/^/  - /')

Scope work to the relevant subdirectory rather than the repo root — root context loads automatically as you walk up."

session_context "$ctx"
