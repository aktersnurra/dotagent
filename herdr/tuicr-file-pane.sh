#!/usr/bin/env bash
# Pick a workspace and one of its regular files, then review that file in tuicr.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
caller="$(
	herdr pane current |
		jq -r '.result.pane | [.pane_id, .foreground_cwd] | @tsv'
)"
caller_pane="${caller%%$'\t'*}"
caller_cwd="${caller#*$'\t'}"
workspace="$("$script_dir/workspace-picker.sh" "$caller_cwd" "review file in workspace")"
[ -n "$workspace" ] || exit 0

file="$(
	(
		cd "$workspace"
		find . -type f \
			! -path "./.jj/*" \
			! -path "./.git/*" \
			! -path "./node_modules/*" \
			-print |
			sed 's#^./##'
	) |
		fzf --prompt="  review file > " \
			--height=100% \
			--border=none \
			--color="fg+:#BAD7FF,prompt:#BAD7FF,pointer:#BAD7FF,hl:#90A959,hl+:#90A959" ||
		true
)"
[ -n "$file" ] || exit 0

pane_id="$(
	herdr pane split --pane "$caller_pane" --direction right --ratio 0.5 --cwd "$workspace" --no-focus |
		python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])'
)"
herdr pane run "$pane_id" tuicr --file "$file" ';' exit >/dev/null
herdr pane wait-output "$pane_id" --match "NORMAL" --source recent-unwrapped --timeout 10000 >/dev/null
herdr pane send-text "$pane_id" ":diff"
herdr pane send-keys "$pane_id" enter
