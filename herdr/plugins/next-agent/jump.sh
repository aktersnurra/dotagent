#!/usr/bin/env bash
# Focus the agent that most needs attention.
#
# Rank: blocked > done > idle. Agents that are `working` need no input, and the
# already-focused agent is skipped so repeated presses walk the queue instead of
# sticking on the current pane. Within a tier the oldest waiter wins (lowest
# state_change_seq), so pressing the key repeatedly drains the backlog in the
# order it built up.
set -euo pipefail

herdr="${HERDR_BIN_PATH:-herdr}"

"$herdr" agent list \
  | jq -r '
      [ .result.agents[]
        | select(.focused | not)
        | { pane_id,
            rank: ( { blocked: 0, done: 1, idle: 2 }[.agent_status] // empty ),
            seq: .state_change_seq }
      ]
      | sort_by(.rank, .seq)
      | first
      | .pane_id // empty
    ' \
  | grep . \
  | xargs -I{} "$herdr" agent focus {} \
  || "$herdr" notification show "No agent needs attention" --sound none
