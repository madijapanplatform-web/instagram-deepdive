# 인스타그램 딥다이브 🔎

**인스타그램 URL** 하나를 넣으면 인터랙티브 zine 스타일 **콘텐츠 심층 분석 리포트**와
**0–100 릴스 헬스 스코어**를 만들어 줍니다. [Claude Code](https://claude.com/claude-code) 스킬입니다.

프로필 URL(또는 특정 릴스 URL)을 주면:

1. Apify MCP로 최근 게시물·릴스를 **스크래핑**하고 참여도로 **랭킹**
2. 베스트 콘텐츠를 **선별**(딥다이브 대상은 사용자가 확정)
3. ffmpeg로 프레임·장면 컷·후킹 클립을 **추출**
4. 프레임을 직접 보며 릴스를 **분석**하고 인터랙티브 HTML 리포트 생성:
   - 🎬 인터랙티브 영상 스크러버 + 슬로우모션 + 필름스트립
   - 🗂 프레임 단위 **스토리보드** 표 & 서사 구조
   - ✂️ **장면 전환 & 컷 페이싱** 분석
   - ⚡ **첫 3초 후킹** 해부 (클립 포함)
   - 📈 시청자 **감정 흐름** 차트(P1/P2/P3 정점) + 구간 동기화 플레이어
   - 🔥 **왜 터졌나** 지표 (참여율, 팔로워 대비 도달)
   - 🎯 타깃 / 자극 감정 / **약점** 분석
   - 🧩 **벤치마킹 공식** (다른 분야 적용 예시)
   - 🏅 **릴스 헬스 스코어(0–100)** + 등급 + **Quick Wins**
   - 🌗 다크모드 + 반응형 + 좌측 고정 목차

## 요구 사항

이 스킬은 외부 도구를 조합해서 작동합니다 — 아래 3가지가 모두 필요합니다.

| 의존성 | 용도 | 설치 |
|--------|------|------|
| **Apify MCP** (+크레딧) | `apify/instagram-scraper`로 인스타 스크래핑 | `claude mcp add --scope user apify --transport http https://mcp.apify.com/sse --header "Authorization: Bearer <APIFY_토큰>"` — 토큰은 [Apify Console](https://console.apify.com/settings/integrations)에서 발급 |
| **Node.js** | 번들 렌더/추출 스크립트 실행 | https://nodejs.org |
| **ffmpeg + ffprobe** | 프레임 추출 & 장면 감지 | https://ffmpeg.org/download.html (PATH에 등록) |

> 스크래핑은 Apify 크레딧을 소모합니다. 딥다이브는 **영상 릴스**에 최적화돼 있고
> (스토리보드·후킹·컷 섹션은 영상이 필요), 캐러셀·사진은 억지로 끼워맞추지 않고 안내 후 중단합니다.

## 설치

### 방법 A — 플러그인 마켓플레이스 (추천 · 한 줄 · 자동 업데이트)

Claude Code에서:

```
/plugin marketplace add madijapanplatform-web/instagram-deepdive
/plugin install instagram-deepdive
```

### 방법 B — `.skill` 파일 (GitHub 불필요)

1. 이 저장소에서 `instagram-deepdive.skill`을 받습니다.
2. zip 파일이므로, 개인 스킬 폴더에 풀어 `~/.claude/skills/instagram-deepdive/SKILL.md`가 되게 합니다:

   ```bash
   # macOS / Linux
   mkdir -p ~/.claude/skills && unzip instagram-deepdive.skill -d ~/.claude/skills/
   ```
   ```powershell
   # Windows (PowerShell)
   New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
   Expand-Archive -Path .\instagram-deepdive.skill -DestinationPath "$HOME\.claude\skills\" -Force
   ```
3. Claude Code를 재시작합니다.

### 방법 C — 폴더 수동 복사

이 저장소의 `skills/instagram-deepdive/` 폴더를 `~/.claude/skills/`로 복사합니다.

> 💡 **모든 프로젝트에서 쓰려면** 반드시 전역 위치(`~/.claude/skills/`)에 두세요.
> 프로젝트 안(`<프로젝트>/.claude/skills/`)에 두면 그 프로젝트에서만 작동합니다.
> Apify MCP도 `--scope user`로 붙여야 모든 프로젝트에서 잡힙니다.

## 사용법

인스타그램 URL을 붙여넣고 딥다이브를 요청하면 됩니다:

```
이 릴스 딥다이브 분석해줘 https://www.instagram.com/reel/XXXXXXXX/
```
```
이 계정 분석해줘 https://www.instagram.com/<username>/
```

- **프로필 URL** → 최근 30일 스크래핑 → 상위 콘텐츠 랭킹 → 딥다이브 대상 확인
- **릴스/게시물 URL** → 해당 콘텐츠를 바로 딥다이브

리포트와 모든 미디어는 프로젝트 폴더(예: `Desktop/ig-deepdive-<코드>/report/`)에 생성되며,
미디어는 로컬에 저장되어 인스타그램 CDN 링크가 만료돼도 계속 열립니다.

## 리포트 공유하기

리포트 HTML은 `media/` 폴더를 상대경로로 참조하므로 **HTML만 단독으로 보내면 사진·영상이 깨집니다.**
공유 방법:

- **단일 파일(가장 간편)** — 모든 미디어를 base64로 HTML에 임베드한 자립형 파일 생성:
  ```bash
  node "<스킬경로>/scripts/embed_standalone.js" report/analysis-<...>.html
  # → analysis-<...>-standalone.html  (이 파일 하나만 보내면 끝)
  ```
- **폴더 zip** — `report/` 폴더(HTML + `media/`)를 통째로 압축해 전달 (더 가벼움).

## 구성

기계적인 작업은 결정적 번들 스크립트가, 분석 내용은 Claude가 프레임을 보고 직접 작성합니다.

```
skills/instagram-deepdive/
├── SKILL.md                     # 워크플로우 + 두 가지 입력 모드
├── scripts/
│   ├── render_overview.js       # 30일 베스트 개요 → index.html
│   ├── render_analysis.js       # 데이터 기반 딥다이브 → 분석 HTML (점수 포함)
│   ├── extract_media.js         # ffmpeg: 프로브·장면컷·프레임·후킹클립·몽타주
│   ├── download_media.js        # 미디어 로컬 다운로드
│   └── embed_standalone.js      # 미디어 임베드 → 공유용 단일 HTML
└── references/
    ├── apify-scraping.md        # Apify 호출 + inputUrl 그룹핑 주의점
    ├── analysis-schema.md       # 렌더러가 읽는 JSON 스키마
    ├── analysis-methodology.md  # 릴스 분석 방법론
    └── reel-scoring.md          # 0–100 릴스 헬스 스코어 체크리스트
```

## 라이선스

MIT — [LICENSE](./LICENSE) 참고.
