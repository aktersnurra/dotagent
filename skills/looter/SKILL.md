---
name: looter
description: Use when researching, inspecting, comparing, broadening, or refreshing live marketplace purchases such as cars, boats, electronics, tools, furniture, machinery, sporting goods, or collectibles.
---

# Looter

Find genuinely good live-marketplace purchases. Optimize for decision quality and response time, not result count or artifact production.

## Route intent first

Choose exactly one lane before checking tools or touching data:

1. **New or materially changed brief** — invoke the `grilling` skill first. Ask one question at a time, give the recommended answer, summarize the resulting brief, and obtain explicit approval before any marketplace web or browser call.
2. **Unchanged search, refresh, inspection or comparison** — use the normal local-first hot path.
3. **Quick refresh** — use the normal local-first hot path only for partial market awareness.
4. **Complete pre-shortlist sweep** — mandatory before promoting any object to DOCUMENTS, INSPECT, NEGOTIATE, BUY, travel advice, or a decision-grade top three. Read `references/coverage.md`.
5. **Explicit full report** — render Explain HTML only after posting the initial result.
6. **Explicit sync/push** — use the archival cold path only when the user clearly requests remote persistence.

If the user says “refresh” and an approved local brief exists, treat it as unchanged unless the requested filters materially differ.

If an approved brief exists only in the legacy encrypted archive, run the one-time compatibility bootstrap before entering the hot path. Bootstrap may decrypt only the requested brief and latest useful run; it must not run jj, encrypt, sign, render or push.

## Read only the relevant references

- Quick refresh or new/changed research: [Research](references/research.md), then [Synthesis and presentation](references/synthesis-presentation.md).
- Complete pre-shortlist sweep: [Coverage](references/coverage.md), [Research](references/research.md), then [Synthesis and presentation](references/synthesis-presentation.md).
- Local state missing or explicit sync/push: [Local state and archival security](references/setup-security.md).
- On any failure: [Failure handling](references/failure-handling.md).

Do not load archival instructions during an ordinary run unless first-use bootstrap is actually required.

## Hot-path contract

A normal run targets three minutes and stops at five minutes:

1. Load the approved plaintext brief and latest manifest from local XDG state.
2. Search only changed filters, stale links and missing model/source gaps.
3. Use one parent multi-query discovery pass; do not launch subagents.
4. Cheaply fetch/filter leads.
5. Verify at most five plausible finalists in one isolated headless Firefox session.
6. Stop when three recommendation-eligible objects survive.
7. Rank directly in the parent context.
8. **Post the verified result immediately.**
9. Atomically cache the compact manifest and result afterward.

At three minutes, answer if three useful candidates exist. If fewer than two exist, use the remaining time for one additional discovery pass—not a retry of failed sources. At five minutes, answer with verified partial evidence without padding.

Once local state is populated, a normal run must not invoke subagents, jj, Git, SOPS, rage, signing, remote checks, Pandoc, Explain, fresh synthesis agents, ancestry checks, round-trip checks, container counts or encrypted provenance.

## Invariants

- Results precede optional caching, reporting and archival work.
- Search snippets are leads only. External search is a gap detector, not inventory proof. Recommend only active canonical direct pages with current price, correct object/variant or powertrain, and required seller type.
- Only complete sweeps may make completeness claims. If asked to call unenumerated inventory comprehensive, before grilling or ranking refuse and write `quick refresh — incomplete coverage`; name the source pagination as uncovered.
- Preserve explicit unknowns, conflicts, confidence and material coverage limitations. Never invent listing facts or market values.
- Local working state is intentionally plaintext and must remain outside the jj workspace with mode-`0700` directories and mode-`0600` files.
- No remote is guessed or configured implicitly.
- Deep research, HTML and sync/push are separate explicit operations; none may delay a normal result.
