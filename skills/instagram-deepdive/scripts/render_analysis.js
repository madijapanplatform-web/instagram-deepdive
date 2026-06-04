#!/usr/bin/env node
/* render_analysis.js — data-driven renderer for the Instagram reel deep-dive report.
 * Usage: node render_analysis.js <analysis.json> <out.html>
 * All bespoke content comes from analysis.json (authored by Claude after viewing frames).
 * Media paths are derived from D.mediaDir (relative to the output HTML location).
 */
const fs = require("fs");
const [,, dataPath, outPath] = process.argv;
if(!dataPath||!outPath){console.error("usage: node render_analysis.js <analysis.json> <out.html>");process.exit(1);}
const D = JSON.parse(fs.readFileSync(dataPath,"utf8"));

const post = D.post;
const MED = D.mediaDir;
const profilePic = D.profilePicFile;
const shots = D.shots;
shots.forEach((s,i)=>{ s.n=i+1; s.thumb=`${MED}/shots/shot${String(i+1).padStart(2,"0")}.jpg`; s.dur=+(s.e-s.s).toFixed(2); });
const emoPts = D.emoPts;
const FRAMES = D.frameCount || Math.max(1, Math.round((post.duration||1)/0.5));
const frames = Array.from({length:FRAMES},(_,k)=>({t:+(k*0.5).toFixed(2), src:`${MED}/frames/f${String(k+1).padStart(3,"0")}.jpg`}));

const esc=(s)=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nf=(n)=>(n||0).toLocaleString("en-US");
const tc=(t)=>{const s=Math.floor(t);const f=Math.round((t-s)*10);return `${s}.${f}s`;};
const dur=post.duration;
const pct=(t)=>(t/dur*100).toFixed(2);

const goalCards = D.goalCards;
const coreTarget = D.coreTarget;
const targetLayers = D.targetLayers;
const emotionsTriggered = D.emotionsTriggered;
const weaknesses = D.weaknesses;
const metrics = D.metrics;
const viralReasons = D.viralReasons;
const emoTimeline = D.emoTimeline || [];
const hookBeats = D.hookBeats;
const hookWhy = D.hookWhy;
const takeaways = D.takeaways;
const peaks = D.peaks;
const toc = D.toc || [
  {id:"sec-player", no:"00", t:"인터랙티브 플레이어"},
  {id:"sec-viral",  no:"01", t:"왜 터졌나"},
  {id:"sec-goal",   no:"02", t:"예상 목표"},
  {id:"sec-target", no:"03", t:"타깃 분석"},
  {id:"sec-hook",   no:"04", t:"3초 후킹"},
  {id:"sec-story",  no:"05", t:"스토리보드"},
  {id:"sec-cut",    no:"06", t:"컷 · 편집"},
  {id:"sec-emotion",no:"07", t:"감정 흐름"},
  {id:"sec-bench",  no:"08", t:"벤치마킹 공식"},
].concat( (D.score) ? [{id:"sec-score", no:"09", t:"릴스 점수"}] : [] );

// ---- derived values + per-video section copy (JSON-overridable, with sane fallbacks) ----
const nCuts = shots.length;
const durStr = Math.round(post.duration*10)/10;
const _engRate = post.views ? ((post.likes+post.comments)/post.views*100).toFixed(2)+"%" : "—";
const _sd = shots.map(s=>+(s.e-s.s).toFixed(2));
const _avg = (post.duration/nCuts).toFixed(1);
const _long = Math.max(..._sd).toFixed(1);
const _short = Math.min(..._sd).toFixed(2);
const headlineKpi   = D.headlineKpi   || _engRate;
const viralTitle    = D.viralTitle    || "왜 이 콘텐츠가 터졌나";
const viralLead     = D.viralLead     || "";
const goalLead      = D.goalLead      || "단일 영상이 아니라 <b>도달 → 댓글 → DM → 구매</b>로 이어지는 퍼널의 입구로 설계된 콘텐츠입니다.";
const cutLead       = D.cutLead       || "샷 길이(막대 클릭 시 해당 구간 재생). 구간별 호흡(완급)을 확인하세요.";
const cutStats      = D.cutStats      || [
  {b:String(nCuts), s:`총 컷 수 (${durStr}초)`},
  {b:_avg+"s", s:"평균 샷 길이"},
  {b:_long+"s", s:"최장 샷"},
  {b:_short+"s", s:"최단 샷"},
];
const transitionNote = D.transitionNote || {t:"전환 방식", d:"컷 전환 방식과 자막·컷 동기화를 분석한 구간입니다."};
const emotionLead   = D.emotionLead   || "";
const benchLead     = D.benchLead     || `구조를 뜯어보면 다른 분야에도 그대로 옮겨 쓸 수 있는 <b>${takeaways.length}개의 콘텐츠 공식</b>이 들어 있습니다.`;

// ---- Reel Health Score (optional): weighted checklist → 0-100 + grade + Quick Wins ----
const SEVMUL = {critical:5, high:3, medium:1.5, low:0.5};
const RESVAL = {pass:1, warn:0.5, fail:0};
const SEVKO  = {critical:"치명", high:"높음", medium:"보통", low:"낮음"};
let scoreData = null;
if (D.score && Array.isArray(D.score.categories) && Array.isArray(D.score.checks)) {
  const cats = D.score.categories.map(c=>{
    const cks = D.score.checks.filter(k=>k.cat===c.key);
    const tot = cks.reduce((a,k)=>a+(SEVMUL[k.sev]||1),0);
    const got = cks.reduce((a,k)=>a+(SEVMUL[k.sev]||1)*(RESVAL[k.result]??0),0);
    return {...c, score: tot? Math.round(got/tot*100):0, n: cks.length};
  });
  const wsum = cats.reduce((a,c)=>a+(c.weight||0),0)||1;
  const overall = Math.round(cats.reduce((a,c)=>a+c.score*(c.weight||0),0)/wsum);
  const grade = overall>=85?"A":overall>=70?"B":overall>=55?"C":overall>=40?"D":"F";
  const gradeColor = overall>=85?"#1faa59":overall>=70?"#3ec5fc":overall>=55?"#f0982e":overall>=40?"#ff7a45":"#e2284b";
  const order = {critical:0, high:1};
  const quickWins = D.score.checks
    .filter(k=>k.result!=="pass" && (k.sev==="critical"||k.sev==="high"))
    .sort((a,b)=>(order[a.sev]-order[b.sev]));
  scoreData = {cats, overall, grade, gradeColor, quickWins, verdict: D.score.verdict||"", checks: D.score.checks};
}

const shotCards = shots.map(s=>`
  <div class="shot" data-start="${s.s}" data-end="${s.e}" data-n="${s.n}">
    <div class="shot-thumb"><img src="${s.thumb}" loading="lazy" alt="shot ${s.n}"><span class="shot-no">CUT ${s.n}</span><span class="shot-tc">${tc(s.s)}–${tc(s.e)}</span></div>
    <div class="shot-info">
      <div class="shot-phase ph-${s.phase}">${s.phase}</div>
      <div class="shot-text">“${esc(s.text)}”</div>
      <div class="shot-shot">🎬 ${esc(s.shot)}</div>
      <div class="shot-role"><span>역할</span> ${esc(s.role)} · <span>감정</span> ${esc(s.emo)} · <span>길이</span> ${s.dur}s</div>
    </div>
  </div>`).join("");

// shot duration bars
const maxDur = Math.max(...shots.map(s=>s.dur));
const durBars = shots.map(s=>`
  <div class="dbar" data-start="${s.s}" data-end="${s.e}">
    <span class="dbar-l">CUT ${s.n}</span>
    <span class="dbar-track"><span class="dbar-fill ph-bg-${s.phase}" style="width:${(s.dur/maxDur*100).toFixed(1)}%">${s.dur}s</span></span>
  </div>`).join("");

// cut markers on timeline
const cutMarks = shots.slice(1).map(s=>`<span class="cutmark" style="left:${pct(s.s)}%" title="CUT ${s.n} @ ${tc(s.s)}"></span>`).join("");
// phase bands under timeline
const phaseColors={"호기심":"#e8467c","관심":"#f0982e","이해":"#2eb6c8","욕구":"#c0398f","결심":"#7a5af0"};
const phaseBands = shots.map(s=>`<span class="pband" style="left:${pct(s.s)}%;width:${pct(s.e-s.s)}%;background:${phaseColors[s.phase]}" title="${s.phase}"></span>`).join("");

// emotion svg
const W=720,H=240,padL=8,padR=8,padT=24,padB=28;
const ex=(t)=>padL+(t/dur)*(W-padL-padR);
const ey=(v)=>padT+(1-v/100)*(H-padT-padB);
const linePts=emoPts.map(p=>`${ex(p[0]).toFixed(1)},${ey(p[1]).toFixed(1)}`).join(" ");
const areaPts=`${ex(emoPts[0][0]).toFixed(1)},${(H-padB)} `+linePts+` ${ex(emoPts[emoPts.length-1][0]).toFixed(1)},${(H-padB)}`;
const emoDots=emoPts.map(p=>`<g class="emo-g" data-t="${p[0]}"><circle cx="${ex(p[0]).toFixed(1)}" cy="${ey(p[1]).toFixed(1)}" r="11" fill="transparent"/><circle cx="${ex(p[0]).toFixed(1)}" cy="${ey(p[1]).toFixed(1)}" r="4.5" class="emo-dot"/><text x="${ex(p[0]).toFixed(1)}" y="${(ey(p[1])-10).toFixed(1)}" class="emo-lab" text-anchor="middle">${p[2]}</text><text x="${ex(p[0]).toFixed(1)}" y="${(H-padB+16)}" class="emo-tc" text-anchor="middle">${tc(p[0])}</text></g>`).join("");

const filmstrip = frames.map(f=>`<button class="fstrip-i" data-t="${f.t}" title="${f.t}s"><img src="${f.src}" loading="lazy" alt="${f.t}s"></button>`).join("");

// storyboard table rows (scrollable)
const shotRows = shots.map(s=>`
  <tr class="srow" data-start="${s.s}" data-n="${s.n}">
    <td class="c-no"><span class="ph-bg-${s.phase}">${s.n}</span></td>
    <td class="c-tc">${tc(s.s)}<span>–${tc(s.e)}</span><i>${s.dur}s</i></td>
    <td class="c-th"><img src="${s.thumb}" loading="lazy" alt="cut ${s.n}"></td>
    <td class="c-tx"><span class="ph ph-${s.phase}">${s.phase}</span><div class="c-cap">“${esc(s.text)}”</div></td>
    <td class="c-sh">${esc(s.shot)}</td>
    <td class="c-rl"><b>${esc(s.role)}</b><span>${esc(s.emo)}</span></td>
  </tr>`).join("");

// emotion synced timeline rows
const emoRows = emoTimeline.map(e=>`
  <button class="etl" data-start="${e.s}">
    <span class="etl-tc">${tc(e.s)}<i>–${tc(e.e)}</i></span>
    <span class="etl-ph ph-${e.phase}">${e.phase}</span>
    <span class="etl-body"><b>${esc(e.title)}</b><span>${esc(e.d)}</span></span>
  </button>`).join("");

// ===== builders (zine layout) =====
const peakMarkers = peaks.map(p=>{
  const x=ex(p.t).toFixed(1), y=ey(p.y).toFixed(1);
  return `<g class="pk-g" data-t="${p.t}">
    <line x1="${x}" y1="${y}" x2="${x}" y2="${(H-padB)}" class="pk-stem"/>
    <circle cx="${x}" cy="${y}" r="14" fill="transparent"/>
    <circle cx="${x}" cy="${y}" r="${p.star?6.5:5}" class="pk-dot${p.star?' star':''}"/>
    <text x="${x}" y="${(+y-14)}" class="pk-lab" text-anchor="middle">${p.star?'★ ':''}${p.id}</text>
  </g>`;
}).join("");

const peakCards = peaks.map(p=>`
  <button class="peak${p.star?' star':''}" data-t="${p.t}">
    <div class="peak-top"><span class="peak-ph ph-${p.phase}">${p.label}</span><span class="peak-id">${p.star?'★ 클라이맥스 · ':''}${p.id} / ${p.tc}</span></div>
    <div class="peak-q">${esc(p.quote)}</div>
    <div class="peak-d">${esc(p.desc)}</div>
    <div class="peak-line">${esc(p.line)}</div>
  </button>`).join("");

const tocHtml = toc.map(s=>`<a class="toc-i" href="#${s.id}" data-id="${s.id}"><span class="toc-no">${s.no}</span><span class="toc-t">${esc(s.t)}</span></a>`).join("");

function eyebrow(no,en){return `<div class="eyebrow"><span class="ey-no">${no}</span><span class="ey-dot">·</span><span>${en}</span></div>`;}

const html=`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>릴스 심층 분석 · ${esc(post.product)}</title>
<script>(function(){var t=localStorage.getItem("igreport-theme");if(t)document.documentElement.setAttribute("data-theme",t);})();</script>
<style>
  :root{--bg:#fbfbfc;--card:#fff;--line:#e9e9ee;--txt:#17171b;--sub:#8c8c98;--accent:#e2284b;--accent2:#ff5777;--grad:linear-gradient(135deg,#ff5777,#e2284b);--shadow:0 1px 2px rgba(20,20,40,.04),0 6px 22px rgba(20,20,40,.05);--shadow-lg:0 14px 40px rgba(20,20,40,.12);--panel:#f6f6f8;--chip-bg:#f1f1f5;--caption:#43434d;--media-bg:#0f0f14;--scroll:#d8d8e0;--bar-bg:rgba(255,255,255,.82);--bar-border:#ededf1;--nav-a:#555;}
  :root[data-theme="dark"]{--bg:#0c0c10;--card:#15151a;--line:#26262e;--txt:#f0f0f4;--sub:#8a8a96;--accent:#ff6b85;--accent2:#ff8aa0;--grad:linear-gradient(135deg,#ff8aa0,#ff5777);--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 22px rgba(0,0,0,.4);--shadow-lg:0 14px 44px rgba(0,0,0,.6);--panel:#1c1c23;--chip-bg:#23232b;--caption:#c3c3cc;--media-bg:#000;--scroll:#3a3a44;--bar-bg:rgba(13,13,17,.82);--bar-border:#23232b;--nav-a:#c8c8d4;}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0c0c10;--card:#15151a;--line:#26262e;--txt:#f0f0f4;--sub:#8a8a96;--accent:#ff6b85;--accent2:#ff8aa0;--grad:linear-gradient(135deg,#ff8aa0,#ff5777);--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 22px rgba(0,0,0,.4);--shadow-lg:0 14px 44px rgba(0,0,0,.6);--panel:#1c1c23;--chip-bg:#23232b;--caption:#c3c3cc;--media-bg:#000;--scroll:#3a3a44;--bar-bg:rgba(13,13,17,.82);--bar-border:#23232b;--nav-a:#c8c8d4;}}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{color-scheme:light dark;scroll-behavior:smooth;}
  html,body{max-width:100%;overflow-x:hidden;}
  img,video,svg{max-width:100%;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:var(--bg);color:var(--txt);line-height:1.65;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s;}
  a{color:inherit;text-decoration:none;}
  b{font-weight:700;}

  /* masthead */
  .masthead{position:sticky;top:0;z-index:60;background:var(--bar-bg);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--bar-border);padding:13px 28px;display:flex;align-items:center;gap:14px;}
  .masthead .back{font-size:12px;font-weight:600;color:var(--nav-a);padding:6px 12px;border-radius:8px;border:1px solid var(--line);}
  .masthead .brand{font-size:13px;font-weight:800;letter-spacing:-.01em;}
  .masthead .brand i{color:var(--accent);font-style:normal;}
  .masthead .crumb{font-size:11.5px;color:var(--sub);}
  #themeToggle{margin-left:auto;font-size:12px;font-weight:600;color:var(--nav-a);padding:6px 13px;border-radius:8px;background:var(--card);border:1px solid var(--line);cursor:pointer;}

  /* layout */
  .layout{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:200px minmax(0,1fr);gap:36px;padding:30px 28px 100px;}
  @media(max-width:880px){.layout{grid-template-columns:1fr;gap:0;padding:18px 18px 80px;}}

  /* TOC */
  .toc{position:fixed;top:50%;transform:translateY(-50%);left:max(28px,calc(50% - 600px + 28px));width:200px;max-height:calc(100vh - 100px);overflow-y:auto;z-index:40;display:flex;flex-direction:column;gap:2px;padding:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);}
  .toc::-webkit-scrollbar{width:5px;} .toc::-webkit-scrollbar-thumb{background:var(--scroll);border-radius:3px;}
  @media(max-width:880px){.toc{display:none;}}
  .toc-i{display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:9px;transition:background .15s,color .15s;}
  .toc-i:hover{background:var(--panel);}
  .toc-i.active{background:var(--panel);}
  .toc-no{font-size:10.5px;font-weight:700;color:var(--sub);font-variant-numeric:tabular-nums;width:20px;flex-shrink:0;position:relative;}
  .toc-i.active .toc-no{color:var(--accent);}
  .toc-i.active .toc-no::before{content:"";position:absolute;left:-9px;top:50%;transform:translateY(-50%);width:5px;height:5px;border-radius:50%;background:var(--accent);}
  .toc-t{font-size:12.5px;color:var(--nav-a);font-weight:500;}
  .toc-i.active .toc-t{color:var(--txt);font-weight:700;}

  /* content */
  .content{min-width:0;grid-column:2;}
  @media(max-width:880px){.content{grid-column:auto;}}
  .report-head{padding-bottom:26px;margin-bottom:36px;border-bottom:1px solid var(--line);}
  .rh-tag{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.04em;margin-bottom:12px;}
  .rh-tag img{width:20px;height:20px;border-radius:50%;object-fit:cover;}
  .rh-title{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.2;margin-bottom:8px;}
  @media(max-width:560px){.rh-title{font-size:23px;}}
  .rh-sub{font-size:13px;color:var(--sub);margin-bottom:18px;}
  .rh-kpis{display:flex;gap:10px;flex-wrap:wrap;}
  .rh-kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 16px;}
  .rh-kpi b{font-size:18px;font-weight:800;}
  .rh-kpi span{font-size:11px;color:var(--sub);margin-left:6px;}

  section.sec{margin-bottom:56px;scroll-margin-top:78px;}
  .eyebrow{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.08em;color:var(--accent);text-transform:uppercase;margin-bottom:9px;}
  .ey-no{font-variant-numeric:tabular-nums;}
  .ey-dot{opacity:.5;}
  .title{font-size:24px;font-weight:800;letter-spacing:-.025em;margin-bottom:12px;}
  @media(max-width:560px){.title{font-size:20px;}}
  .lead{font-size:13.5px;color:var(--sub);margin-bottom:22px;max-width:780px;line-height:1.7;}
  .lead b{color:var(--txt);}
  .note{font-size:12px;color:var(--sub);background:var(--panel);border-radius:10px;padding:11px 14px;margin-bottom:18px;line-height:1.6;}
  .note.warn{border-left:3px solid var(--accent);}
  .note b{color:var(--accent);}
  .sub-h{font-size:15px;font-weight:800;margin:30px 0 14px;letter-spacing:-.01em;}

  /* cards generic */
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;}
  .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;}
  @media(max-width:680px){.grid2{grid-template-columns:1fr;}}
  .card2{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:var(--shadow);}
  .plabel{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--accent);margin-bottom:10px;}
  .card2 h3{font-size:16px;font-weight:800;letter-spacing:-.01em;margin-bottom:8px;line-height:1.4;}
  .card2 p{font-size:13px;color:var(--caption);line-height:1.7;}
  .card2 p b{color:var(--txt);}
  .subbox{background:var(--panel);border-radius:11px;padding:13px 15px;margin-top:14px;}
  .sb-l{font-size:10px;font-weight:800;letter-spacing:.12em;color:var(--sub);margin-bottom:6px;}
  .subbox p{font-size:12.5px;color:var(--caption);}
  .subbox .ex b{color:var(--accent);}

  .ic{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow);}
  .ic .t{font-weight:800;font-size:14px;margin-bottom:6px;}
  .ic .d{font-size:12.5px;color:var(--caption);line-height:1.65;}
  .ic.top{border-top:3px solid;}
  .tlayer-tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);padding:3px 9px;border-radius:99px;margin-bottom:8px;}

  /* player */
  .player{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:18px;}
  .stage{display:grid;grid-template-columns:minmax(0,290px) minmax(0,1fr);gap:20px;}
  .stage>*{min-width:0;}
  @media(max-width:680px){.stage{grid-template-columns:minmax(0,1fr);}}
  .vidwrap{position:relative;border-radius:14px;overflow:hidden;background:var(--media-bg);aspect-ratio:9/16;max-width:100%;}
  .vidwrap video{width:100%;height:100%;object-fit:contain;display:block;background:var(--media-bg);}
  .live{display:flex;flex-direction:column;gap:11px;min-width:0;}
  .nowcut{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
  .nowcut .big{font-size:26px;font-weight:800;color:var(--accent);}
  .nowcut .ph{font-size:11px;font-weight:700;padding:4px 11px;border-radius:99px;color:#fff;}
  .nowtime{font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--sub);}
  .nowtext{font-size:16px;font-weight:700;line-height:1.5;min-height:48px;}
  .nowmeta{font-size:12px;color:var(--sub);} .nowmeta b{color:var(--txt);}
  .timeline{margin-top:6px;min-width:0;}
  .scrub-row{display:flex;align-items:center;gap:11px;min-width:0;}
  .tl{position:relative;flex:1 1 0;min-width:0;height:32px;}
  .tl input[type=range]{position:absolute;inset:0;width:100%;height:100%;margin:0;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;z-index:4;}
  .tl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid var(--accent);box-shadow:0 1px 5px rgba(0,0,0,.3);}
  .tl-track{position:absolute;top:13px;left:0;right:0;height:6px;border-radius:99px;background:var(--chip-bg);overflow:hidden;}
  .tl-prog{position:absolute;top:0;left:0;height:100%;width:0;background:var(--grad);}
  .pbands{position:absolute;top:2px;left:0;right:0;height:4px;}
  .pband{position:absolute;top:0;height:100%;opacity:.5;border-radius:2px;}
  .cutmark{position:absolute;top:8px;width:2px;height:16px;background:var(--txt);opacity:.35;transform:translateX(-1px);}
  .pbtn{width:40px;height:40px;border-radius:50%;border:none;background:var(--grad);color:#fff;font-size:15px;cursor:pointer;flex-shrink:0;box-shadow:0 4px 12px color-mix(in srgb,var(--accent) 35%,transparent);}
  .ctrls{display:flex;align-items:center;gap:8px;margin-top:11px;flex-wrap:wrap;}
  .ctrls .grp{display:flex;gap:6px;align-items:center;}
  .sbtn{font-size:12px;font-weight:600;padding:6px 11px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--txt);cursor:pointer;}
  .sbtn.on{background:var(--accent);color:#fff;border-color:var(--accent);}
  .ctrls .lbl{font-size:11px;color:var(--sub);}
  .hint{font-size:11px;color:var(--sub);margin-top:9px;line-height:1.5;}
  .fstrip{display:flex;gap:5px;overflow-x:auto;margin-top:12px;padding-bottom:6px;max-width:100%;}
  .fstrip::-webkit-scrollbar{height:7px;} .fstrip::-webkit-scrollbar-thumb{background:var(--scroll);border-radius:4px;}
  .fstrip-i{flex:0 0 auto;width:40px;height:71px;border-radius:6px;overflow:hidden;border:2px solid transparent;padding:0;cursor:pointer;background:none;}
  .fstrip-i img{width:100%;height:100%;object-fit:cover;display:block;}
  .fstrip-i.on{border-color:var(--accent);}

  /* metrics */
  .metricbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
  @media(max-width:640px){.metricbar{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .metric{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 16px;box-shadow:var(--shadow);}
  .metric b{display:block;font-size:25px;font-weight:800;color:var(--accent);line-height:1.1;}
  .metric .ms{display:block;font-size:12.5px;font-weight:700;margin-top:4px;}
  .metric .mn{display:block;font-size:10.5px;color:var(--sub);margin-top:3px;}

  /* target */
  .target-core{display:flex;gap:18px;align-items:center;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:16px;padding:20px 22px;box-shadow:var(--shadow);}
  .tc-badge{font-size:11px;font-weight:800;letter-spacing:.05em;color:#fff;background:var(--grad);padding:7px 13px;border-radius:10px;flex-shrink:0;}
  .tc-line{font-size:16px;font-weight:800;letter-spacing:-.01em;margin-bottom:4px;}
  .tc-detail{font-size:12.5px;color:var(--caption);}
  .emo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:13px;}
  .emo-trig{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px 16px;box-shadow:var(--shadow);}
  .et-ic{font-size:21px;line-height:1;flex-shrink:0;}
  .et-emo{font-weight:800;font-size:13px;margin-bottom:3px;}
  .et-how{font-size:12px;color:var(--caption);}
  .weak-list{display:flex;flex-direction:column;gap:9px;}
  .weak{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:13px 15px;box-shadow:var(--shadow);}
  .wk-no{flex-shrink:0;width:21px;height:21px;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;}
  .weak b{display:block;font-size:12.5px;margin-bottom:2px;}
  .weak span{font-size:12px;color:var(--caption);}

  /* hook */
  .hookgrid{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start;}
  .hookgrid>*{min-width:0;}
  @media(max-width:680px){.hookgrid{grid-template-columns:minmax(0,1fr);}}
  .hookvid{display:flex;flex-direction:column;gap:10px;}
  .hookvid video{width:100%;border-radius:14px;background:var(--media-bg);aspect-ratio:9/16;object-fit:contain;display:block;}
  .hookreplay{align-self:center;font-size:12px;font-weight:600;color:#fff;background:var(--grad);border:none;padding:8px 16px;border-radius:99px;cursor:pointer;}
  .hookbeats{display:flex;flex-direction:column;gap:11px;}
  .hb{display:flex;gap:13px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px;box-shadow:var(--shadow);}
  .hb-tc{flex-shrink:0;font-size:11px;font-weight:800;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);padding:6px 10px;border-radius:9px;height:fit-content;font-variant-numeric:tabular-nums;}
  .hb-body b{display:block;font-size:13.5px;margin-bottom:3px;}
  .hb-body span{font-size:12.5px;color:var(--caption);}

  /* storyboard table */
  .sbscroll{max-height:470px;overflow-y:auto;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);background:var(--card);}
  .sbscroll::-webkit-scrollbar{width:9px;} .sbscroll::-webkit-scrollbar-thumb{background:var(--scroll);border-radius:5px;}
  .sbtable{width:100%;border-collapse:collapse;font-size:12.5px;}
  .sbtable thead th{position:sticky;top:0;z-index:2;background:var(--panel);text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.04em;color:var(--sub);padding:12px;border-bottom:1px solid var(--line);white-space:nowrap;text-transform:uppercase;}
  .srow{cursor:pointer;border-bottom:1px solid var(--line);transition:background .15s;}
  .srow:last-child{border-bottom:none;}
  .srow:hover{background:var(--panel);}
  .srow.active{background:color-mix(in srgb,var(--accent) 8%,transparent);box-shadow:inset 3px 0 0 var(--accent);}
  .sbtable td{padding:11px 12px;vertical-align:top;}
  .c-no span{display:inline-flex;width:25px;height:25px;border-radius:50%;color:#fff;font-weight:800;font-size:12px;align-items:center;justify-content:center;}
  .c-tc{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--sub);font-size:11px;line-height:1.5;}
  .c-tc span{display:block;} .c-tc i{display:block;color:var(--accent);font-style:normal;font-weight:700;}
  .c-th{width:62px;} .c-th img{width:52px;aspect-ratio:9/12;object-fit:cover;border-radius:7px;display:block;background:var(--media-bg);}
  .c-tx{min-width:150px;} .c-cap{font-weight:700;margin-top:6px;line-height:1.45;}
  .c-sh{color:var(--caption);min-width:155px;}
  .c-rl{min-width:108px;} .c-rl b{display:block;color:var(--accent);font-size:11.5px;} .c-rl span{font-size:11px;color:var(--sub);}
  .ph{display:inline-block;font-size:10px;font-weight:700;color:#fff;padding:2px 9px;border-radius:99px;}
  .ph-호기심,.ph-bg-호기심{background:#e8467c;} .ph-관심,.ph-bg-관심{background:#f0982e;} .ph-이해,.ph-bg-이해{background:#2eb6c8;} .ph-욕구,.ph-bg-욕구{background:#c0398f;} .ph-결심,.ph-bg-결심{background:#7a5af0;}

  /* cut analysis */
  .cutwrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;}
  .cutwrap>*{min-width:0;}
  @media(max-width:680px){.cutwrap{grid-template-columns:minmax(0,1fr);}}
  .dbars{display:flex;flex-direction:column;gap:7px;}
  .dbar{display:flex;align-items:center;gap:10px;cursor:pointer;}
  .dbar-l{font-size:11px;color:var(--sub);width:46px;flex-shrink:0;font-weight:600;}
  .dbar-track{flex:1;background:var(--chip-bg);border-radius:99px;height:21px;overflow:hidden;}
  .dbar-fill{height:100%;border-radius:99px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-size:10.5px;font-weight:700;min-width:32px;}
  .statbox{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;align-content:start;}
  .stat-c{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:16px;box-shadow:var(--shadow);}
  .stat-c b{display:block;font-size:23px;font-weight:800;color:var(--accent);}
  .stat-c span{font-size:11.5px;color:var(--sub);}

  /* emotion */
  .peakrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px;}
  @media(max-width:760px){.peakrow{grid-template-columns:1fr;}}
  .peak{text-align:left;background:var(--card);border:1px solid var(--line);border-radius:15px;padding:18px;box-shadow:var(--shadow);cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;}
  .peak:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg);}
  .peak.star{border-color:var(--accent);}
  .peak-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;}
  .peak-ph{font-size:10.5px;font-weight:700;color:#fff;padding:3px 10px;border-radius:99px;}
  .peak-id{font-size:10.5px;font-weight:700;color:var(--sub);font-variant-numeric:tabular-nums;}
  .peak.star .peak-id{color:var(--accent);}
  .peak-q{font-size:19px;font-weight:800;letter-spacing:-.01em;margin-bottom:8px;}
  .peak-d{font-size:12px;color:var(--caption);line-height:1.6;margin-bottom:10px;}
  .peak-line{font-size:11.5px;color:var(--sub);font-style:italic;background:var(--panel);border-radius:9px;padding:9px 11px;line-height:1.5;}

  .emo-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px 20px;}
  .emo-svg{width:100%;height:auto;display:block;}
  .emo-area{fill:url(#eg);opacity:.16;}
  .emo-line{fill:none;stroke:url(#eg);stroke-width:3;}
  .emo-dot{fill:var(--card);stroke:var(--accent);stroke-width:2.2;}
  .emo-lab{font-size:9.5px;fill:var(--sub);font-weight:600;}
  .emo-tc{font-size:9px;fill:var(--sub);}
  .emo-axis{font-size:9px;fill:var(--sub);font-weight:700;letter-spacing:.08em;}
  .emo-head{stroke:var(--txt);stroke-width:1.4;stroke-dasharray:3 3;opacity:.4;}
  .pk-stem{stroke:var(--accent);stroke-width:1.3;stroke-dasharray:2 3;opacity:.5;}
  .pk-dot{fill:var(--card);stroke:var(--accent);stroke-width:2.6;}
  .pk-dot.star{fill:var(--accent);}
  .pk-lab{font-size:11px;fill:var(--accent);font-weight:800;}
  .pk-g{cursor:pointer;} .pk-g:hover .pk-dot{stroke-width:3.4;}
  .emo-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;}
  .emo-legend span{font-size:11px;color:var(--sub);display:flex;align-items:center;gap:6px;}
  .emo-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;}

  .emo-bottom{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:20px;margin-top:20px;align-items:start;}
  @media(max-width:760px){.emo-bottom{grid-template-columns:minmax(0,1fr);}}
  .emo-player{position:sticky;top:80px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:14px;}
  @media(max-width:760px){.emo-player{position:static;}}
  .emo-player video{width:100%;border-radius:12px;background:var(--media-bg);aspect-ratio:9/16;object-fit:contain;display:block;margin-bottom:10px;}
  .emo-pnow{font-size:12px;color:var(--sub);text-align:center;}
  .emo-pnow b{color:var(--accent);}
  .etl-list{display:flex;flex-direction:column;gap:9px;}
  .etl{display:flex;gap:13px;align-items:flex-start;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:13px 15px;box-shadow:var(--shadow);cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;width:100%;}
  .etl:hover{transform:translateX(3px);}
  .etl.active{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent),var(--shadow);}
  .etl-tc{flex-shrink:0;font-size:11px;font-weight:800;color:var(--txt);font-variant-numeric:tabular-nums;width:92px;}
  .etl-tc i{color:var(--sub);font-style:normal;font-weight:600;}
  .etl-ph{flex-shrink:0;align-self:flex-start;font-size:10px;font-weight:700;color:#fff;padding:3px 10px;border-radius:99px;}
  .etl-body b{display:block;font-size:13px;margin-bottom:3px;}
  .etl-body span{font-size:12px;color:var(--caption);}

  /* reel health score */
  .rh-score{display:flex;align-items:center;gap:12px;margin-top:16px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 18px;box-shadow:var(--shadow);width:fit-content;}
  .rh-score .ring{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:conic-gradient(var(--sc) calc(var(--p)*1%), var(--chip-bg) 0);}
  .rh-score .ring i{width:46px;height:46px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-size:18px;font-weight:800;font-style:normal;}
  .rh-score .sg{font-size:13px;}
  .rh-score .sg b{font-size:15px;font-weight:800;} .rh-score .sg span{color:var(--sub);}
  .scorewrap{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);gap:24px;align-items:center;margin-bottom:8px;}
  @media(max-width:680px){.scorewrap{grid-template-columns:1fr;}}
  .bigring{width:180px;height:180px;border-radius:50%;display:grid;place-items:center;margin:0 auto;background:conic-gradient(var(--sc) calc(var(--p)*1%), var(--chip-bg) 0);}
  .bigring i{width:142px;height:142px;border-radius:50%;background:var(--card);display:grid;place-items:center;flex-direction:column;font-style:normal;text-align:center;}
  .bigring .nbig{font-size:46px;font-weight:800;line-height:1;color:var(--txt);}
  .bigring .gbig{font-size:13px;font-weight:700;color:var(--sc);margin-top:4px;}
  .bigring .sub{font-size:10px;color:var(--sub);}
  .scat{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
  .scat-h{display:flex;align-items:baseline;gap:8px;font-size:12.5px;}
  .scat-h b{font-weight:700;} .scat-h i{color:var(--sub);font-style:normal;font-size:11px;} .scat-h em{margin-left:auto;font-style:normal;font-weight:800;}
  .scat-bar{height:8px;border-radius:99px;background:var(--chip-bg);overflow:hidden;}
  .scat-bar span{display:block;height:100%;border-radius:99px;}
  .qwins{display:flex;flex-direction:column;gap:10px;}
  .qwin{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:13px;padding:13px 15px;box-shadow:var(--shadow);}
  .qwin .sev{flex-shrink:0;font-size:10px;font-weight:800;color:#fff;background:var(--accent);padding:3px 9px;border-radius:99px;height:fit-content;}
  .qwin.sev-high{border-left-color:#f0982e;} .qwin.sev-high .sev{background:#f0982e;}
  .qwin b{display:block;font-size:13px;margin-bottom:2px;} .qwin .find{font-size:12px;color:var(--caption);} .qwin .fix{font-size:12px;color:var(--accent);margin-top:3px;}
  .checktable{width:100%;border-collapse:collapse;font-size:12.5px;}
  .checktable thead th{position:sticky;top:0;background:var(--panel);text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.04em;color:var(--sub);padding:11px;border-bottom:1px solid var(--line);text-transform:uppercase;white-space:nowrap;}
  .checktable td{padding:11px;vertical-align:top;border-bottom:1px solid var(--line);}
  .checktable tr:last-child td{border-bottom:none;}
  .ck-id{font-weight:800;color:var(--sub);white-space:nowrap;}
  .ck-r{font-weight:800;font-size:11px;padding:3px 9px;border-radius:99px;white-space:nowrap;}
  .ck-r.pass{color:#1faa59;background:rgba(31,170,89,.12);} .ck-r.warn{color:#e08a1e;background:rgba(240,152,46,.14);} .ck-r.fail{color:#e2284b;background:rgba(226,40,75,.12);}
  .ck-sev{font-size:10.5px;color:var(--sub);}
  .ck-fix{color:var(--accent);}

  footer{font-size:11.5px;color:var(--sub);padding:30px 0 0;border-top:1px solid var(--line);margin-top:30px;line-height:1.7;}
  footer a{color:var(--accent);font-weight:600;}
</style>
</head>
<body>
  <div class="masthead">
    <a class="back" href="index.html">←</a>
    <div class="brand">딥다이브 <i>릴스 분석</i></div>
    <span class="crumb">@${esc(post.account)} · 30일 1위 콘텐츠</span>
    <button id="themeToggle">🌙 다크</button>
  </div>

  <div class="layout">
    <aside class="toc">${tocHtml}</aside>

    <main class="content">
      <div class="report-head">
        <div class="rh-tag"><img src="${profilePic}"> @${esc(post.account)} · 릴스 심층 분석</div>
        <div class="rh-title">${esc(post.product)}</div>
        <div class="rh-sub">${durStr}초 · ${nCuts}컷 · ${post.date} 게시 · <a href="${post.url}" target="_blank" style="color:var(--accent);font-weight:600">원본 보기 ↗</a></div>
        <div class="rh-kpis">
          <div class="rh-kpi"><b>${nf(post.likes)}</b><span>좋아요</span></div>
          <div class="rh-kpi"><b>${nf(post.comments)}</b><span>댓글</span></div>
          <div class="rh-kpi"><b>${(post.views/1000).toFixed(1)}K</b><span>조회</span></div>
          <div class="rh-kpi"><b>${headlineKpi}</b><span>참여율</span></div>
        </div>
        ${scoreData?`<a href="#sec-score" class="rh-score" style="--p:${scoreData.overall};--sc:${scoreData.gradeColor}"><span class="ring"><i>${scoreData.overall}</i></span><span class="sg"><b>릴스 헬스 스코어 ${scoreData.grade}</b><br><span>${scoreData.overall}/100 · 클릭해 상세 점수 ↓</span></span></a>`:""}
      </div>

      <!-- 00 PLAYER -->
      <section class="sec" id="sec-player">
        ${eyebrow("00","Interactive Player")}
        <h2 class="title">슬라이드를 움직이며 장면을 천천히 보기</h2>
        <div class="player">
          <div class="stage">
            <div class="vidwrap"><video id="vid" playsinline preload="metadata" poster="${shots[0].thumb}"><source src="${MED}/video.mp4" type="video/mp4"></video></div>
            <div class="live">
              <div class="nowcut"><span class="big" id="nowNo">CUT 1</span><span class="ph ph-호기심" id="nowPh">호기심</span><span class="nowtime" id="nowTime">0.0 / ${post.duration}s</span></div>
              <div class="nowtext" id="nowText">“아이스크림이 아니라구요??!!”</div>
              <div class="nowmeta" id="nowShot">🎬 크림색 얼린 곤약젤리를 손으로 짜는 클로즈업</div>
              <div class="nowmeta" id="nowRole"><b>역할</b> 후킹 · 정체 숨김</div>
              <div class="timeline">
                <div class="scrub-row">
                  <button class="pbtn" id="playBtn">▶</button>
                  <div class="tl">
                    <div class="tl-track"><div class="tl-prog" id="prog"></div></div>
                    <div class="pbands">${phaseBands}</div>
                    ${cutMarks}
                    <input type="range" id="scrub" min="0" max="${post.duration}" step="0.01" value="0">
                  </div>
                </div>
                <div class="ctrls">
                  <span class="grp"><span class="lbl">속도</span>
                    <button class="sbtn" data-rate="0.25">0.25×</button>
                    <button class="sbtn" data-rate="0.5">0.5×</button>
                    <button class="sbtn on" data-rate="1">1×</button>
                  </span>
                  <span class="grp" style="margin-left:auto">
                    <button class="sbtn" id="stepB">◀ 0.1s</button>
                    <button class="sbtn" id="stepF">0.1s ▶</button>
                  </span>
                </div>
                <div class="hint">슬라이더를 드래그하거나 0.25×로 재생하면 장면을 천천히 볼 수 있어요. 필름스트립을 클릭해도 이동합니다.</div>
                <div class="fstrip" id="fstrip">${filmstrip}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 01 VIRAL -->
      <section class="sec" id="sec-viral">
        ${eyebrow("01","Why it blew up")}
        <h2 class="title">${viralTitle}</h2>
        <div class="lead">${viralLead}</div>
        <div class="metricbar">
          ${metrics.map(m=>`<div class="metric"><b>${m.b}</b><span class="ms">${m.s}</span><span class="mn">${m.note}</span></div>`).join("")}
        </div>
        <div class="grid2" style="margin-top:18px">
          ${viralReasons.map((c,i)=>`<div class="card2"><div class="plabel">REASON 0${i+1}</div><h3>${c.t}</h3><p>${c.d}</p></div>`).join("")}
        </div>
      </section>

      <!-- 02 GOAL -->
      <section class="sec" id="sec-goal">
        ${eyebrow("02","Strategy")}
        <h2 class="title">예상 목표 (KPI 설계)</h2>
        <div class="lead">${goalLead}</div>
        <div class="grid">
          ${goalCards.map((c,i)=>`<div class="ic top" style="border-top-color:var(--accent)"><div class="t">${c.t}</div><div class="d">${c.d}</div></div>`).join("")}
        </div>
      </section>

      <!-- 03 TARGET -->
      <section class="sec" id="sec-target">
        ${eyebrow("03","Audience")}
        <h2 class="title">타깃 분석</h2>
        <div class="target-core">
          <div class="tc-badge">CORE</div>
          <div><div class="tc-line">${esc(coreTarget.line)}</div><div class="tc-detail">${esc(coreTarget.detail)}</div></div>
        </div>
        <div class="grid" style="margin-top:16px">
          ${targetLayers.map(c=>`<div class="ic"><div class="tlayer-tag">${esc(c.tag)}</div><div class="t">${esc(c.t)}</div><div class="d">${esc(c.d)}</div></div>`).join("")}
        </div>
        <div class="sub-h">자극한 감정</div>
        <div class="emo-grid">
          ${emotionsTriggered.map(e=>`<div class="emo-trig"><span class="et-ic">${e.icon}</span><div><div class="et-emo">${esc(e.emo)}</div><div class="et-how">${esc(e.how)}</div></div></div>`).join("")}
        </div>
        <div class="sub-h">약점 · 리스크</div>
        <div class="weak-list">
          ${weaknesses.map(w=>`<div class="weak"><span class="wk-no">!</span><div><b>${esc(w.t)}</b><span>${esc(w.d)}</span></div></div>`).join("")}
        </div>
      </section>

      <!-- 04 HOOK -->
      <section class="sec" id="sec-hook">
        ${eyebrow("04","First 3 seconds")}
        <h2 class="title">초반 3초 후킹 해부</h2>
        <div class="lead">${esc(hookWhy)}</div>
        <div class="hookgrid">
          <div class="hookvid">
            <video id="hookVid" playsinline muted loop controls preload="metadata" poster="${shots[0].thumb}"><source src="${MED}/hook3s.mp4" type="video/mp4"></video>
            <button class="hookreplay" id="hookReplay">↻ 후킹 0–3초 다시 보기</button>
          </div>
          <div class="hookbeats">
            ${hookBeats.map(b=>`<div class="hb"><span class="hb-tc">${b.tc}</span><div class="hb-body"><b>${esc(b.t)}</b><span>${esc(b.d)}</span></div></div>`).join("")}
          </div>
        </div>
      </section>

      <!-- 05 STORYBOARD -->
      <section class="sec" id="sec-story">
        ${eyebrow("05","Storyboard · 11 cuts")}
        <h2 class="title">컷별 스토리보드 & 구조</h2>
        <div class="lead">행을 클릭하면 상단 플레이어가 해당 컷으로 이동합니다. 색상은 감정 단계(호기심·관심·이해·욕구·결심). <b>표 안에서 스크롤</b>해 11개 컷을 확인하세요.</div>
        <div class="sbscroll">
          <table class="sbtable">
            <thead><tr><th>#</th><th>시간</th><th>장면</th><th>자막 · 단계</th><th>샷 구성</th><th>역할 · 감정</th></tr></thead>
            <tbody id="sbbody">${shotRows}</tbody>
          </table>
        </div>
      </section>

      <!-- 06 CUT -->
      <section class="sec" id="sec-cut">
        ${eyebrow("06","Editing · Pacing")}
        <h2 class="title">장면 전환 & 컷 분할 분석</h2>
        <div class="cutwrap">
          <div>
            <div class="lead" style="margin-bottom:12px">${cutLead}</div>
            <div class="dbars">${durBars}</div>
          </div>
          <div class="statbox">
            ${cutStats.map(c=>`<div class="stat-c"><b>${esc(c.b)}</b><span>${esc(c.s)}</span></div>`).join("")}
            <div class="stat-c" style="grid-column:1/-1"><b style="font-size:14px;color:var(--txt)">${esc(transitionNote.t)}</b><span>${transitionNote.d}</span></div>
          </div>
        </div>
      </section>

      <!-- 07 EMOTION -->
      <section class="sec" id="sec-emotion">
        ${eyebrow("07","Emotional arc")}
        <h2 class="title">시청자 감정 흐름 — 정점 3번</h2>
        <div class="lead">${emotionLead}</div>
        <div class="note warn"><b>분석 기준</b> 정점 위치(P1·P2·P3)는 컷·자막·시퀀스 내용에서 도출. 정점 사이 곡선 강도는 정보형 reels의 일반적 시청자 심리를 기반으로 한 추정이며, 실측 이탈률 데이터는 비공개라 포함하지 않았습니다.</div>
        <div class="peakrow">${peakCards}</div>
        <div class="emo-card">
          <svg viewBox="0 0 ${W} ${H}" class="emo-svg">
            <defs><linearGradient id="eg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${'#ff5777'}"/><stop offset="1" stop-color="${'#e2284b'}"/></linearGradient></defs>
            <text x="${padL}" y="${H-6}" class="emo-axis" text-anchor="start">HOOK</text>
            <text x="${(W/2)}" y="${H-6}" class="emo-axis" text-anchor="middle">LOW</text>
            <text x="${W-padR}" y="${H-6}" class="emo-axis" text-anchor="end">CTA</text>
            <polygon class="emo-area" points="${areaPts}"/>
            <polyline class="emo-line" points="${linePts}"/>
            <line id="emoHead" class="emo-head" x1="${padL}" y1="${padT-6}" x2="${padL}" y2="${H-padB}"/>
            ${peakMarkers}
          </svg>
          <div class="emo-legend">
            <span><i style="background:#e8467c"></i>호기심</span>
            <span><i style="background:#f0982e"></i>관심</span>
            <span><i style="background:#2eb6c8"></i>이해</span>
            <span><i style="background:#c0398f"></i>욕구</span>
            <span><i style="background:#7a5af0"></i>결심</span>
          </div>
        </div>
        <div class="emo-bottom">
          <div class="emo-player">
            <video id="vid2" playsinline controls preload="metadata" poster="${shots[0].thumb}"><source src="${MED}/video.mp4" type="video/mp4"></video>
            <div class="emo-pnow" id="emoNow"><b>P1</b> 0.0s · 호기심</div>
          </div>
          <div class="etl-list" id="etlList">${emoRows}</div>
        </div>
      </section>

      <!-- 08 BENCH -->
      <section class="sec" id="sec-bench">
        ${eyebrow("08","Extracted patterns")}
        <h2 class="title">벤치마킹 공식 — 다른 분야에 적용</h2>
        <div class="lead">${benchLead}</div>
        <div class="grid2">
          ${takeaways.map((c,i)=>`<div class="card2"><div class="plabel">PATTERN 0${i+1}</div><h3>${c.t}</h3><p>${c.d}</p><div class="subbox ex"><div class="sb-l">다른 분야 적용</div><p>${c.apply.replace(/·/g,'<b>·</b>')}</p></div></div>`).join("")}
        </div>
      </section>
${ scoreData ? `
      <!-- 09 SCORE -->
      <section class="sec" id="sec-score">
        ${eyebrow("09","Reel Health Score")}
        <h2 class="title">릴스 헬스 스코어</h2>
        <div class="lead">${scoreData.verdict}</div>
        <div class="scorewrap">
          <div class="bigring" style="--p:${scoreData.overall};--sc:${scoreData.gradeColor}">
            <i><span class="nbig">${scoreData.overall}</span><span class="gbig" style="color:${scoreData.gradeColor}">${scoreData.grade} 등급</span><span class="sub">/ 100</span></i>
          </div>
          <div class="score-cats">
            ${scoreData.cats.map(c=>`<div class="scat"><span class="scat-h"><b>${esc(c.name)}</b><i>${c.weight}% · ${c.n}개</i><em>${c.score}</em></span><span class="scat-bar"><span style="width:${c.score}%;background:${c.score>=70?'#1faa59':c.score>=50?'#f0982e':'#e2284b'}"></span></span></div>`).join("")}
          </div>
        </div>
        ${scoreData.quickWins.length?`
        <div class="sub-h">⚡ Quick Wins — 먼저 고칠 것</div>
        <div class="qwins">
          ${scoreData.quickWins.map(k=>`<div class="qwin sev-${k.sev}"><span class="sev">${SEVKO[k.sev]||k.sev}</span><div><b>[${esc(k.id)}] ${esc(k.text||"")}</b><div class="find">${esc(k.finding||"")}</div><div class="fix">→ ${esc(k.fix||"")}</div></div></div>`).join("")}
        </div>`:""}
        <div class="sub-h">전체 체크리스트 (${scoreData.checks.length}개)</div>
        <div class="sbscroll">
          <table class="checktable">
            <thead><tr><th>ID</th><th>판정</th><th>체크</th><th>발견 · 개선</th><th>심각도</th></tr></thead>
            <tbody>
              ${scoreData.checks.map(k=>`<tr><td class="ck-id">${esc(k.id)}</td><td><span class="ck-r ${k.result}">${k.result==="pass"?"PASS":k.result==="warn"?"WARN":"FAIL"}</span></td><td><b>${esc(k.text||"")}</b></td><td>${esc(k.finding||"")}${k.fix?`<div class="ck-fix">→ ${esc(k.fix)}</div>`:""}</td><td class="ck-sev">${SEVKO[k.sev]||k.sev}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="note" style="margin-top:14px">점수 = 체크별 (가중치=심각도) × 판정(PASS 1·WARN 0.5·FAIL 0)을 카테고리 가중치로 합산한 0–100 정성 평가입니다. 실측 리텐션/이탈률 등 비공개 지표는 제외.</div>
      </section>` : "" }

      <footer>분석 기준 영상: <a href="${post.url}" target="_blank">@${esc(post.account)} 릴스</a> · ${durStr}초 / ${nCuts}컷 · 좋아요 ${nf(post.likes)} · 댓글 ${nf(post.comments)} · 조회 ${nf(post.views)}<br>프레임은 영상에서 ffmpeg로 추출 · 컷은 장면 전환 감지(scene detection) 기반 · 감정 곡선·정점·점수는 정성 분석</footer>
    </main>
  </div>

<script>
  const SHOTS=${JSON.stringify(shots.map(s=>({n:s.n,s:s.s,e:s.e,text:s.text,shot:s.shot,role:s.role,phase:s.phase,emo:s.emo})))};
  const ETL=${JSON.stringify(emoTimeline.map(e=>({s:e.s,e:e.e,phase:e.phase,title:e.title})))};
  const DUR=${post.duration}, EW=${W}, EPADL=${padL}, EPADR=${padR};

  // ---- main player ----
  const vid=document.getElementById("vid"), scrub=document.getElementById("scrub"), prog=document.getElementById("prog");
  const nowNo=document.getElementById("nowNo"),nowPh=document.getElementById("nowPh"),nowText=document.getElementById("nowText"),nowShot=document.getElementById("nowShot"),nowRole=document.getElementById("nowRole"),nowTime=document.getElementById("nowTime");
  const playBtn=document.getElementById("playBtn");
  const srows=[...document.querySelectorAll(".srow")];
  const fstripItems=[...document.querySelectorAll(".fstrip-i")];
  const dbars=[...document.querySelectorAll(".dbar")];
  let curN=-1;
  function shotAt(t){let s=SHOTS[0];for(const x of SHOTS){if(t>=x.s)s=x;}return s;}
  function renderMain(t){
    prog.style.width=(t/DUR*100)+"%"; scrub.value=t;
    nowTime.textContent=t.toFixed(1)+" / "+DUR+"s";
    const s=shotAt(t);
    if(s.n!==curN){curN=s.n;
      nowNo.textContent="CUT "+s.n; nowPh.textContent=s.phase; nowPh.className="ph ph-"+s.phase;
      nowText.textContent="“"+s.text+"”"; nowShot.textContent="🎬 "+s.shot;
      nowRole.innerHTML="<b>역할</b> "+s.role+" · <b>감정</b> "+s.emo;
      srows.forEach(c=>c.classList.toggle("active",+c.dataset.n===s.n));
    }
    let fi=Math.min(fstripItems.length-1,Math.round(t/0.5));
    fstripItems.forEach((f,k)=>f.classList.toggle("on",k===fi));
  }
  vid.addEventListener("timeupdate",()=>renderMain(vid.currentTime));
  vid.addEventListener("loadedmetadata",()=>renderMain(0));
  scrub.addEventListener("input",()=>{vid.currentTime=+scrub.value;renderMain(+scrub.value);});
  playBtn.addEventListener("click",()=>{vid.paused?vid.play():vid.pause();});
  vid.addEventListener("play",()=>playBtn.textContent="❚❚");
  vid.addEventListener("pause",()=>playBtn.textContent="▶");
  document.getElementById("stepB").addEventListener("click",()=>{vid.pause();vid.currentTime=Math.max(0,vid.currentTime-0.1);renderMain(vid.currentTime);});
  document.getElementById("stepF").addEventListener("click",()=>{vid.pause();vid.currentTime=Math.min(DUR,vid.currentTime+0.1);renderMain(vid.currentTime);});
  document.querySelectorAll(".sbtn[data-rate]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".sbtn[data-rate]").forEach(x=>x.classList.remove("on"));
    b.classList.add("on"); vid.playbackRate=+b.dataset.rate; if(vid.paused)vid.play();
  }));
  function inView(el){const r=el.getBoundingClientRect();return r.top<innerHeight*0.9&&r.bottom>60;}
  function seekMain(t){vid.pause();vid.currentTime=t;renderMain(t);const pl=document.getElementById("sec-player");if(!inView(pl))pl.scrollIntoView({behavior:"smooth",block:"start"});}
  srows.forEach(c=>c.addEventListener("click",()=>seekMain(+c.dataset.start+0.05)));
  fstripItems.forEach(f=>f.addEventListener("click",()=>{vid.pause();vid.currentTime=+f.dataset.t;renderMain(+f.dataset.t);}));
  dbars.forEach(d=>d.addEventListener("click",()=>seekMain(+d.dataset.start+0.05)));

  // ---- emotion player (independent, no scroll) ----
  const vid2=document.getElementById("vid2"), emoHead=document.getElementById("emoHead"), emoNow=document.getElementById("emoNow");
  const etls=[...document.querySelectorAll(".etl")];
  const peakBtns=[...document.querySelectorAll(".peak")];
  const pkGs=[...document.querySelectorAll(".pk-g")];
  let curE=-1;
  function emoIdxAt(t){let i=0;for(let k=0;k<ETL.length;k++){if(t>=ETL[k].s)i=k;}return i;}
  function renderEmo(t){
    if(emoHead){const x=EPADL+(t/DUR)*(EW-EPADL-EPADR);emoHead.setAttribute("x1",x);emoHead.setAttribute("x2",x);}
    const ei=emoIdxAt(t);
    if(ei!==curE){curE=ei;etls.forEach((r,k)=>r.classList.toggle("active",k===ei));
      const e=ETL[ei]; if(emoNow)emoNow.innerHTML="<b>"+t.toFixed(1)+"s</b> · "+e.phase+" — "+e.title;
    } else if(emoNow){emoNow.innerHTML="<b>"+t.toFixed(1)+"s</b> · "+ETL[ei].phase+" — "+ETL[ei].title;}
  }
  vid2.addEventListener("timeupdate",()=>renderEmo(vid2.currentTime));
  vid2.addEventListener("loadedmetadata",()=>renderEmo(0));
  function seekEmo(t){vid2.currentTime=t;vid2.play();renderEmo(t);}
  etls.forEach(r=>r.addEventListener("click",()=>seekEmo(+r.dataset.start+0.05)));
  peakBtns.forEach(b=>b.addEventListener("click",()=>seekEmo(+b.dataset.t)));
  pkGs.forEach(g=>g.addEventListener("click",()=>seekEmo(+g.dataset.t)));

  // ---- TOC scroll-spy ----
  const tocItems=[...document.querySelectorAll(".toc-i")];
  const secs=tocItems.map(a=>document.getElementById(a.dataset.id)).filter(Boolean);
  const spy=new IntersectionObserver((ents)=>{
    ents.forEach(e=>{if(e.isIntersecting){const id=e.target.id;tocItems.forEach(a=>a.classList.toggle("active",a.dataset.id===id));}});
  },{rootMargin:"-45% 0px -50% 0px",threshold:0});
  secs.forEach(s=>spy.observe(s));

  // ---- hook clip ----
  const hookVid=document.getElementById("hookVid"),hookReplay=document.getElementById("hookReplay");
  if(hookReplay)hookReplay.addEventListener("click",()=>{hookVid.currentTime=0;hookVid.play();});

  // ---- theme ----
  (function(){const root=document.documentElement,btn=document.getElementById("themeToggle");
   const saved=localStorage.getItem("igreport-theme");
   function paint(t){const dark=t==="dark"||(t==null&&matchMedia("(prefers-color-scheme:dark)").matches);btn.textContent=dark?"☀️ 라이트":"🌙 다크";}
   if(saved)root.setAttribute("data-theme",saved); paint(saved);
   btn.addEventListener("click",()=>{const cur=root.getAttribute("data-theme");const sys=matchMedia("(prefers-color-scheme:dark)").matches;const now=cur?(cur==="dark"?"light":"dark"):(sys?"light":"dark");root.setAttribute("data-theme",now);localStorage.setItem("igreport-theme",now);paint(now);});
  })();
</script>
</body>
</html>`;

fs.writeFileSync(outPath, html, "utf8");
console.log("Analysis page written:", outPath, "bytes", Buffer.byteLength(html));
