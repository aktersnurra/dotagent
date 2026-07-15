# Failure handling and fact discipline

Apply these rules without rationalizing around them:

- **Missing prerequisite:** stop and name it; do not install it.
- **Missing workspace:** run the consent-based setup flow in [Setup and security](setup-security.md).
- **Unauthorized device:** show only the public recipient and stop before web or model calls.
- **Brief/index decryption failure:** make no web or model calls.
- **Research timeout:** retain completed artifacts, mark coverage partial, and synthesize only verified evidence.
- **Browser failure:** record the failed attempt and exclude unverified listings.
- **Blocked source:** record it as blocked, never as proof of zero inventory.
- **Synthesis uncertainty:** lower confidence or use **Insufficient evidence**.
- **Pandoc/render failure:** preserve encrypted synthesis, report that HTML was not produced, and never auto-install.
- **Encryption or round-trip failure:** make no commit, copy no plaintext into the workspace, and retain protected runtime plaintext for recovery.
- **Plaintext/path leakage:** make no commit and do not retire a migration source.
- **Signing failure:** make no completed checkpoint.

## Fact discipline

- Never invent URLs, prices, usage, equipment, service, condition, model variants, seller details, or market values.
- Never infer common model features as listing facts.
- Missing means missing.
- Search snippets are leads only; never recommend dead or unverified links.
- Do not double-rank duplicates or pad Top N.
- Serious risks may override numeric scores.
- Seller questions omit answers already present.
- Preserve unknowns, provenance, confidence, and source limitations in synthesis and encrypted provenance.
