#!/usr/bin/env bash
# doctor.sh — sanity check a deepsec install.
#
# Usage:
#   bash doctor.sh [<repo-root>]

REPO_ROOT="${1:-$PWD}"
DEEPSEC_DIR="$REPO_ROOT/.deepsec"
EXIT=0

bad() { echo "  ✗ $1"; EXIT=1; }
ok()  { echo "  ✓ $1"; }
warn() { echo "  ! $1"; }

echo "checking $DEEPSEC_DIR"
if [ ! -d "$DEEPSEC_DIR" ]; then
  bad "no .deepsec/ — run 'npx deepsec init' from the repo root"
  exit $EXIT
fi

cd "$DEEPSEC_DIR" || exit 2

echo
echo "[1/6] node_modules"
if [ -d "node_modules/deepsec" ]; then
  ok "deepsec installed"
else
  bad "deepsec not installed — run 'pnpm install' inside .deepsec/"
fi

echo
echo "[2/6] config file"
if ls deepsec.config.{ts,mjs,js,cjs} >/dev/null 2>&1; then
  CFG=$(ls deepsec.config.{ts,mjs,js,cjs} 2>/dev/null | head -1)
  ok "found $CFG"
else
  bad "no deepsec.config.* — should have been created by 'deepsec init'"
fi

echo
echo "[3/6] credentials"
if [ -f .env.local ]; then
  if grep -qE '^(AI_GATEWAY_API_KEY|ANTHROPIC_AUTH_TOKEN|OPENAI_API_KEY|VERCEL_OIDC_TOKEN)=' .env.local; then
    KEY=$(grep -oE '^(AI_GATEWAY_API_KEY|ANTHROPIC_AUTH_TOKEN|OPENAI_API_KEY|VERCEL_OIDC_TOKEN)' .env.local | head -1)
    ok ".env.local has $KEY"
    if [ "$KEY" = "VERCEL_OIDC_TOKEN" ]; then
      # OIDC tokens are 12-hour TTL. File mtime is a proxy for last pull.
      AGE_SEC=$(( $(date +%s) - $(stat -f %m .env.local 2>/dev/null || stat -c %Y .env.local) ))
      if [ "$AGE_SEC" -gt 39600 ]; then  # 11 hours
        warn ".env.local last touched $((AGE_SEC/3600))h ago — OIDC may be near expiry; re-run 'npx vercel env pull'"
      fi
    fi
  else
    bad ".env.local exists but has no recognized API key var"
  fi
else
  if claude --version >/dev/null 2>&1 || codex --version >/dev/null 2>&1; then
    warn "no .env.local — relying on local claude/codex subscription (only works for non-sandbox runs)"
  else
    bad "no .env.local and no local agent CLI — set AI_GATEWAY_API_KEY or login claude/codex"
  fi
fi

echo
echo "[4/6] data dir"
PROJECTS=$(find data -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$PROJECTS" -gt 0 ]; then
  ok "$PROJECTS project dir(s) under data/"
  for p in data/*/; do
    [ -d "$p" ] || continue
    pid=$(basename "$p")
    if [ -f "$p/INFO.md" ]; then
      lines=$(wc -l < "$p/INFO.md" | tr -d ' ')
      if [ "$lines" -gt 200 ]; then
        warn "data/$pid/INFO.md is $lines lines — consider trimming to 50–100"
      elif [ "$lines" -lt 5 ]; then
        warn "data/$pid/INFO.md is $lines lines — looks unfilled (run the bootstrap prompt)"
      else
        ok "data/$pid/INFO.md ($lines lines)"
      fi
    else
      bad "data/$pid missing INFO.md"
    fi
  done
else
  bad "no data/<id>/ dirs — config has no projects?"
fi

echo
echo "[5/6] node version"
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -n "$NODE_VER" ] && [ "$NODE_VER" -ge 22 ]; then
  ok "node $(node --version)"
else
  bad "node $(node --version 2>/dev/null || echo 'not found') — deepsec requires Node 22+"
fi

echo
echo "[6/6] git"
if (cd .. && git rev-parse --is-inside-work-tree >/dev/null 2>&1); then
  ok "parent dir is a git repo"
else
  warn "parent dir is not a git repo — revalidate's 'fixed' verdict needs git history"
fi

echo
if [ $EXIT -eq 0 ]; then
  echo "all good. Try: pnpm deepsec scan && pnpm deepsec process --limit 50"
else
  echo "fix the ✗ items above; see references/setup.md and references/gotchas.md"
fi
exit $EXIT
