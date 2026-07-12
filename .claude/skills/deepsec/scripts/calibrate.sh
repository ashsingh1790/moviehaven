#!/usr/bin/env bash
# calibrate.sh — run a limited deepsec process and project full-repo cost.
#
# Usage:
#   bash calibrate.sh [<repo-root>]
#
# Defaults to current dir. Expects .deepsec/ to exist (run `npx deepsec init` first).

set -u

REPO_ROOT="${1:-$PWD}"
DEEPSEC_DIR="$REPO_ROOT/.deepsec"

if [ ! -d "$DEEPSEC_DIR" ]; then
  echo "no .deepsec/ at $REPO_ROOT — run 'npx deepsec init' from the repo root first" >&2
  exit 2
fi

cd "$DEEPSEC_DIR" || exit 2

echo "=== scan (regex only, free) ==="
pnpm deepsec scan
SCAN_RC=$?
if [ $SCAN_RC -ne 0 ]; then
  echo "scan failed (exit $SCAN_RC)" >&2
  exit $SCAN_RC
fi

echo
echo "=== status before calibration ==="
pnpm deepsec status

echo
echo "=== process --limit 50 (AI-driven, costs money) ==="
pnpm deepsec process --limit 50
PROC_RC=$?

echo
if [ $PROC_RC -ne 0 ]; then
  echo "process --limit 50 failed (exit $PROC_RC)" >&2
  exit $PROC_RC
fi

# Pull total file count and recent run cost from data dir.
# Runs live under data/*/runs/<runId>.json. We grab the most recent.
LAST_RUN=$(find data -name '*.json' -path '*/runs/*' -print0 \
  | xargs -0 ls -t 2>/dev/null | head -1)

if [ -z "$LAST_RUN" ]; then
  echo "no run file found under data/*/runs/ — can't project cost" >&2
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not installed — can't compute projection. Run details: $LAST_RUN"
  exit 0
fi

# RunMeta has: stats.totalCostUsd, stats.filesScanned, stats.findingsCount
RUN_COST=$(jq -r '.stats.totalCostUsd // 0' "$LAST_RUN")
RUN_FILES=$(jq -r '.stats.filesScanned // 50' "$LAST_RUN")
TOTAL_FILES=$(find data -name '*.json' -path '*/files/*' | wc -l | tr -d ' ')

if [ "$RUN_FILES" -le 0 ] 2>/dev/null; then
  RUN_FILES=50
fi

echo "=== calibration summary ==="
echo "  last run:           $LAST_RUN"
echo "  observed cost:      \$$RUN_COST  ($RUN_FILES files)"
echo "  total candidate files: $TOTAL_FILES"

# Rough projection: cost per file × total files. Add 30% headroom.
PROJECTION=$(awk -v cost="$RUN_COST" -v ran="$RUN_FILES" -v total="$TOTAL_FILES" \
  'BEGIN { printf "%.2f", (cost / ran) * total * 1.3 }')

echo "  projected full-run: ~\$$PROJECTION  (per-file × total × 1.3 headroom)"
echo
echo "If this is acceptable, run: pnpm deepsec process"
echo "Otherwise scope with --min-severity, --files-from, --matchers, or --project-id."
