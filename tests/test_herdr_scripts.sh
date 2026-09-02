#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"

cleanup() {
	rm -rf "$temp_dir"
}
trap cleanup EXIT

assert_contains() {
	local needle="$1"
	local file="$2"
	grep -qF "$needle" "$file" || {
		echo "expected $file to contain: $needle" >&2
		exit 1
	}
}

# A new workspace is created in the repo's .workspaces directory, with the
# feature name as a child directory rather than as a dot-separated suffix.
shim_dir="$temp_dir/shim"
mkdir -p "$shim_dir"
call_log="$temp_dir/calls.log"
repo_root="$temp_dir/dotagent"
mkdir -p "$repo_root"

cat >"$shim_dir/jj" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  root) printf '%s\n' "$JJ_ROOT" ;;
  workspace)
    workspace_path="${!#}"
    [ -d "$(dirname "$workspace_path")" ] || exit 1
    printf 'jj|%s\n' "$*" >>"$CALL_LOG"
    ;;
esac
EOF
cat >"$shim_dir/herdr" <<'EOF'
#!/usr/bin/env bash
printf 'herdr|%s\n' "$*" >>"$CALL_LOG"
EOF
chmod +x "$shim_dir/jj" "$shim_dir/herdr"

printf 'feature\ny\n' | (
	cd "$repo_root"
	PATH="$shim_dir:$PATH" JJ_ROOT="$repo_root" CALL_LOG="$call_log" TERM=xterm \
		"$repo_dir/herdr/new-jj-workspace.sh" >/dev/null
)

expected_path="$temp_dir/dotagent.workspaces/feature"
assert_contains "jj|workspace add --name feature $expected_path" "$call_log"
assert_contains "herdr|workspace create --cwd $expected_path --label dotagent.workspaces/feature --focus" "$call_log"

# Feature names must remain a single child of the .workspaces container.
if printf '../escape\n' | (
	cd "$repo_root"
	PATH="$shim_dir:$PATH" JJ_ROOT="$repo_root" CALL_LOG="$call_log" TERM=xterm \
		"$repo_dir/herdr/new-jj-workspace.sh" >/dev/null 2>"$temp_dir/invalid-feature.err"
); then
	echo "expected path-traversal feature name to fail" >&2
	exit 1
fi
assert_contains "Feature name must not contain path separators." "$temp_dir/invalid-feature.err"

# Creating another workspace from inside one reuses the base repo's shared
# .workspaces directory instead of nesting a second container beneath feature.
nested_root="$temp_dir/projects/dotagent.workspaces/feature"
mkdir -p "$nested_root/docs"
printf 'design\n' >"$nested_root/docs/ignored-design.md"
: >"$call_log"
printf 'second\ny\n' | (
	cd "$nested_root"
	PATH="$shim_dir:$PATH" JJ_ROOT="$nested_root" CALL_LOG="$call_log" TERM=xterm \
		"$repo_dir/herdr/new-jj-workspace.sh" >/dev/null
)
assert_contains "jj|workspace add --name second $temp_dir/projects/dotagent.workspaces/second" "$call_log"

# Existing workspaces beneath a .workspaces container are offered by prefix+o.
cat >"$shim_dir/fzf" <<'EOF'
#!/usr/bin/env bash
awk '/dotagent\.workspaces\/feature$/ { print; exit }'
EOF
chmod +x "$shim_dir/fzf"
: >"$call_log"
HOME="$temp_dir" PATH="$shim_dir:$PATH" CALL_LOG="$call_log" \
	"$repo_dir/herdr/open-workspace.sh" >/dev/null
assert_contains "herdr|workspace create --cwd $nested_root --label feature --focus" "$call_log"

# The prefix+g binding uses the wrapper so it can explain why lazyjj cannot
# open, rather than directly invoking lazyjj and immediately closing.
prefix_g_command="$(awk '
  /key = "prefix\+g"/ { found=1 }
  found && /command = / { print; exit }
' "$repo_dir/herdr/config.toml")"
[[ "$prefix_g_command" == 'command = "~/.config/herdr/lazyjj.sh"' ]]

# The wrapper leaves a clear, visible explanation open outside a jj repository.
cat >"$shim_dir/jj" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$shim_dir/jj"

non_repo="$temp_dir/not-a-repo"
mkdir -p "$non_repo"
input_fifo="$temp_dir/lazyjj.in"
mkfifo "$input_fifo"
PATH="$shim_dir:$PATH" "$repo_dir/herdr/lazyjj.sh" <"$input_fifo" >"$temp_dir/lazyjj.out" &
lazyjj_pid=$!
sleep 0.1
kill -0 "$lazyjj_pid"
printf x >"$input_fifo"
wait "$lazyjj_pid"
assert_contains "Not a Jujutsu repository. Press any key to close..." "$temp_dir/lazyjj.out"

# The picker uses jj's workspace registry for the caller's repository rather
# than scanning unrelated .workspaces directories.
cat >"$shim_dir/jj" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"workspace list"* ]]; then
  printf '%s\n' "$PICKED_WORKSPACE"
fi
EOF
cat >"$shim_dir/fzf" <<'EOF'
#!/usr/bin/env bash
cat >"$FZF_INPUT"
printf '%s\n' "$PICKED_WORKSPACE"
EOF
chmod +x "$shim_dir/jj" "$shim_dir/fzf"
PATH="$shim_dir:$PATH" PICKED_WORKSPACE="$nested_root" \
	FZF_INPUT="$temp_dir/workspace-candidates" \
	"$repo_dir/herdr/workspace-picker.sh" "$repo_root" >/dev/null
assert_contains "$nested_root" "$temp_dir/workspace-candidates"

# prefix+f picks a jj workspace, then one of its tracked files, and opens that
# file in a tuicr split rooted at the selected workspace.
cat >"$shim_dir/jj" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"workspace list"* ]]; then
  printf '%s\n' "$PICKED_WORKSPACE"
elif [[ "$1 $2" == "file list" ]]; then
  exit 97
fi
EOF
cat >"$shim_dir/herdr" <<'EOF'
#!/usr/bin/env bash
printf 'herdr|%s\n' "$*" >>"$CALL_LOG"
if [[ "$1 $2" == "pane current" ]]; then
  printf '{"result":{"pane":{"pane_id":"test-origin","foreground_cwd":"%s"}}}\n' "$SOURCE_CWD"
elif [[ "$1 $2" == "pane split" ]]; then
  printf '{"result":{"pane":{"pane_id":"test-pane"}}}\n'
fi
EOF
cat >"$shim_dir/fzf" <<'EOF'
#!/usr/bin/env bash
count_file="$FZF_COUNT_FILE"
count=0
[ -f "$count_file" ] && count="$(cat "$count_file")"
count=$((count + 1))
printf '%s' "$count" >"$count_file"
if [ "$count" -eq 1 ]; then
  printf '%s\n' "$PICKED_WORKSPACE"
else
  cat >"$FILE_CANDIDATES"
  grep -qx 'docs/ignored-design.md' "$FILE_CANDIDATES" || exit 2
  printf 'docs/ignored-design.md\n'
fi
EOF
chmod +x "$shim_dir/jj" "$shim_dir/herdr" "$shim_dir/fzf"
: >"$call_log"
HOME="$temp_dir" PATH="$shim_dir:$PATH" CALL_LOG="$call_log" \
	SOURCE_CWD="$repo_root" PICKED_WORKSPACE="$nested_root" FZF_COUNT_FILE="$temp_dir/fzf-count" \
	FILE_CANDIDATES="$temp_dir/file-candidates" \
	"$repo_dir/herdr/tuicr-file-pane.sh" >/dev/null
assert_contains "herdr|pane current" "$call_log"
assert_contains "herdr|pane split --pane test-origin --direction right --ratio 0.5 --cwd $nested_root --no-focus" "$call_log"
assert_contains "herdr|pane run test-pane tuicr --file docs/ignored-design.md ; exit" "$call_log"
assert_contains "herdr|pane wait-output test-pane --match NORMAL --source recent-unwrapped --timeout 10000" "$call_log"
assert_contains "herdr|pane send-text test-pane :diff" "$call_log"
assert_contains "herdr|pane send-keys test-pane enter" "$call_log"

# prefix+s uses master when available and reviews the selected workspace's
# non-empty stack relative to that base bookmark.
cat >"$shim_dir/jj" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"workspace list"* ]]; then
  printf '%s\n' "$PICKED_WORKSPACE"
elif [[ "$1" == log ]]; then
  if [[ "$*" == *master* ]]; then printf 'master-id\n'; else printf 'head-id\n'; fi
fi
EOF
cat >"$shim_dir/fzf" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$PICKED_WORKSPACE"
EOF
chmod +x "$shim_dir/jj" "$shim_dir/fzf"
: >"$call_log"
HOME="$temp_dir" PATH="$shim_dir:$PATH" CALL_LOG="$call_log" \
	SOURCE_CWD="$repo_root" PICKED_WORKSPACE="$nested_root" \
	"$repo_dir/herdr/tuicr-stack-pane.sh" >/dev/null
assert_contains "herdr|pane current" "$call_log"
assert_contains "herdr|pane split --pane test-origin --direction right --ratio 0.5 --cwd $nested_root --no-focus" "$call_log"
assert_contains "herdr|pane run test-pane tuicr --revisions master..head-id ; exit" "$call_log"

prefix_f_type="$(awk '
  /key = "prefix\+f"/ { found=1 }
  found && /type = / { print; exit }
' "$repo_dir/herdr/config.toml")"
[[ "$prefix_f_type" == 'type = "popup"' ]]
prefix_f_command="$(awk '
  /key = "prefix\+f"/ { found=1 }
  found && /command = / { print; exit }
' "$repo_dir/herdr/config.toml")"
[[ "$prefix_f_command" == 'command = "~/.config/herdr/tuicr-file-pane.sh"' ]]

prefix_s_type="$(awk '
  /key = "prefix\+s"/ { found=1 }
  found && /type = / { print; exit }
' "$repo_dir/herdr/config.toml")"
[[ "$prefix_s_type" == 'type = "popup"' ]]
prefix_s_command="$(awk '
  /key = "prefix\+s"/ { found=1 }
  found && /command = / { print; exit }
' "$repo_dir/herdr/config.toml")"
[[ "$prefix_s_command" == 'command = "~/.config/herdr/tuicr-stack-pane.sh"' ]]
