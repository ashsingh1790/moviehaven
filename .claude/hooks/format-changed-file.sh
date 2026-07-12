#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit) — auto-format the file just changed via
# Biome (the project formatter — replaces ESLint + Prettier). Silent no-op if
# the extension doesn't match or the local binary isn't present.

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"
read_hook_input

file="$(hook_field 'tool_response.filePath')"
[[ -z "$file" ]] && file="$(hook_field 'tool_input.file_path')"
[[ -z "$file" || ! -f "$file" ]] && exit 0

biome="${CLAUDE_PROJECT_DIR}/node_modules/.bin/biome"

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    [[ -x "$biome" ]] && "$biome" format --write "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
