# Data Dashboard Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill SOOP public statistics from Trackify, improve data trend exploration, restore YouTube/Shorts analytics, and make manual refresh bypass stale CDN responses.

**Architecture:** Extend the existing external SOOP adapter instead of introducing a second data API. Normalize Trackify summary fields in `lib/soop-external.js`, merge them into the existing `soop.overview` contract in `lib/chunbong-data.js`, normalize YouTube items in `api/youtube.js`, and keep rendering in the existing `data.js`/`data.css` page. Manual refresh uses an explicit query flag so normal automatic refresh can retain shared caching while user-triggered refresh uses no-store semantics.

**Tech Stack:** Node.js CommonJS/ESM tests, Vercel serverless functions, vanilla HTML/CSS/JavaScript, SVG charts.

**Spec:** `docs/superpowers/specs/2026-09-05-data-dashboard-reliability-design.md`

## Global Constraints

- Preserve existing design and unrelated fan-site functionality.
- Do not display donor ranking tables or individual donation/mission/sanction records.
- Never fabricate missing statistics.
- Keep source attribution per metric.
- Keep existing API fields backward compatible.
- Validate all `tests/*.mjs` and changed JavaScript syntax before merge.

---

### Task 1: Trackify summary parser and merge contract

**Files:**
- Modify: `tests/chunbong-data-api-regression.mjs`
- Modify: `lib/soop-external.js`
- Modify: `lib/chunbong-data.js`

**Interfaces:**
- Consumes: Trackify HTML/text from `fetchExternalSoopStats()`.
- Produces: normalized fields `monthlyStarCount`, `starsPerHour`, `monthlyChatCount`, `monthlyKickCount`, `monthlyMuteCount`, `stationOpenedAt`, `latestBroadcastDate`, `categoryRankings`, plus existing SOOP statistics and `fieldSources`.

- [ ] **Step 1: Write failing parser assertions**

Add a representative Trackify summary fixture containing `9월 별풍선`, `시급`, `방송 시간`, `최고 시청자`, `평균 시청자`, `누적 유저`, `뷰어십`, `채팅 수`, aggregate `강퇴/채금`, station opening/latest broadcast, favorites/subscriber, cumulative users/UP/broadcast time, fanclub/supporter, category rankings and category distribution. Assert all normalized values and assert no donor ranking array is returned.

- [ ] **Step 2: Run regression on the branch and confirm failure**

Open a PR from the feature branch to `main` so `Site regression` runs. Expected: `chunbong-data-api-regression.mjs` fails on the new fields before implementation.

- [ ] **Step 3: Implement minimal parser and merge changes**

Extend `extractExternalSoopStatsFromHtml()` and `fetchExternalSoopStats()` to parse/merge the new summary fields. Extend `mergeSoopMetricSources()` and `fetchChunbongData()` to project them into `soop.overview`. Keep donor ranking/detail content unparsed.

- [ ] **Step 4: Re-run PR CI**

Expected: Trackify parser assertions and existing API regression pass.

### Task 2: YouTube resilient stats and Shorts-aware ordering

**Files:**
- Create: `tests/youtube-data-regression.mjs`
- Modify: `api/youtube.js`
- Modify: `lib/chunbong-data.js`
- Modify: `data.js`

**Interfaces:**
- Produces YouTube items with `id`, `kind`, `title`, `date`, optional `dateIso`, `meta`, `viewCount`, `link`.
- Produces `mergeRecentYoutubeItems(videos, shorts, limit)` from `lib/chunbong-data.js` for deterministic dedupe/sort and testability.

- [ ] **Step 1: Add failing tests**

Cover duplicate video IDs across tabs, a newer Short than the newest regular video, relative dates, ISO dates, and monthly upload count including Shorts.

- [ ] **Step 2: Run PR CI and confirm failure**

Expected: new YouTube regression fails because Shorts have no sortable date and the UI currently concatenates before slicing.

- [ ] **Step 3: Implement normalization**

Extract publish text/date metadata from both video and Shorts renderers; preserve `dateIso` when available. Add a deterministic merge/dedupe/sort helper used for monthly counting/top/recent display. Make the UI consume the merged list rather than `videos + shorts` sliced in source order.

- [ ] **Step 4: Re-run PR CI**

Expected: YouTube regression and existing tests pass.

### Task 3: Interactive trend charts and expanded SOOP overview

**Files:**
- Modify: `tests/chunbong-data-ui-regression.mjs`
- Modify: `data.html`
- Modify: `data.js`
- Modify: `data.css`

**Interfaces:**
- `createSvgChart()` remains the chart rendering entry point but adds pointer/focus tooltip state and richer axis/value labels.
- SOOP overview cards render the new Trackify summary fields when finite/present.

- [ ] **Step 1: Add failing UI markers**

Assert markers for interactive tooltip/crosshair behavior, expanded Trackify KPI labels, and source attribution.

- [ ] **Step 2: Run PR CI and confirm failure**

Expected: UI regression fails on the new markers.

- [ ] **Step 3: Implement chart/KPI UI**

Add summary cards for monthly stars, stars/hour, chat, aggregate moderation counts, station opened/latest broadcast, and category rank references where data exists. Upgrade SVG point hover/focus to show a floating tooltip and vertical guide without external chart dependencies.

- [ ] **Step 4: Re-run PR CI**

Expected: UI regression passes and existing layout tests remain green.

### Task 4: Manual refresh cache bypass

**Files:**
- Create: `tests/data-refresh-regression.mjs`
- Modify: `api/content.js`
- Modify: `data.js`

**Interfaces:**
- Browser manual refresh calls `/api/content?type=data&refresh=1&_ts=<epoch>` with `cache: 'no-store'`.
- API sends `Cache-Control: no-store, max-age=0` only when `type=data` and `refresh=1`; normal requests retain existing shared cache.

- [ ] **Step 1: Add failing source regression**

Assert manual refresh constructs the cache-busting URL, disables/re-enables the button, and `api/content.js` contains the refresh-specific no-store path.

- [ ] **Step 2: Run PR CI and confirm failure**

Expected: refresh regression fails against current constant-URL behavior.

- [ ] **Step 3: Implement refresh behavior**

Split `refresh({ force })`; button uses `force:true`, initial/interval refresh uses normal cache. Add loading and result text/state without changing the existing 5-minute interval.

- [ ] **Step 4: Re-run PR CI**

Expected: refresh regression and all existing tests pass.

### Task 5: Full verification, merge and production smoke

**Files:**
- Existing workflows/tests only unless a verification-only update is required.

- [ ] **Step 1: Verify PR checks**

Confirm `Site regression` is completed/success and inspect job steps/logs for all test files.

- [ ] **Step 2: Merge by fast-forwarding `main` only after green verification**

Use the verified feature branch head SHA as the new `main` ref, without force.

- [ ] **Step 3: Verify Vercel deployment**

Confirm the new `main` commit gets Vercel `success / Deployment has completed`.

- [ ] **Step 4: Verify production data**

Use the existing production smoke mechanism to confirm `/data.js`, `/data.html`, `/api/content?type=data` HTTP 200, `fallback=false`, empty errors where possible, Trackify-filled overview fields, YouTube channel values, recent Shorts presence, and manual refresh source markers.
