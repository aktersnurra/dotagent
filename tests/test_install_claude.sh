#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
bin_dir="$temp_dir/bin"
home_dir="$temp_dir/home"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$bin_dir"
cat >"$bin_dir/claude" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$bin_dir/claude"

HOME="$home_dir" PATH="$bin_dir:$PATH" "$repo_dir/install-claude"

[[ "$(readlink "$home_dir/.claude/CLAUDE.md")" == "$repo_dir/AGENTS.md" ]]
[[ "$(readlink "$home_dir/.claude/settings.json")" == "$repo_dir/claude/settings.json" ]]
