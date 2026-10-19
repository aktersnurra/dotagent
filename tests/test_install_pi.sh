#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
bin_dir="$temp_dir/bin"
pi_dir="$temp_dir/pi-work"
collision_pi_dir="$temp_dir/pi-collision"
pi_log="$temp_dir/pi.log"

cleanup() {
	rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$bin_dir"
cat >"$bin_dir/pi" <<'EOF'
#!/usr/bin/env bash
printf '%s|%s\n' "${PI_CODING_AGENT_DIR:-}" "$*" >>"$PI_LOG"
EOF
chmod +x "$bin_dir/pi"
cat >"$bin_dir/npm" <<'EOF'
#!/usr/bin/env bash
printf '%s|npm %s\n' "${PI_CODING_AGENT_DIR:-}" "$*" >>"$PI_LOG"
EOF
chmod +x "$bin_dir/npm"

mkdir -p "$pi_dir"
cat >"$pi_dir/settings.json" <<'EOF'
{
  "packages": [
    "npm:pi-ask-user"
  ]
}
EOF
cat >"$pi_dir/skill-visibility.json" <<'EOF'
{
  "version": 1,
  "overrides": {
    "/skills/wiki/SKILL.md": "startup"
  }
}
EOF
cp "$pi_dir/skill-visibility.json" "$temp_dir/skill-visibility.expected.json"

HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
	"$repo_dir/install-pi" --dir "$pi_dir" --provider github-copilot

[[ -L "$pi_dir/AGENTS.md" ]]
actual_agents_link="$(readlink "$pi_dir/AGENTS.md")"
if [[ "$actual_agents_link" != "$repo_dir/AGENTS.md" ]]; then
	printf 'AGENTS.md link mismatch: got %s, expected %s\n' \
		"$actual_agents_link" "$repo_dir/AGENTS.md" >&2
	exit 1
fi
[[ -L "$pi_dir/skills/jj" ]]
[[ -L "$pi_dir/extensions/pi-exec-guard" ]]
expected_guard_link="$repo_dir/pi/extensions/pi-exec-guard"
[[ "$(readlink "$pi_dir/extensions/pi-exec-guard")" == "$expected_guard_link" ]]
rg -qF "$pi_dir|npm ci --prefix $expected_guard_link --omit=dev --omit=peer --ignore-scripts --no-audit --no-fund" "$pi_log"
[[ -L "$pi_dir/extensions/pi-skill-visibility" ]]
actual_extension_link="$(readlink "$pi_dir/extensions/pi-skill-visibility")"
expected_extension_link="$repo_dir/pi/extensions/pi-skill-visibility"
if [[ "$actual_extension_link" != "$expected_extension_link" ]]; then
  printf 'extension link mismatch: got %s, expected %s\n' \
    "$actual_extension_link" "$expected_extension_link" >&2
  exit 1
fi

HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
  "$repo_dir/install-pi" --dir "$pi_dir" --provider github-copilot
[[ "$(readlink "$pi_dir/extensions/pi-skill-visibility")" == "$expected_extension_link" ]]
cmp "$temp_dir/skill-visibility.expected.json" "$pi_dir/skill-visibility.json"
[[ "$(readlink "$pi_dir/extensions/pi-exec-guard")" == "$expected_guard_link" ]]
! rg -q 'PI_EXEC_GUARD|OPENROUTER_API_KEY' "$pi_dir/settings.json"

for collision in directory symlink; do
  guard_collision_dir="$temp_dir/guard-$collision"
  mkdir -p "$guard_collision_dir/extensions"
  if [[ "$collision" == directory ]]; then
    mkdir "$guard_collision_dir/extensions/pi-exec-guard"
  else
    ln -s /unrelated/extension "$guard_collision_dir/extensions/pi-exec-guard"
  fi
  if HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
    "$repo_dir/install-pi" --dir "$guard_collision_dir" >"$temp_dir/collision.log" 2>&1; then
    echo "install-pi replaced an unrelated guard $collision" >&2
    exit 1
  fi
  rg -q 'Refusing to replace' "$temp_dir/collision.log"
done

mkdir -p "$collision_pi_dir/extensions/pi-skill-visibility"
if HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
  "$repo_dir/install-pi" --dir "$collision_pi_dir" >/dev/null 2>&1; then
  echo "install-pi replaced an unrelated extension directory" >&2
  exit 1
fi

[[ -f "$pi_dir/settings.json" ]]
[[ "$(jq -r '.defaultProvider' "$pi_dir/settings.json")" == "github-copilot" ]]
[[ "$(jq -r '.defaultModel' "$pi_dir/settings.json")" == "$(jq -r '.defaultModel' "$repo_dir/pi.settings.json")" ]]
[[ "$(jq -r '.defaultThinkingLevel' "$pi_dir/settings.json")" == "$(jq -r '.defaultThinkingLevel' "$repo_dir/pi.settings.json")" ]]
jq -e '.packages | any(type == "object" and .source == "npm:pi-ask-user" and .skills == [])' \
  "$pi_dir/settings.json" >/dev/null
jq -e '.packages | all(. != "npm:pi-ask-user")' "$pi_dir/settings.json" >/dev/null
[[ "$(wc -l <"$pi_log" | tr -d ' ')" -gt 0 ]]
rg -qF "$pi_dir|install npm:pi-web-access" "$pi_log"
[[ "$(rg -vF "$pi_dir|" "$pi_log" || true)" == "" ]]
