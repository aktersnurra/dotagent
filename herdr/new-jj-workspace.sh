#!/usr/bin/env bash
# Create a jj workspace as a sibling directory named
# <repo-name>.workspaces.<feature>, then open it as its own herdr workspace.
#
# Bound to prefix+shift+g (see config.toml [[keys.command]]).
set -euo pipefail

# Colors matching the no-clown-fiesta config theme.
c_accent=$'\e[38;2;186;215;255m' # blue
c_dim=$'\e[38;2;114;114;114m'    # medium_gray
c_green=$'\e[38;2;144;169;89m'
c_red=$'\e[38;2;180;105;88m'
c_reset=$'\e[0m'
c_bold=$'\e[1m'

pause() { read -r -p "${c_dim}Press enter to close...${c_reset}" _; }
fail() { echo "${c_red}${1}${c_reset}" >&2; pause; exit 1; }

clear
echo "${c_bold}${c_accent}  New jj workspace${c_reset}"
echo "${c_dim}  ─────────────────────────────────────────${c_reset}"
echo

jj_root="$(jj root 2>/dev/null)" || fail "  Not inside a jj repo."

current_name="$(basename "$jj_root")"
parent_dir="$(dirname "$jj_root")"

# If we're already inside a <repo>.workspaces.<feature> checkout, strip
# back to the base repo name instead of nesting another .workspaces.* dir.
if [[ "$current_name" == *.workspaces.* ]]; then
  repo_name="${current_name%%.workspaces.*}"
  echo "  ${c_dim}already in a workspace, using base repo:${c_reset} ${repo_name}"
else
  repo_name="$current_name"
  echo "  ${c_dim}repo:${c_reset} ${repo_name}"
fi
echo
read -r -p "  ${c_bold}Feature name:${c_reset} " feature
[ -n "$feature" ] || fail "  No feature name given, aborting."

ws_name="${repo_name}.workspaces.${feature}"
ws_path="${parent_dir}/${ws_name}"

echo
echo "  ${c_dim}will create:${c_reset}"
echo "    ${c_accent}${ws_path}${c_reset}"
echo

[ -e "$ws_path" ] && fail "  Path already exists: ${ws_path}"

read -r -p "  Create and open? [Y/n] " confirm
case "$confirm" in
  ""|y|Y) ;;
  *) echo "  ${c_dim}Cancelled.${c_reset}"; pause; exit 0 ;;
esac

echo
jj workspace add --name "$feature" "$ws_path" \
  || fail "  jj workspace add failed."

herdr workspace create --cwd "$ws_path" --label "$ws_name" --focus >/dev/null \
  || fail "  herdr workspace create failed."

echo "  ${c_green}✓ workspace created and opened${c_reset}"
sleep 1
