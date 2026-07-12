#!/usr/bin/env bash
# Shared helpers for Claude Code hooks. Source from any hook:
#   source "${CLAUDE_PROJECT_DIR}/.claude/hooks/lib/common.sh"

set -euo pipefail

# Read JSON input from stdin once; expose as $HOOK_INPUT.
read_hook_input() {
  if [[ -t 0 ]]; then HOOK_INPUT='{}'; else HOOK_INPUT="$(cat)"; fi
  export HOOK_INPUT
}

# Extract a field from the hook input JSON. Requires jq.
hook_field() {
  echo "$HOOK_INPUT" | jq -r ".$1 // empty"
}

# PreToolUse — deny the tool call with a structured reason.
deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# PreToolUse — gate the tool call behind a confirmation prompt.
ask() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# SessionStart — inject additional context the model sees at session boot.
session_context() {
  jq -n --arg c "$1" '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $c
    }
  }'
  exit 0
}

# Stop — block the stop and feed the model a reflection task. Dedupes per
# session via a marker file so it fires at most once per session_id.
stop_with_reflection() {
  local session_id="$1" reason="$2"
  [[ -z "$session_id" ]] && exit 0
  local marker="${TMPDIR:-/tmp}/claude-reflect-${session_id}.done"
  [[ -f "$marker" ]] && exit 0
  touch "$marker"
  jq -n --arg r "$reason" '{
    decision: "block",
    reason: $r,
    suppressOutput: true
  }'
  exit 0
}
