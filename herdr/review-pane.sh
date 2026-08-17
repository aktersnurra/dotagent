#!/usr/bin/env bash
# Open tuicr in a vertical split beside the current pane.
#
# `[[keys.command]] type = "pane"` only offers a temporary zoomed pane, so the
# split goes through the socket API instead: split first, then run tuicr in
# the new pane.
#
# Bound to prefix+d (see config.toml [[keys.command]]).
set -euo pipefail

# Pick what to review. With nothing to review tuicr exits immediately and
# leaves an empty pane behind, so decide before splitting; tuicr exits
# non-zero either way, so ask the VCS rather than reading its exit status.
#
# A clean working copy is the common case under jj, where committing is
# constant and @ is often empty, so fall back to the nearest non-empty
# ancestor rather than reporting nothing to review. @- alone is not enough:
# it is itself empty after a plain `jj new`.
if [ -n "$(jj diff --summary 2>/dev/null)" ] \
  || [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  review_args=(--working-tree)
elif rev="$(jj log -r 'latest(::@ & ~empty())' --no-graph -T 'commit_id' 2>/dev/null)" \
  && [ -n "$rev" ]; then
  review_args=(-r "$rev")
else
  herdr notification show "tuicr" --body "No changes to review" --sound none >/dev/null
  exit 0
fi

pane_id="$(
  herdr pane split --current --direction right --ratio 0.5 --focus \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])'
)"

# `pane run` types the command into the pane's own shell, and that shell owns
# the pane. Chaining `exit` makes it leave when tuicr does, closing the pane;
# `pane.split` has no command or close-on-exit option to do this directly.
herdr pane run "$pane_id" tuicr "${review_args[@]}" ';' exit >/dev/null
