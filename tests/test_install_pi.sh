#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
bin_dir="$temp_dir/bin"
pi_dir="$temp_dir/pi-work"
pi_log="$temp_dir/pi.log"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$bin_dir"
cat >"$bin_dir/pi" <<'EOF'
#!/usr/bin/env bash
printf '%s|%s\n' "${PI_CODING_AGENT_DIR:-}" "$*" >>"$PI_LOG"
EOF
chmod +x "$bin_dir/pi"

HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
  "$repo_dir/install-pi" --dir "$pi_dir" --provider github-copilot

[[ -L "$pi_dir/AGENTS.md" ]]
[[ "$(readlink "$pi_dir/AGENTS.md")" == "$repo_dir/AGENTS.md" ]]
[[ -L "$pi_dir/skills/jj" ]]
[[ -f "$pi_dir/settings.json" ]]
[[ "$(jq -r '.defaultProvider' "$pi_dir/settings.json")" == "github-copilot" ]]
[[ "$(jq -r '.defaultModel' "$pi_dir/settings.json")" == "gpt-5.6-terra" ]]
[[ "$(jq -r '.defaultThinkingLevel' "$pi_dir/settings.json")" == "medium" ]]
[[ "$(wc -l <"$pi_log" | tr -d ' ')" -gt 0 ]]
[[ "$(rg -vF "$pi_dir|" "$pi_log" || true)" == "" ]]
