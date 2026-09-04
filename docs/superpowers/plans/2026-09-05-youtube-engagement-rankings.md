# YouTube Engagement Rankings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accurate all-time/current-month/recent-three-calendar-month YouTube view/comment rankings while limiting SOOP daily presentation to 10 days and removing three SOOP KPI cards.

**Architecture:** Keep recent YouTube uploads in the existing fetcher, but add a persistent full-channel engagement cache refreshed by GitHub Actions. Precompute six top-five ranking lists server-side and send only those compact lists to the browser. SOOP daily limiting and KPI removal stay presentation-only.

**Tech Stack:** Node.js 24 CommonJS/ESM, static browser JavaScript/CSS, GitHub Actions, Vercel serverless API.

**Spec:** `docs/superpowers/specs/2026-09-05-youtube-engagement-rankings-design.md`

## Global Constraints

- `이번 달` uses the current Korea-calendar month.
- `최근 3달` uses the current month plus the previous two calendar months.
- Rankings include public Videos and Shorts.
- Missing comment counts are excluded from comment rankings and never estimated.
- Rankings show at most five items per range/metric.
- Daily SOOP charts and daily detail table show only the latest 10 dated rows; monthly/calendar remain full history.
- Remove only these SOOP UI cards: `이번 달 별풍선`, `별풍선 시급`, `이번 달 채금`.
- Do not send the complete YouTube cache to the browser.

---

### Task 1: Pure YouTube engagement ranking model

**Files:**
- Create: `lib/youtube-engagement.js`
- Test: `tests/youtube-engagement-regression.mjs`

**Interfaces:**
- Produces: `monthKeyKst(date) -> YYYY-MM`
- Produces: `threeMonthStartKey(date) -> YYYY-MM-01`
- Produces: `normalizeEngagementItem(item) -> normalized item`
- Produces: `buildEngagementRankings(items, now) -> { allTime, currentMonth, recentThreeMonths }`, each with `views` and `comments` arrays.
- Produces: `mergeEngagementCache(previous, fresh) -> versioned cache`

- [ ] **Step 1: Write the failing ranking test**

Create fixtures spanning four calendar months with Videos/Shorts, duplicate IDs, missing comments, and unequal view/comment counts. Assert:
- all-time views/comments are independently sorted descending;
- current month includes only current-month publication dates;
- recent three months starts at the first day two calendar months before current month;
- missing comments are excluded only from comment ranking;
- duplicate IDs collapse to one item;
- each list is limited to five.

- [ ] **Step 2: Run the targeted test and confirm RED**

Run: `node tests/youtube-engagement-regression.mjs`
Expected: FAIL because `lib/youtube-engagement.js` does not exist.

- [ ] **Step 3: Implement the pure model**

Use `Intl.DateTimeFormat(..., { timeZone: 'Asia/Seoul' })` for current-month boundaries. Normalize to `{id, kind, title, publishedAt, viewCount, commentCount, link}` and use stable descending numeric sorts with publication date as tie-breaker.

`mergeEngagementCache` must prefer fresh finite metrics but preserve previous finite view/comment counts when a fresh item temporarily omits one. Fresh publication/title/link fields override only when non-empty.

- [ ] **Step 4: Re-run targeted test and confirm GREEN**

Run: `node tests/youtube-engagement-regression.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add youtube engagement ranking model`

---

### Task 2: Complete-channel YouTube collection and persistent cache updater

**Files:**
- Modify: `api/youtube.js`
- Create: `scripts/update-youtube-engagement-cache.mjs`
- Create: `data/youtube-engagement-cache.json`
- Test: `tests/youtube-engagement-fetch-regression.mjs`
- Test: `tests/youtube-engagement-cache-regression.mjs`

**Interfaces:**
- `api/youtube.js` produces reusable parsing helpers for channel browse continuations and watch-page metrics.
- `scripts/update-youtube-engagement-cache.mjs` consumes those helpers and `mergeEngagementCache`, writes `data/youtube-engagement-cache.json`.

- [ ] **Step 1: Add RED fixtures/tests for continuation parsing**

Test initial/continuation JSON containing `videoRenderer`, `lockupViewModel`, `shortsLockupViewModel`, and `continuationItemRenderer`. Assert all IDs are returned once and the next continuation token is extracted.

- [ ] **Step 2: Add RED fixtures/tests for watch-page metrics**

Use representative `ytInitialPlayerResponse`/`ytInitialData` strings. Assert extraction of exact view count, available comment count, and publication date. Assert disabled/missing comments return `null`.

- [ ] **Step 3: Implement continuation helpers**

Add helpers to extract `INNERTUBE_API_KEY`, client context and continuation token from initial channel HTML, and call `https://www.youtube.com/youtubei/v1/browse?key=...` with bounded page count and dedupe by ID.

- [ ] **Step 4: Implement watch-page metric extraction**

Fetch `https://www.youtube.com/watch?v=<id>&hl=ko&gl=KR`. Prefer exact `videoDetails.viewCount`; read publication date from structured metadata; read comment count only when a finite public count exists.

- [ ] **Step 5: Implement updater with bounded concurrency**

Use a small worker pool (maximum 6 concurrent watch-page requests). Merge fresh items into the previous cache. Do not replace a non-empty healthy cache with an empty result. Write JSON with `{version:1, capturedAt, source, itemCount, items}`.

- [ ] **Step 6: Run targeted fetch/cache tests**

Run:
`node tests/youtube-engagement-fetch-regression.mjs`
`node tests/youtube-engagement-cache-regression.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: cache full youtube engagement stats`

---

### Task 3: Server API compact engagement payload

**Files:**
- Modify: `lib/chunbong-data.js`
- Test: `tests/chunbong-data-youtube-engagement-regression.mjs`

**Interfaces:**
- Reads: `data/youtube-engagement-cache.json`
- Produces in public payload: `youtube.engagement = { capturedAt, itemCount, rankings }`
- `rankings` shape: `{ allTime:{views,comments}, currentMonth:{views,comments}, recentThreeMonths:{views,comments} }`

- [ ] **Step 1: Write RED API regression**

Inject a controlled cache reader containing multiple months and assert the six lists are correct, each <=5, and raw `items` are not present in the returned public payload.

- [ ] **Step 2: Run targeted test and confirm RED**

Run: `node tests/chunbong-data-youtube-engagement-regression.mjs`
Expected: FAIL because engagement payload is absent.

- [ ] **Step 3: Add cache reader and compact payload**

Add dependency-injectable `readYoutubeEngagementCache`, call `buildEngagementRankings(cache.items, now)`, and return metadata plus rankings only.

- [ ] **Step 4: Run targeted test and existing data API regression**

Run:
`node tests/chunbong-data-youtube-engagement-regression.mjs`
`node tests/chunbong-data-api-regression.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: expose youtube engagement rankings`

---

### Task 4: SOOP daily 10-day presentation and KPI removal

**Files:**
- Modify: `data.js`
- Test: `tests/data-soop-display-regression.mjs`

**Interfaces:**
- Browser daily rendering uses `daily.slice(-10)` after date sorting.
- Monthly/calendar data use original complete arrays.

- [ ] **Step 1: Write RED UI source/runtime regression**

Assert daily chart/table rendering uses a latest-10 helper and that strings `kpi('이번 달 별풍선'`, `kpi('별풍선 시급'`, and `kpi('이번 달 채금'` are absent from render code.

- [ ] **Step 2: Run test and confirm RED**

Run: `node tests/data-soop-display-regression.mjs`
Expected: FAIL against current 24-row/full daily rendering and three KPI cards.

- [ ] **Step 3: Implement minimal UI changes**

Create a helper that sorts valid dated rows ascending and returns the last 10. Use it only for `#data-soop-chart` daily charts and `#data-soop-daily-table`. Remove the three KPI calls. Leave monthly and calendar rendering untouched.

- [ ] **Step 4: Run targeted test**

Run: `node tests/data-soop-display-regression.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `fix: limit soop daily history display`

---

### Task 5: YouTube ranking controls and presentation

**Files:**
- Modify: `data.js`
- Modify: `data.css`
- Test: `tests/data-youtube-engagement-ui-regression.mjs`

**Interfaces:**
- Client state adds `youtubeEngagementRange` (`allTime|currentMonth|recentThreeMonths`) and `youtubeEngagementMetric` (`views|comments`).
- `renderYoutubeEngagement(payload)` renders controls and selected top-five list from `payload.youtube.engagement.rankings`.

- [ ] **Step 1: Write RED UI regression**

Assert controls contain labels `전체`, `이번 달`, `최근 3달`, `조회수`, `댓글`; range and metric state changes select the corresponding precomputed list; comment rows show `댓글 N개`; view rows show `조회수 N`.

- [ ] **Step 2: Run and confirm RED**

Run: `node tests/data-youtube-engagement-ui-regression.mjs`
Expected: FAIL because the dashboard still renders `YouTube TOP` only.

- [ ] **Step 3: Implement range/metric state and renderer**

Replace the existing `topPanel('YouTube TOP', ...)` use for YouTube with the engagement renderer. Preserve SOOP `topContent` behavior if used elsewhere. Add button listeners after each render because the controls are generated HTML.

- [ ] **Step 4: Add focused CSS**

Add dashboard-consistent toggle container, active button state, two-column/one-column responsive ranking layout if needed, and metric typography. Do not change unrelated page styles.

- [ ] **Step 5: Run targeted UI regression**

Run: `node tests/data-youtube-engagement-ui-regression.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add youtube engagement filters`

---

### Task 6: Automated cache refresh and production verification

**Files:**
- Modify: `.github/workflows/chunbong-data-snapshot.yml`
- Modify: `.github/workflows/production-data-smoke.yml`
- Test: `tests/youtube-engagement-workflow-regression.mjs`

**Interfaces:**
- Snapshot workflow runs `node scripts/update-youtube-engagement-cache.mjs` before production snapshot capture.
- Commit step includes `data/youtube-engagement-cache.json`.
- Production smoke validates engagement metadata and six ranking arrays without requiring every list to be non-empty.

- [ ] **Step 1: Write RED workflow regression**

Assert snapshot workflow references the updater/cache file and production smoke verifies `youtube.engagement.rankings.allTime.views`, `.allTime.comments`, `.currentMonth.views`, `.currentMonth.comments`, `.recentThreeMonths.views`, `.recentThreeMonths.comments`.

- [ ] **Step 2: Run test and confirm RED**

Run: `node tests/youtube-engagement-workflow-regression.mjs`
Expected: FAIL.

- [ ] **Step 3: Update workflow**

Run the YouTube engagement updater before snapshot capture. Add cache JSON to diff/add commands. Add production-smoke summary fields for cache count and ranking counts.

- [ ] **Step 4: Run full local-style verification through Actions-compatible tests**

Run:
`node --check api/youtube.js`
`node --check lib/youtube-engagement.js`
`node --check lib/chunbong-data.js`
`node --check data.js`
`node --check scripts/update-youtube-engagement-cache.mjs`
`for f in tests/*.mjs; do node "$f" || exit 1; done`
Expected: all exit 0.

- [ ] **Step 5: Populate initial cache on the feature branch**

Temporarily/manual-dispatch the snapshot workflow or run an equivalent GitHub-hosted diagnostic if workflow dispatch is unavailable. Verify a non-zero complete-channel item count and both views/comments coverage. Keep only production workflow code, not temporary probes.

- [ ] **Step 6: Review diff and open PR**

Check no unrelated design/functionality was removed. PR should mention cache semantics, date windows, SOOP 10-day limit, and missing-comment handling.

- [ ] **Step 7: Merge only after fresh branch regression success**

Use squash merge with expected HEAD SHA.

- [ ] **Step 8: Production verification**

Verify on merged `main`:
- Vercel status success;
- Site regression success;
- Production data smoke success;
- `youtube.engagement.itemCount > 0`;
- six ranking arrays exist;
- SOOP daily UI source uses latest-10 behavior and removed KPI labels are absent;
- headless Chrome production data page exits normally and renders YouTube engagement controls.

- [ ] **Step 9: Final report**

Report actual production counts and any public YouTube metrics that are unavailable rather than claiming estimated values.