---
name: explain
description: Use when the user asks for a detailed explanation, walkthrough, codebase tour, app overview, service overview, operational guide, or durable Markdown/HTML documentation generated from an answer.
disable-model-invocation: true
---

# Explain

## Overview

Create a durable answer: resolve whether the artifact is project-scoped or user-scoped,
write the full explanation to Markdown under the matching Superpowers docs root, render
it to HTML with Pandoc and the shared CSS, then open the HTML page in the default
browser.

Do not put the full explanation in chat. The chat response is only a short artifact
summary. The current working directory alone never makes a personal or global topic
project-scoped.

## When to Use

Use for requests such as:

- "explain this codebase"
- "give me a detailed walkthrough of this app"
- "walk me through this service"
- "explain how to work with jj"
- "write a guide for xyz"

Do not use for short conversational answers where the user did not ask for a durable
explanation, walkthrough, guide, or document.

## Artifact Scope and Output Contract

Resolve the artifact root before writing:

1. **Explicit or domain location:** a user-provided path or an active domain-specific
   skill's canonical storage contract wins over Explain's generic artifact roots.
2. **Project scope:** if the subject is the current repository, its code, operation, or
   architecture, use `docs/superpowers/explain/` in that project.
3. **User scope:** if the subject is personal, general, or unrelated to the current
   repository, use `${XDG_DATA_HOME:-$HOME/.local/share}/pi/docs/superpowers/explain/`.
4. **Ambiguous scope:** ask one location question before writing.

Never place personal or global research in an unrelated repository merely because it is
the current working directory.

Write the reading artifacts under the resolved `<explain-root>`:

```text
<explain-root>/<YYYY-MM-DD>-<topic>.md
<explain-root>/<YYYY-MM-DD>-<topic>.html
```

If the user explicitly asks for slides, also write and render a separate condensed
source:

```text
<explain-root>/<YYYY-MM-DD>-<topic>-slides.md
<explain-root>/<YYYY-MM-DD>-<topic>-slides.html
```

The reading Markdown file is authoritative. Slides are a distilled companion. HTML files
are derived from their matching Markdown sources. Supporting trackers or datasets
requested by the user live under the same resolved docs root, never in an unrelated
project.

## Workflow

1. Treat the text after the skill invocation as the question or command to answer.
2. Research the current project or requested subject enough to answer accurately.
3. Resolve project, user, or ambiguous artifact scope using the rules above. Do not
   infer scope from the working directory alone.
4. Choose `<topic>`:
   - If the prompt has an obvious subject, create a lowercase hyphenated slug from it.
   - If the prompt is vague, ask the user for a short title or topic before writing
     files.
5. Create the resolved `<explain-root>` if needed.
6. Write the complete answer to `<explain-root>/<YYYY-MM-DD>-<topic>.md`.
7. Check `command -v pandoc`.
8. If Pandoc is missing, ask whether to install it before running any install command.
9. If the user declines installation or Pandoc cannot be installed, stop after Markdown
   and report that HTML was not generated.
10. Render and open the reading page with:

```bash
skills/explain/scripts/render.sh <explain-root>/<YYYY-MM-DD>-<topic>.md
```

11. If the user explicitly requested slides, write a condensed slide source under the
    same `<explain-root>`.
12. Render and open the slide deck with:

```bash
skills/explain/scripts/render-slides.sh <explain-root>/<YYYY-MM-DD>-<topic>-slides.md
```

13. Reply only with:
    - Markdown path
    - HTML path, if generated
    - Slides Markdown path, if generated
    - Slides HTML path, if generated
    - Whether the browser was opened

## Pandoc Installation

Never install Pandoc without explicit user approval.

If Pandoc is missing, ask first. After approval, use the available package manager:

```bash
sudo apt-get update && sudo apt-get install -y pandoc
```

or:

```bash
brew install pandoc
```

If neither package manager is available, tell the user to install Pandoc manually and
keep the Markdown artifact.

## Document Quality

The Markdown answer should be useful as a standalone document:

- Start with a clear title.
- Include a short summary before details.
- Use headings that match the user's question.
- Include code, commands, file paths, diagrams, or tables when they make the explanation
  clearer.
- Prefer concrete project evidence over generic advice.
- State assumptions and limitations when relevant.

## Slide Quality

Only create slides when explicitly requested. Slides are a presentation companion, not a
replacement for the reading document.

- Write a separate `*-slides.md` source.
- Separate slides with `---`.
- Put one idea on each slide.
- Use 3-5 bullets per slide at most.
- Keep code snippets short enough to present.
- Convert dense tables into bullets.
- Prefer takeaways, sequence, and narrative over exhaustive detail.
- Keep full detail in the normal Markdown document.

## Common Mistakes

| Mistake                                                | Correct behavior                                          |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Answering fully in chat                                | Write the full answer to Markdown and keep chat short     |
| Treating the working directory as the artifact scope   | Classify the subject as project, user, or ambiguous first |
| Writing personal research into an unrelated repository | Use the user-scoped Superpowers docs root                 |
| Using legacy `docs/explain/` for project artifacts     | Use `docs/superpowers/explain/`                           |
| Rendering before Markdown exists                       | Write Markdown first, then render HTML                    |
| Installing Pandoc automatically                        | Ask for approval before installing                        |
| Skipping browser open                                  | Use the render helper, which opens the HTML page          |
| Generating slides by default                           | Generate slides only when explicitly requested            |
| Rendering the reading doc as slides                    | Write a separate condensed `*-slides.md` source first     |
| Using one-off CSS                                      | Use the skill CSS assets through the render helpers       |
