#!/usr/bin/env bash
# Open lazyjj, or explain why it cannot open from the current directory.
# Bound to prefix+g (see config.toml).
set -euo pipefail

if ! jj root >/dev/null 2>&1; then
	printf 'Not a Jujutsu repository. Press any key to close...'
	read -r -n 1 -s _ || true
	printf '\n'
	exit 0
fi

exec lazyjj
