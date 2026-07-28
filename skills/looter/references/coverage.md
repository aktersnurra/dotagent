# Marketplace inventory coverage

## Modes

- Quick refresh: partial market awareness only; cannot promote to DOCUMENTS or decision-grade top three.
- Complete pre-shortlist sweep: required before DOCUMENTS, INSPECT, NEGOTIATE, BUY, travel advice, or a decision-grade top three.

## Required sources

Wayke, Blocket, Bytbil, Bilweb.

## Complete-sweep algorithm

For each source: apply hard filters directly, exhaust pagination, collect canonical URLs, normalise registration, deduplicate, record every disposition, then browser/car.info-check retained finalists.

## Coverage ledger

A complete ledger covers every required source.

```json
{
  "mode": "complete-pre-shortlist",
  "complete": true,
  "checked_at": "2026-07-27T00:00:00Z",
  "sources": [
    {
      "name": "Wayke",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 3,
      "raw_listings_found": 42,
      "unique_registrations_found": 39,
      "retained_finalists": ["ABC123"],
      "coverage_limit": null
    },
    {
      "name": "Blocket",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 2,
      "raw_listings_found": 27,
      "unique_registrations_found": 25,
      "retained_finalists": ["DEF456"],
      "coverage_limit": null
    },
    {
      "name": "Bytbil",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 4,
      "raw_listings_found": 51,
      "unique_registrations_found": 47,
      "retained_finalists": ["GHI789"],
      "coverage_limit": null
    },
    {
      "name": "Bilweb",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 1,
      "raw_listings_found": 12,
      "unique_registrations_found": 12,
      "retained_finalists": [],
      "coverage_limit": null
    }
  ],
  "deduplication": {
    "primary_key": "registration",
    "fallbacks": ["VIN", "seller plus identical identity evidence"]
  }
}
```

A partial ledger records every attempted source and cannot be promoted to DOCUMENTS, INSPECT, NEGOTIATE, BUY, travel advice, or a decision-grade top three.

```json
{
  "mode": "complete-pre-shortlist",
  "complete": false,
  "checked_at": "2026-07-27T00:00:00Z",
  "sources": [
    {
      "name": "Wayke",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 3,
      "raw_listings_found": 42,
      "unique_registrations_found": 39,
      "retained_finalists": ["ABC123"],
      "coverage_limit": null
    },
    {
      "name": "Blocket",
      "status": "partial",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 0,
      "raw_listings_found": 0,
      "unique_registrations_found": 0,
      "retained_finalists": [],
      "coverage_limit": "source blocked before first result page"
    },
    {
      "name": "Bytbil",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 4,
      "raw_listings_found": 51,
      "unique_registrations_found": 47,
      "retained_finalists": ["GHI789"],
      "coverage_limit": null
    },
    {
      "name": "Bilweb",
      "status": "covered",
      "filter_summary": "approved brief hard filters",
      "pages_enumerated": 1,
      "raw_listings_found": 12,
      "unique_registrations_found": 12,
      "retained_finalists": [],
      "coverage_limit": null
    }
  ],
  "deduplication": {
    "primary_key": "registration",
    "fallbacks": ["VIN", "seller plus identical identity evidence"]
  }
}
```

## Partial coverage

Blocked, failed, or incompletely enumerated sources are partial. External search never substitutes for a required source.

## Coverage audit failure

A later supplied eligible listing absent from a claimed complete sweep invalidates that completeness claim and triggers a new complete sweep.
