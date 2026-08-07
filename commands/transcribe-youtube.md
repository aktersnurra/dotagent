---
description: Transcribe a YouTube video and return a transcript-grounded overview
argument-hint: "<YouTube-URL>"
---

# Transcribe a YouTube video

Use the `transcribing-youtube-videos` skill for this YouTube URL:

$ARGUMENTS

The user requests a transcript and overview. Return:

1. A concise overview grounded in the transcript.
2. Timestamped direct evidence or tight paraphrases.
3. Clearly separated inference, only when needed.
4. Confidence, the transcript artifact path, and limitations.

Do not paste the full raw transcript.
