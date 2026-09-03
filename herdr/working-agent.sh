#!/usr/bin/env bash
# Focus the previous or next Herdr agent currently in the working state.
set -euo pipefail

direction="${1:-}"
case "$direction" in
	previous | next) ;;
	*)
		echo "usage: working-agent.sh previous|next" >&2
		exit 2
		;;
esac

herdr="${HERDR_BIN_PATH:-herdr}"
selection="$(
	"$herdr" agent list |
		jq -r --arg direction "$direction" '
			[ .result.agents[]
			  | select(.agent_status == "working")
			  | { pane_id, focused, sequence: .state_change_seq }
			]
			| sort_by(.sequence) as $agents
			| ($agents | length) as $count
			| if $count == 0 then "none"
			  elif $count == 1 then "one"
			  else
			    ($agents | map(.focused) | index(true)) as $focused
			    | (if $focused == null then
			         if $direction == "next" then 0 else $count - 1 end
			       else
			         ($focused + (if $direction == "next" then 1 else -1 end) + $count) % $count
			       end) as $index
			    | "focus\t" + $agents[$index].pane_id
			  end
		'
)"

case "$selection" in
	none) "$herdr" notification show "No working agents" --sound none ;;
	one) "$herdr" notification show "Only one working agent" --sound none ;;
	focus$'\t'*) "$herdr" agent focus "${selection#*$'\t'}" ;;
	*)
		echo "could not select a working agent" >&2
		exit 1
		;;
esac
