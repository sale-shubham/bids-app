#!/usr/bin/env bash
# Stop hook: quality gate for code written in a Claude Code session.
# When the working tree has uncommitted source changes, runs `npm run check`
# (this repo's lint / typecheck / tests — see package.json) and blocks the
# turn from ending (exit 2) until it passes, so a session can't finish with
# code that pre-commit or CI would reject. Committed work is already covered by
# .husky/pre-commit and the PR workflow; this catches it before that.
#
# Fires once per stop-cluster: if another Stop hook (or this one) already
# blocked, let the stop through rather than loop — pre-commit and CI still
# enforce the same check.

input=$(cat)
dir="${CLAUDE_PROJECT_DIR:-.}"
cd "$dir" || exit 0

if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

changed=$(git status --porcelain --untracked-files=all 2>/dev/null \
  | sed -E 's/^.{3}//; s/.* -> //' \
  | grep -Ei '\.(js|jsx|mjs|cjs|ts|tsx|json|css)$' \
  | grep -Ev '^(node_modules|\.next[^/]*|dist|out|public|coverage)/' \
  | grep -Ev '(^|/)(package-lock\.json|next-env\.d\.ts|version\.json)$')
[ -z "$changed" ] && exit 0

out=$(npm run --silent check 2>&1)
status=$?
[ "$status" -eq 0 ] && exit 0

{
  echo "Quality gate (.claude/hooks/quality-gate.sh): \`npm run check\` fails on the uncommitted changes."
  echo "Fix every problem below, then stop again. Do NOT silence it: no eslint-disable, @ts-ignore/@ts-expect-error,"
  echo "rule downgrades or skipped tests — the fix patterns are in CLAUDE.md ('Code quality guardrails')."
  printf '%s\n' "$out" | tail -60
} >&2
exit 2
