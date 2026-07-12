#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit) — rebuild the OKF dev catalog when the
# Drizzle schema or a tRPC router is modified. Silent no-op for all other files.

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"
read_hook_input

file="$(hook_field 'tool_response.filePath')"
[[ -z "$file" ]] && file="$(hook_field 'tool_input.file_path')"
[[ -z "$file" ]] && exit 0

# Only trigger on schema or router files.
case "$file" in
  */packages/db/src/schema/*.ts|*/apps/api/src/trpc/routers/*.ts) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR}"
pnpm okf:build >/dev/null 2>&1 || true

exit 0
