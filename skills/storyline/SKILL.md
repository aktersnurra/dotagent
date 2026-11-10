---
name: storyline
description: Shared viewer, story schema and validator used by the pr-story and codebase-story skills. Not invoked on its own.
disable-model-invocation: true
---

# Storyline

Shared parts for the story skills. Nothing here runs on its own.

- `SCHEMA.md`: the story JSON format.
- `viewer/dist/index.html`: the viewer bundle, built from `viewer/src/`.
- `viewer/dist/validate.mjs`: checks a story; with `--repo` checks its anchors and quoted code
  against the repo, and with `--diff` checks it against the real diff.
- `viewer/server.mjs`: serves a story and answers questions through a headless harness. It keeps
  the reader's questions and answers in `<story>.comments.json` beside the story file.

Skills that use it: `pr-story` and `codebase-story`.

To change the viewer, run `npm install` in `viewer/`, edit `viewer/src/`, then `npm run typecheck`,
`npm test` and `npm run build`. Commit the rebuilt files in `viewer/dist/`.
