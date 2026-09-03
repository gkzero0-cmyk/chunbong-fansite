# 춘봉 데이터 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팬사이트에 `춘봉 데이터` 메뉴와 SOOP/YouTube 공개 활동 대시보드, 일일 스냅샷 누적 기능을 추가한다.

**Architecture:** 기존 `api/vod.js`, `api/clips.js`, `api/youtube.js`를 재사용하는 `api/chunbong-data.js` 집계 모듈을 추가하고 `/api/content?type=data`로 노출한다. 프론트는 새 `data.html`/`data.js`가 payload를 렌더링하고, GitHub Actions가 매일 `data/chunbong-data-snapshots.json`을 upsert해 추이를 누적한다.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 20 CommonJS/ESM tests, Vercel Functions, GitHub Actions, SOOP 공개 API/페이지, YouTube 공개 채널 페이지 및 선택적 YouTube Data API v3.

**Spec:** `docs/superpowers/specs/2026-09-03-chunbong-data-dashboard-design.md`

## Global Constraints

- 공개 데이터만 사용한다.
- API key, 쿠키, 로그인 세션을 저장소에 커밋하지 않는다.
- `YOUTUBE_API_KEY`가 없어도 1차 기능이 동작해야 한다.
- 외부 차트/analytics 라이브러리를 추가하지 않는다.
- SOOP 또는 YouTube 한쪽 실패가 전체 payload 실패로 이어지지 않게 한다.
- 기존 공지, 일정, CATCH, 타로 동작은 변경하지 않는다.
- 스냅샷은 같은 KST 날짜를 upsert하고 최대 400일만 유지한다.

---

### Task 1: SOOP/YouTube 데이터 정규화와 집계 코어

**Files:**
- Create: `api/chunbong-data.js`
- Modify: `api/_shared.js`
- Modify: `api/youtube.js`
- Test: `tests/chunbong-data-api-regression.mjs`

**Interfaces:**
- Consumes: `fetchVod(): Promise<Array>`, `fetchClips(): Promise<{catch:Array,clip:Array,items:Array}>`, `fetchYoutube(): Promise<{videos:Array,shorts:Array,items:Array}>`.
- Produces: `parseDurationMinutes(value)`, `parseMetricNumber(value)`, `fetchSoopLiveStatus()`, `buildMonthlyActivity(vods, clips, youtubeItems, now)`, `buildTopContent(vods, youtubeItems)`, `fetchChunbongData()`.

- [ ] **Step 1: Write failing API regression tests**

Create tests that assert:

```js
assert.equal(dataApi.parseDurationMinutes('01:30:00'), 90);
assert.equal(dataApi.parseDurationMinutes('45:10'), 45 + 10 / 60);
assert.equal(dataApi.parseMetricNumber('조회수 1.2만회'), 12000);
assert.equal(dataApi.parseMetricNumber('조회수 3,456회'), 3456);

const monthly = dataApi.buildMonthlyActivity(
  [
    { date: '2026-09-02', durationMinutes: 120 },
    { date: '2026-09-03', durationMinutes: 90 },
    { date: '2026-08-30', durationMinutes: 60 }
  ],
  { catch: [{ date: '2026-09-03' }], clip: [{ date: '2026-09-03' }] },
  [{ dateIso: '2026-09-01T03:00:00Z' }],
  new Date('2026-09-03T08:00:00Z')
);
assert.equal(monthly.soop.vodCount, 2);
assert.equal(monthly.soop.vodMinutes, 210);
assert.equal(monthly.youtube.uploadCount, 1);
```

Also inject failing fetchers into `fetchChunbongData({ fetchVod, fetchClips, fetchYoutube, fetchLive })` and assert one platform error still returns the other platform's data plus `errors` metadata.

- [ ] **Step 2: Run target test and verify RED**

Run: `node tests/chunbong-data-api-regression.mjs`
Expected: FAIL because `api/chunbong-data.js` and new helpers do not exist.

- [ ] **Step 3: Extend SOOP normalization**

In `api/_shared.js`, extract duration candidates such as `vod_duration`, `duration`, `play_time`, `playTime`, `running_time`, `runningTime`, and add normalized fields:

```js
duration: rawDuration ? String(rawDuration) : '',
durationMinutes: parseDurationLikeValue(rawDuration)
```

Keep existing object fields unchanged.

- [ ] **Step 4: Extend YouTube normalization**

In `api/youtube.js`, retain existing output while adding machine-readable fields when available:

```js
dateIso: '',
viewCount: parseMetricNumber(metaText) || null
```

Add channel metadata parsing from the public channel page only when stable values are present. Return:

```js
{ videos, shorts, items, channel: { subscriberCount, viewCount, videoCount } }
```

Use `null` for unavailable values; never fabricate zero.

- [ ] **Step 5: Implement `api/chunbong-data.js`**

Implement pure parsers and aggregators, then `fetchSoopLiveStatus()` using the public SOOP player endpoint. `fetchChunbongData()` must use `Promise.allSettled` or equivalent error isolation and return:

```js
{
  capturedAt,
  soop: { live, monthly, recentVod, recentCatch, recentClip },
  youtube: { channel, monthly, recentVideos, recentShorts },
  topContent: { soop, youtube },
  snapshots: [],
  errors: []
}
```

- [ ] **Step 6: Run target test and verify GREEN**

Run: `node tests/chunbong-data-api-regression.mjs`
Expected: PASS.

- [ ] **Step 7: Commit Task 1**

Commit message: `feat: add Chunbong data aggregation core`

---

### Task 2: Snapshot persistence helpers and daily updater

**Files:**
- Create: `data/chunbong-data-snapshots.json`
- Create: `scripts/update-chunbong-data.mjs`
- Create: `.github/workflows/chunbong-data-snapshot.yml`
- Test: `tests/chunbong-data-snapshot-regression.mjs`

**Interfaces:**
- Consumes: `fetchChunbongData()` from `api/chunbong-data.js`.
- Produces: `upsertSnapshot(document, snapshot, limit=400)` exported from the updater for tests.

- [ ] **Step 1: Write failing snapshot regression test**

Test exact KST-date replacement and retention:

```js
const input = { version: 1, snapshots: [{ date: '2026-09-02', capturedAt: 'old' }] };
const first = upsertSnapshot(input, { date: '2026-09-03', capturedAt: 'new' });
assert.equal(first.snapshots.length, 2);
const second = upsertSnapshot(first, { date: '2026-09-03', capturedAt: 'newer' });
assert.equal(second.snapshots.length, 2);
assert.equal(second.snapshots.at(-1).capturedAt, 'newer');
```

Generate 405 dates and assert only newest 400 remain.

- [ ] **Step 2: Run target test and verify RED**

Run: `node tests/chunbong-data-snapshot-regression.mjs`
Expected: FAIL because updater does not exist.

- [ ] **Step 3: Implement snapshot updater**

`scripts/update-chunbong-data.mjs` loads the existing JSON, calls `fetchChunbongData()`, builds a compact snapshot, upserts by KST date, and writes pretty JSON only if content changed. Export `upsertSnapshot` and `buildSnapshot` for tests; gate CLI execution with an ESM main check.

- [ ] **Step 4: Add scheduled workflow**

Use:

```yaml
on:
  schedule:
    - cron: '15 19 * * *'
  workflow_dispatch:
```

This is 04:15 KST. Workflow uses Node 20, runs the updater, then commits `data/chunbong-data-snapshots.json` only if changed. Set `permissions: contents: write` and prevent recursive duplicate commits by only tracking that one JSON file.

- [ ] **Step 5: Run target test and verify GREEN**

Run: `node tests/chunbong-data-snapshot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Commit message: `feat: add daily Chunbong data snapshots`

---

### Task 3: Expose data through the existing content API

**Files:**
- Modify: `api/content.js`
- Modify: `api/chunbong-data.js`
- Test: `tests/chunbong-data-api-regression.mjs`

**Interfaces:**
- Consumes: `fetchChunbongData()` and `data/chunbong-data-snapshots.json`.
- Produces: `GET /api/content?type=data` returning the dashboard payload.

- [ ] **Step 1: Extend failing test for dispatcher contract**

Assert source contains or handler returns the `data` branch and that the payload has `capturedAt`, `soop`, `youtube`, `topContent`, `snapshots`, `errors`.

- [ ] **Step 2: Run target test and verify RED**

Run: `node tests/chunbong-data-api-regression.mjs`
Expected: FAIL because dispatcher has no `type=data` branch.

- [ ] **Step 3: Implement dispatcher branch**

Add:

```js
const fetchChunbongData = require('./chunbong-data');
```

and a `type === 'data'` branch. For this branch set:

```js
res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
```

Return HTTP 200 even for partial upstream failures, with `fallback` true only when both SOOP and YouTube are unavailable.

- [ ] **Step 4: Load stored snapshots into payload**

Read the committed snapshot JSON with `require('../data/chunbong-data-snapshots.json')` or a safe fs helper and include it in `fetchChunbongData()` without allowing malformed snapshot data to crash the endpoint.

- [ ] **Step 5: Run target test and verify GREEN**

Run: `node tests/chunbong-data-api-regression.mjs`
Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Commit message: `feat: expose Chunbong data endpoint`

---

### Task 4: Build the `춘봉 데이터` page and navigation

**Files:**
- Create: `data.html`
- Create: `data.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `schedule.html`
- Modify: `notice.html`
- Modify: `vod.html`
- Modify: `clips.html`
- Modify: `fanart.html`
- Modify: `tarot.html`
- Modify: `youtube.html`
- Test: `tests/chunbong-data-ui-regression.mjs`
- Test: `tests/multipage-smoke.mjs`

**Interfaces:**
- Consumes: `/api/content?type=data` payload.
- Produces: `data.html` DOM IDs from the spec and a `data-nav="data"` navigation entry.

- [ ] **Step 1: Write failing UI regression test**

Assert `data.html` exists and includes:

```txt
body data-page="data"
#data-status
#data-summary-grid
#data-soop-monthly
#data-youtube-monthly
#data-top-content
#data-recent-content
#data-trend-chart
#data-updated
```

Assert every main HTML page contains `data-nav="data" href="data.html">춘봉 데이터` and `data.js` fetches `/api/content?type=data`.

- [ ] **Step 2: Run UI test and verify RED**

Run: `node tests/chunbong-data-ui-regression.mjs`
Expected: FAIL because page/menu do not exist.

- [ ] **Step 3: Create `data.html`**

Follow existing header/footer/page-shell markup. Include platform source links and source note that values are public-data based and may be partial/estimated.

- [ ] **Step 4: Implement `data.js`**

Implement `loadData()`, numeric formatter, KST timestamp formatter, KPI rendering, platform error banners, recent content lists, TOP lists, and simple CSS bar trend rendering. Refresh every 300000 ms only when `document.hidden === false`.

- [ ] **Step 5: Add responsive styles**

Add `.data-*` classes to `styles.css`: status hero, KPI grid, platform grid, metric bars, top list, recent list, error state. Reuse existing CSS variables and avoid changing unrelated selectors.

- [ ] **Step 6: Add navigation and home portal card**

Add the menu to all major pages and `08 / DATA` portal card to `index.html`. Keep existing menu labels/links unchanged.

- [ ] **Step 7: Run UI and multipage tests**

Run:

```bash
node tests/chunbong-data-ui-regression.mjs
node tests/multipage-smoke.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

Commit message: `feat: add Chunbong data dashboard UI`

---

### Task 5: Full verification and production smoke

**Files:**
- Modify: `.github/workflows/catch-regression.yml` only if its current loop does not already execute all `tests/*.mjs`.
- Create or modify: `.github/workflows/chunbong-data-production-smoke.yml`

**Interfaces:**
- Consumes: deployed `data.html` and `/api/content?type=data`.
- Produces: repeatable production verification.

- [ ] **Step 1: Run syntax checks**

Run:

```bash
node --check api/chunbong-data.js
node --check api/content.js
node --check api/youtube.js
node --check data.js
node --check scripts/update-chunbong-data.mjs
```

Expected: all exit 0.

- [ ] **Step 2: Run the complete regression suite**

Run:

```bash
for file in tests/*.mjs; do node "$file"; done
```

Expected: every file exits 0, including the three new Chunbong-data tests.

- [ ] **Step 3: Add production smoke workflow**

Verify:

```txt
GET /data.html -> 200
GET /api/content?type=data -> 200
payload.capturedAt present
payload.soop object present
payload.youtube object present
payload.topContent object present
payload.snapshots array present
```

The smoke must not require either platform to be live.

- [ ] **Step 4: Review branch diff**

Confirm only approved data dashboard, menu, aggregation, snapshot, tests, and workflow files changed; no unrelated SOOP notice/schedule/CATCH/tarot behavior changed.

- [ ] **Step 5: Merge to `main` only after branch verification is green**

Use a non-force fast-forward or PR merge. Then verify the final main SHA's Site regression and Vercel deployment status.

- [ ] **Step 6: Verify production**

Run production smoke against `https://chunbong-fansite.vercel.app` and confirm the data page/API return 200. Record whether SOOP/YouTube individual sources were live or partial at verification time without treating upstream partial data as a deployment failure.
