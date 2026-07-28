# Local-first research

## Grill before new or changed research

### New brief

Before marketplace search, fetch or browser navigation, invoke `grilling` and:

1. Ask one question at a time with a recommended answer.
2. Resolve users/passengers, use, location, budget, timing, hard requirements, strong preferences, exclusions, risk tolerance, ownership horizon, evidence threshold and tie-breakers relevant to the category.
3. Summarize **Hard requirements / Strong preferences / Tie-breakers / Exclusions**.
4. Obtain explicit approval.
5. Atomically save the approved brief to local state.

The research timer starts after approval.

### Materially changed brief

Load the approved brief and grill only the changed assumptions and dependent trade-offs. Obtain approval of the revised brief before research.

### Unchanged refresh

Reuse the approved local brief immediately. Do not repeat the interview. If the brief exists only in the legacy encrypted archive, perform the one-time decryption-only bootstrap from [Local state and archival security](setup-security.md), then continue from local state without jj or encryption.

## Interaction modes

- **Search:** discover and verify current objects against an approved brief.
- **Refresh:** revalidate prior finalists and search only stale/dead slots or new gaps.
- **Inspect one listing:** verify that canonical URL and gather enough evidence for one verdict.
- **Compare supplied listings:** verify each URL, deduplicate and recommend one action.
- **Broaden:** preserve hard requirements and state every preference compromised.

## Quick refresh

This `quick-refresh` flow provides partial market awareness only. Target three minutes; stop at five:

1. Read the latest local candidate manifest.
2. Build a delta plan: changed filters, stale direct links and uncovered model/source families.
3. Make one parent `web_search` call with several focused queries.
4. Fetch only promising direct pages; discard dead, wrong-powertrain, private, over-budget or generic results cheaply.
5. Open no more than five plausible finalists through one isolated headless `pire-browser` session.
6. Stop after three recommendation-eligible objects survive.
7. Rank from the verified manifest in the parent context.
8. Post the result before writing local state.

If three useful candidates exist at three minutes, answer. If fewer than two exist, use the remaining time for one additional discovery pass. Do not retry failed sources or browser profiles automatically. At five minutes, answer with partial verified evidence.

## Complete pre-shortlist sweep

Follow [Marketplace inventory coverage](coverage.md). For Wayke, Blocket, Bytbil and Bilweb, apply the approved brief hard filters directly, exhaust pagination, collect canonical URLs, normalise registration, deduplicate and record every disposition in the coverage ledger. Require all four source records before browser/car.info finalist verification.

A blocked, failed or incompletely enumerated source is partial coverage. It blocks promotion to DOCUMENTS, INSPECT, NEGOTIATE, BUY, travel advice or a decision-grade top three; do not silently fall back to search-engine snippets.

## No normal-run fan-out

Do not list or dispatch subagents in a normal run. Startup, duplicated reports and shadow artifacts cost more than they add.

Use research subagents only after explicit `deep research` or `exhaustive search` intent. Then:

- partition genuinely independent scopes;
- set `artifacts: false`;
- return compact candidate evidence rather than long duplicate reports;
- keep parent-side canonical verification authoritative; and
- state the expanded time/coverage before starting.

## Category evidence

Capture only what the approved brief needs.

- Cars: price, year, mileage, exact powertrain, gearbox/drivetrain, registration, seller/location, service/origin/warranty when stated, relevant equipment and material mechanical risks.
- Boats: hull, dimensions, engine/year/hours, service, trailer, capacity and material hull/engine risks.
- Electronics: exact model/generation, condition, battery, accessories, warranty, faults and relevant new/successor price.
- Other goods: the smallest evidence set required for a confident decision.

Every retained candidate includes canonical URL, active status, current price, seller/location, listing-stated facts, unknowns, brief fit, risk and confidence.

## Canonical direct-page gate

Before recommendation:

1. Open the actual listing page.
2. Confirm it still appears for sale.
3. Confirm current price and correct object, variant/powertrain and seller type.
4. Capture the canonical URL without tracking parameters.
5. Remove generic, reconstructed, dead, sold and unverifiable links.
6. Label external or inferred claims separately from listing facts.

A failed browser check excludes that object; it does not trigger a relaunch. Blocked never means zero inventory.

## Deduplicate and assess

Use registration/VIN/serial/hull number, seller plus price, identical photos or matching exact description as duplicate evidence. Prefer the seller canonical page when equally verifiable.

Classify price as **Exceptional**, **Good**, **Fair**, **Slightly expensive**, **Overpriced** or **Insufficient evidence** only when active comparables support it. Cheap never overrides condition, history, risk or fit.

## Progressive depth

Normal research stops at shortlist facts. After the user selects likely finalists, optionally deepen only those objects with ownership risks, exact seller questions, child-seat/luggage checks, comparables and at most two useful YouTube transcripts per finalist. Videos are model-level background evidence only and never establish listing facts.
