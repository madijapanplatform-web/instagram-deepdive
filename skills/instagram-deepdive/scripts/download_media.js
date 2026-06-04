#!/usr/bin/env node
/* download_media.js — download a list of media URLs to local files.
 * Instagram CDN URLs expire and are best saved locally so the report keeps working.
 *
 * Usage: node download_media.js <tasks.json>
 *   tasks.json = [ { "url": "...", "dest": "abs/or/rel/path.jpg" }, ... ]
 * Creates parent dirs, downloads with browser-like headers, ~6 concurrent.
 * Prints "ok=<n> fail=<n>" and lists failures (if any).
 */
const fs = require("fs");
const path = require("path");

const tasksPath = process.argv[2];
if(!tasksPath){ console.error("usage: node download_media.js <tasks.json>"); process.exit(1); }
const tasks = JSON.parse(fs.readFileSync(tasksPath,"utf8"));
const headers = {
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Referer":"https://www.instagram.com/"
};
let ok=0, fail=0; const fails=[];
async function dl({url,dest}){
  try{
    const r=await fetch(url,{headers});
    if(!r.ok){ fail++; fails.push([dest,r.status]); return; }
    const buf=Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,buf);
    if(buf.length<1000){ fail++; fails.push([dest,"tiny:"+buf.length]); } else ok++;
  }catch(e){ fail++; fails.push([dest,e.message]); }
}
(async()=>{
  const N=6; let idx=0;
  async function worker(){ while(idx<tasks.length){ const i=idx++; await dl(tasks[i]);
    if((ok+fail)%25===0) process.stderr.write(`  ${ok+fail}/${tasks.length}\n`); } }
  await Promise.all(Array.from({length:N},worker));
  console.log(`ok=${ok} fail=${fail}`);
  if(fails.length) console.log("FAILS:", JSON.stringify(fails.slice(0,40)));
})();
