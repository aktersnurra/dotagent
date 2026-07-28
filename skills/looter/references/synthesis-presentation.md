# Results, local caching and optional presentation

## Rank in the parent context

Normal runs do not dispatch a fresh synthesis agent. Rank directly from the compact browser-verified manifest.

Adapt weights to the approved brief. Price must not overpower hard fit, condition, documentation, risk or evidence quality. Use **BUY**, **INSPECT**, **NEGOTIATE**, **WATCH** or **SKIP** honestly; unknown hard requirements prevent **BUY**.

Do not browse during ranking. If evidence is missing, lower confidence or mark it unknown.

## Post immediately

The normal chat response is:

1. One concise market conclusion.
2. Top 3 objects, each with verdict, current price, canonical direct link and decisive reason.
3. One recommended next action.
4. Material source/coverage limitations.

Do not delay chat for local writes, Markdown reports, HTML, encryption, jj, signing or remote persistence. Do not paste a long report unless the user asks.

For one-listing inspection or supplied comparisons, use the same principle with the smallest useful result rather than padding to three.

## Result contracts

- Complete-sweep ranked: identify the timestamp and four-source coverage status.
- Quick-refresh ranked — incomplete coverage: cannot contain promotion verdicts or purchase/travel advice.
- Every manifest includes coverage.mode, coverage.complete, and one source record per attempted marketplace.

## Cache after chat

After posting:

1. Create an opaque run ID.
2. Atomically write the compact verified `manifest.json`.
3. Atomically write the concise `result.md`.
4. Update `latest.json` for the brief.
5. Add the brief/run IDs to `sync-state.json` dirty state.

Directories are mode `0700`; files mode `0600`. If any write fails, report that the result was not cached. Never imply local reuse or sync readiness when the write failed.

The manifest stores only decision-relevant evidence: canonical URL, active status, price, identity/specification, seller/location, listing facts, unknowns, confidence, verdict, checked time and required coverage metadata. Do not create source-by-source provenance essays.

## Optional full report

Only explicit wording such as `open full report` invokes Explain/Pandoc. Render from the cached result and manifest, open HTML, and report the path/status. This occurs after the initial chat answer and never triggers archival sync.

If rendering fails, report it without changing the market verdict or dirty state. Never install Pandoc automatically.

## Optional deep synthesis

Only explicit deep/exhaustive intent may use a fresh synthesis agent for a large evidence set. It still cannot replace canonical parent-side verification, and its output must not delay a preliminary verified result when the user requested speed.

## Explicit archival handoff

When the user later asks to sync/push, follow the cold path in [Local state and archival security](setup-security.md). Batch dirty state; do not regenerate research, re-open listings or render HTML as part of sync.
