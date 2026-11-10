import { build } from "esbuild"
import { readFileSync, writeFileSync, statSync } from "node:fs"
await build({ entryPoints: ["src/main.tsx"], bundle: true, minify: true, format: "iife",
  jsx: "automatic", jsxImportSource: "preact", target: "es2022", loader: { ".svg": "text" }, outfile: "dist/viewer.js", legalComments: "none" })
await build({ entryPoints: ["cli/validate.mjs"], bundle: true, minify: true, format: "esm", platform: "node",
  target: "node22", outfile: "dist/validate.mjs", legalComments: "none" })
const js = readFileSync("dist/viewer.js", "utf8").replaceAll("</script", "<\\/script")
const font = (w) => readFileSync(`node_modules/@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-${w}-normal.woff2`).toString("base64")
const face = (family, file) => readFileSync(`node_modules/@fontsource/${family}/files/${family}-latin-${file}.woff2`).toString("base64")
const head = readFileSync("page.head.html", "utf8").replace("__FONT_400__", font(400)).replace("__FONT_600__", font(600))
  .replace("__LIT_400__", face("literata", "400-normal")).replace("__LIT_400I__", face("literata", "400-italic")).replace("__LIT_700__", face("literata", "700-normal"))
  .replace("__MONO_400__", face("ibm-plex-mono", "400-normal")).replace("__MONO_600__", face("ibm-plex-mono", "600-normal"))
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  head.replace("<div id=\"root\">", "</head><body><div id=\"root\">") + `<script>${js}</script></body></html>\n`
writeFileSync("dist/index.html", html)
console.log("viewer.js", (statSync("dist/viewer.js").size / 1024).toFixed(0), "KiB; index.html", (statSync("dist/index.html").size / 1024).toFixed(0), "KiB")
