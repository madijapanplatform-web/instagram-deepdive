#!/usr/bin/env node
/* render_overview.js — renders the 30-day "best content" overview report.
 * Usage: node render_overview.js <dataDir> <out.html>
 */
const fs = require("fs");
const path = require("path");
const [,, dataDir, outPath] = process.argv;
if(!dataDir||!outPath){console.error("usage: node render_overview.js <dataDir> <out.html>");process.exit(1);}
const sel = JSON.parse(fs.readFileSync(path.join(dataDir,"selected.json"), "utf8"));
const profiles = JSON.parse(fs.readFileSync(path.join(dataDir,"profiles.json"), "utf8"));

const esc = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nf = (n) => (n || 0).toLocaleString("en-US");
const fmtDate = (t) => { if (!t) return ""; const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };
const capHtml = (c) => esc(c).replace(/\n/g, "<br>").replace(/#([^\s#<]+)/g, '<span class="tag">#$1</span>').replace(/@([A-Za-z0-9._]+)/g, '<span class="tag">@$1</span>');
const order = Object.keys(sel);

function mediaHtml(p, gid) {
  if (p.isVideo && p.local.video) {
    return `<div class="media"><video controls preload="metadata" poster="${p.local.cover}"><source src="${p.local.video}" type="video/mp4"></video><span class="badge">릴스</span></div>`;
  }
  const imgs = p.local.images && p.local.images.length ? p.local.images : (p.local.cover ? [p.local.cover] : []);
  if (imgs.length === 0) return `<div class="media empty">미디어 없음</div>`;
  const slides = imgs.map((src, i) => `<img src="${src}" loading="lazy" class="slide${i===0?" active":""}" data-i="${i}">`).join("");
  const multi = imgs.length > 1;
  const dots = multi ? `<div class="dots">${imgs.map((_,i)=>`<span class="dot${i===0?" on":""}"></span>`).join("")}</div>` : "";
  const arrows = multi ? `<button class="nav prev" data-g="${gid}">‹</button><button class="nav next" data-g="${gid}">›</button><span class="badge counter">1/${imgs.length}</span>` : "";
  return `<div class="media carousel" id="${gid}" data-n="${imgs.length}">${slides}${arrows}${dots}</div>`;
}

function card(p, rank, gid) {
  const eng = p.likes + p.comments;
  const viewsLine = p.isVideo && p.views ? `<span class="stat">${nf(p.views)} views</span>` : "";
  return `
  <article class="card">
    <div class="rank">#${rank}</div>
    ${mediaHtml(p, gid)}
    <div class="body">
      <div class="stats">
        <span class="stat like">좋아요 ${nf(p.likes)}</span>
        <span class="stat">댓글 ${nf(p.comments)}</span>
        ${viewsLine}
        <span class="stat eng">참여 ${nf(eng)}</span>
      </div>
      <div class="meta">${fmtDate(p.timestamp)} · ${p.isVideo?"릴스":"게시물"} · <a href="${p.url}" target="_blank">원본 보기 ↗</a>${p.analysisHref?` · <a href="${p.analysisHref}" class="analysis-link">📊 심층 분석</a>`:""}</div>
      <div class="caption">${capHtml(p.caption)}</div>
    </div>
  </article>`;
}

function section(acc) {
  const pr = profiles[acc];
  const data = sel[acc];
  let gid = 0;
  const cards = data.top.map((p, i) => card(p, i + 1, `${acc}-c${gid++}`)).join("");
  return `
  <section class="account" id="${acc}">
    <header class="profile">
      <div class="avatar-ring"><img class="avatar" src="${pr.localPic}" alt="${esc(pr.username)}"></div>
      <div class="pinfo">
        <div class="ptop"><h2>@${esc(pr.username)}</h2><a class="iglink" href="https://www.instagram.com/${esc(pr.username)}/" target="_blank">Instagram ↗</a></div>
        <div class="counts">
          <span><b>${nf(pr.posts)}</b> 게시물</span>
          <span><b>${nf(pr.followers)}</b> 팔로워</span>
          <span><b>${nf(pr.follows)}</b> 팔로잉</span>
        </div>
        <div class="fullname">${esc(pr.fullName)}</div>
        <div class="bio">${capHtml(pr.bio)}</div>
        <div class="note">최근 30일 수집 ${data.total}건 · ${pr.note}</div>
      </div>
    </header>
    <div class="grid">${cards}</div>
  </section>`;
}

const sections = order.map(section).join("");
const navLinks = order.map(a => `<a href="#${a}">@${a}</a>`).join("");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>인스타그램 콘텐츠 리포트 · 최근 30일 베스트</title>
<script>(function(){var t=localStorage.getItem("igreport-theme");if(t)document.documentElement.setAttribute("data-theme",t);})();</script>
<style>
  :root{--bg:#f4f5f7;--card:#fff;--line:#ececf0;--txt:#16161a;--sub:#8a8a99;--accent:#6d5efc;--grad:linear-gradient(135deg,#f9508f 0%,#a93efc 50%,#6d5efc 100%);--shadow:0 4px 20px rgba(20,20,40,.06);--shadow-lg:0 12px 36px rgba(20,20,40,.12);--chip-bg:#f4f4f8;--chip-txt:#444;--bio:#666;--caption:#3a3a44;--media-bg:#eef0f4;--avatar-border:#fff;--bar-bg:rgba(255,255,255,.72);--bar-border:rgba(255,255,255,.6);--nav-a:#555;--scroll:#dcdce4;}
  :root[data-theme="dark"]{--bg:#0e0e12;--card:#1a1a20;--line:#2a2a32;--txt:#f0f0f4;--sub:#8e8e9c;--accent:#9a8cff;--shadow:0 4px 20px rgba(0,0,0,.4);--shadow-lg:0 12px 40px rgba(0,0,0,.6);--chip-bg:#26262f;--chip-txt:#c8c8d4;--bio:#a8a8b4;--caption:#c4c4d0;--media-bg:#26262f;--avatar-border:#1a1a20;--bar-bg:rgba(20,20,26,.72);--bar-border:rgba(255,255,255,.06);--nav-a:#c8c8d4;--scroll:#3a3a44;}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e0e12;--card:#1a1a20;--line:#2a2a32;--txt:#f0f0f4;--sub:#8e8e9c;--accent:#9a8cff;--shadow:0 4px 20px rgba(0,0,0,.4);--shadow-lg:0 12px 40px rgba(0,0,0,.6);--chip-bg:#26262f;--chip-txt:#c8c8d4;--bio:#a8a8b4;--caption:#c4c4d0;--media-bg:#26262f;--avatar-border:#1a1a20;--bar-bg:rgba(20,20,26,.72);--bar-border:rgba(255,255,255,.06);--nav-a:#c8c8d4;--scroll:#3a3a44;}}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{color-scheme:light dark;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:var(--bg);color:var(--txt);line-height:1.6;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s;}
  .profile,.card,.topbar,.stat,.counts span,.topbar nav a{transition:background .3s,color .3s,box-shadow .3s,border-color .3s,transform .2s;}
  .topbar{position:sticky;top:0;z-index:50;background:var(--bar-bg);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--bar-border);box-shadow:0 1px 16px rgba(20,20,40,.04);padding:18px 32px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
  .topbar h1{font-size:17px;font-weight:700;letter-spacing:-.02em;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .topbar .sub{color:var(--sub);font-size:12px;font-weight:400;}
  .topbar nav{margin-left:auto;display:flex;gap:10px;}
  .topbar nav a{font-size:12.5px;font-weight:500;color:var(--nav-a);text-decoration:none;padding:7px 15px;border-radius:99px;background:var(--card);box-shadow:var(--shadow);transition:transform .18s,box-shadow .18s,color .18s;cursor:pointer;border:none;}
  .topbar nav a:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg);color:var(--accent);}
  .wrap{max-width:1180px;margin:0 auto;padding:44px 32px 90px;}
  .account{margin-bottom:80px;}
  .profile{position:relative;display:flex;gap:30px;align-items:center;background:var(--card);border-radius:24px;padding:30px 34px;margin-bottom:34px;box-shadow:var(--shadow);overflow:hidden;}
  .profile::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;background:var(--grad);}
  .avatar-ring{padding:3px;background:var(--grad);border-radius:50%;flex-shrink:0;}
  .avatar{width:86px;height:86px;border-radius:50%;object-fit:cover;display:block;border:3px solid var(--avatar-border);}
  .pinfo{flex:1;min-width:0;}
  .ptop{display:flex;align-items:center;gap:14px;margin-bottom:12px;}
  .ptop h2{font-size:21px;font-weight:700;letter-spacing:-.02em;}
  .iglink{font-size:12px;font-weight:600;color:#fff;text-decoration:none;padding:6px 14px;border-radius:99px;background:var(--grad);box-shadow:0 4px 14px rgba(169,62,252,.3);transition:transform .18s;}
  .iglink:hover{transform:translateY(-1px);}
  .counts{display:flex;gap:14px;margin-bottom:12px;flex-wrap:wrap;}
  .counts span{font-size:12.5px;color:var(--sub);background:var(--chip-bg);padding:7px 14px;border-radius:12px;}
  .counts b{color:var(--txt);font-weight:700;}
  .fullname{font-weight:700;font-size:14px;margin-bottom:3px;}
  .bio{font-size:12.5px;color:var(--bio);margin-bottom:10px;line-height:1.5;}
  .note{font-size:11.5px;color:var(--accent);font-weight:500;background:rgba(109,94,252,.08);display:inline-block;padding:5px 12px;border-radius:99px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:26px;}
  .card{position:relative;display:flex;flex-direction:column;background:var(--card);border-radius:20px;overflow:hidden;box-shadow:var(--shadow);transition:transform .22s ease,box-shadow .22s ease;}
  .card:hover{transform:translateY(-5px);box-shadow:var(--shadow-lg);}
  .rank{position:absolute;top:14px;left:14px;z-index:8;background:rgba(22,22,26,.78);backdrop-filter:blur(6px);color:#fff;font-weight:700;font-size:12px;letter-spacing:.02em;padding:5px 11px;border-radius:99px;}
  .media{position:relative;width:100%;aspect-ratio:1/1;background:var(--media-bg);overflow:hidden;display:flex;align-items:center;justify-content:center;}
  .media.empty{color:var(--sub);background:var(--media-bg);font-size:12px;}
  .media img.slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s;}
  .media img.slide.active{opacity:1;}
  .media video{width:100%;height:100%;object-fit:cover;background:#000;}
  .badge{position:absolute;top:14px;right:14px;background:rgba(22,22,26,.78);backdrop-filter:blur(6px);color:#fff;font-size:11px;font-weight:600;letter-spacing:.02em;padding:4px 10px;border-radius:99px;}
  .nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.18);border:none;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;color:#222;z-index:6;opacity:0;transition:opacity .2s,transform .15s;}
  .card:hover .nav{opacity:1;}
  .nav:active{transform:translateY(-50%) scale(.9);}
  .nav.prev{left:12px;} .nav.next{right:12px;}
  .dots{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:6;}
  .dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.55);transition:background .2s,transform .2s;}
  .dot.on{background:#fff;transform:scale(1.25);}
  .body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:9px;}
  .stats{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
  .stat{font-size:12.5px;font-weight:600;color:var(--chip-txt);background:var(--chip-bg);padding:5px 11px;border-radius:99px;}
  .stat.like{color:#e8467c;background:rgba(232,70,124,.1);}
  .stat.eng{margin-left:auto;color:#fff;background:var(--grad);box-shadow:0 3px 10px rgba(169,62,252,.28);}
  .meta{font-size:11.5px;color:var(--sub);}
  .meta a{color:var(--accent);text-decoration:none;font-weight:500;}
  .meta a:hover{text-decoration:underline;}
  .meta a.analysis-link{background:var(--grad);color:#fff;padding:2px 9px;border-radius:99px;font-weight:600;}
  .caption{font-size:12.5px;line-height:1.65;color:var(--caption);max-height:104px;overflow-y:auto;white-space:normal;padding-right:4px;}
  .caption .tag{color:var(--accent);font-weight:500;}
  .caption::-webkit-scrollbar{width:5px;} .caption::-webkit-scrollbar-thumb{background:var(--scroll);border-radius:3px;}
  footer{text-align:center;color:var(--sub);font-size:11.5px;padding:36px 0 0;border-top:1px solid var(--line);}
</style>
</head>
<body>
  <div class="topbar">
    <h1>Instagram Best Content</h1>
    <span class="sub">최근 30일 · 참여도(좋아요+댓글) 상위 콘텐츠</span>
    <nav>${navLinks}<button id="themeToggle" aria-label="테마 전환">🌙 다크</button></nav>
  </div>
  <div class="wrap">
    ${sections}
    <footer>수집 기준일: 2026-06-04 · 데이터 출처: Instagram (Apify) · 참여도 = 좋아요 + 댓글 수 기준 내림차순</footer>
  </div>
<script>
  (function(){
    const root=document.documentElement, btn=document.getElementById("themeToggle");
    const saved=localStorage.getItem("igreport-theme");
    function paint(t){
      const dark = t==="dark" || (t==null && window.matchMedia("(prefers-color-scheme:dark)").matches);
      btn.textContent = dark ? "☀️ 라이트" : "🌙 다크";
    }
    if(saved){root.setAttribute("data-theme",saved);}
    paint(saved);
    btn.addEventListener("click",()=>{
      const cur=root.getAttribute("data-theme");
      const sysDark=window.matchMedia("(prefers-color-scheme:dark)").matches;
      const now = cur ? (cur==="dark"?"light":"dark") : (sysDark?"light":"dark");
      root.setAttribute("data-theme",now);
      localStorage.setItem("igreport-theme",now);
      paint(now);
    });
  })();
  document.querySelectorAll(".carousel").forEach(c=>{
    const n=+c.dataset.n;let cur=0;
    const slides=[...c.querySelectorAll(".slide")];
    const dots=[...c.querySelectorAll(".dot")];
    const counter=c.querySelector(".counter");
    function show(i){cur=(i+n)%n;slides.forEach((s,k)=>s.classList.toggle("active",k===cur));dots.forEach((d,k)=>d.classList.toggle("on",k===cur));if(counter)counter.textContent=(cur+1)+"/"+n;}
    const prev=c.querySelector(".prev"),next=c.querySelector(".next");
    if(prev)prev.addEventListener("click",e=>{e.preventDefault();show(cur-1);});
    if(next)next.addEventListener("click",e=>{e.preventDefault();show(cur+1);});
  });
</script>
</body>
</html>`;

fs.writeFileSync(outPath, html, "utf8");
console.log("Overview written:", outPath, "bytes", Buffer.byteLength(html));
