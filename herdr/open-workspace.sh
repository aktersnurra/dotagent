#!/usr/bin/env bash
# Pick a repo or jj workspace with fzf and open it as a herdr workspace.
#
# Bound to prefix+o (see config.toml [[keys.command]]).
set -euo pipefail

# Colors matching the no-clown-fiesta config theme.
c_dim=$'\e[38;2;114;114;114m' # medium_gray
c_red=$'\e[38;2;180;105;88m'
c_reset=$'\e[0m'

pause() { read -r -p "${c_dim}Press enter to close...${c_reset}" _; }
fail() { echo "${c_red}${1}${c_reset}" >&2; pause; exit 1; }

# Candidate roots. ~/projects keeps repos flat at depth 1, while ~/work nests
# them a few levels down, so each root is scanned on its own terms rather than
# with one shared depth.
FLAT_ROOTS=("$HOME/projects")
NESTED_ROOTS=("$HOME/work")

# Emit one absolute path per line. Kept separate from the picker so switching
# to another fuzzy finder stays a one-line change.
candidates() {
  # Skips dotfile dirs, and the .workspaces container itself: the container
  # holds workspaces but is not one, while <repo>.workspaces.<feature> is.
  for root in "${FLAT_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    find "$root" -mindepth 1 -maxdepth 1 -type d \
      ! -name '.*' ! -name '*.workspaces'
  done

  # A repo is anything holding .git or .jj; -prune stops the walk from
  # descending into the repo's own internals.
  for root in "${NESTED_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    find "$root" -maxdepth 4 -type d \( -name .git -o -name .jj \) -prune \
      -exec dirname {} \;
  done
}

command -v fzf >/dev/null 2>&1 || fail "  fzf is not installed."

selected="$(
  candidates \
    | sort -u \
    | sed "s|^$HOME|~|" \
    | fzf --prompt="  open workspace > " \
          --height=100% \
          --border=none \
          --color="fg+:#BAD7FF,prompt:#BAD7FF,pointer:#BAD7FF,hl:#90A959,hl+:#90A959" \
    || true
)"

# Empty when fzf is cancelled with esc or ctrl-c.
[ -n "$selected" ] || exit 0

ws_path="${selected/#\~/$HOME}"
[ -d "$ws_path" ] || fail "  Not a directory: ${ws_path}"

herdr workspace create --cwd "$ws_path" --label "$(basename "$ws_path")" --focus >/dev/null \
  || fail "  herdr workspace create failed."
