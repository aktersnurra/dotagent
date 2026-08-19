---
name: wiki
description: Use when distilling knowledge from a YouTube video or article URL into a personal markdown wiki page, or when querying that wiki to answer a question from previously captured knowledge.
disable-model-invocation: true
---

# Wiki

Turn sources (YouTube videos, articles) into durable, queryable local knowledge pages. Optimize for a description an LLM can screen without opening the file, and for answers grounded in captured pages rather than memory.

## Route intent first

Choose exactly one lane:

1. **Capture** — "add this to the wiki: `<url>`" or similar. Ingest a source and write a new page.
2. **Query** — "what do I know about X" or similar. Search existing pages and answer from them.
3. **Explicit sync/push** — "sync/push the wiki". Cold path only; read `references/sync-security.md`. Never enter this lane implicitly from capture or query.

## Paths

```sh
WIKI_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/wiki"
```

All pages are plaintext markdown, flat inside `$WIKI_HOME`, filename `<date>-<slug>.md` (e.g. `2026-08-08-neural-network-basics.md`). No subdirectories — topic grouping happens via `tags`, not folders.

## Page format

```markdown
---
title: Short human title
date: 2026-08-08
source: https://example.com/or/youtube-url
tags: [kebab-case, freeform, topics]
description: 2-4 sentences summarizing the page body, written so an LLM can judge relevance without reading further.
---

# Short human title

Freeform prose with headings, distilled from the source. Structure adapts
to the content — no fixed template. Explain concepts, don't just list facts.
```

`tags` are freeform lowercase-kebab-case, chosen by judgment each capture — no controlled vocabulary to maintain.

## Capture

1. Detect source type from the URL.
2. **YouTube:** delegate to one ordinary subagent, same pattern as the `transcribing-youtube-videos` skill, but give it a broad distillation goal instead of a narrow question — e.g. "extract all key knowledge, concepts, and claims from this video, not just an answer to one question." Resolve the sibling `transcribe-youtube` script from that skill and run it the same way:

   ```bash
   artifacts=$(mktemp -d "${TMPDIR:-/tmp}/youtube-transcript.XXXXXX")
   WHISPER_LANGUAGE=sv WHISPER_MODEL=small \
     /absolute/path/to/skills/transcribing-youtube-videos/transcribe-youtube "$url" "$artifacts"
   ```

   The subagent reads the emitted SRT and returns distilled notes (not the raw transcript) to the parent.
3. **Article/other URL:** use WebFetch directly to retrieve and extract readable content, then distill in the parent.
4. **Dedup check:** before writing, `rg -l "^source: $url$"` (or equivalent frontmatter check) across `$WIKI_HOME/*.md`. If an exact URL match exists, tell the user and ask whether to update the existing page, create a new dated page anyway, or skip. Do not silently overwrite or silently duplicate.
5. Write frontmatter + distilled body to `$WIKI_HOME/<date>-<slug>.md`. Create `$WIKI_HOME` if missing.

Never paste a full raw transcript or full article HTML into the parent context — only the distilled result.

## Query

1. Extract keywords from the user's question.
2. `rg -il` those keywords across `$WIKI_HOME/*.md` to shortlist candidate files. Broaden terms once if the first pass returns nothing.
3. Read only the frontmatter block (between the `---` markers) of shortlisted candidates to judge relevance from `description` and `tags`.
4. Read the full body of the best-matching page(s) — usually one to three.
5. Answer the question directly from that content, citing which wiki page(s) (title + path) the answer drew from.

If no page is relevant, say so plainly rather than answering from memory — the wiki is empty on this topic, not the question unanswerable in general.

## Invariants

- Capture and query never touch jj, SOPS, rage, signing, or a remote. Those are cold-path only, entered on explicit request.
- No remote or encryption key is ever guessed. See `references/sync-security.md`.
- `$WIKI_HOME` is intentionally plaintext at rest, mode `0700`/`0600`, for fast local grep-based querying.
- Every page carries `title`, `date`, `source`, `tags`, `description` — query mode depends on `description` being readable without loading the body.
