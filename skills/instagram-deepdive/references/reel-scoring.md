# Reel Health Score — scoring model (0–100)

Adapted from the weighted-checklist pattern: each check is **PASS / WARNING / FAIL**, multiplied by a
**severity** weight, aggregated per **category**, then combined by **category weight** into a single
0–100 score with a letter grade. The renderer computes all the math — you (Claude) only judge each
check (`result`) and write the `finding` + `fix`. Be honest: an average reel should land in the
50–75 range, not 90+.

## Formula (computed by render_analysis.js)
```
category_score = Σ(result × severity) / Σ(severity) × 100        result: pass=1, warn=0.5, fail=0
overall        = Σ(category_score × category_weight) / Σ(weights)  severity: critical=5, high=3, medium=1.5, low=0.5
```
Grade: **A** ≥85 · **B** 70–84 · **C** 55–69 · **D** 40–54 · **F** <40.
**Quick Wins** = every check that is NOT pass AND is `critical`/`high` severity (sorted critical→high).

## Categories & weights
| key | 카테고리 | weight | 핵심 질문 |
|-----|----------|--------|-----------|
| `hook` | 후킹 & 리텐션 (0–3초) | 30% | 스크롤을 멈추고 끝까지 볼 이유를 주는가 |
| `structure` | 구조 & 페이싱 | 20% | 서사·컷 리듬·정점·CTA 배치가 좋은가 |
| `reach` | 도달 & 확산 | 20% | 팔로워 밖으로 퍼졌는가 (탐색/추천) |
| `engagement` | 참여 & 전환 | 20% | 참여·댓글·저장·CTA가 작동하는가 |
| `production` | 완성도 & 브랜드 | 10% | 화질·오디오·브랜드 일관성 |

## Check list (judge each; pick the closest result)
Each check: `id`, `cat`, `sev`, then you assign `result` (pass/warn/fail) + `finding` + `fix`.

### hook (30%)
- **H1** `critical` — 0–3초 스크롤 정지 요소(강한 비주얼·움직임·패턴 인터럽트)
- **H2** `critical` — 호기심 갭/질문/열린 고리(끝까지 볼 이유). *질문·반전·정체숨김 = pass*
- **H3** `high` — 핵심 메시지/USP를 3초 내 노출
- **H4** `medium` — 첫 화면 자막 가독성(큰 글씨·대비·1줄 핵심)

### structure (20%)
- **S1** `high` — 명확한 서사 아크(훅 → 전개 → 정점 → CTA)
- **S2** `medium` — 컷 페이싱 완급. *평균 샷 1–2.5초, 정보는 짧게·정점은 길게면 pass*
- **S3** `medium` — 뚜렷한 클라이맥스가 CTA 직전에 배치
- **S4** `low` — 길이 적정(7–30초, 스윗스폿 15–25초)

### reach (20%)
- **R1** `critical` — 도달 > 팔로워. *조회/팔로워 ≥1.0 pass · 0.3–1.0 warn · <0.3 fail*
- **R2** `high` — 루프/재시청. *재생/조회 ≥1.5x pass · 1.1–1.5 warn · ≤1.0 fail*
- **R3** `medium` — 공유/저장 유인(친구 태그 트리거·저장할 정보)

### engagement (20%)
- **E1** `high` — 참여율 (좋아요+댓글)/조회. *≥2% pass · 1–2% warn · <1% fail*
- **E2** `medium` — 댓글 유도 장치(키워드 게이팅·질문·논쟁거리)
- **E3** `high` — 명확한 CTA(온스크린 또는 캡션). *다음 행동 명시 = pass*
- **E4** `medium` — 저장 가치(레시피·비교·랭킹·체크리스트 등 ‘다시 볼 정보’)

### production (10%)
- **P1** `medium` — 영상/이미지 화질·조명·구도
- **P2** `low` — 오디오/음악 적합성(트렌드·무드·자막 싱크)
- **P3** `low` — 브랜드 일관성(톤·컬러·로고·자막 스타일)

You may add platform/format-specific checks with new ids if relevant, but keep the category keys above
so weights apply. Drop a check (omit it) only if genuinely N/A — don't FAIL something that doesn't apply.

## Writing the verdict
`score.verdict`: one or two sentences — the headline read ("탄탄한 퍼널 릴스지만 후킹·도달이 약해 C등급",
etc.). It shows under the score and should match the numbers.
