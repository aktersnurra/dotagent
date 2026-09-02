#!/usr/bin/env bash
# Print an fzf-selected jj workspace belonging to the supplied repository.
set -euo pipefail

repository="${1:?usage: workspace-picker.sh REPOSITORY [PROMPT]}"
prompt="${2:-workspace}"

command -v fzf >/dev/null 2>&1 || {
	echo "fzf is not installed." >&2
	exit 1
}

selected="$(
	jj -R "$repository" workspace list -T 'self.root() ++ "\n"' |
		fzf --prompt="  ${prompt} > " \
			--height=100% \
			--border=none \
			--color="fg+:#BAD7FF,prompt:#BAD7FF,pointer:#BAD7FF,hl:#90A959,hl+:#90A959" ||
		true
)"

[ -n "$selected" ] || exit 0
[ -d "$selected" ] || {
	echo "Not a directory: $selected" >&2
	exit 1
}
printf '%s\n' "$selected"
