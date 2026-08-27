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
[[ "$(readlink "$herdr_dir/lazyjj.sh")" == "$repo_dir/herdr/lazyjj.sh" ]]
[[ "$(readlink "$herdr_dir/new-jj-workspace.sh")" == "$repo_dir/herdr/new-jj-workspace.sh" ]]
[[ "$(readlink "$herdr_dir/open-workspace.sh")" == "$repo_dir/herdr/open-workspace.sh" ]]
[[ "$(readlink "$herdr_dir/review-pane.sh")" == "$repo_dir/herdr/review-pane.sh" ]]
[[ "$(readlink "$herdr_dir/plugins/next-agent")" == "$repo_dir/herdr/plugins/next-agent" ]]

# Re-running is idempotent: the plugin symlink is replaced, not nested inside
# the existing link's target directory.
HERDR_CONFIG_DIR="$herdr_dir" "$repo_dir/install-herdr"
[[ "$(readlink "$herdr_dir/plugins/next-agent")" == "$repo_dir/herdr/plugins/next-agent" ]]
[[ ! -e "$repo_dir/herdr/plugins/next-agent/next-agent" ]]

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

# macOS notification warning. Run against a minimal PATH holding only a stub
# herdr, so terminal-notifier is definitively absent regardless of what the
# host has installed. `uname` must resolve too, hence /usr/bin and /bin.
shim_dir="$temp_dir/shim"
mkdir -p "$shim_dir"
printf '#!/usr/bin/env bash\nexit 0\n' >"$shim_dir/herdr"
chmod +x "$shim_dir/herdr"

notifier_dir="$temp_dir/herdr-config-notifier"
PATH="$shim_dir:/usr/bin:/bin" HERDR_CONFIG_DIR="$notifier_dir" \
	"$repo_dir/install-herdr" >"$temp_dir/notifier.out" 2>"$temp_dir/notifier.err"

if [[ "$(uname -s)" == "Darwin" ]]; then
	grep -qF "brew install terminal-notifier" "$temp_dir/notifier.err"
else
	# The warning is macOS-only; other platforms must stay quiet about it.
	! grep -qF "terminal-notifier" "$temp_dir/notifier.err"
fi

# The warning never blocks the install.
[[ "$(readlink "$notifier_dir/config.toml")" == "$repo_dir/herdr/config.toml" ]]
