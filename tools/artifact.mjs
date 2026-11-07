// tools/artifact.mjs — turn the Vite build into a page the Artifact host can publish.
// The host wraps the page in its own <!doctype html><head><body>, so this strips those from
// dist/index.html and writes dist/artifact.html; everything else in dist/ is published beside it.
import fs from "node:fs";
const html = fs.readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/i, "").replace(/<meta name="viewport"[^>]*>\s*/i, "");
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
fs.writeFileSync("dist/artifact.html", (head.trim() + "\n" + body.trim() + "\n"));
console.log("wrote dist/artifact.html");
