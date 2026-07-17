---
name: transcribing-youtube-videos
description: Use when a question must be answered from a YouTube video and captions may be missing, disabled, incomplete, or insufficient for timestamped evidence.
---

# Transcribing YouTube Videos

## Contract

The parent delegates the entire operation to **one ordinary subagent**. The parent does not download media, run transcription, or read the raw transcript.

The subagent receives the URL and exact question, performs the workflow, reads the transcript, and returns only the evidence-backed answer plus the transcript path and limitations. It does not launch another subagent.

## Workflow

1. Try the dedicated `youtube_transcript` tool when available. If it returns a useful transcript, answer from it.
2. Otherwise resolve the sibling `transcribe-youtube` script and run:

```bash
artifacts=$(mktemp -d "${TMPDIR:-/tmp}/youtube-transcript.XXXXXX")
WHISPER_LANGUAGE=sv WHISPER_MODEL=small \
  /absolute/path/to/transcribe-youtube "$url" "$artifacts"
```

3. Read the emitted SRT, answer the exact question, then keep the transcript and let the script remove temporary audio.

The script first asks `yt-dlp` for subtitles. If none exist, it pipes the best audio stream directly through `ffmpeg` into a temporary WAV and runs Whisper through `uvx`.

## Answer

Return, in order:

- **Direct evidence:** timestamped quotes or tight paraphrases.
- **Inference:** clearly separated reasoning, if needed.
- **Confidence:** high, medium, or low with one reason.
- **Artifact:** the transcript path.
- **Limitations:** inaudible speech, uncertain names, translation, or missing sections.

Never paste the full transcript or raw media into the parent context. Never invent spoken claims. On failure, report the failed command and its stderr instead of guessing.

## Dependencies

- `uvx`
- `ffmpeg`
- Network access

`uvx` supplies `yt-dlp` and `openai-whisper`; do not use `pip` or install persistent Python packages. The first Whisper run downloads the selected model into the uv cache.

## Common mistakes

- Stopping when captions are disabled instead of using the audio fallback.
- Answering from memory instead of transcript evidence.
- Mixing direct statements with inference.
- Running the workflow in the parent instead of the delegated subagent.
