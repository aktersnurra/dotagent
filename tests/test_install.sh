#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
dotfiles_dir="$temp_dir/dotfiles"
log_file="$temp_dir/install.log"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$dotfiles_dir"
cat >"$dotfiles_dir/install-claude" <<'EOF'
#!/usr/bin/env bash
printf 'claude|%s\n' "$*" >>"$INSTALL_LOG"
EOF
cat >"$dotfiles_dir/install-pi" <<'EOF'
#!/usr/bin/env bash
printf 'pi|%s\n' "$*" >>"$INSTALL_LOG"
EOF
chmod +x "$dotfiles_dir/install-claude" "$dotfiles_dir/install-pi"

DOTFILES="$dotfiles_dir" INSTALL_LOG="$log_file" \
  "$repo_dir/install" --pi-dir "$temp_dir/pi-work"

[[ "$(rg -Fxc 'claude|' "$log_file")" -eq 1 ]]
[[ "$(rg -Fxc "pi|--dir $temp_dir/pi-work" "$log_file")" -eq 1 ]]
