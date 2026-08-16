#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

# herdr already installed: symlinks land.
herdr_dir="$temp_dir/herdr-config"
HERDR_CONFIG_DIR="$herdr_dir" "$repo_dir/install-herdr"

[[ "$(readlink "$herdr_dir/config.toml")" == "$repo_dir/herdr/config.toml" ]]
[[ "$(readlink "$herdr_dir/new-jj-workspace.sh")" == "$repo_dir/herdr/new-jj-workspace.sh" ]]

# herdr missing: fails with a manual-install message, no symlinks created.
# Strip herdr's own directory from PATH rather than emptying PATH outright,
# so bash/coreutils used by install-herdr itself stay resolvable.
herdr_bin_dir="$(dirname "$(command -v herdr)")"
stripped_path="$(printf '%s' "$PATH" | tr ':' '\n' | grep -vFx "$herdr_bin_dir" | tr '\n' ':')"

missing_dir="$temp_dir/herdr-config-missing"
if PATH="$stripped_path" HERDR_CONFIG_DIR="$missing_dir" "$repo_dir/install-herdr" \
  >"$temp_dir/missing.out" 2>"$temp_dir/missing.err"; then
  echo "expected install-herdr to fail when herdr is not installed" >&2
  exit 1
fi

grep -qF "https://herdr.dev" "$temp_dir/missing.err"
[[ ! -e "$missing_dir/config.toml" ]]
