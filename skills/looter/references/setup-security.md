# Local state and archival security

## Paths

```sh
LOOTER_STATE="${XDG_STATE_HOME:-$HOME/.local/state}/looter"
LOOTER_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/looter"
LOOTER_KEY_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/looter/age/keys.txt"
```

`LOOTER_STATE` is the normal plaintext working store. `LOOTER_HOME` is the encrypted jj archive used only for explicit sync/push.

## Local plaintext state

Layout:

```text
$LOOTER_STATE/
├── briefs/
│   ├── index.json
│   └── <opaque-id>.md
├── runs/
│   └── <opaque-id>/
│       ├── manifest.json
│       └── result.md
├── latest.json
└── sync-state.json
```

Requirements:

- Set `umask 077`.
- Root and directories are mode `0700`; files are mode `0600`.
- Use UUID-based opaque brief/run IDs.
- Write through a same-directory temporary file, set mode `0600`, then atomically rename.
- `latest.json` maps briefs to their latest run.
- `sync-state.json` records dirty brief/run IDs and last successful pushed commit when known.
- Never place local state inside the encrypted archive or a project repository.

The user has explicitly accepted that this state is plaintext at rest. Permissions do not protect against device compromise, privileged access, backups, indexing or snapshots.

## First-use compatibility bootstrap

If the requested approved brief is absent locally but exists in the encrypted archive:

1. Check only `sops`, the device key and the requested encrypted containers.
2. Decrypt the matching brief and latest useful run once into local state.
3. Verify modes and atomic writes.
4. Continue on the hot path.

Bootstrap must not run jj status/log/sign, inspect remotes, re-encrypt, commit, push, render HTML or validate every archive container.

If the device cannot decrypt the requested brief, stop before web research and show only the public recipient when useful. Do not create a conflicting identity silently.

## Explicit sync/push gate

Enter this section only when the user clearly asks to sync or push Looter remotely. A normal search must never run these checks.

### Require an explicit remote first

- Use an existing explicitly configured remote, or ask for the exact remote URL.
- Never guess provider, host, organization, repository, username or remote.
- No remote means no encryption, jj setup, signing or commit work.

If the encrypted archive is absent, clone the exact supplied remote with `jj git clone`. If it exists, require `jj -R "$LOOTER_HOME" st` to succeed and verify the supplied/configured remote matches user intent before changing anything.

### Cold-path prerequisites

Check `jj`, `sops`, `rage`, `rage-keygen`, the device identity, `.sops.yaml`, recipient authorization and signing only now. Device key directory/file modes are `0700`/`0600`. Never print or commit the private identity.

If this device is not an authorized recipient, display only:

```sh
rage-keygen -y "$LOOTER_KEY_FILE"
```

and stop the sync.

### Batch dirty state

1. Snapshot dirty IDs from `sync-state.json`; exclude later writes from this transaction.
2. Convert each dirty Markdown/JSON artifact into an opaque binary-SOPS JSON container under `briefs/` or `runs/`.
3. Decrypt and byte-compare every newly written container once.
4. Scan the archive for committed plaintext and semantic path leakage.
5. Create one Conventional Commit for the entire snapshot.
6. Verify `self.signature().status()` is `good`.
7. Push to the explicit remote.
8. Mark the snapshot clean atomically only after push succeeds.

Use binary SOPS from `$LOOTER_HOME` so `.sops.yaml` is discovered:

```sh
SOPS_AGE_KEY_FILE="$LOOTER_KEY_FILE" sops encrypt \
  --input-type binary --output-type json \
  --filename-override "$output_path" \
  "$input_path" > "$output_path.tmp" && mv "$output_path.tmp" "$output_path"
```

A failed prerequisite, encryption, comparison, leakage, signing or push step stops only sync. Preserve the complete local dirty snapshot for an idempotent retry. Never mark individual items clean incrementally.

## Device onboarding and revocation

Recipient onboarding/removal is also cold-path work. A trusted authorized device updates `.sops.yaml`, rewraps every encrypted container, creates one signed commit and pushes. Never perform recipient rotation during research.
