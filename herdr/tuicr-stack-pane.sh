#!/usr/bin/env bash
# Pick a workspace and review its non-empty jj stack from master or main.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
caller="$(
	herdr pane current |
		jq -r '.result.pane | [.pane_id, .foreground_cwd] | @tsv'
)"
caller_pane="${caller%%$'\t'*}"
caller_cwd="${caller#*$'\t'}"
workspace="$("$script_dir/workspace-picker.sh" "$caller_cwd" "review change stack")"
[ -n "$workspace" ] || exit 0

cd "$workspace"
base=""
for candidate in master main; do
	if jj log -r "$candidate" --no-graph -T 'commit_id' >/dev/null 2>&1; then
		base="$candidate"
		break
	fi
done

if [ -z "$base" ]; then
	herdr notification show "tuicr" --body "No master or main bookmark" --sound none >/dev/null
	exit 1
fi

head="$(jj log -r 'latest(::@ & ~empty())' --no-graph -T 'commit_id')"
if [ -z "$head" ] || [ "$head" = "$(jj log -r "$base" --no-graph -T 'commit_id')" ]; then
	herdr notification show "tuicr" --body "No stack changes to review" --sound none >/dev/null
	exit 0
fi

pane_id="$(
	herdr pane split --pane "$caller_pane" --direction right --ratio 0.5 --cwd "$workspace" --no-focus |
		python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])'
)"
herdr pane run "$pane_id" tuicr --revisions "$base..$head" ';' exit >/dev/null
