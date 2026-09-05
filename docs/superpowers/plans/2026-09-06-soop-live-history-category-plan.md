# SOOP Live / History / Category Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SOOP dashboard accurately reflect live status, today-anchored weekly history, month-selectable history, verified favorite/follower growth, and fresh month/recent-3-month category analytics.

**Architecture:** Keep historical broadcast sessions in the existing Trackify/fan-site session pipeline, add a normalized live-state resolver and a persistent exact-observation follower history, then expose period/category helpers from `lib/soop-analytics.js`. The browser keeps the full historical API payload and renders only the selected 7-day bucket or selected month. An active stream is projected into current-period aggregates without being persisted as a completed session.

**Tech Stack:** Node.js 24, CommonJS analytics/data modules, ESM updater scripts, vanilla browser JavaScript/CSS, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-06-soop-live-history-category-design.md`

## Global Constraints

- `오늘 기준 일주일` is KST today through six days ago, then seven-day rolling buckets backward.
- `최근 3개월` is the current KST month plus the previous two calendar months.
- Historical favorite/follower values must be exact public observations; never interpolate or fabricate missing dates.
- Explicit LIVE from an authoritative source wins over stale/offline fallback text.
- If live sources fail or disagree without a positive live signal, return unknown (`live: null`) instead of false OFFLINE.
- Do not reintroduce Auro/Streams Charts/source badges.
- Do not modify YouTube behavior in this feature.

---

### Task 1: Normalize live-state resolution

**Files:**
- Modify: `lib/chunbong-data.js`
- Modify: `lib/soop-external.js`
- Modify: `scripts/collect-soop-telemetry.mjs`
- Test: `tests/soop-live-state-regression.mjs`

**Interfaces:**
- Produces: `resolveSoopLiveState(...signals)` -> normalized `{ live, broadcastId, startedAt, title, viewerCount, categoryId, categoryName, source }`.
- Consumes: existing SOOP player/live parser and Trackify streamer/broadcast payloads.

- [ ] **Step 1: Write the failing test**

Create `tests/soop-live-state-regression.mjs` asserting:

```js
assert.equal(resolveSoopLiveState(
  { live:false, source:'player-html' },
  { live:true, broadcastId:'123', title:'현재 방송', source:'soop-structured' }
).live, true);

assert.equal(resolveSoopLiveState(
  { live:false, source:'player-html' },
  { live:null, source:'trackify' }
).live, false);

assert.equal(resolveSoopLiveState(
  { live:null, source:'player-html' },
  { live:null, source:'trackify' }
).live, null);
```

Also assert positive Trackify live wins over stale offline HTML and telemetry consumes the normalized resolver rather than reimplementing status rules.

- [ ] **Step 2: Run test to verify it fails**

Run through the PR Site regression workflow. Expected: FAIL because `resolveSoopLiveState` does not exist / telemetry has no normalized resolver marker.

- [ ] **Step 3: Write minimal implementation**

Implement `resolveSoopLiveState` with priority by positive live evidence, explicit offline only when no positive signal exists, and unknown when only failures/unknown signals exist. Extend Trackify current streamer parsing to expose active broadcast identity/state when present. Make `fetchSoopLive()` return this normalized result and keep telemetry calling the same path.

- [ ] **Step 4: Run test to verify it passes**

Expected: `tests/soop-live-state-regression.mjs` PASS and existing SOOP API/telemetry tests remain green.

- [ ] **Step 5: Commit**

Commit message: `fix: resolve SOOP live state from explicit signals`

---

### Task 2: Add exact favorite/follower observation history

**Files:**
- Create: `data/soop-follower-history.json`
- Create: `scripts/update-soop-follower-history.mjs`
- Modify: `lib/soop-external.js`
- Modify: `lib/chunbong-data.js`
- Modify: `.github/workflows/chunbong-data-snapshot.yml`
- Modify: `.github/workflows/site-regression.yml`
- Test: `tests/soop-follower-history-regression.mjs`

**Interfaces:**
- Produces: `mergeFollowerObservations(previous, incoming)` and `readSoopFollowerHistory()`.
- Consumes: exact dated Trackify history/day/month values if exposed and existing `chunbong-data-history.json` snapshots.

- [ ] **Step 1: Write the failing test**

Test exact-date merge precedence and no interpolation:

```js
const merged = mergeFollowerObservations(
  [{ date:'2026-09-01', followerCount:100, confidence:1 }],
  [{ date:'2026-09-01', followerCount:101, confidence:2 }, { date:'2026-09-03', followerCount:105, confidence:2 }]
);
assert.deepEqual(merged.map(x => [x.date,x.followerCount]), [['2026-09-01',101],['2026-09-03',105]]);
assert.equal(merged.some(x => x.date === '2026-09-02'), false);
```

Also assert snapshot observations from the same actual day override retrospective internet backfill for that date.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL because history file/updater/merge helper do not exist.

- [ ] **Step 3: Write minimal implementation**

Create versioned history file and updater. Fetch only exact dated values from Trackify endpoints that actually expose follower/favorite history; if an endpoint does not expose them, keep it empty rather than infer. Merge existing fan-site daily snapshots with higher confidence. Wire the merged observations into the analytics snapshot input.

- [ ] **Step 4: Run test to verify it passes**

Expected: follower-history test PASS and updater syntax check PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: persist exact SOOP favorite history`

---

### Task 3: Extend analytics for selected periods and active projection

**Files:**
- Modify: `lib/soop-analytics.js`
- Modify: `lib/chunbong-data.js`
- Modify: `api/content.js`
- Test: `tests/soop-analytics-regression.mjs`
- Test: `tests/soop-period-category-regression.mjs`

**Interfaces:**
- Produces:
  - `rollingWeekRanges(rows, now)` -> newest-first `{ index, startDate, endDate }[]`.
  - `availableMonths(sessions, daily, monthly)` -> sorted month keys.
  - `aggregateCategoriesForRange(sessions, startDate, endDate)`.
  - `buildActiveSessionProjection(live, now)` -> transient session or `null`.
  - `recentThreeMonthRange(now)`.

- [ ] **Step 1: Write the failing test**

Use `now = 2026-09-06 KST` and assert current bucket is `2026-08-31..2026-09-06`, previous bucket `2026-08-24..2026-08-30`; selected month keys come from actual data; recent-three-month range starts `2026-07-01`; category aggregation returns correct `streamCount`, `minutes`, `sharePercent`; active projection contributes to current day/month/categories but is not added when a completed session with matching broadcast identity exists.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL because period/projection helpers do not exist.

- [ ] **Step 3: Write minimal implementation**

Add pure helpers and extend `buildSoopAnalytics` to return:

```js
periods: { weeks, months, recentThreeMonths: { startDate, endDate } },
categoryAnalytics: { byMonth: { [month]: [...] }, recentThreeMonths: [...] },
activeProjection
```

Merge follower observations into daily/monthly deltas before falling back to session deltas. Ensure active projection is only transient and de-duplicated by broadcast/session identity.

- [ ] **Step 4: Run test to verify it passes**

Expected: new period/category test and existing analytics test PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add SOOP period and category analytics`

---

### Task 4: Add week/month controls and fresh category UI

**Files:**
- Modify: `data.html`
- Modify: `data.js`
- Modify: `data-enhancements.js`
- Modify: `data.css`
- Modify: `data-enhancements.css`
- Test: `tests/chunbong-data-ui-regression.mjs`
- Test: `tests/data-dashboard-trackify-ux-regression.mjs`
- Create: `tests/soop-period-controls-regression.mjs`

**Interfaces:**
- Consumes `payload.soop.periods`, `payload.soop.categoryAnalytics`, full `payload.soop.daily`, and `payload.soop.monthlyStats`.
- Produces DOM controls `data-soop-week-range` and `data-soop-month-range` plus selected-period rendering.

- [ ] **Step 1: Write the failing test**

Assert browser source contains period state and renders controls for rolling weeks/months; current week is default; clicking a week filters charts/table; clicking a month filters monthly detail/calendar/category block; current-month and recent-three-month category rows include count, airtime, and percent; `이번 달 후원자` is absent from overview render list.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL because controls and new category rendering are absent.

- [ ] **Step 3: Write minimal implementation**

Remove client-side `limitDailyRows(...).slice(-10)` truncation so all historical daily rows remain available. Add selected week/month state, render chip controls, filter chart/table inputs at render time, and synchronize selected month with calendar month. Replace stale Trackify current-month distribution block with server `categoryAnalytics.byMonth[selectedMonth]`; add a recent-3-month section. Preserve the idempotent MutationObserver behavior.

- [ ] **Step 4: Run test to verify it passes**

Expected: period-control/UI tests PASS and observer regression stays green.

- [ ] **Step 5: Commit**

Commit message: `feat: add SOOP weekly monthly category controls`

---

### Task 5: Remove monthly donor KPI and compact the new payload safely

**Files:**
- Modify: `data.js`
- Modify: `data-enhancements.js`
- Modify: `api/content.js`
- Test: `tests/data-dashboard-instant-load-regression.mjs`
- Test: `tests/data-dashboard-ui-reliability-regression.mjs`

**Interfaces:**
- Public API must preserve full daily/month availability and compact category analytics without re-sending raw session history.

- [ ] **Step 1: Write the failing test**

Assert `이번 달 후원자` never appears in rendered KPI labels, full daily history is no longer hard-truncated to 10 rows, and compact payload still includes `periods`, month category summaries, and recent-three-month category summaries while excluding raw duplicate sessions.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL on stale monthly donor rendering and/or missing new compact fields.

- [ ] **Step 3: Write minimal implementation**

Remove `monthlySupporterCount` card from overview and disallowed-label set where redundant. Extend compact payload functions to retain required new aggregate fields only. Keep instant localStorage rendering and forced-refresh `no-store` behavior unchanged.

- [ ] **Step 4: Run test to verify it passes**

Expected: instant-load and UI reliability regressions PASS.

- [ ] **Step 5: Commit**

Commit message: `fix: clean SOOP overview and compact period data`

---

### Task 6: Wire refresh workflows and production smoke

**Files:**
- Modify: `.github/workflows/chunbong-data-snapshot.yml`
- Modify: `.github/workflows/site-regression.yml`
- Modify: `.github/workflows/production-data-smoke.yml`
- Test: `tests/data-dashboard-trackify-ux-regression.mjs`
- Create: `tests/soop-workflow-regression.mjs`

**Interfaces:**
- Snapshot workflow refreshes Trackify cache + follower history before capturing dashboard snapshot.
- Smoke validates new live/period/category API contract and UI tokens.

- [ ] **Step 1: Write the failing test**

Assert workflows include `update-soop-follower-history.mjs`, syntax checks, path triggers, and smoke checks for `periods.weeks`, `periods.months`, `categoryAnalytics.recentThreeMonths`, no monthly donor UI token, and live state not forced to false when unknown.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL on missing workflow/updater/smoke markers.

- [ ] **Step 3: Write minimal implementation**

Wire updater before the snapshot, add the new data file to commits/path triggers, and update smoke to validate non-empty period/month/category shapes without requiring unavailable historical follower points.

- [ ] **Step 4: Run test to verify it passes**

Expected: workflow regression PASS.

- [ ] **Step 5: Commit**

Commit message: `ci: verify SOOP live history category dashboard`

---

### Task 7: Full regression, review, merge, and production verification

**Files:**
- No product changes unless verification finds a defect.

**Interfaces:**
- Consumes the complete feature branch.
- Produces verified `main` + production deployment.

- [ ] **Step 1: Run full branch regression**

Run Site regression on the final branch/PR. Expected: every `tests/*.mjs` PASS and all JS syntax checks PASS.

- [ ] **Step 2: Review the diff**

Check changed files for accidental YouTube changes, source-badge regressions, stale Auro/Streams Charts references, duplicate active-session counting, and raw-session payload growth.

- [ ] **Step 3: Merge the reviewed PR**

Squash merge only the verified branch into `main`.

- [ ] **Step 4: Verify production**

Require:

```text
Vercel deployment: success
Site regression on main: success
Production data smoke: success / ok:true
/api/content?type=data: HTTP 200, fallback:false
periods.weeks.length > 0
periods.months.length > 0
categoryAnalytics.recentThreeMonths is an array
```

If Chunbong is live during verification, require production `soop.live.live === true`; if not live, require the live contract to permit `false` or `null` without contradicting authoritative source data.

- [ ] **Step 5: Report completion**

Report merge commit, production status, period/category counts, and exact follower-history coverage discovered. Do not claim historical values for dates that were not actually verified.
