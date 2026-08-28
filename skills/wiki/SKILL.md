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

A bare invocation with no URL and no question is ambiguous. Infer the lane from conversation context when a source or a question is clearly in play; otherwise ask which lane rather than guessing.

## Paths

```sh
WIKI_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/wiki"
WIKI_INDEX="$WIKI_HOME/.index.md"
```

Pages are plaintext markdown, flat inside `$WIKI_HOME`, filename `<date>-<slug>.md` (e.g. `2026-08-08-neural-network-basics.md`). No subdirectories — topic grouping happens via `tags`, not folders.

`$WIKI_INDEX` is a generated screening index, not a page. It is a dotfile so that `$WIKI_HOME/*.md` globs — which sync uses to enumerate pages — never pick it up.

`$WIKI_HOME` must be writable without a permission prompt. If a capture write fails on sandbox restrictions, tell the user to add `$WIKI_HOME` to the sandbox allowlist via `/sandbox`, rather than silently disabling the sandbox on every capture.

## Page format

Frontmatter is YAML delimited by `---`, the same convention Obsidian reads as properties, so a vault opened on `$WIKI_HOME` works without conversion. Links stay standard markdown, not `[[wikilinks]]`, so both `rg` and Obsidian can follow them.

```markdown
---
title: Short human title
date: 2026-08-08
source: https://example.com/or/youtube-url
type: article
tags: [kebab-case, freeform, topics]
description: 2-4 sentences summarizing the page body, written so an LLM can judge relevance without reading further.
---

# Short human title

Freeform prose with headings, distilled from the source. Structure adapts
to the content — no fixed template. Explain concepts, don't just list facts.
```

`type` is the medium: `article`, `video`, `paper`, `talk`, `thread`, or another short lowercase word when none fit. It lets query mode filter by medium without parsing the `source` URL.

`tags` are freeform lowercase-kebab-case, chosen by judgment each capture. There is no controlled vocabulary to maintain, but prefer an existing tag over a new synonym — see *Tag reuse*.

## URL normalization

Normalize before both dedup comparison and writing `source:`; store the normalized form. In order:

1. Scheme to `https`.
2. Lowercase the host; strip a leading `www.`, and for YouTube also a leading `m.`.
3. Strip tracking parameters: any `utm_*`, plus `fbclid`, `gclid`, `igshid`, `si`, `ref`, `ref_src`.
4. For YouTube, canonicalize to `https://youtube.com/watch?v=<id>`, folding `youtu.be/<id>`, `/shorts/<id>`, and `/embed/<id>` into one form.
5. Strip a trailing `/` from the path, and drop an empty trailing `?` or `#`.

Keep every other query parameter — many sites need them to identify the resource.

## Capture

1. Detect source type from the URL and normalize the URL.
2. **Dedup check first**, before fetching or transcribing — that work is expensive and wasted on a duplicate. Match literally, so URLs containing `?`, `+`, or `.` are not read as a regex:

   ```sh
   rg -l -F "source: $normalized_url" "$WIKI_HOME"/*.md
   ```

   On an exact match, tell the user and ask whether to **update** the existing page, **create** a new dated page anyway, or **skip**. Never silently overwrite or silently duplicate.

   With no exact match, check for a near-duplicate before proceeding: search the bare host plus any stable id (e.g. a YouTube video id) with `rg -l -F`. On a near-match, surface the candidate page and ask, with the same three options.
3. **YouTube:** delegate to one ordinary subagent, same pattern as the `transcribing-youtube-videos` skill, but give it a broad distillation goal instead of a narrow question — e.g. "extract all key knowledge, concepts, and claims from this video, not just an answer to one question." Resolve the sibling `transcribe-youtube` script from that skill and run it the same way:

   ```bash
   artifacts=$(mktemp -d "${TMPDIR:-/tmp}/youtube-transcript.XXXXXX")
   WHISPER_LANGUAGE=sv WHISPER_MODEL=small \
     /absolute/path/to/skills/transcribing-youtube-videos/transcribe-youtube "$url" "$artifacts"
   ```

   The subagent reads the emitted SRT and returns distilled notes (not the raw transcript) to the parent.
4. **Article/other URL:** use WebFetch directly to retrieve and extract readable content, then distill in the parent.
5. Choose `type` and `tags` (see *Tag reuse*).
6. Write frontmatter + distilled body to `$WIKI_HOME/<date>-<slug>.md`, mode `0600`. Create `$WIKI_HOME` mode `0700` if missing.
7. Regenerate `$WIKI_INDEX` (see *Index*). Every capture ends with this — a stale index silently degrades query mode.

Never paste a full raw transcript or full article HTML into the parent context — only the distilled result.

### Tag reuse

Before choosing tags, read the tags already in use:

```sh
rg -h '^tags:' "$WIKI_HOME"/*.md | sort -u
```

Reuse an existing tag whenever it means the same thing; invent one only when nothing fits. This keeps `ai-agents` / `agents` / `llm-agents` from fragmenting one concept across pages, without imposing a vocabulary to maintain.

### Updating an existing page

When the user chooses "update" on a dedup hit:

- Merge new material into the existing body rather than replacing it — the old page may hold detail the new fetch missed.
- Keep the original `date`; it records when the source entered the wiki. Add `updated: <today>`.
- Keep the original filename, so the slug and any archive correlation stay stable.
- Rewrite `description` to cover the merged body, and extend `tags` as needed.
- Regenerate `$WIKI_INDEX`.

## Index

`$WIKI_INDEX` is a generated screening table — one row per page, derived entirely from frontmatter. Query mode reads this one file instead of grepping every body:

```markdown
# Wiki index

<!-- Generated. Do not edit by hand; regenerated on every capture. -->

| Page | Type | Date | Tags | Description |
|------|------|------|------|-------------|
| [Open Knowledge Format (OKF)](2026-08-28-open-knowledge-format.md) | article | 2026-08-28 | okf, google-cloud | Google Cloud's OKF is a vendor-neutral spec for … |
```

Regenerate by reading the frontmatter block of every `$WIKI_HOME/*.md` and rewriting the file whole. Never edit it incrementally, and never treat it as authoritative — pages are the source of truth, the index is a cache. If it is missing or stale during query, regenerate it and continue.

## Query

1. Extract keywords from the user's question.
2. Read `$WIKI_INDEX` and shortlist candidates from `description`, `tags`, and `type`. This is the primary path: one file read, no corpus grep.
3. If the index is missing, or yields nothing while the question is plainly in scope, fall back to `rg -il` across `$WIKI_HOME/*.md`, broadening terms once. Regenerate the index if it was missing.
4. Read the full body of the best-matching page(s) — usually one to three.
5. Answer the question directly from that content, citing which wiki page(s) (title + path) the answer drew from.

If no page is relevant, say so plainly rather than answering from memory — the wiki is empty on this topic, not the question unanswerable in general.

## Invariants

- Capture and query never touch jj, SOPS, rage, signing, or a remote. Those are cold-path only, entered on explicit request.
- No remote or encryption key is ever guessed. See `references/sync-security.md`.
- `$WIKI_HOME` is intentionally plaintext at rest, mode `0700`/`0600`, for fast local grep-based querying.
- Every page carries `title`, `date`, `source`, `type`, `tags`, `description` — query mode depends on `description` being readable without loading the body.
- `$WIKI_INDEX` is generated, never hand-edited, never authoritative over page frontmatter, and never synced.
