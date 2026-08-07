#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
bin_dir="$temp_dir/bin"
pi_dir="$temp_dir/pi-work"
home_dir="$temp_dir/home"

cleanup() {
	rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$bin_dir"
cat >"$bin_dir/pi" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$bin_dir/claude" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$bin_dir/pi" "$bin_dir/claude"

HOME="$home_dir" PATH="$bin_dir:$PATH" \
	"$repo_dir/install-pi" --dir "$pi_dir" --provider github-copilot

for command in "$repo_dir"/commands/*.md; do
	name="$(basename "$command")"
	link="$pi_dir/prompts/$name"
	actual_link="$(readlink "$link" 2>/dev/null || true)"
	[[ "$actual_link" == "$command" ]]
done

HOME="$home_dir" PATH="$bin_dir:$PATH" "$repo_dir/install-claude"

for command in "$repo_dir"/commands/*.md; do
	name="$(basename "$command")"
	link="$home_dir/.claude/commands/$name"
	actual_link="$(readlink "$link" 2>/dev/null || true)"
	[[ "$actual_link" == "$command" ]]
done
