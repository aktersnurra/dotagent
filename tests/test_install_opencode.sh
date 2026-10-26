#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
home_dir="$temp_dir/home"
config_dir="$home_dir/.config/opencode"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$config_dir/skills" "$config_dir/commands"
ln -s /elsewhere/custom.md "$config_dir/commands/custom.md"
ln -s /elsewhere/custom-skill/ "$config_dir/skills/custom-skill"
ln -s "$temp_dir/stale-CLAUDE.md" "$config_dir/CLAUDE.md"

HOME="$home_dir" XDG_CONFIG_HOME="$home_dir/.config" "$repo_dir/install-opencode"
HOME="$home_dir" XDG_CONFIG_HOME="$home_dir/.config" "$repo_dir/install-opencode"

[[ "$(readlink "$config_dir/AGENTS.md")" == "$repo_dir/AGENTS.md" ]]
[[ ! -e "$config_dir/CLAUDE.md" && ! -L "$config_dir/CLAUDE.md" ]]
[[ "$(readlink "$config_dir/skills/jj")" == "$repo_dir/skills/jj/" ]]
[[ "$(readlink "$config_dir/skills/custom-skill")" == "/elsewhere/custom-skill/" ]]
[[ "$(readlink "$config_dir/commands/sync-master.md")" == "$repo_dir/commands/sync-master.md" ]]
[[ "$(readlink "$config_dir/commands/custom.md")" == "/elsewhere/custom.md" ]]
