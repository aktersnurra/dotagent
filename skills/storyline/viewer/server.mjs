// Local storyline server: serves the viewer and answers sticker questions through a headless harness.
// Node standard library only. Usage: node server.mjs [--story file] [--port n] [--harness claude] [--open]
// Without --port the system picks a free one; the address is printed once the server is listening.
import { createServer } from "node:http"
import { readFileSync, writeFileSync } from "node:fs"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
let port = Number(arg("port", "0")) // 0: any free port; set to the real one on listen
const shouldOpen = process.argv.includes("--open")
const harnessName = arg("harness", "claude")
const storyPath = arg("story", join(here, "fixtures", "dotagent-install.story.json"))

// The reader's questions and answers live beside the story: story.json -> story.comments.json.
const commentsPath = storyPath.replace(/(\.json)?$/, ".comments.json")

// A harness turns a prompt into a stream of text deltas. One implementation per agent.
// Throws (async) with { code, message } on failure.
const harnesses = {
  claude: async function* (prompt, signal) {
    const child = spawn(
      "claude",
      ["-p", "--output-format", "stream-json", "--include-partial-messages", "--verbose",
       "--no-session-persistence", "--tools", "", "--disable-slash-commands", "--model", "haiku"],
      { cwd: "/tmp", stdio: ["pipe", "pipe", "pipe"], signal },
    )
    let stderr = ""
    child.stderr.on("data", (d) => { stderr += d })
    const exited = new Promise((resolve) => child.on("close", resolve))
    child.on("error", () => {})
    child.stdin.end(prompt)
    let buf = ""
    for await (const chunk of child.stdout) {
      buf += chunk
      const lines = buf.split("\n")
      buf = lines.pop() ?? ""
      for (const line of lines) {
        let ev
        try { ev = JSON.parse(line) } catch { continue }
        const d = ev.type === "stream_event" ? ev.event?.delta : undefined
        if (d?.type === "text_delta" && d.text) yield d.text
      }
    }
    const code = await exited
    if (code !== 0 && !signal.aborted) {
      throw { code: "harness_failed", message: stderr.trim().split("\n").pop() || `claude exited with ${code}` }
    }
  },
}
const harness = harnesses[harnessName]
if (!harness) { console.error(`unknown harness: ${harnessName}`); process.exit(1) }

const page = readFileSync(join(here, "dist", "index.html"))

// Reject requests that did not come from this page: any website could otherwise POST to localhost.
const sameOrigin = (req) => {
  const host = req.headers.host
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return false
  const origin = req.headers.origin
  return origin === undefined || origin === `http://${host}`
}

const readBody = async (req, limit = 262144) => {
  let size = 0; const parts = []
  for await (const c of req) { size += c.length; if (size > limit) throw { code: "prompt_too_large", message: "Prompt too large." }; parts.push(c) }
  return Buffer.concat(parts).toString("utf8")
}

createServer(async (req, res) => {
  if (!sameOrigin(req)) { res.writeHead(403).end(); return }
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page); return
  }
  if (req.method === "GET" && req.url === "/story.json") {
    try {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(readFileSync(storyPath))
    } catch {
      res.writeHead(404).end()
    }
    return
  }
  if (req.method === "GET" && req.url === "/comments.json") {
    let saved = "[]"
    try { saved = readFileSync(commentsPath, "utf8") } catch (e) { if (e.code !== "ENOENT") { res.writeHead(500).end(); return } }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(saved); return
  }
  if (req.method === "PUT" && req.url === "/comments.json") {
    try {
      const comments = JSON.parse(await readBody(req, 4194304))
      if (!Array.isArray(comments)) throw new Error("not a list")
      writeFileSync(commentsPath, JSON.stringify(comments, null, 2) + "\n")
    } catch (e) {
      res.writeHead(e instanceof SyntaxError || e.message === "not a list" || e.code === "prompt_too_large" ? 400 : 500).end(); return
    }
    res.writeHead(204).end(); return
  }
  if (req.method === "POST" && req.url === "/ask") {
    const ctl = new AbortController()
    res.on("close", () => ctl.abort())
    res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-store" })
    const send = (o) => res.write(JSON.stringify(o) + "\n")
    try {
      const { prompt } = JSON.parse(await readBody(req))
      if (typeof prompt !== "string" || prompt.trim() === "") throw { code: "invalid_request", message: "Missing prompt." }
      for await (const text of harness(prompt, ctl.signal)) send({ type: "delta", text })
      send({ type: "done" })
    } catch (e) {
      if (!ctl.signal.aborted) send({ type: "error", code: e?.code ?? "upstream_error", message: e?.message ?? String(e) })
    }
    res.end(); return
  }
  res.writeHead(404).end()
}).listen(port, "127.0.0.1", function () {
  port = this.address().port
  console.log(`storyline viewer: http://127.0.0.1:${port}  (harness: ${harnessName})`)
  if (shouldOpen) {
    const opener = process.platform === "darwin" ? "open" : "xdg-open"
    spawn(opener, [`http://127.0.0.1:${port}`], { stdio: "ignore", detached: true }).on("error", () => {}).unref()
  }
})
