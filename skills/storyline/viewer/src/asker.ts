import { Context, Data, Effect, Layer } from "effect"

export class AskFailed extends Data.TaggedError("AskFailed")<{
  readonly code: string
  readonly message: string
  readonly partial: string | undefined
}> {}

const toAskFailed = (e: unknown) => {
  const err = e as { code?: string; message?: string; text?: string }
  return new AskFailed({ code: err.code ?? "unknown", message: err.message ?? String(e), partial: err.text })
}

export class Asker extends Context.Service<Asker, {
  ask(prompt: string, onText: (whole: string) => void): Effect.Effect<string, AskFailed>
}>()("storyline/Asker") {
  static readonly artifact = Layer.succeed(
    Asker,
    Asker.of({
      ask: (prompt, onText) =>
        Effect.tryPromise({
          try: async (signal) => {
            const sample = await window.claude?.use("sample")
            if (!sample) throw { code: "unavailable", message: "Claude is not available in this view." }
            const { text } = await sample(prompt, {
              signal,
              cache: false,
              modelTier: "quick",
              onText: ({ text }) => onText(text),
            })
            return text
          },
          catch: toAskFailed,
        }),
    }),
  )

  static readonly local = Layer.succeed(
    Asker,
    Asker.of({
      ask: (prompt, onText) =>
        Effect.tryPromise({
          try: async (signal) => {
            const res = await fetch("/ask", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ prompt }),
              signal,
            })
            if (!res.ok || !res.body) throw { code: "upstream_error", message: `Server answered ${res.status}.` }
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
            let pending = ""
            let whole = ""
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              pending += value
              const lines = pending.split("\n")
              pending = lines.pop() ?? ""
              for (const line of lines) {
                if (line === "") continue
                const ev = JSON.parse(line) as
                  | { type: "delta"; text: string }
                  | { type: "done" }
                  | { type: "error"; code: string; message: string }
                if (ev.type === "delta") { whole += ev.text; onText(whole) }
                else if (ev.type === "error") throw { code: ev.code, message: ev.message, text: whole }
              }
            }
            if (whole === "") throw { code: "empty_completion", message: "No answer came back." }
            return whole
          },
          catch: toAskFailed,
        }),
    }),
  )
}
