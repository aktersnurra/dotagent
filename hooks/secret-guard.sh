#!/usr/bin/env bash
# Blocks tool calls that reference secret paths or dump the process environment.
# Reads Claude Code hook JSON from stdin.
# Exit 0 = allow, exit 2 = block (with JSON reason emitted to stdout).

set -euo pipefail

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

deny() {
  local reason="$1"
  printf '{"decision":"block","reason":"%s"}' "$reason"
  exit 2
}

# Secret path segments — matched only against tokens that look like paths
SECRET_PATH_SEGS=(
  '\.ssh'
  '\.gnupg'
  '\.gpg'
  '\.aws'
  '\.netrc'
  '\.pgpass'
  'config/gh'
  'config/gcloud'
  'config/op'
  '\.password-store'
  '\.vault-token'
  '/etc/shadow'
  '/etc/sudoers'
)

# Key file name patterns — matched against tokens that look like filenames
SECRET_FILE_PATS=(
  '^id_rsa$'
  '^id_ed25519$'
  '^id_ecdsa$'
  '^id_dsa$'
  '\.pem$'
  '\.p12$'
  '\.pfx$'
)

# Commands that dump the full environment wholesale (bare, no args)
ENV_DUMP_CMDS=(
  '^[[:space:]]*(printenv|env)[[:space:]]*$'
  '^[[:space:]]*export[[:space:]]*$'
  '^[[:space:]]*set[[:space:]]*$'
  'process\.env\b'
)

# Extract path-like tokens from a command string.
# A path token starts with /, ~, ./, or ../ — excludes flag values and message strings.
extract_path_tokens() {
  local cmd="$1"
  # Strip everything after -m / --message (commit messages contain arbitrary text)
  cmd=$(echo "$cmd" | sed 's/[[:space:]]-m[[:space:]].*//; s/[[:space:]]--message[[:space:]].*//')
  # Extract tokens that look like paths
  echo "$cmd" | grep -oE '(~|\.\.?)?/[^[:space:]"'"'"']+' || true
  echo "$cmd" | grep -oE '~/[^[:space:]"'"'"']+' || true
}

if [[ "$TOOL" == "Bash" ]]; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

  # Check for bare environment dump commands (whole-command match)
  for pat in "${ENV_DUMP_CMDS[@]}"; do
    if echo "$CMD" | grep -qE "$pat"; then
      deny "Blocked: command may dump process environment"
    fi
  done

  # Check path-like tokens for secret path segments
  PATH_TOKENS=$(extract_path_tokens "$CMD")
  if [[ -n "$PATH_TOKENS" ]]; then
    for pat in "${SECRET_PATH_SEGS[@]}"; do
      if echo "$PATH_TOKENS" | grep -qiE "$pat"; then
        deny "Blocked: command references a secret path ($pat)"
      fi
    done
    for pat in "${SECRET_FILE_PATS[@]}"; do
      if echo "$PATH_TOKENS" | grep -qiE "$pat"; then
        deny "Blocked: command references a secret key file ($pat)"
      fi
    done
  fi

  # Block reading .env files via common reader commands
  if echo "$CMD" | grep -qE '(^|[|;[:space:]])(cat|less|head|tail|bat|sed|awk|grep)[[:space:]]+[^|;]*\.env([[:space:]]|$)'; then
    deny "Blocked: command reads a .env file"
  fi
fi

if [[ "$TOOL" == "Read" ]]; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
  FILE_EXPANDED="${FILE/\~/$HOME}"

  for pat in "${SECRET_PATH_SEGS[@]}"; do
    if echo "$FILE_EXPANDED" | grep -qiE "$pat"; then
      deny "Blocked: Read references a secret path ($pat)"
    fi
  done
  for pat in "${SECRET_FILE_PATS[@]}"; do
    if echo "$FILE_EXPANDED" | grep -qiE "$pat"; then
      deny "Blocked: Read references a secret key file ($pat)"
    fi
  done

  if echo "$FILE_EXPANDED" | grep -qE '(^|/)\.env(\.|$)'; then
    deny "Blocked: Read targets a .env file"
  fi
fi

exit 0
