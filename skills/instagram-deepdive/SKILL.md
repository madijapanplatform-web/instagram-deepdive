---
name: instagram-deepdive
description: >-
  Generate a deep-dive content-analysis HTML report from an Instagram URL. Given an Instagram
  profile URL (e.g. instagram.com/username/) or a specific post/reel URL, scrape recent posts &
  reels via the Apify MCP, rank by engagement, and build an interactive "zine-style" deep-dive of
  the chosen reel — frame-by-frame storyboard, scene-cut & pacing analysis, 3-second hook breakdown
  with clip, viewer emotion-flow chart (P1/P2/P3 peaks) with a synced video player, why-it-went-viral
  metrics, target / emotions / weakness analysis, and cross-domain benchmarking patterns, all with an
  interactive video scrubber, dark mode, and a fixed left table of contents. USE THIS whenever the
  user pastes an Instagram URL and wants to analyze it, asks for a content/reels breakdown, a
  "딥다이브"/deep-dive/심층분석, competitor or creator research, a best-content report, or wants to
  understand why a post performed well — even if they only say "analyze this account/reel".
---

# Instagram Deep-Dive Analyzer

Turn an Instagram URL into (a) a 30-day **best-content overview** and (b) an interactive
**deep-dive analysis** of the single best-performing reel. The mechanical work (scraping, media
download, ffmpeg frame/scene extraction, HTML rendering) is handled by bundled scripts. Your job is
the part only a human-level analyst can do: **watch the frames and write the analysis**.

Throughout, let `SKILL` = this skill's directory (the folder containing this file) and run the
bundled scripts as `node "$SKILL/scripts/<name>.js" ...`. Requires **Node.js**, **ffmpeg + ffprobe**
on PATH, and the **Apify MCP** (`apify/instagram-scraper`) connected.

## Inputs & modes

The user gives one of:
- **Profile URL(s)** — `instagram.com/<username>/` (one or two). → Do the full flow: scrape → rank →
  overview → **confirm which content to deep-dive with the user** → deep-dive.
- **A specific post/reel URL** — `instagram.com/p/<code>/` or `instagram.com/reel/<code>/`. → Skip
  ranking; scrape just that item and deep-dive it directly.
- A mix ("analyze @acct, deep-dive this reel <url>"). Honor the explicit target.

Always **confirm the deep-dive target with the user** before the expensive media/analysis step,
unless they already named a specific post/reel URL.

## Output layout

Create a project folder (ask the user or default to `<Desktop>/ig-deepdive-<username>`). Everything
the HTML references is **relative to `report/`**, and media is downloaded locally so the report keeps
working after Instagram's CDN URLs expire.

```
<project>/
├── data/            selected.json, profiles.json, analysis-<code>.json, scrape dumps
└── report/
    ├── index.html                      (overview — render_overview.js)
    ├── analysis-<account>-<code>.html  (deep-dive — render_analysis.js)
    └── media/
        ├── profile/<account>.jpg
        └── <account>/<code>/  cover.jpg, video.mp4, img*.jpg, hook3s.mp4,
                               frames/f###.jpg, shots/shot##.jpg, sheet_*.jpg
```

## Step 1 — Scrape (Apify MCP)

Read `references/apify-scraping.md` for exact tool calls, input schema, and gotchas. Key points:
- Use `apify/instagram-scraper`, `resultsType:"posts"`, `addParentData:true`,
  `onlyPostsNewerThan:"30 days"` (or the user's window), `resultsLimit:~100`.
- Run **async** (`call-actor` with `async:true`), poll `get-actor-run` until `SUCCEEDED`, then pull
  fields with `get-actor-output`. Large outputs are saved to a file — process with Node, don't dump
  into context.
- **Group by `inputUrl`, NOT `ownerUsername`** — collab posts and renamed handles differ from the
  profile you searched. This matters; getting it wrong misattributes content.
- Also run `resultsType:"details"` for profile headers (followers, bio, pic) → `profiles.json`.

## Step 2 — Rank & build the overview

- Engagement = `likesCount + commentsCount` (treat hidden/`-1` as 0). Sort desc, take **top 10 per
  account**. Write `data/selected.json` (schema in `references/analysis-schema.md`).
- Build a download list of every top item's media (cover, sidecar `images[]`, reel `videoUrl`) and
  profile pics, then: `node "$SKILL/scripts/download_media.js" data/dltasks.json`.
- Render: `node "$SKILL/scripts/render_overview.js" data report/index.html`.
- Show the user the ranked candidates and **ask which to deep-dive** (default: the top reel — video
  content deep-dives best since the analysis is built around shots/cuts/hook).

## Step 3 — Extract media for the chosen reel

Let `MED=report/media/<account>/<code>` and `VID=$MED/video.mp4` (download it first if needed).

```bash
node "$SKILL/scripts/extract_media.js" all "$VID" "$MED"
```

This prints JSON with `probe`, `cuts` (scene-change times), `frameCount`, `shotBounds`, and
`shotMidpoints`, and writes `frames/f###.jpg` (2 fps filmstrip) + `hook3s.mp4` (0–3.2s clip). Then
make one thumbnail per cut and contact sheets you can actually look at:

```bash
node "$SKILL/scripts/extract_media.js" shots "$VID" "$MED/shots" "<comma-separated shotMidpoints>"
# Full storyboard: montage the per-cut thumbnails (one tile per real cut). Pick cols×rows ≥ #cuts,
# e.g. 9 cuts → 3 3, 11 cuts → 4 3, 12 cuts → 4 3.
node "$SKILL/scripts/extract_media.js" montage "$MED/shots" "$MED/sheet_story.jpg" 3 3 240
# First-3s hook: tiling the video here is correct (12 frames = exactly 0–3s).
node "$SKILL/scripts/extract_media.js" sheet "$VID" "$MED/sheet_hook.jpg" 4 3 4 240 0 3
```

> ⚠️ Do NOT build the full storyboard with `sheet <video> ... tile=CxR` — that tiles only the first
> C×R frames (at 2 fps, a 3×3 sheet = just the first 4.5 s, not the whole video). Always `montage` the
> extracted `shots/shot##.jpg` for the storyboard so each tile is a real cut. Captions can change
> faster than scene cuts, so also skim the `frames/` filmstrip if a shot's caption is ambiguous.

## Step 4 — Watch the frames, then write the analysis

**This is the core.** Read the contact sheets and shot thumbnails with the Read tool and actually
look at them — read the on-screen captions, identify each shot, the hook, the climax, the CTA. Then
author `data/analysis-<code>.json` following `references/analysis-schema.md` and the analytical
method in `references/analysis-methodology.md`. The quality of the report is entirely the quality of
what you write here — be specific and evidence-based, citing real on-screen text and real metrics
(compute engagement/like/comment rates; compare views vs follower count for reach).

**Reel Health Score (recommended):** also fill the `score` object — a weighted checklist that the
renderer turns into a 0–100 score + letter grade + Quick Wins. Evaluate each check in
`references/reel-scoring.md` as pass/warn/fail and write the `finding` + `fix`. Be honest: tie R1
(reach) to real views-vs-followers, E1 to the real engagement rate, etc. An average reel lands ~50–75,
not 90+. The score becomes a headline badge in the report and a dedicated "09 릴스 점수" section.

## Step 5 — Render & link

```bash
node "$SKILL/scripts/render_analysis.js" data/analysis-<code>.json report/analysis-<account>-<code>.html
```

Then set `analysisHref:"analysis-<account>-<code>.html"` on that item inside `selected.json` and
re-run `render_overview.js` so the overview card links to the deep-dive. Open the report
(`Start-Process` on Windows / `open` on macOS) and summarize the key findings for the user.

## Notes & gotchas

- **Don't dump large Apify/dataset JSON into context** — it's saved to a file; process with Node and
  read back only what you need.
- **Verify media before rendering** — `download_media.js` reports `fail=N`; a tiny/HTML response
  means a bad/expired URL.
- The renderers are **pure templating** — they reproduce the reference report byte-for-byte from the
  JSON. Don't hand-edit the HTML; change the data and re-render. If you need a layout change, edit the
  renderer script, not the output.
- The analysis JSON is authored **per video**. Never reuse another reel's storyboard/emotion text —
  it must match the frames you actually viewed.
- For a non-video post (carousel/image) the deep-dive's shot/hook/cut sections don't apply; prefer a
  reel as the deep-dive target, or tell the user the deep-dive works best on video.
