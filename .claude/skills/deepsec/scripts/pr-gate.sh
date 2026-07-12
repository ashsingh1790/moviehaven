#!/usr/bin/env bash
# pr-gate.sh — local "what would CI say" wrapper around `process --diff`.
#
# Usage:
#   bash pr-gate.sh <base-ref> [<extra deepsec flags...>]
#
# Examples:
#   bash pr-gate.sh origin/main
#   bash pr-gate.sh origin/main --agent claude --concurrency 10

set -u

if [ $# -lt 1 ]; then
  echo "usage: $0 <base-ref> [<extra flags>]" >&2
  echo "example: $0 origin/main" >&2
  exit 2
fi

BASE_REF="$1"; shift

# Find .deepsec/ — walk up.
DIR="$PWD"
while [ "$DIR" != "/" ] && [ ! -d "$DIR/.deepsec" ]; do
  DIR=$(dirname "$DIR")
done

if [ ! -d "$DIR/.deepsec" ]; then
  echo "no .deepsec/ found walking up from $PWD" >&2
  exit 2
fi

cd "$DIR/.deepsec" || exit 2

COMMENT_OUT="${COMMENT_OUT:-comment.md}"

echo "running: pnpm deepsec process --diff $BASE_REF --comment-out $COMMENT_OUT $*"
pnpm deepsec process --diff "$BASE_REF" --comment-out "$COMMENT_OUT" "$@"
RC=$?

echo
case $RC in
  0)
    echo "✓ no net-new findings — gate passes"
    ;;
  1)
    echo "✗ net-new findings — gate fails"
    if [ -f "$COMMENT_OUT" ]; then
      echo "  comment artifact: $DIR/.deepsec/$COMMENT_OUT"
    fi
    ;;
  *)
    echo "! deepsec runtime error (exit $RC) — see logs above"
    ;;
esac

exit $RC
