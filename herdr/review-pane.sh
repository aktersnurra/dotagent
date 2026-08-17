#!/usr/bin/env bash
# Open tuicr in a vertical split beside the current pane.
#
# `[[keys.command]] type = "pane"` only offers a temporary zoomed pane, so the
# split goes through the socket API instead: split first, then run tuicr in
# the new pane.
#
# Bound to prefix+d (see config.toml [[keys.command]]).
set -euo pipefail

# With nothing to review tuicr exits immediately and leaves an empty pane
# behind, so bail before splitting. tuicr exits non-zero either way, so ask
# the VCS rather than reading its exit status.
if [ -n "$(jj diff --summary 2>/dev/null)" ]; then
  :
elif [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  :
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
herdr pane run "$pane_id" tuicr --working-tree ';' exit >/dev/null
