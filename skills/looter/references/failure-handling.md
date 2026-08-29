# Failure handling and fact discipline

## Hot-path failures

- **No approved brief:** run one-question-at-a-time grilling; do not browse first.
- **First-use bootstrap decryption failure:** stop before web research and report the
  access problem.
- **Discovery/source failure:** discard affected leads and continue.
- **Blocked source:** record partial coverage, never zero inventory.
- **Browser verification failure:** exclude the object; do not relaunch automatically.
- **Weak shortlist at three minutes:** when fewer than two candidates survive, use one
  additional discovery pass until the five-minute stop.
- **Five-minute stop:** post verified partial results without padding.
- **Ranking uncertainty:** lower confidence or use **Insufficient evidence**.
- **Local-state write failure:** keep the already-posted result, warn that it was not
  cached, and write no clean/dirty success marker.

Normal research does not fail because jj, SOPS, rage, signing, Pandoc, remotes or
encrypted archives are unavailable. Those are not hot-path prerequisites except SOPS/key
access during one-time compatibility bootstrap.

## Optional-mode failures

- **Deep research failure:** retain verified parent evidence and return partial
  coverage.
- **Explain/render failure:** report that HTML was not produced; do not alter the market
  result or invoke sync.

## Cold-path sync failures

- **No explicit remote:** stop before encryption or jj work and ask for the exact
  remote.
- **Missing prerequisite or unauthorized device:** stop sync and preserve local dirty
  state.
- **Encryption or round-trip failure:** make no completed checkpoint and preserve the
  entire dirty snapshot.
- **Plaintext/path leakage:** do not commit or push.
- **Signing failure:** do not push or mark clean.
- **Push failure:** report the local commit accurately, retain the full dirty snapshot,
  and do not mark items clean individually.

Sync failures never invalidate previously posted research or block later local searches.

## Fact discipline

- Never invent URLs, prices, usage, equipment, service, condition, model variants,
  seller details or market values.
- Missing means missing; common model equipment is not an exact-listing fact.
- Search snippets are leads only.
- Never recommend dead, generic, reconstructed or browser-unverified links.
- Do not double-rank duplicates or pad Top N.
- Serious risks override numeric scores.
- Ask only seller questions not already answered.
- Preserve unknowns, evidence conflicts, confidence and material coverage limitations.
