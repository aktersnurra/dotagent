# Sync/push security

Enter this reference only when the user clearly asks to sync or push the wiki remotely
(e.g. "sync the wiki", "push the wiki"). Capture and query must never run any of this.

## Paths

```sh
WIKI_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/wiki"
WIKI_ARCHIVE="${XDG_DATA_HOME:-$HOME/.local/share}/wiki-archive"
WIKI_KEY_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/wiki/age/keys.txt"
```

`WIKI_HOME` is the plaintext working store used by capture and query. `WIKI_ARCHIVE` is
a separate jj repository holding a SOPS-encrypted mirror, used only for explicit
sync/push.

Only `$WIKI_HOME/*.md` pages are archived. `$WIKI_HOME/.index.md` is a generated cache,
regenerable from page frontmatter at any time; it is never encrypted, committed, or
pushed. Being a dotfile, it already falls outside the `*.md` glob — do not widen that
glob.

## Archive layout

The archive mirrors `WIKI_HOME`'s flat layout and filenames — one SOPS-encrypted JSON
container per page, same `<date>-<slug>` id as the plaintext page (not an opaque UUID;
wiki pages are not sensitive-identity-like, and keeping the id readable makes archive
entries easy to correlate with local pages):

```text
$WIKI_ARCHIVE/
└── <date>-<slug>.md.enc.json
```

## First-use identity setup

1. Check for an existing age identity at `$WIKI_KEY_FILE`.
2. If absent, generate one: `rage-keygen -o "$WIKI_KEY_FILE"` (create the parent dir
   mode `0700` first; the key file must end up mode `0600`).
3. Show the public recipient (`rage-keygen -y "$WIKI_KEY_FILE"`) so it can be added to
   `.sops.yaml`.
4. Never print or commit the private identity.

## Require an explicit remote first

- Use an existing explicitly configured remote for `$WIKI_ARCHIVE`, or ask the user for
  the exact remote URL.
- Never guess provider, host, organization, repository, or username.
- No remote means no encryption, jj setup, signing, or commit work.

If `$WIKI_ARCHIVE` is absent, clone the exact supplied remote with `jj git clone`. If it
exists, require `jj -R "$WIKI_ARCHIVE" st` to succeed and confirm the configured remote
matches user intent before changing anything.

## Cold-path prerequisites

Check `jj`, `sops`, `rage`, `rage-keygen`, the device identity, `.sops.yaml`, recipient
authorization, and signing only now.

If this device is not an authorized recipient, display only:

```sh
rage-keygen -y "$WIKI_KEY_FILE"
```

and stop the sync.

## Batch dirty pages

1. Diff `$WIKI_HOME/*.md` against `$WIKI_ARCHIVE` to find pages that are new or changed
   since the last successful push.
2. Convert each dirty page into a SOPS-encrypted JSON container:

   ```sh
   SOPS_AGE_KEY_FILE="$WIKI_KEY_FILE" sops encrypt \
     --input-type binary --output-type json \
     --filename-override "$output_path" \
     "$input_path" > "$output_path.tmp" && mv "$output_path.tmp" "$output_path"
   ```

   Run from `$WIKI_ARCHIVE` so `.sops.yaml` is discovered.

3. Decrypt and byte-compare every newly written container once against its source page.
4. Scan the archive for committed plaintext and semantic path leakage (page
   titles/topics leaking through filenames — the `<date>-<slug>` id is accepted leakage
   by design; anything beyond that id is not).
5. Create one Conventional Commit for the entire snapshot.
6. Verify `self.signature().status()` is `good`.
7. Push to the explicit remote.
8. Mark the snapshot clean only after push succeeds.

A failed prerequisite, encryption, comparison, leakage, signing, or push step stops only
sync. Preserve the complete local dirty snapshot for an idempotent retry. Never mark
individual pages clean incrementally.

## Failures

- **No explicit remote:** stop before encryption or jj work and ask for the exact
  remote.
- **Missing prerequisite or unauthorized device:** stop sync and preserve local dirty
  state; show the public recipient command above.
- **Encryption or round-trip failure:** make no completed checkpoint and preserve the
  entire dirty snapshot.
- **Plaintext/path leakage:** do not commit or push.
- **Signing failure:** do not push or mark clean.
- **Push failure:** report the local commit accurately, retain the full dirty snapshot,
  do not mark pages clean individually.

## Device onboarding and revocation

Recipient onboarding/removal is cold-path work. A trusted authorized device updates
`.sops.yaml`, rewraps every encrypted container, creates one signed commit, and pushes.
Never perform recipient rotation during capture or query.
