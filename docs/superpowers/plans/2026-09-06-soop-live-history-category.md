# SOOP Live / History / Category Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SOOP dashboard accurately reflect live status, expose today-anchored rolling seven-day history and data-driven month selection, backfill verified favorite/follower observations, and show selected-month plus recent-three-month category analytics.

**Architecture:** Introduce two small pure modules: one resolves live state from structured SOOP/Trackify signals, and one merges exact favorite/follower observations without interpolation. Keep Trackify sessions as the historical broadcast source, extend `soop-analytics` with an active-stream projection and range category aggregates, then let `data.js` filter the complete API history into rolling-week/month views. Persistent collection remains in GitHub Actions; the browser keeps the existing instant-load cache and never displays data-source badges.

**Tech Stack:** Node.js 24, CommonJS/ESM already used by the repo, Vercel serverless API, GitHub Actions, vanilla HTML/CSS/JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-06-soop-live-history-category-design.md`

## Global Constraints

- `애청자 · 즐겨찾기` is the existing `followerCount` metric.
- Rolling weeks are KST date buckets: offset 0 = today through 6 days ago, offset 1 = 7 through 13 days ago, etc.
- Recent three months means the current KST calendar month plus the previous two calendar months.
- Never interpolate, extrapolate, or fabricate historical follower/favorite values.
- Trackify remains the primary external SOOP history source; Softc may remain a last-good metric fallback where already used.
- Do not reintroduce Auro, Streams Charts, donor ranking, source badges, or the removed star/mute KPI cards.
- YouTube behavior and its engagement cache are out of scope and must remain unchanged.
- Preserve the existing browser last-good local cache and forced-refresh `no-store` behavior.

---

### Task 1: Resolve live state from structured SOOP signals

**Files:**
- Create: `lib/soop-live-state.js`
- Modify: `lib/chunbong-data.js`
- Modify: `lib/soop-external.js`
- Modify: `scripts/collect-soop-telemetry.mjs`
- Create: `tests/soop-live-state-regression.mjs`
- Modify: `tests/chunbong-data-api-regression.mjs`

**Interfaces:**
- Produces: `normalizeSoopBroadPayload(payload, source)` -> normalized signal `{ live, authoritative, broadcastId, startedAt, title, viewerCount, categoryId, categoryName, source }`.
- Produces: `resolveLiveState(signals)` -> one normalized live state. Any explicit live signal wins; explicit offline is used only when no live signal exists; otherwise `live:null`.
- `fetchSoopStructuredLive()` in `lib/chunbong-data.js` requests `https://api-channel.sooplive.co.kr/v1.1/channel/chunbongtv/home/section/broad` with browser-like headers.
- `fetchSoopLive()` becomes an orchestrator: structured SOOP signal first, explicit Trackify live signal second when available, HTML parser only as fallback.

- [ ] **Step 1: Write failing live resolver tests**

Create `tests/soop-live-state-regression.mjs` with fixtures equivalent to:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { normalizeSoopBroadPayload, resolveLiveState } = require('../lib/soop-live-state.js');

const structured = normalizeSoopBroadPayload({
  broad: {
    broad_no: '296999999',
    broad_title: '현재 방송',
    broad_start: '2026-09-06 06:10:00',
    current_sum_viewer: 73,
    cate_no: '00810000',
    cate_name: '버추얼'
  }
}, 'soop-channel');
assert.equal(structured.live, true);
assert.equal(structured.broadcastId, '296999999');
assert.equal(structured.viewerCount, 73);

const resolved = resolveLiveState([
  { live: false, authoritative: false, source: 'html-fallback' },
  structured
]);
assert.equal(resolved.live, true, 'explicit structured LIVE must beat stale offline HTML');
assert.equal(resolved.broadcastId, '296999999');

assert.equal(resolveLiveState([{ live: false, authoritative: true, source: 'soop-channel' }]).live, false);
assert.equal(resolveLiveState([{ live: null, authoritative: false, source: 'failed' }]).live, null);
```

Also add a DI case to `tests/chunbong-data-api-regression.mjs` proving `fetchChunbongData()` exposes `live:true` when the injected live resolver does so.

- [ ] **Step 2: Run the live tests and verify RED**

Run:

```bash
node tests/soop-live-state-regression.mjs
node tests/chunbong-data-api-regression.mjs
```

Expected: FAIL because `lib/soop-live-state.js` and/or structured-live wiring do not exist.

- [ ] **Step 3: Implement the pure resolver**

Create `lib/soop-live-state.js`. The normalizer must accept both `payload.broad` and list-style `payload.data/items` shapes, and recognize broadcast id aliases (`broad_no`, `broadNo`, `bno`), title aliases, viewer aliases, category aliases, and start-time aliases. Example core behavior:

```js
function resolveLiveState(signals = []) {
  const rows = signals.filter(Boolean);
  const live = rows.find(row => row.live === true);
  if (live) return { ...emptyState(), ...live, live: true };
  const offline = rows.find(row => row.live === false && row.authoritative === true);
  if (offline) return { ...emptyState(), ...offline, live: false };
  return { ...emptyState(), live: null };
}
```

A structured response with a non-empty broadcast number is authoritative live. A structured response that explicitly returns an empty/no broadcast collection is authoritative offline. Missing/malformed data is unknown.

- [ ] **Step 4: Wire structured live fetch and safe fallback**

In `lib/chunbong-data.js`, add `fetchSoopStructuredLive()` and change `fetchSoopLive()` so the HTML page does not decide OFFLINE merely because the template contains offline copy. The HTML fallback may provide metadata, but only returns `live:false` when its response positively identifies an offline channel and there is no structured positive signal.

Extend `extractTrackifyApiStats()` in `lib/soop-external.js` with a `liveSignal` only when Trackify payload explicitly contains active-broadcast data; do not infer live from `lastBroadDate` or `broadStartAt` alone.

Ensure `scripts/collect-soop-telemetry.mjs` keeps calling the normalized `fetchSoopLive()` so telemetry and dashboard share the same resolver.

- [ ] **Step 5: Run targeted and telemetry tests**

```bash
node tests/soop-live-state-regression.mjs
node tests/chunbong-data-api-regression.mjs
node tests/soop-telemetry-regression.mjs
node --check lib/soop-live-state.js
node --check lib/chunbong-data.js
node --check scripts/collect-soop-telemetry.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add lib/soop-live-state.js lib/chunbong-data.js lib/soop-external.js scripts/collect-soop-telemetry.mjs tests/soop-live-state-regression.mjs tests/chunbong-data-api-regression.mjs
git commit -m "fix: resolve SOOP live state from structured signals"
```

---

### Task 2: Persist exact favorite/follower history from Trackify

**Files:**
- Create: `lib/soop-follower-history.js`
- Create: `data/soop-follower-history.json`
- Create: `scripts/update-soop-follower-history.mjs`
- Modify: `.github/workflows/chunbong-data-snapshot.yml`
- Modify: `.github/workflows/site-regression.yml`
- Modify: `lib/chunbong-data.js`
- Create: `tests/soop-follower-history-regression.mjs`
- Modify: `tests/chunbong-data-snapshot-regression.mjs`

**Interfaces:**
- Produces: `extractTrackifyFollowerPoints(payload, capturedAt)` -> exact dated `{date,followerCount,source:'trackify',capturedAt,confidence:1}` points.
- Produces: `mergeFollowerHistory(...collections)` -> one point per KST date, preferring a same-day fan-site snapshot over a later internet backfill for that same date.
- Produces: `followerHistoryToSnapshots(history)` -> snapshot-like rows consumed by analytics.
- Persistent file shape: `{version:1, points:[...]}`.

- [ ] **Step 1: Write failing follower-history tests**

Create `tests/soop-follower-history-regression.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const h = require('../lib/soop-follower-history.js');

const points = h.extractTrackifyFollowerPoints({
  history: [
    { date: '2026-08-31', fanCount: 29720 },
    { date: '2026-09-01', fanCount: 29731 },
    { date: '2026-09-02', fanCount: null }
  ]
}, '2026-09-06T00:00:00.000Z');
assert.deepEqual(points.map(x => [x.date, x.followerCount]), [
  ['2026-08-31', 29720], ['2026-09-01', 29731]
]);

const merged = h.mergeFollowerHistory(
  points,
  [{ date: '2026-09-01', followerCount: 29735, source: 'fan-site-snapshot', capturedAt: '2026-09-01T23:00:00Z', confidence: 2 }]
);
assert.equal(merged.find(x => x.date === '2026-09-01').followerCount, 29735);
assert.equal(merged.some(x => x.date === '2026-09-02'), false, 'unknown dates must not be interpolated');
```

Add a snapshot fixture showing existing `chunbong-data-history.json` rows can be converted into confidence-2 observations.

- [ ] **Step 2: Run the tests and verify RED**

```bash
node tests/soop-follower-history-regression.mjs
```

Expected: FAIL because the module/data/updater do not exist.

- [ ] **Step 3: Implement follower-history pure functions**

Create `lib/soop-follower-history.js` with:

```js
function exactDate(value) {
  const text = String(value || '').slice(0, 10);
  return /^20\d{2}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function mergeFollowerHistory(...collections) {
  const byDate = new Map();
  for (const row of collections.flat()) {
    const date = exactDate(row?.date);
    const followerCount = finite(row?.followerCount);
    if (!date || followerCount === null) continue;
    const next = { ...row, date, followerCount };
    const prev = byDate.get(date);
    if (!prev || (next.confidence || 0) >= (prev.confidence || 0)) byDate.set(date, next);
  }
  return [...byDate.values()].sort((a,b) => a.date.localeCompare(b.date));
}
```

`extractTrackifyFollowerPoints()` must walk only array rows and accept date aliases `date`, `day`, `statDate`, `stat_date` and favorite aliases `fanCount`, `followerCount`, `favoriteCount`, `favorite_count`. It must never derive a point from an undated profile total.

- [ ] **Step 4: Implement the persistent updater**

Create `scripts/update-soop-follower-history.mjs` that:

1. Reads `data/soop-follower-history.json`.
2. Reads `data/chunbong-data-history.json` and converts finite `soop.followerCount` rows into confidence-2 observations.
3. Requests Trackify streamer history from the same public endpoint family already used by `soop-external.js`: `https://www.trackify.kr/api/v1/p/soop/streamer/chunbongtv?granularity=day&period=YYYY-MM` for every month from `2025-09` through the current KST month.
4. Calls `extractTrackifyFollowerPoints()` on every successful response.
5. Merges exact points and writes the JSON file. Failed months leave last-good points untouched.
6. Logs `SOOP_FOLLOWER_HISTORY_POINTS=<count>` and `SOOP_FOLLOWER_HISTORY_FETCH_ERRORS=<count>`.

Do not use search-result snippets as machine data; the updater's internet backfill is Trackify's public historical JSON. The manual web research only establishes that Trackify collection begins 2025-09-01.

- [ ] **Step 5: Wire history into data analytics**

In `lib/chunbong-data.js`, add `readFollowerHistory()` and a DI hook `readFollowerHistory`. Pass the resulting points to `buildSoopAnalytics()` as the fifth argument/options object rather than mutating `chunbong-data-history.json`.

Update `.github/workflows/chunbong-data-snapshot.yml` to run:

```yaml
- name: Refresh SOOP follower history
  run: node scripts/update-soop-follower-history.mjs
```

before `update-chunbong-data.mjs`, and include `data/soop-follower-history.json` in the commit set and push-path trigger.

Update `site-regression.yml` to syntax-check the new updater and module.

- [ ] **Step 6: Run targeted tests**

```bash
node tests/soop-follower-history-regression.mjs
node tests/chunbong-data-snapshot-regression.mjs
node tests/chunbong-data-api-regression.mjs
node --check scripts/update-soop-follower-history.mjs
node --check lib/soop-follower-history.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add lib/soop-follower-history.js data/soop-follower-history.json scripts/update-soop-follower-history.mjs lib/chunbong-data.js .github/workflows/chunbong-data-snapshot.yml .github/workflows/site-regression.yml tests/soop-follower-history-regression.mjs tests/chunbong-data-snapshot-regression.mjs tests/chunbong-data-api-regression.mjs
git commit -m "feat: backfill exact SOOP favorite history"
```

---

### Task 3: Add active-stream projection and period category analytics

**Files:**
- Modify: `lib/soop-analytics.js`
- Modify: `lib/chunbong-data.js`
- Modify: `api/content.js`
- Modify: `tests/soop-analytics-regression.mjs`
- Modify: `tests/data-dashboard-instant-load-regression.mjs`

**Interfaces:**
- `buildSoopAnalytics(sessions, snapshots, live, now, options)` accepts `options.followerHistory`.
- Produces `projectLiveSession(live, now)` -> transient session or `null`.
- Produces `recentThreeMonthStart(now)` -> `YYYY-MM-01` two calendar months before current KST month.
- API adds `soop.categoryPeriods.recentThreeMonths` with compact category rows.
- Monthly rows retain their existing `categories` server-side; `api/content.js` exposes a compact `categories` array per month because the client needs selected-month analysis.

- [ ] **Step 1: Extend analytics tests for follower history and live overlay**

Append fixtures to `tests/soop-analytics-regression.mjs`:

```js
const followerHistory = [
  { date: '2026-08-31', followerCount: 990 },
  { date: '2026-09-02', followerCount: 1000 },
  { date: '2026-09-03', followerCount: 1005 }
];
const projected = analytics.projectLiveSession({
  live: true,
  broadcastId: 'live-1',
  startedAt: '2026-09-03T14:00:00+09:00',
  categoryId: 'g',
  categoryName: '종합게임',
  title: '현재 방송',
  viewerCount: 61
}, new Date('2026-09-03T16:00:00+09:00'));
assert.equal(projected.durationMinutes, 120);
assert.equal(projected.measurement, 'live-projection');

const liveResult = analytics.buildSoopAnalytics(
  sessions, snapshots,
  { live:true, broadcastId:'live-1', startedAt:'2026-09-03T14:00:00+09:00', categoryName:'종합게임', viewerCount:61 },
  new Date('2026-09-03T16:00:00+09:00'),
  { followerHistory }
);
assert.ok(liveResult.daily.find(x => x.date === '2026-09-03').durationMinutes > 240);
assert.equal(liveResult.categoryPeriods.recentThreeMonths.length > 0, true);
```

Add a duplicate-guard case where a completed session with matching `broadcastId` exists and confirm the live projection is not added.

- [ ] **Step 2: Run analytics test and verify RED**

```bash
node tests/soop-analytics-regression.mjs
```

Expected: FAIL on missing `projectLiveSession`, options support, or `categoryPeriods`.

- [ ] **Step 3: Implement exact follower delta input**

Inside `soop-analytics.js`, convert `options.followerHistory` into snapshot-like rows and merge them with regular snapshots before `buildSnapshotDeltaMap()` / `monthlySnapshotDelta()`. Same-date direct snapshots win because Task 2 already assigns higher confidence; no missing date is synthesized.

- [ ] **Step 4: Implement live projection**

`projectLiveSession()` returns `null` unless `live.live === true` and `startedAt` parses. Its duration is `now - startedAt`, clamped to >=0. It has one current category segment for the projected duration when `categoryName` exists. `averageViewers` stays `null` and `viewerSampleCount` stays `0`; `maxViewers` may use the current viewer count only as live metadata, not a completed average.

Before aggregation, append the projection only if no completed session has the same non-empty `broadcastId`. Do not include `live-projection` in `measuredTotalMinutes`; do include it in today's/month's display aggregates.

- [ ] **Step 5: Implement selected-range category payloads**

Add helpers:

```js
function startOfRecentThreeMonths(now) { /* current KST month minus two */ }
function sessionsInRange(sessions, startDate, endDate) { /* compare session KST date */ }
```

Return:

```js
categoryPeriods: {
  recentThreeMonths: aggregateCategories(relevantSessions)
}
```

Each row already carries `name`, `minutes`, `streamCount`, `averageViewers`, `maxViewers`, `sharePercent`.

- [ ] **Step 6: Compact only required category fields in public API**

Update `api/content.js` so `monthlyStats` retains compact category rows rather than dropping them, and `categoryPeriods.recentThreeMonths` is passed through with only the six fields above. Do not expose full raw sessions.

Add assertions to `tests/data-dashboard-instant-load-regression.mjs` that the public payload contains monthly category rows and recent-three-month rows but no raw session duplication.

- [ ] **Step 7: Run Task 3 tests**

```bash
node tests/soop-analytics-regression.mjs
node tests/chunbong-data-api-regression.mjs
node tests/data-dashboard-instant-load-regression.mjs
node --check lib/soop-analytics.js
node --check api/content.js
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add lib/soop-analytics.js lib/chunbong-data.js api/content.js tests/soop-analytics-regression.mjs tests/chunbong-data-api-regression.mjs tests/data-dashboard-instant-load-regression.mjs
git commit -m "feat: add live SOOP projection and category periods"
```

---

### Task 4: Add rolling-week and data-driven month controls to the dashboard

**Files:**
- Modify: `data.html`
- Modify: `data.js`
- Modify: `data-enhancements.js`
- Modify: `data.css`
- Modify: `data-enhancements.css`
- Create: `tests/data-dashboard-soop-periods-regression.mjs`
- Modify: `tests/data-dashboard-trackify-ux-regression.mjs`
- Modify: `tests/data-dashboard-ui-reliability-regression.mjs`
- Modify: `tests/data-enhancements-observer-regression.mjs`

**Interfaces:**
- Client state adds `dailyWeekOffset:0` and `selectedMonth:''`.
- `buildRollingWeekOptions(rows, todayKey)` -> ordered week descriptors `{offset,start,end,label}`.
- `filterDailyByWeek(rows, option)` -> rows inside the inclusive date range.
- `availableMonthKeys(payload)` -> newest-first unique months from `monthlyStats` and `calendar`.
- `renderSoopPeriodControls(payload)` renders week and month chips.

- [ ] **Step 1: Write failing client contract test**

Create `tests/data-dashboard-soop-periods-regression.mjs` using source-token and pure helper VM checks. Required assertions:

```js
assert.ok(dataHtml.includes('id="data-daily-periods"'));
assert.ok(dataHtml.includes('id="data-month-periods"'));
assert.ok(dataJs.includes('buildRollingWeekOptions'));
assert.ok(dataJs.includes('filterDailyByWeek'));
assert.ok(dataJs.includes('availableMonthKeys'));
assert.ok(dataJs.includes('dailyWeekOffset'));
assert.ok(dataJs.includes('selectedMonth'));
assert.ok(!dataJs.includes("kpi('이번 달 후원자'"));
assert.ok(enhancements.includes("'이번 달 후원자'"));
assert.ok(!enhancements.includes('soop.daily = limitDailyRows(soop.daily)'));
```

The test should execute exported/test-hook versions of `buildRollingWeekOptions` with today `2026-09-06` and verify offset 0 is `2026-08-31..2026-09-06`, offset 1 is `2026-08-24..2026-08-30`.

- [ ] **Step 2: Run client test and verify RED**

```bash
node tests/data-dashboard-soop-periods-regression.mjs
```

Expected: FAIL because controls/helpers do not exist and 10-row truncation remains.

- [ ] **Step 3: Add period control containers**

In `data.html`, add:

```html
<div class="data-period-controls" id="data-daily-periods" aria-label="일별 기간 선택"></div>
```

inside the daily view before the chart, and:

```html
<div class="data-period-controls" id="data-month-periods" aria-label="월 선택"></div>
```

inside the monthly view before the chart. Do not hard-code month buttons.

- [ ] **Step 4: Keep full daily data in the browser**

In `data-enhancements.js`, remove `limitDailyRows()` and the assignment that slices `soop.daily` to 10. Keep normalization, legacy-source stripping, cache behavior, and idempotent MutationObserver behavior unchanged.

Add `이번 달 후원자` to `DISALLOWED_SOOP_LABELS` as a belt-and-suspenders client cleanup while also removing the card from `data.js`.

- [ ] **Step 5: Implement rolling-week filtering and rendering**

In `data.js`, compute date boundaries in KST from `payload.capturedAt` (fall back to current time), render all available rolling week buttons, and filter the daily charts/table to the selected week. Recompute the displayed cumulative series within the selected week so it starts from that week's first visible day.

Buttons use `data-daily-week-offset` and are idempotently rebound after render.

- [ ] **Step 6: Implement month selection**

Generate month keys from `monthlyStats` and `calendar`. On selection:

- update `state.selectedMonth`,
- set `state.calendarMonth` to the same month,
- render the monthly detail table with only that month,
- render calendar for that month,
- render selected-month category block from `monthlyStats.find(row => row.month === selectedMonth).categories`.

Keep multi-month comparison charts if useful, but visually label the selected month and never show a hard-coded fixed six-month selector.

- [ ] **Step 7: Render current-month and recent-three-month categories**

Replace the stale `overview.currentMonthCategories` display with two internal-data sections:

1. `${selectedMonthLabel} 카테고리 분포` using the selected monthly row's `categories`.
2. `최근 3개월 카테고리 분석` using `payload.soop.categoryPeriods.recentThreeMonths`.

Each row must visibly include the three requested primary values:

```text
{streamCount}회 · {minutes formatted as time} · {sharePercent}%
```

and retain average/max viewers as secondary copy when finite. No Trackify/source badges or external-reference blocks.

- [ ] **Step 8: Style period chips and category sub-sections**

Add `.data-period-controls`, `.data-period-chip`, `.data-category-period`, `.data-category-period-head` rules to `data.css` or `data-enhancements.css`, using the existing orange active-state language and responsive wrapping. Do not alter unrelated layout.

- [ ] **Step 9: Preserve observer/cache regressions**

Run:

```bash
node tests/data-dashboard-soop-periods-regression.mjs
node tests/data-dashboard-trackify-ux-regression.mjs
node tests/data-dashboard-ui-reliability-regression.mjs
node tests/data-enhancements-observer-regression.mjs
node tests/data-dashboard-instant-load-regression.mjs
node --check data.js
node --check data-enhancements.js
```

Expected: PASS, including no MutationObserver rewrite loop.

- [ ] **Step 10: Commit Task 4**

```bash
git add data.html data.js data-enhancements.js data.css data-enhancements.css tests/data-dashboard-soop-periods-regression.mjs tests/data-dashboard-trackify-ux-regression.mjs tests/data-dashboard-ui-reliability-regression.mjs tests/data-enhancements-observer-regression.mjs tests/data-dashboard-instant-load-regression.mjs
git commit -m "feat: add SOOP week month and category controls"
```

---

### Task 5: Seed follower history and validate current live/category data on GitHub runners

**Files:**
- Modify: `data/soop-follower-history.json` through updater output only
- Modify temporarily then remove: optional diagnostic workflow only if the production GitHub runner cannot reveal the Trackify follower-series shape from the normal snapshot job
- Modify: `tests/trackify-history-regression.mjs`
- Modify: `tests/trackify-cache-regression.mjs`

**Interfaces:**
- No new production interface; this task validates the network-facing collectors and seeds exact data.

- [ ] **Step 1: Extend Trackify fixture coverage for dated follower rows**

Update `tests/trackify-history-regression.mjs` so its fake streamer response includes an exact dated history array and assert `extractTrackifyFollowerPoints()` returns it without using profile totals as fake historical points.

- [ ] **Step 2: Run the follower updater on a GitHub Actions runner**

Use the existing snapshot workflow path or a short-lived diagnostic workflow on the feature branch to execute:

```bash
node scripts/update-soop-follower-history.mjs
```

Required logs:

```text
SOOP_FOLLOWER_HISTORY_POINTS=<positive integer>
SOOP_FOLLOWER_HISTORY_FETCH_ERRORS=<integer>
```

If Trackify exposes no dated favorite/follower history for Chunbong, retain only the exact existing fan-site snapshot points. Do not manufacture a historical series just to make the graph dense.

- [ ] **Step 3: Seed the generated exact history file**

Commit only the updater-generated `data/soop-follower-history.json`. Review the earliest/latest dates and confirm every row has an exact date and finite integer count.

- [ ] **Step 4: Run a live collector diagnostic while the streamer is actually live when possible**

Call the structured SOOP broad endpoint from the GitHub runner and log only normalized non-sensitive fields: `live`, `broadcastId`, `startedAt`, `viewerCount`, `categoryName`. Confirm the resolver returns `live:true` whenever the structured endpoint exposes an active broadcast. Remove any temporary diagnostic workflow before merge.

- [ ] **Step 5: Re-run Trackify/cache tests**

```bash
node tests/trackify-history-regression.mjs
node tests/trackify-cache-regression.mjs
node tests/soop-follower-history-regression.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add data/soop-follower-history.json tests/trackify-history-regression.mjs tests/trackify-cache-regression.mjs
git commit -m "data: seed verified SOOP favorite history"
```

---

### Task 6: Update production smoke, run full regression, merge, deploy, verify

**Files:**
- Modify: `.github/workflows/production-data-smoke.yml`
- Modify: `.github/workflows/site-regression.yml`
- Modify: `tests/data-dashboard-trackify-ux-regression.mjs`
- Modify: `data/production-smoke-latest.json` only through workflow output after deployment

**Interfaces:**
- Production smoke must validate the actual API contract, not stale source tokens.

- [ ] **Step 1: Add failing smoke-contract regression assertions**

Extend `tests/data-dashboard-trackify-ux-regression.mjs` to require smoke checks for:

```text
soop.overview.live is boolean or null
soop.daily contains > 7 records in the raw API when history exists
soop.monthlyStats contains category arrays or compact category rows
soop.categoryPeriods.recentThreeMonths is an array
followerHistoryPointCount is reported
"이번 달 후원자" is absent from data.js output code
rolling-week and selected-month control tokens exist
```

Remove stale smoke expectations for `soop.daily = limitDailyRows(soop.daily)` and `slice(-10)`.

- [ ] **Step 2: Run the contract test and verify RED**

```bash
node tests/data-dashboard-trackify-ux-regression.mjs
```

Expected: FAIL until smoke workflow is updated.

- [ ] **Step 3: Update production smoke**

In `.github/workflows/production-data-smoke.yml`:

- add new source files/data files to the path trigger,
- fetch production as before with `refresh=1`,
- record `live`, `broadcastId`, raw daily/month counts, category period counts, follower-history point count,
- verify data/static assets are HTTP 200 and API `fallback !== true`,
- verify recent-three-month categories are present when historical sessions cover that range,
- verify the client contains rolling-week/month selectors and does not contain the removed `이번 달 후원자` KPI renderer.

Do **not** fail smoke merely because `live` is false; fail only if the live-state field is missing/invalid. When the known current broadcast is live during manual verification, compare the dashboard status separately.

- [ ] **Step 4: Run the complete local/CI regression set on the feature branch**

```bash
node --check data.js
node --check data-enhancements.js
node --check lib/chunbong-data.js
node --check lib/soop-live-state.js
node --check lib/soop-follower-history.js
node --check lib/soop-analytics.js
node --check lib/soop-external.js
node --check scripts/collect-soop-telemetry.mjs
node --check scripts/update-soop-follower-history.mjs
node --check scripts/update-trackify-soop-cache.mjs
set -e; for file in tests/*.mjs; do node "$file"; done
```

Expected: all checks PASS.

- [ ] **Step 5: Review branch diff and open/ready the PR**

Confirm no unrelated YouTube, tarot, schedule, notice, or other page logic changed. Verify no temporary diagnostic workflow remains.

- [ ] **Step 6: Merge the verified branch**

Squash merge into `main` only after the feature-branch Site regression is green.

- [ ] **Step 7: Verify Vercel and production smoke**

After merge:

1. Confirm the merge commit's Vercel status is `success / Deployment has completed`.
2. Confirm `Site regression` on `main` is success.
3. Confirm `Production data smoke` is success and `data/production-smoke-latest.json` has `ok:true`.
4. Confirm the production API reports non-fallback data and the expected SOOP arrays/category periods.
5. If Chunbong is live at verification time, confirm production `soop.overview.live === true`; otherwise verify the structured endpoint/live resolver contract from workflow logs rather than forcing a live expectation.

- [ ] **Step 8: Final completion check**

Completion requires all acceptance criteria from the spec, not merely successful deployment. Report any unavailable historical follower dates as genuine data gaps rather than a defect.
