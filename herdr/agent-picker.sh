#!/usr/bin/env bash
# Pick an agent with fzf and focus it.
#
# Bound to prefix+a (see config.toml [[keys.command]]).
#
# Complements prefix+u (the next-agent plugin). That key drains the attention
# queue oldest-first without showing it; this one shows the whole roster so a
# specific agent can be picked out of the middle of it.
set -euo pipefail

# Colors matching the no-clown-fiesta config theme.
c_dim=$'\e[38;2;114;114;114m' # medium_gray
c_red=$'\e[38;2;180;105;88m'
c_green=$'\e[38;2;144;169;89m'
c_yellow=$'\e[38;2;244;191;117m'
c_reset=$'\e[0m'

pause() { read -r -p "${c_dim}Press enter to close...${c_reset}" _; }
fail() { echo "${c_red}${1}${c_reset}" >&2; pause; exit 1; }

herdr="${HERDR_BIN_PATH:-herdr}"

command -v fzf >/dev/null 2>&1 || fail "  fzf is not installed."
command -v jq >/dev/null 2>&1 || fail "  jq is not installed."

# Ranked by the same tiers as the next-agent plugin: blocked, done, idle, then
# working. fzf draws its list bottom-up, so that emission order renders with the
# stale agents at the top of the popup and the blocked ones at the bottom, next
# to the prompt where the cursor already sits.
#
# The focused agent is kept in the list, unlike in jump.sh, and marked instead.
# A picker that silently omits a row makes the roster harder to read, and
# picking the current agent is a harmless no-op.
#
# Three tab-separated fields: the pane id for the focus call, the visible row,
# and a trailing field holding the status and agent kind. Only the middle one is
# shown (--with-nth=2), while --nth widens matching to the trailing field, so
# typing "blocked" or "opencode" still filters on text that is not on screen.
# awk pads the visible field so the workspace column stays aligned, and moves
# the agent kind into that trailing field: at this width the title earns the
# columns more than a repeated "opencode" does, and both stay typeable.
#
# --no-sort keeps the rank order from the sort above instead of letting fzf
# reorder by match score, so the bottom-up layout keeps the agent most needing
# attention under the cursor. `grep .` turns an empty roster into a non-zero
# exit that pipefail surfaces, so the whole thing stays one pipe.
selected="$(
  "$herdr" agent list \
    | jq -r \
        --arg red "$c_red" \
        --arg green "$c_green" \
        --arg yellow "$c_yellow" \
        --arg dim "$c_dim" \
        --arg reset "$c_reset" \
        '
        [ .result.agents[]
          | { pane_id,
              # Descending urgency: blocked agents are the reason the picker was
              # opened, working ones need nothing. This is emission order, which
              # fzf then draws bottom-up (see the --no-sort note in the header),
              # landing the urgent end at the cursor.
              rank: ( { blocked: 0, done: 1, idle: 2, working: 3 }[.agent_status] // 3 ),
              seq: .state_change_seq,
              icon: ( { blocked: "!", done: "+", idle: "·", working: "*" }[.agent_status] // "?" ),
              # Truecolor escapes from the no-clown-fiesta palette, matching the
              # semantics the theme block already uses: red demands attention,
              # green is finished, yellow is in flight, gray is resting.
              color: ( { blocked: $red, done: $green, idle: $dim, working: $yellow }[.agent_status] // $dim ),
              status: .agent_status,
              agent: .agent,
              # cwd is absolute and often deep; the basename is what identifies
              # the workspace at a glance.
              # Clipped to the awk column width below: a long workspace name
              # would otherwise push its own title out of alignment with the
              # rest of the column.
              where: ( .cwd | sub("/$"; "") | split("/") | last
                       | if length > 16 then .[0:15] + "…" else . end ),
              # Agents prefix their own title ("OC | ...", "π - ..."). The kind
              # is already in the hidden match field, so the prefix is stripped
              # to buy back columns for the part of the title that differs.
              # An agent with no task names itself after its directory, which
              # the workspace column already shows; blanking that repeat keeps
              # the eye on the rows that actually say something.
              title: ( ( .terminal_title_stripped | sub("^(OC \\| |π - )"; "") ) as $t
                       | ( .cwd | sub("/$"; "") | split("/") | last ) as $base
                       | if $t == $base then "" else $t end ),
              focused: .focused }
        ]
        # Emission order, not display order: fzf draws this list bottom-up, so
        # the LAST line emitted is the one at the top of the popup and the first
        # is at the cursor. Sorting urgent-first therefore renders as stale at
        # the top and blocked at the prompt. Within a tier the newest state
        # change is emitted first so it also ends up nearest the cursor.
        | sort_by(.rank, -.seq)
        | .[]
        # The icon already encodes the status, so the spelled-out word is
        # dropped: it is the widest column and buys nothing the glyph lacks.
        # Status still matches on typing, via the hidden field below.
        # The color escape rides in its own field rather than being glued to the
        # icon: awk pads by byte count, so an escape inside a padded field would
        # throw the column widths off by the length of the escape.
        | [ .pane_id,
            .color,
            ( .icon + ( if .focused then "•" else " " end ) ),
            .agent,
            .where,
            .title,
            .status
          ]
        | @tsv
      ' \
    | grep . \
    | awk -F'\t' -v reset="$c_reset" \
        '{ row = sprintf("%-2s %-16s %s", $3, $5, $6)
           sub(/ +$/, "", row)
           printf "%s\t%s%s%s\t%s %s\n", $1, $2, row, reset, $7, $4 }' \
    | fzf --prompt="  focus agent > " \
          --ansi \
          --no-sort \
          --info=hidden \
          --delimiter='\t' \
          --with-nth=2 \
          --nth=2,3 \
          --height=100% \
          --border=none \
          --color="fg+:#BAD7FF,prompt:#BAD7FF,pointer:#BAD7FF,hl:#90A959,hl+:#90A959"
)" && status=0 || status=$?

# fzf exits 130 on esc/ctrl-c and 1 when nothing matched: both mean "no pick",
# not a failure. Anything else is the roster pipeline itself breaking, which is
# worth a message rather than a silent close.
case "${status:-0}" in
  0) ;;
  1 | 130) exit 0 ;;
  *) fail "  Could not list agents." ;;
esac

[ -n "$selected" ] || exit 0

pane_id="${selected%%$'\t'*}"
[ -n "$pane_id" ] || fail "  Could not read a pane id from the selection."

"$herdr" agent focus "$pane_id" >/dev/null || fail "  herdr agent focus failed."
