#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "$0")/.." && pwd)
sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT

mkdir -p "$sandbox/home/projects" "$sandbox/config/opencode"
ln -s "$repository_root" "$sandbox/home/projects/dotagent"

cat > "$sandbox/config/opencode/opencode.jsonc" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "username": "test-user",
  "plugin": [
    "superpowers@git+https://github.com/aktersnurra/superpowers.git"
  ]
}
EOF

HOME="$sandbox/home" XDG_CONFIG_HOME="$sandbox/config" "$repository_root/install-opencode"
HOME="$sandbox/home" XDG_CONFIG_HOME="$sandbox/config" "$repository_root/install-opencode"

config="$sandbox/config/opencode/opencode.jsonc"
jq -e '.username == "test-user"' "$config"
jq -e '.plugin | index("superpowers@git+https://github.com/aktersnurra/superpowers.git") != null' "$config"
jq -e '.plugin | index("@mohak34/opencode-notifier@latest") != null' "$config"
jq -e '.mcp.playwright == {"type":"local","command":["npx","-y","@playwright/mcp@latest","--browser","chrome"]}' "$config"
