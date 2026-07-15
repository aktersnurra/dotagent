# Synthesis, presentation, and persistence

## Synthesize in fresh context

Dispatch a fresh synthesis subagent with the decrypted brief and completed research artifact paths. Set `acceptance: false` and a runtime output file. It must:

- deduplicate;
- adapt scoring weights to the brief without letting price overpower condition, documentation, risk, or fit;
- assign **BUY**, **INSPECT**, **NEGOTIATE**, **WATCH**, or **SKIP**;
- ask only seller questions not already answered;
- rank a concise Top N without padding; and
- produce this structure:

```markdown
# <Brief title> market report

## Market conclusion

| Rank | Object | Price | Key specification | Location | Verdict | Confidence | Direct link |
| ---: | --- | ---: | --- | --- | --- | ---: | --- |

## 1. Object name

**Direct listing:** URL
**Price:**
**Seller:**
**Location:**
**Key facts:**
**Verdict:**
**Confidence:**

### Why it ranks highly
### Main concerns
### Missing information
### What to ask the seller
### Price assessment
### Recommendation

## Final picks

**Best overall:**
**Best value:**
**Lowest-risk option:**
**Most interesting wildcard:**
**Best negotiation target:**
**Listings to skip:**

> If I were spending my own money today, I would choose: ...
```

## Present with Explain

Dispatch an Explain-enabled subagent with the runtime root as `cwd` and the synthesis path as input. Follow the installed Explain skill: create polished Markdown and HTML beneath the runtime project's `docs/explain/`, then open the HTML in the default browser. Never render in `$LOOTER_HOME`.

If Pandoc or rendering fails, preserve the encrypted synthesis and report that HTML was not produced. Never install Pandoc without approval.

## Persist an opaque run

Encrypt every completed research artifact, the synthesis, and provenance into a new opaque run directory. Provenance includes every attempted source and status, coverage/limitations, evidence labels, prior signed commit IDs when relevant, and enough source material to refresh or audit the run.

Decrypt every result and compare it byte-for-byte with its runtime source before describing a jj change. Scan the workspace for plaintext and title/date leakage. Never commit if plaintext exists under `briefs/` or `runs/`, encryption or comparison failed, or signing failed.

Create a Conventional Commit message scoped to the operation, sign `@`, and verify `self.signature().status()` is `good`. Start `jj new` only when another change will follow.

Delete runtime plaintext only after successful persistence verification and presentation.

## Final chat response

Do not paste the full report. Return only:

1. Top 3 objects, each with verdict, price, and canonical direct link.
2. Encrypted run path.
3. Runtime Markdown and HTML paths while they exist.
4. Whether the HTML opened.
5. Material source and coverage limitations.
