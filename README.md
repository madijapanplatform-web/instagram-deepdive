# Instagram Deep-Dive 🔎

Turn an **Instagram URL** into an interactive, zine-style **deep-dive content analysis** — and a
**0–100 Reel Health Score**. Built as a [Claude Code](https://claude.com/claude-code) skill.

Give it a profile URL (or a specific reel URL) and it will:

1. **Scrape** recent posts & reels via the Apify MCP and rank them by engagement
2. **Pick** the best content (you confirm the deep-dive target)
3. **Extract** frames, scene cuts, and a hook clip with ffmpeg
4. **Analyze** the reel by actually watching the frames, and build an interactive HTML report:
   - 🎬 Interactive video scrubber + slow-mo + filmstrip
   - 🗂 Frame-by-frame **storyboard** table & narrative structure
   - ✂️ **Scene-cut & pacing** analysis
   - ⚡ **3-second hook** breakdown (with clip)
   - 📈 Viewer **emotion-flow** chart (P1/P2/P3 peaks) with a section-local synced player
   - 🔥 **Why-it-went-viral** metrics (engagement, reach vs followers)
   - 🎯 Target / emotions / **weakness** analysis
   - 🧩 Cross-domain **benchmarking patterns**
   - 🏅 **Reel Health Score (0–100)** with letter grade + **Quick Wins**
   - 🌗 Dark mode + responsive + fixed left table of contents

## Requirements

This skill orchestrates external tools — you need all three:

| Dependency | Why | Get it |
|-----------|-----|--------|
| **Apify MCP** (+ credits) | Scrapes Instagram via `apify/instagram-scraper` | `claude mcp add apify --transport http https://mcp.apify.com/sse --header "Authorization: Bearer <APIFY_TOKEN>"` — token from [Apify Console](https://console.apify.com/settings/integrations) |
| **Node.js** | Runs the bundled render/extract scripts | https://nodejs.org |
| **ffmpeg + ffprobe** | Frame extraction & scene detection | https://ffmpeg.org/download.html (must be on PATH) |

> Scraping consumes Apify credits. The deep-dive works best on **video reels** (the storyboard/hook/cut
> sections need a video); carousels/photos are flagged rather than force-fit.

## Install

### Option A — Plugin marketplace (recommended, one-line, auto-updates)

In Claude Code:

```
/plugin marketplace add madijapanplatform-web/instagram-deepdive
/plugin install instagram-deepdive
```

### Option B — `.skill` file (no GitHub needed)

1. Download `instagram-deepdive.skill` from this repo.
2. It's a zip — extract it into your personal skills folder so you get
   `~/.claude/skills/instagram-deepdive/SKILL.md`:

   ```bash
   # macOS / Linux
   mkdir -p ~/.claude/skills && unzip instagram-deepdive.skill -d ~/.claude/skills/
   ```
   ```powershell
   # Windows (PowerShell)
   New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
   Expand-Archive -Path .\instagram-deepdive.skill -DestinationPath "$HOME\.claude\skills\" -Force
   ```
3. Restart Claude Code.

### Option C — Manual copy

Copy the `skills/instagram-deepdive/` folder from this repo into `~/.claude/skills/`.

## Usage

Just paste an Instagram URL and ask for a deep-dive:

```
이 릴스 딥다이브 분석해줘 https://www.instagram.com/reel/XXXXXXXX/
```
```
analyze this account https://www.instagram.com/<username>/
```

- **Profile URL** → scrapes 30 days, ranks top content, asks which to deep-dive.
- **Reel/post URL** → deep-dives that specific item directly.

The report and all media are written to a project folder (e.g. `Desktop/ig-deepdive-<code>/report/`)
with media downloaded locally, so it keeps working after Instagram's CDN links expire.

## How it's built

The mechanical work is deterministic bundled scripts; the analysis is authored by Claude after
viewing the frames.

```
skills/instagram-deepdive/
├── SKILL.md                     # workflow + the two input modes
├── scripts/
│   ├── render_overview.js       # 30-day best-content overview → index.html
│   ├── render_analysis.js       # data-driven deep-dive → analysis HTML (incl. score)
│   ├── extract_media.js         # ffmpeg: probe, scene cuts, frames, hook clip, montage
│   └── download_media.js        # local media download
└── references/
    ├── apify-scraping.md        # Apify calls + the inputUrl grouping gotcha
    ├── analysis-schema.md       # JSON schema the renderers consume
    ├── analysis-methodology.md  # how to analyze a reel
    └── reel-scoring.md          # the 0–100 Reel Health Score checklist
```

## License

MIT — see [LICENSE](./LICENSE).
