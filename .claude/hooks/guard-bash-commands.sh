#!/usr/bin/env bash
# PreToolUse(Bash) — gate dangerous or whole-repo operations behind
# confirmation, and block patterns too risky to leave to the prompt.
# Static patterns (git push --force, rm -rf /) are in permissions.deny;
# this hook covers contextual cases and explains why.

set -euo pipefail
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"
read_hook_input

cmd="$(hook_field 'tool_input.command')"
[[ -z "$cmd" ]] && exit 0

case "$cmd" in
  *"--no-verify"*|*"--no-gpg-sign"*)
    deny "Skipping git hooks / signing. If a hook is failing, fix the underlying issue rather than bypassing it."
    ;;
  *"curl"*"| sh"*|*"curl"*"| bash"*|*"wget"*"| sh"*)
    deny "Piping a remote download into a shell. Download first, inspect, then run."
    ;;
  *"git reset --hard"*)
    ask "git reset --hard will erase uncommitted work. Confirm you want to proceed."
    ;;
  *"git checkout ."*|*"git restore ."*|*"git clean -f"*)
    ask "This will discard all uncommitted changes. Confirm you want to proceed."
    ;;
  *"pnpm infra:reset"*|*"infra:reset"*)
    ask "infra:reset wipes Postgres + Redis volumes — all local data will be lost. Confirm you want to proceed."
    ;;
esac

exit 0
