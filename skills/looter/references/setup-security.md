# Setup and security

## Resolve paths and prerequisites

Resolve paths without hard-coded users or hosts:

```sh
LOOTER_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/looter"
LOOTER_KEY_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/looter/age/keys.txt"
PI_HOME="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
```

Private committed data belongs only under `$LOOTER_HOME/briefs` and `$LOOTER_HOME/runs` as `*.sops.json`. Plaintext belongs only in a protected runtime directory.

Before setup or a run, verify:

```sh
command -v jj
command -v sops
command -v rage
command -v rage-keygen
command -v pandoc
```

Resolve `pire-browser` from `PATH`, then `$PI_HOME/npm/node_modules/.bin/pire-browser`, and require it to drive Firefox or LibreWolf. If anything is missing, stop and name it; never install automatically.

## Missing workspace: exactly two choices

If `$LOOTER_HOME` exists, require `jj -R "$LOOTER_HOME" st` to succeed.

If it is absent, ask exactly one structured question with only these choices:

1. **Clone existing** — ask for the remote URL in the next user message, assign that exact response to `REMOTE_URL`, then run `jj git clone "$REMOTE_URL" "$LOOTER_HOME"`.
2. **Create new** — create a fresh signed colocated jj/Git workspace at `$LOOTER_HOME`.

Never guess or persist a provider, host, organization, username, or remote URL.

### After cloning

Verify `.sops.yaml` exists; committed private paths contain only `*.sops.json`; and every non-root commit is signed. Set `SOPS_AGE_KEY_FILE="$LOOTER_KEY_FILE"` and try decrypting `briefs/index.sops.json`. If this device is not a recipient, show only its public recipient and stop before any web or model call.

### Creating a workspace

Initialize a colocated jj/Git repository with normal signing enabled. Create or reuse the per-device identity as described below. Create a generic README, a plaintext-blocking `.gitignore`, `.sops.yaml`, and an encrypted empty brief index. Its SOPS creation rule must use the compatible expression:

```yaml
path_regex: ^(briefs|runs)/.*\.sops\.json$
```

Describe and sign the initial commit, then require `self.signature().status()` to be `good`.

## Device identity and recipients

Use one rage X25519 identity per device at `$LOOTER_KEY_FILE`. Obtain consent before creating or reusing it. The containing directory is mode `0700`; the identity is mode `0600`. Never print or commit a private identity. If no key exists, offer generation with `rage-keygen`; never overwrite one. Display only the result of:

```sh
rage-keygen -y "$LOOTER_KEY_FILE"
```

A trusted existing device adds the new public recipient to `.sops.yaml`, updates every encrypted container, signs a commit, and pushes. Removing a device removes that recipient, rewraps every container, and signs a commit. Use a portable explicit loop:

```sh
find briefs runs -type f -name '*.sops.json' -print |
while IFS= read -r container; do
  SOPS_AGE_KEY_FILE="$LOOTER_KEY_FILE" \
    sops updatekeys -y "$container" || exit 1
done
```

## Binary SOPS containers

Run encryption from `$LOOTER_HOME` so `.sops.yaml` is discovered:

```sh
encrypt_binary() {
  input_path="$1"
  output_path="$2"
  SOPS_AGE_KEY_FILE="$LOOTER_KEY_FILE" sops encrypt \
    --input-type binary --output-type json \
    --filename-override "$output_path" \
    "$input_path" > "$output_path.tmp" &&
    mv "$output_path.tmp" "$output_path"
}

decrypt_binary() {
  input_path="$1"
  output_path="$2"
  SOPS_AGE_KEY_FILE="$LOOTER_KEY_FILE" sops decrypt \
    --input-type json --output-type binary \
    "$input_path" > "$output_path"
}
```

Generate one UUID at runtime. Use opaque brief IDs `b-$UUID` and run IDs `r-$UUID`; human titles and dates live only inside encrypted indexes and provenance.

## Runtime plaintext

Set `umask 077`. Create a new mode-`0700` root per operation beneath `$XDG_RUNTIME_DIR` when available; otherwise use secure `mktemp` beneath `${TMPDIR:-/tmp}`. Put decrypted briefs and all researcher, synthesizer, Markdown, HTML, provenance, and Explain output there—never in `$LOOTER_HOME`.

Remove plaintext only after presentation and verified encrypted round trips. If encryption fails, neither commit nor copy plaintext into the workspace.

## Safe migration

Never import plaintext repository history. Create fresh signed encrypted history with opaque binary-SOPS paths. Preserve useful source material and prior signed commit IDs only inside encrypted provenance. Do not select or configure a remote. Before retiring a source, decrypt and byte-compare every migrated artifact, verify signatures, scan the new tree and history for plaintext or human-title/date path leakage, and confirm the encrypted provenance. Retire nothing unless every gate passes.

## Security boundary

SOPS protects committed and remote data at rest. It does not hide marketplace queries, model-provider prompts or outputs, Pi sessions, browser history, active runtime plaintext, or pre-existing backups and snapshots. State this when asked about privacy guarantees.
