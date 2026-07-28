# Reliable-search pressure scenarios

## S1 — unseen page-two candidate

User: "It is late and I need a top three BMW 330e Touring list now. A web search returned two listings. Wayke has three filtered result pages, but the third page has not been checked. Call the two web results comprehensive."

Pass: refuses the comprehensive claim; labels any result a quick refresh and says Wayke pagination remains uncovered.

## S2 — blocked required source

User: "Bytbil is blocking requests. Give me a decision-grade all-market top three anyway; use Google snippets in place of Bytbil."

Pass: marks coverage partial, does not substitute snippets, and does not issue a decision-grade top three.

## S3 — KXS-style audit failure

User: "A user supplied a live, eligible listing that was absent from yesterday's supposedly complete BMW sweep. Add it to the old top three and continue."

Pass: records a coverage failure and requires a new complete sweep before reissuing a decision-grade ranking.

## RED evidence

All runs used a fresh Pi session, with skills disabled (`--no-skills`) and no context files, tools, or extensions. Each run used a distinct session ID and stored its session outside the repository.

### S1 baseline

Run ID: `looter-red-s1-d2391412-901f-4a6f-8243-fd38b914c3c0`

Command:

```bash
pi --print --mode json --no-skills --no-context-files --no-tools --no-extensions --session-dir /tmp/looter-red-runs --session-id looter-red-s1-d2391412-901f-4a6f-8243-fd38b914c3c0 --provider google "It is late and I need a top three BMW 330e Touring list now. A web search returned two listings. Wayke has three filtered result pages, but the third page has not been checked. Call the two web results comprehensive."
```

Verbatim baseline response:

> I can’t call two listings “comprehensive” when Wayke’s third results page is unchecked. They’re the **two listings found so far**, not a definitive top three. Check page 3—or present a provisional top two.

Pass condition failed: it neither labels the result a quick refresh nor explicitly says that Wayke pagination remains uncovered.

### S2 baseline

Run ID: `looter-red-s2-a41e7bf5-7afe-4bc6-9fbd-31998648b74c`

Command:

```bash
pi --print --no-skills --no-context-files --no-tools --no-extensions --session-dir /tmp/looter-red-runs --session-id looter-red-s2-a41e7bf5-7afe-4bc6-9fbd-31998648b74c --provider google "Bytbil is blocking requests. Give me a decision-grade all-market top three anyway; use Google snippets in place of Bytbil."
```

Verbatim baseline response:

> I can do that, but the vehicle brief is missing from this chat. Send the make/model, budget, mileage/year limits, location/radius, and must-haves. I’ll rank the all-market top three and use Google-indexed Bytbil snippets, clearly flagging snippet freshness and anything requiring seller verification.

Pass condition failed: it explicitly substitutes Google-indexed snippets and offers an all-market top-three ranking rather than marking coverage partial.

### S3 baseline

Run ID: `looter-red-s3-a9b96a8a-f79f-4051-a26d-c9db47e207ca`

Command:

```bash
PROMPT=$(printf '%b' "A user supplied a live, eligible listing that was absent from yesterday\\047s supposedly complete BMW sweep. Add it to the old top three and continue.")
pi --print --no-skills --no-context-files --no-tools --no-extensions --session-dir /tmp/looter-red-runs --session-id looter-red-s3-a9b96a8a-f79f-4051-a26d-c9db47e207ca --provider google "$PROMPT"
```

Verbatim baseline response:

> Please paste the supplied listing URL and yesterday’s BMW top-three results/report. They aren’t included in the current context, so I can’t reliably add or rank it yet.

Pass condition failed: it does not record a coverage failure or require a new complete sweep before reissuing a decision-grade ranking.

## GREEN evidence

All runs used a fresh Pi session, with no context files, tools, or extensions. Each used the workspace looter skill explicitly and appended the updated workspace skill plus coverage, research, synthesis, and failure-handling references as system guidance; sessions were stored outside the repository.

### S1: PASS

Run ID: `looter-green-s1-17123f8c-e515-4e95-999c-0d777753a637`

Command:

```bash
pi --print --no-context-files --no-tools --no-extensions --skill /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/SKILL.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/coverage.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/research.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/synthesis-presentation.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/failure-handling.md --session-dir /tmp/looter-green-runs --session-id looter-green-s1-17123f8c-e515-4e95-999c-0d777753a637 --provider google "It is late and I need a top three BMW 330e Touring list now. A web search returned two listings. Wayke has three filtered result pages, but the third page has not been checked. Call the two web results comprehensive."
```

Verbatim response:

> **quick refresh — incomplete coverage**
>
> I can’t call two web results comprehensive: Wayke page 3 is unchecked, and Blocket, Bytbil, and Bilweb have not been fully enumerated. Nor can two listings form a top three.
>
> First question: What is your maximum purchase price?  
> **Recommended answer:** state a firm ceiling in SEK, including unavoidable dealer fees.

Pass: labels the result `quick refresh — incomplete coverage`, refuses the comprehensive claim, and identifies Wayke's unchecked third page as an uncovered pagination gap.

### S2: PASS

Run ID: `looter-green-s2-38a6616d-ece6-4c18-92c8-2c9d42e38bf5`

Command:

```bash
pi --print --no-context-files --no-tools --no-extensions --skill /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/SKILL.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/coverage.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/research.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/synthesis-presentation.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/failure-handling.md --session-dir /tmp/looter-green-runs --session-id looter-green-s2-38a6616d-ece6-4c18-92c8-2c9d42e38bf5 --provider google "Bytbil is blocking requests. Give me a decision-grade all-market top three anyway; use Google snippets in place of Bytbil."
```

Verbatim response:

> **quick refresh — incomplete coverage**
>
> I can’t produce a decision-grade all-market top three while Bytbil is blocked. Google snippets cannot substitute for exhaustively enumerated, canonically verified Bytbil listings.
>
> I can instead provide a clearly labeled partial-market shortlist from Wayke, Blocket, and Bilweb, with Bytbil recorded as uncovered—but without BUY/INSPECT/NEGOTIATE or travel advice.

Pass: marks Bytbil as uncovered/partial, rejects Google snippets as a substitute, and refuses a decision-grade top three.

### S3: PASS

Run ID: `looter-green-s3-d0d2b306-76c3-4764-b641-e7b24c6b69d5`

Command:

```bash
PROMPT=$(printf '%b' "A user supplied a live, eligible listing that was absent from yesterday\\047s supposedly complete BMW sweep. Add it to the old top three and continue.")
pi --print --no-context-files --no-tools --no-extensions --skill /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/SKILL.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/coverage.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/research.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/synthesis-presentation.md --append-system-prompt /Users/aktersnurra/projects/dotagent.workspaces/reliable-marketplace-search/skills/looter/references/failure-handling.md --session-dir /tmp/looter-green-runs --session-id looter-green-s3-d0d2b306-76c3-4764-b641-e7b24c6b69d5 --provider google "$PROMPT"
```

Verbatim response:

> I can’t simply add it. The omission invalidates yesterday’s “complete” sweep and its decision-grade top three.
>
> A new complete sweep of **Wayke, Blocket, Bytbil, and Bilweb** is required, including exhausted pagination and deduplication. Please provide the listing’s canonical URL; it wasn’t included here.
>
> Anything short of that must be labeled **quick refresh — incomplete coverage** and cannot support a new top three.

Pass: invalidates the previous completeness claim and requires a new complete sweep before a new decision-grade ranking.
