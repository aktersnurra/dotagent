import { test } from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const viewer = join(dirname(fileURLToPath(import.meta.url)), "..")

// Starts the server and resolves with the address it prints, or rejects if it exits first.
const start = (t, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server.mjs", ...args], { cwd: viewer, stdio: ["ignore", "pipe", "pipe"] })
    t.after(() => child.kill())
    let out = ""
    child.stdout.on("data", (d) => {
      out += d
      const m = /storyline viewer: (http:\/\/127\.0\.0\.1:\d+)/.exec(out)
      if (m) resolve(m[1])
    })
    child.on("exit", (code) => reject(new Error(`server exited with ${code} before printing an address`)))
  })

test("two servers started without --port both come up, each on its own address", async (t) => {
  const [a, b] = await Promise.all([start(t), start(t)])
  assert.notEqual(a, b)
  for (const address of [a, b]) {
    const res = await fetch(address + "/")
    assert.equal(res.status, 200)
  }
})

test("--port is honoured", async (t) => {
  const probe = await start(t)
  const free = Number(new URL(probe).port) + 1000
  assert.equal(await start(t, ["--port", String(free)]), `http://127.0.0.1:${free}`)
})

test("comments are written next to the story and served back after a restart", async (t) => {
  const { mkdtempSync, copyFileSync, readFileSync, rmSync } = await import("node:fs")
  const { tmpdir } = await import("node:os")
  const dir = mkdtempSync(join(tmpdir(), "storyline-"))
  t.after(() => rmSync(dir, { recursive: true }))
  const story = join(dir, "story.json")
  copyFileSync(join(viewer, "fixtures", "pr-a1b35ba.story.json"), story)
  const saved = [{ id: "c1", blockId: "b", quote: "", text: "why?", answer: "because" }]

  const first = await start(t, ["--story", story])
  assert.deepEqual(await (await fetch(first + "/comments.json")).json(), [])
  const put = await fetch(first + "/comments.json", { method: "PUT", body: JSON.stringify(saved) })
  assert.equal(put.status, 204)
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "story.comments.json"), "utf8")), saved)

  const second = await start(t, ["--story", story])
  assert.deepEqual(await (await fetch(second + "/comments.json")).json(), saved)

  const bad = await fetch(first + "/comments.json", { method: "PUT", body: "{\"not\":\"a list\"}" })
  assert.equal(bad.status, 400)
})
