# Research

## Briefs and interaction modes

Briefs are free-form Markdown; interpret intent without requiring schema or frontmatter. Typical headings may include Goal, Budget, Hard requirements, Strong preferences, Candidate models, Avoid, Rank by, Context, and Location. Resolve a brief by decrypting `briefs/index.sops.json` and matching display title or opaque ID. Create and edit plaintext only in the runtime root, then encrypt it before cleanup.

Support these modes:

- **Search from a brief:** complete discovery, verification, synthesis, and presentation.
- **Inspect one listing:** verify its URL and gather enough market and risk evidence for a focused verdict.
- **Compare listings:** verify every supplied URL, deduplicate, and recommend one action.
- **Broaden a search:** preserve hard requirements and state each preference compromised by alternatives.
- **Refresh a run:** reuse the encrypted brief and prior provenance, remove dead listings, and highlight new listings and price/status changes.

Ask only questions that materially change the outcome.

## Adapt evidence to the category

Derive fields from the object and brief; do not force a fixed schema.

- Cars: year, mileage, engine, gearbox, drivetrain, registration, service, ownership, tax, and mechanical risks.
- Boats: hull, dimensions, engine/year/hours, service, trailer, capacity, seaworthiness, and hull/engine risks.
- Electronics: exact model/generation, condition, battery, accessories, warranty, faults, new price, and successor.
- Other goods: the smallest evidence set needed for a confident decision.

Always capture provenance, canonical direct URL, active status, price, seller/location when available, unknowns, risks, confidence, and brief fit.

## Plan focused fan-out

Choose sources dynamically by category, location, specialist relevance, and the brief; suggestions are never a closed allowlist. Before dispatch, call the subagent listing action and use only executable agents. Prefer a small focused fan-out, partitioned by source group, product family, or evidence question.

Each research subagent receives the decrypted brief and one bounded scope in fresh context, writes a unique runtime Markdown file, uses file-only output when available, and sets `acceptance: false` because this is evidence research rather than code/tests. Require source coverage, direct candidate URLs, facts, unknowns, confidence, and limitations.

Do not share a mutable browser session. Use isolated named sessions/profiles or serialize verification.

## Discover and verify direct pages

Use Firefox or LibreWolf through `pire-browser` as primary whenever rendering or interaction matters. Search/fetch may accelerate discovery, but snippets are leads only.

Before recommending an object:

1. Open the actual listing page.
2. Confirm it still appears for sale.
3. Confirm current price and key specifications.
4. Capture the canonical direct URL without tracking parameters.
5. Remove dead, generic-search, reconstructed, or unverifiable URLs.
6. Label every fact as listing-stated, external, inferred, or unknown.

Record every attempted source as successful, blocked, no qualifying result, or partial. Blocked never means zero inventory.

## Deduplicate and assess

Treat registration/VIN/hull number, seller plus exact price, identical photos, or matching model/year/engine/location/description as strong duplicate evidence. Prefer the seller's canonical link while retaining useful active alternatives.

Compare against similar active listings. Classify price as **Exceptional**, **Good**, **Fair**, **Slightly expensive**, **Overpriced**, or **Insufficient evidence**. Use ranges unless comparables support precision. Cheap never automatically means good.
