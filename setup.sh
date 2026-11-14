#!/usr/bin/env bash
# setup.sh — Regenerates .claude/settings.local.json with this machine's absolute
# marketplace path. Run once after cloning. Re-run if you move the repo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_PATH="$SCRIPT_DIR/.claude/plugins"
SETTINGS_LOCAL="$SCRIPT_DIR/.claude/settings.local.json"

cat > "$SETTINGS_LOCAL" <<EOF
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '=== PROJECT RULES ===' && cat .claude/RULES.md"
          }
        ]
      }
    ]
  },
  "extraKnownMarketplaces": {
    "pce-plugins": {
      "source": {
        "type": "localPath",
        "path": "$MARKETPLACE_PATH"
      }
    }
  }
}
EOF

echo "✓ .claude/settings.local.json regenerated"
echo "  Marketplace path: $MARKETPLACE_PATH"
echo "  Run 'claude plugin list' to verify plugins are visible."
