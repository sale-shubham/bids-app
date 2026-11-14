#!/usr/bin/env bash
# Stop hook: when this session left UI changes (src/app, src/components,
# src/features) uncommitted but no e2e/specs change, block once and ask for a
# spec — CLAUDE.md: every fix or feature adds or updates an E2E spec.
# Fires once per stop-cluster (stop_hook_active), so a stated reason ends it.
input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
changed=$(git status --porcelain --untracked-files=all 2>/dev/null | sed -E 's/^.{3}//; s/.* -> //')
ui=$(printf '%s\n' "$changed" | grep -E '^src/(app|components|features)/.+\.(tsx?|css)$')
specs=$(printf '%s\n' "$changed" | grep -E '^e2e/specs/')
if [ -n "$ui" ] && [ -z "$specs" ]; then
  {
    echo "E2E reminder (CLAUDE.md): UI code changed but no e2e/specs/ file did."
    echo "Add or update a Playwright spec that covers this change (see e2e/README.md), or say why none applies, then stop again:"
    printf '%s\n' "$ui" | head -15 | sed 's/^/  - /'
  } >&2
  exit 2
fi
exit 0
