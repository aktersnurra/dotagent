#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

# tuicr already installed: symlinks land.
tuicr_dir="$temp_dir/tuicr-config"
TUICR_CONFIG_DIR="$tuicr_dir" "$repo_dir/install-tuicr"

[[ "$(readlink "$tuicr_dir/config.toml")" == "$repo_dir/tuicr/config.toml" ]]
[[ "$(readlink "$tuicr_dir/themes/no-clown-fiesta.toml")" == "$repo_dir/tuicr/themes/no-clown-fiesta.toml" ]]

# The config names the theme the themes/ dir provides; renaming one without
# the other would silently fall back to a bundled theme.
grep -qF 'theme = "no-clown-fiesta"' "$repo_dir/tuicr/config.toml"

# tuicr missing: fails with a manual-install message, no symlinks created.
# Strip tuicr's own directory from PATH rather than emptying PATH outright,
# so bash/coreutils used by install-tuicr itself stay resolvable.
tuicr_bin_dir="$(dirname "$(command -v tuicr)")"
stripped_path="$(printf '%s' "$PATH" | tr ':' '\n' | grep -vFx "$tuicr_bin_dir" | tr '\n' ':')"

missing_dir="$temp_dir/tuicr-config-missing"
if PATH="$stripped_path" TUICR_CONFIG_DIR="$missing_dir" "$repo_dir/install-tuicr" \
  >"$temp_dir/missing.out" 2>"$temp_dir/missing.err"; then
  echo "expected install-tuicr to fail when tuicr is not installed" >&2
  exit 1
fi

grep -qF "https://tuicr.dev" "$temp_dir/missing.err"
[[ ! -e "$missing_dir/config.toml" ]]
