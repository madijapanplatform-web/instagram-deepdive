# Data schemas

Exact JSON the bundled renderers consume. All media paths are **relative to the output HTML**
(which lives in `report/`), e.g. `media/<account>/<code>/video.mp4`.

## Overview: `selected.json` + `profiles.json` (→ render_overview.js)

`render_overview.js <dataDir> <out.html>` reads both from `<dataDir>`. Account order = key order of
`selected.json`.

### selected.json
```json
{
  "<account>": {
    "total": 100,
    "top": [
      {
        "account": "<account>",
        "shortCode": "DZEwF4ex-Kc",
        "url": "https://www.instagram.com/p/DZEwF4ex-Kc/",
        "caption": "full caption text…",
        "likes": 2865,
        "comments": 146,
        "views": 116760,                 // 0 for non-video
        "duration": 17.76,               // reels only
        "timestamp": "2026-06-02T06:57:23.000Z",
        "isVideo": true,
        "local": {
          "cover": "media/<account>/<code>/cover.jpg",
          "video": "media/<account>/<code>/video.mp4",   // "" if not a video
          "images": ["media/<account>/<code>/img1.jpg", "…"]  // carousel; [] for reels
        },
        "analysisHref": "analysis-<account>-<code>.html"  // OPTIONAL — add after the deep-dive renders
      }
    ]
  }
}
```

### profiles.json
```json
{
  "<account>": {
    "username": "<account>",
    "fullName": "…",
    "followers": 83763,
    "follows": 1180,
    "posts": 3349,
    "bio": "line1\nline2",
    "localPic": "media/profile/<account>.jpg",
    "note": "최근 30일 수집 N건 · (협업/리네임 등 참고)"   // shown in the header note
  }
}
```

## Deep-dive: `analysis-<code>.json` (→ render_analysis.js)

`render_analysis.js <analysis.json> <out.html>`. Media-derived paths (`shots[].thumb`, filmstrip
frames, video, hook clip, poster) are computed from `mediaDir` + `frameCount` + shot count, so the
JSON only carries **content**. Sections appear in this fixed order: 00 player, 01 viral, 02 goal,
03 target, 04 hook, 05 storyboard, 06 cut, 07 emotion, 08 benchmarking.

```json
{
  "mediaDir": "media/<account>/<code>",
  "profilePicFile": "media/profile/<account>.jpg",
  "frameCount": 35,                         // # of frames/f###.jpg at 2 fps (≈ round(duration/0.5))
  "post": {
    "account": "nppip_japan",
    "fullName": "…",
    "url": "https://www.instagram.com/p/<code>/",
    "likes": 2865, "comments": 146, "views": 116760,
    "duration": 17.72,
    "date": "2026.06.02",
    "product": "short product/topic label shown as the report title"
  },

  "shots": [                                 // one per CUT, in order; n/thumb/dur auto-derived
    { "s": 0.10, "e": 2.54,
      "text": "on-screen caption(s) during this cut (verbatim, '·'-joined if multiple)",
      "shot": "what the camera shows (framing/action)",
      "role": "narrative role (후킹·정체 숨김, USP 공개, 반전, CTA …)",
      "phase": "호기심",                      // one of: 호기심 관심 이해 욕구 결심 (drives color coding)
      "emo": "viewer emotion at this beat" }
  ],

  "emoPts": [ [0.3,72,"놀람 스파이크"], [2.4,55,"호기심 유지"], "… [timeSec, intensity0-100, label]" ],

  "goalCards":      [ {"t":"① …","d":"…(may contain <b> </b>)"} ],
  "coreTarget":     { "line":"one-line persona", "detail":"…" },
  "targetLayers":   [ {"tag":"WHO · 핵심","t":"…","d":"…"} ],
  "emotionsTriggered":[ {"icon":"❓","emo":"놀람 · 호기심","how":"…"} ],
  "weaknesses":     [ {"t":"…","d":"…"} ],

  "metrics":        [ {"b":"2.58%","s":"참여율","note":"…"} ],        // 4 headline stats
  "viralReasons":   [ {"t":"…","d":"…"} ],                           // why it spread (algorithm view)

  "emoTimeline":    [ {"s":0.0,"e":2.5,"phase":"호기심","title":"…","d":"…"} ],  // time-synced cards
  "peaks": [                                                          // exactly the 3 emotion peaks
    { "id":"P1","t":0.6,"y":72,"label":"호기심 폭발","phase":"호기심",
      "quote":"big quote on the card","tc":"0–3s","star":false,"desc":"…","line":"on-screen line(s)" },
    { "id":"P2","t":14.6,"y":92,"label":"…","phase":"욕구","quote":"…","tc":"12–16s","star":true,"desc":"…","line":"…" },
    { "id":"P3","t":16.9,"y":84,"label":"…","phase":"결심","quote":"…","tc":"16–18s","star":false,"desc":"…","line":"…" }
  ],

  "emoTimeline": [ {"s":0.0,"e":5.5,"phase":"호기심","title":"…","d":"…"} ],  // REQUIRED: time-synced cards
  "hookBeats": [ {"tc":"0.0–0.5s","t":"beat title","d":"…"} ],       // first-3s breakdown
  "hookWhy": "1–3 sentence thesis on why the hook works",

  "takeaways": [ {"t":"pattern name","d":"what/why","apply":"how to reuse in other niches"} ],

  "// PER-VIDEO SECTION COPY — write these every time so no other video's text leaks in": "",
  "viralTitle": "왜 이 콘텐츠가 터졌나",   // section 01 title — reword honestly if it DIDN'T blow up
  "viralLead":  "lead under the viral title — cite this video's real reach (views vs followers)",
  "goalLead":   "section 02 lead — the funnel this specific video is built for",
  "cutLead":    "section 06 lead — this video's pacing in words",
  "cutStats":   [ {"b":"9","s":"총 컷 수 (20.2초)"}, {"b":"2.2s","s":"평균 샷"}, {"b":"3.6s","s":"최장 샷"}, {"b":"1.2s","s":"최단 샷"} ],
  "transitionNote": { "t":"전환 방식 — 하드컷", "d":"how cuts/captions transition in THIS video" },
  "emotionLead": "section 07 lead — describe THIS video's arc & where the real peak is",
  "benchLead":  "section 08 lead — one line setting up the reusable patterns",
  "headlineKpi": "2.8%"    // optional; defaults to computed (likes+comments)/views
}
```

### Reel Health Score (optional but recommended) — `score`
A weighted checklist the renderer turns into a 0–100 score + grade (A/B/C/D/F) + Quick Wins, shown as
a headline badge and a "09 릴스 점수" section. Full check list, severities, and thresholds are in
`references/reel-scoring.md`. Shape:
```json
"score": {
  "verdict": "one–two sentence headline read (may use <b>…</b>)",
  "categories": [
    {"key":"hook","name":"후킹 & 리텐션 (0–3초)","weight":30},
    {"key":"structure","name":"구조 & 페이싱","weight":20},
    {"key":"reach","name":"도달 & 확산","weight":20},
    {"key":"engagement","name":"참여 & 전환","weight":20},
    {"key":"production","name":"완성도 & 브랜드","weight":10}
  ],
  "checks": [
    {"id":"H1","cat":"hook","sev":"critical","result":"warn",
     "text":"check description","finding":"what you observed","fix":"how to improve (omit/empty if pass)"}
  ]
}
```
- `cat` must match a `categories[].key`; `sev` ∈ critical|high|medium|low; `result` ∈ pass|warn|fail.
- The renderer computes per-category and overall scores — don't precompute. Quick Wins = non-pass
  checks with critical/high severity. If `score` is omitted, the badge and section are simply skipped.

### Required vs optional
- **Required** (renderer needs them): `post, mediaDir, profilePicFile, frameCount, shots, emoPts,
  goalCards, coreTarget, targetLayers, emotionsTriggered, weaknesses, metrics, viralReasons,
  emoTimeline, peaks, hookBeats, hookWhy, takeaways`.
- **Per-video copy** (`viralTitle, viralLead, goalLead, cutLead, cutStats, transitionNote,
  emotionLead, benchLead, headlineKpi`): technically optional — the renderer falls back to generic
  text — but **always author them** so the report carries no leftover copy from another video, and so
  the numbers (cuts, duration, reach) match this video. Be honest: if the reel under-performed, say so
  in `viralTitle`/`viralLead` and `metrics` rather than forcing a "went viral" framing.

### Field notes
- `phase` must be one of **호기심 / 관심 / 이해 / 욕구 / 결심** (also used by `emoTimeline`, `peaks`).
  These map to fixed colors in the renderer; other values render uncolored. (Translate these to the
  account's language if you localize — but then also update the color keys in the renderer.)
- `peaks` should be the **three** emotional high points (hook spike, true climax with `star:true`,
  and the CTA/turn). `t` is the seek time; `y` (0–100) places the marker on the curve.
- `emoPts` is the smooth curve (8–10 points is plenty). `peaks` are the labeled markers on top of it.
- `metrics` are 4 short cards — compute them: engagement % = (likes+comments)/views, like %, comment
  count, and reach (views ÷ followers as "×N").
- Light inline `<b>…</b>` is allowed inside `d`/`detail` strings (they're injected as HTML); other
  fields are HTML-escaped, so write quotes/`&`/`<` naturally.
- `frameCount`: the `extract_media.js all` output prints it. Default ≈ `round(duration / 0.5)`.
