#!/usr/bin/env node
/* embed_standalone.js — inline all local media into a single portable HTML file.
 * Usage: node embed_standalone.js <report.html> [out.html]
 *   Reads every "media/…" reference (src/poster/<source>/CSS url()) relative to the report's folder,
 *   base64-encodes it as a data: URI, and writes a self-contained <name>-standalone.html that works
 *   when shared on its own (no media/ folder needed). Note: embedding videos inflates size ~33%.
 */
const fs = require("fs");
const path = require("path");

const inPath = process.argv[2];
if (!inPath) { console.error("usage: node embed_standalone.js <report.html> [out.html]"); process.exit(1); }
const dir = path.dirname(path.resolve(inPath));
const outPath = process.argv[3] || inPath.replace(/\.html?$/i, "") + "-standalone.html";

const MIME = {".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",
              ".gif":"image/gif",".svg":"image/svg+xml",".mp4":"video/mp4",".webm":"video/webm",
              ".m4v":"video/mp4",".mov":"video/quicktime"};

let html = fs.readFileSync(inPath, "utf8");
const cache = new Map();
let ok = 0, miss = 0, bytes = 0;
function toDataUri(rel){
  if (cache.has(rel)) return cache.get(rel);
  const file = path.join(dir, decodeURIComponent(rel));
  let uri = rel;
  try {
    const buf = fs.readFileSync(file);
    const mime = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    uri = `data:${mime};base64,${buf.toString("base64")}`;
    ok++; bytes += buf.length;
  } catch(e){ miss++; console.error("  ! missing:", rel); }
  cache.set(rel, uri);
  return uri;
}
// match quoted "media/…" (src, poster, <source src>) and css url(media/…)
html = html.replace(/(["'])(media\/[^"']+)\1/g, (m,q,rel)=>`${q}${toDataUri(rel)}${q}`);
html = html.replace(/url\(\s*(media\/[^)'"]+)\s*\)/g, (m,rel)=>`url(${toDataUri(rel)})`);

fs.writeFileSync(outPath, html, "utf8");
console.log(`Standalone written: ${outPath}`);
console.log(`  embedded ${ok} files (${(bytes/1048576).toFixed(1)} MB) · missing ${miss} · output ${(Buffer.byteLength(html)/1048576).toFixed(1)} MB`);
if (miss) console.error("WARNING: some media missing — those references stay as relative paths.");
