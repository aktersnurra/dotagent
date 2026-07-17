# Looter Local-First Fast Pipeline Design

**Date:** 2026-07-16  
**Status:** Approved for implementation  
**Scope:** Global Looter skill behavior in `skills/looter/`

## Problem

Looter currently places archival durability on the interactive research path. A normal search can decrypt history, inspect jj state, dispatch several subagents, verify many pages, create long research artifacts, synthesize in another model context, render Explain HTML, encrypt every artifact, byte-compare it, scan for leakage, sign a jj commit and clean duplicated shadow outputs before showing the user a result.

Those operations protect remote history but do not improve the immediate buying decision. They made targeted research slow, failure-prone and visibly wasteful.

## Goals

- Start every new or materially changed brief with a one-question-at-a-time `grill-me` interview and explicit approval.
- Finish normal targeted research in about three minutes, with a five-minute hard stop.
- Show verified results before any archival work.
- Reuse prior local results without SOPS or jj on the normal path.
- Use no subagents, retries, Explain rendering, encryption or version-control operations by default.
- Preserve canonical direct-page verification and explicit unknowns.
- Move encryption, signing and remote persistence into an explicit `sync/push` operation.

## Non-goals

- No crawler, database, daemon, cache service, adapter framework or separate orchestrator.
- No exhaustive source sweep by default.
- No automatic remote configuration or push.
- No attempt to encrypt the accepted plaintext local working state.

## Two execution lanes

### Hot path: grill, research and answer

The hot path exists only to reach a good purchase decision quickly.

It may read and atomically update the local plaintext working state. It must not invoke jj, Git, SOPS, rage, signing, Pandoc or Explain. It must not inspect remote configuration, commit ancestry, signatures, recipients, encrypted-container counts or workspace leakage.

### Cold path: explicit sync/push

The cold path is entered only when the user explicitly asks to `sync Looter`, `push Looter`, or equivalent wording that clearly requests remote archival.

It batches all dirty local work, encrypts it, verifies the encrypted boundary once, creates one signed jj commit and pushes to an explicitly configured or user-supplied remote.

## Grill-first requirements gate

### New brief

Before any marketplace web search, listing fetch or browser navigation:

1. Invoke the installed `grilling` skill.
2. Ask one question at a time and provide the recommended answer.
3. Resolve the relevant decision tree: users/passengers, use pattern, location, budget, timing, hard requirements, strong preferences, exclusions, risk tolerance, ownership horizon, evidence threshold and tie-breakers.
4. Summarize hard requirements, strong preferences, tie-breakers and exclusions.
5. Obtain explicit approval.
6. Save the approved brief to local state.

The research timer starts only after approval.

### Materially changed brief

Load the approved local brief and grill only the changed assumptions and dependent trade-offs. Obtain explicit approval of the revised brief before research.

### Unchanged refresh

Reuse the approved brief immediately. Do not repeat the interview.

## Local plaintext working state

Use:

```text
${XDG_STATE_HOME:-$HOME/.local/state}/looter/
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

- Root and directories are mode `0700`.
- Files are mode `0600`.
- Writes use a same-directory temporary file plus atomic rename.
- IDs are opaque UUID-based identifiers so later sync can reuse them directly.
- `latest.json` maps each brief to its latest local run.
- `sync-state.json` records dirty brief/run IDs and the last successfully pushed commit when known.
- Human titles, requirements and listing data are plaintext at rest in this local state by explicit design choice.
- No local-state path lives inside the jj workspace.

### One-time bootstrap

If local state does not yet contain the requested brief, Looter may decrypt the latest matching encrypted brief and run once into local state. This compatibility bootstrap may use SOPS but must not use jj, sign, commit, render or push. Subsequent normal runs use local state only.

If bootstrap cannot decrypt, stop before web research and report the missing access. Do not silently create a conflicting brief with the same identity.

## Adaptive normal research

### Timing

- Target result time: three minutes after brief approval.
- Hard stop: five minutes.
- At three minutes, if at least three useful verified candidates exist, answer immediately.
- If fewer than two useful candidates exist, use the remaining time for one additional discovery pass.
- At five minutes, answer with verified partial evidence without padding.

### Default execution

1. Load the approved brief and latest local manifest.
2. Build a delta plan: changed filters, stale links and missing model families only.
3. Run one parent multi-query web discovery call.
4. Fetch promising direct pages cheaply and discard obvious failures.
5. Verify no more than five plausible finalists in one isolated headless Firefox session.
6. Stop once three recommendation-eligible candidates survive.
7. Rank directly in the parent context from the verified manifest.
8. Post the concise linked result immediately.
9. Atomically save `manifest.json` and `result.md` to local state.

### Default prohibitions

A normal run must not:

- launch subagents;
- retry failed sources or browser profiles automatically;
- create research/provenance essays;
- dispatch a fresh synthesis agent;
- render Markdown or HTML;
- invoke jj, Git, SOPS, rage or signing tools;
- inspect encrypted workspace status;
- wait for local-state persistence before posting the result.

If the local-state write fails, still post the result and warn that it was not cached.

### Evidence gate

Only these safeguards remain mandatory before recommending an object:

1. Active canonical direct page
2. Current asking price
3. Correct object, variant/powertrain and professional seller when required by the brief
4. Explicit unknowns, conflicts and coverage limitations

Search snippets remain leads only. Generic, dead, reconstructed and browser-unverified links remain ineligible.

## Optional depth

### Deep or exhaustive research

Only explicit user wording such as `deep research`, `exhaustive search` or approval after an underfilled result enables broader sources, research subagents, model-level ownership evidence and extended time.

Subagent runs must set `artifacts: false` and avoid project shadow outputs. They return compact candidate evidence, not duplicate full reports.

### Full report

Only explicit wording such as `open full report` invokes Explain/Pandoc and opens HTML. Rendering never blocks the initial chat result.

### Finalist research

Ownership risks, exact seller questions, child-seat/luggage analysis and YouTube transcripts are deferred until the user selects likely finalists. Videos remain model-level background evidence and never prove listing facts.

## Explicit sync/push workflow

The sync operation requires an explicit remote archival request.

1. Read `sync-state.json` and identify dirty local briefs/runs.
2. Require an existing explicitly configured remote or ask the user for the exact remote URL. Never guess one.
3. Check jj, SOPS, rage, device identity, recipients and signing configuration.
4. Convert dirty local artifacts into opaque binary-SOPS JSON containers beneath the encrypted workspace.
5. Decrypt and byte-compare every newly written container once.
6. Scan the encrypted workspace for committed plaintext and semantic path leakage.
7. Create one Conventional Commit for the whole dirty batch.
8. Verify its signature is `good`.
9. Push to the explicit remote.
10. Mark local items synchronized only after push succeeds.

No remote means no encryption or jj work.

A failed sync leaves local dirty state untouched. A successful local commit followed by a failed push remains dirty and must be reported accurately.

## Failure behavior

- **Discovery/source failure:** exclude affected objects and continue.
- **Browser failure:** record partial coverage; do not relaunch automatically.
- **Underfilled result at three minutes:** perform one additional discovery pass, not a retry of failed sources.
- **Hard stop:** post verified partial results.
- **Local-state write failure:** post results, warn that reuse is unavailable, and preserve no false success marker.
- **Bootstrap decryption failure:** stop before web research.
- **Sync prerequisite/encryption/signing/push failure:** stop only the cold path; preserve dirty local state.

## Privacy boundary

The local working state is intentionally plaintext. Mode `0700`/`0600` protects against ordinary local users but not device compromise, privileged access, backups, indexing or filesystem snapshots.

SOPS remains the remote and archival boundary. Pi sessions, marketplace queries, browser history and model-provider traffic are outside SOPS protection regardless of this design.

## Acceptance scenarios

1. **New brief grills first:** no web or browser call occurs before one-question-at-a-time grilling and explicit approval.
2. **Changed brief grills deltas:** only changed assumptions and dependent trade-offs are re-interviewed.
3. **Unchanged refresh skips grilling:** approved local brief loads immediately.
4. **Three-minute happy path:** one parent discovery call plus at most five browser checks returns three candidates without subagents.
5. **Five-minute partial path:** an underfilled search performs one extra discovery pass and posts partial evidence at the hard stop.
6. **Zero hot-path archival:** normal-run behavior contains no jj, Git, SOPS, rage, signing, ancestry, round-trip, container-count or Explain actions.
7. **No synthesis handoff:** parent ranks the verified manifest directly.
8. **Local reuse:** the next refresh reads the prior manifest without decrypting the encrypted workspace.
9. **Local write failure:** results still appear immediately with a cache warning.
10. **Explicit deep mode:** subagents run only after explicit depth approval and produce no project debug artifacts.
11. **Explicit report mode:** HTML renders only after the initial result and only on request.
12. **Explicit sync:** all dirty runs encrypt into one signed commit and push only to an explicit remote.
13. **Sync failure isolation:** research remains usable and dirty plaintext survives a failed archival operation.
