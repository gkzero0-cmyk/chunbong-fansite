# Chunbong SOOP Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `춘봉 데이터` into SOOP and YouTube views and add detailed SOOP daily/monthly/calendar analytics backed by five-minute public telemetry samples and permanent stream-session summaries.

**Architecture:** Keep the existing `/api/content?type=data` route and add focused SOOP analytics modules under `lib/`. A five-minute GitHub Actions collector stores transient samples on `data/soop-telemetry`, a Vercel-disabled data branch, and writes only completed stream summaries to `main`. The browser renders platform tabs, SVG charts, calendar drill-down, and source-quality labels from the expanded API payload.

**Tech Stack:** Node.js 20 CommonJS/ESM, static HTML/CSS/vanilla JS, GitHub Actions, Vercel serverless, JSON persistence.

**Spec:** `docs/superpowers/specs/2026-09-03-chunbong-soop-analytics-design.md`

## Global Constraints

- Use only public SOOP/YouTube data; do not depend on authenticated streamer analytics.
- Never invent historical average/max viewers, follower changes, or fanclub changes.
- Viewer analytics are labeled `팬사이트 측정` and based on approximately five-minute public samples.
- Missing follower/fanclub counters stay `null` and render as `측정 불가`.
- Do not add a new top-level Vercel serverless function; keep `/api/content?type=data`.
- Telemetry commits must not create Vercel deployments; `data/soop-telemetry` is disabled via `vercel.json` Git configuration.
- Completed session writes must be idempotent by session ID.
- Existing SOOP VOD/CATCH/clip and YouTube behavior must continue passing regression tests.

---

### Task 1: Pure SOOP analytics engine

**Files:**
- Create: `lib/soop-analytics.js`
- Create: `tests/soop-analytics-regression.mjs`

**Interfaces:**
- Produces: `finalizeSession(state, offlineAt)`, `upsertSession(store, session)`, `buildSoopAnalytics(sessions, snapshots, live, now)`, `aggregateCategories(sessions)`.

- [ ] **Step 1: Write failing regression tests** covering sample average/max, duration, follower/fanclub delta, 10-minute interval clamp, category aggregation, daily aggregation, monthly aggregation, cumulative measured minutes, and idempotent session upsert.
- [ ] **Step 2: Run `node tests/soop-analytics-regression.mjs` and verify RED** because `lib/soop-analytics.js` does not exist.
- [ ] **Step 3: Implement pure functions** with KST date/month keys, finite-number filtering, rounded viewer averages, category interval attribution, and session-ID upsert.
- [ ] **Step 4: Run the target test and verify GREEN.**
- [ ] **Step 5: Commit `feat: add SOOP analytics engine`.**

### Task 2: Public SOOP profile/live normalization and API contract

**Files:**
- Modify: `lib/chunbong-data.js`
- Create: `data/soop-sessions.json`
- Modify: `tests/chunbong-data-api-regression.mjs`

**Interfaces:**
- Consumes: `buildSoopAnalytics()` from Task 1.
- Produces: expanded `soop.live`, `soop.overview`, `soop.daily`, `soop.monthly`, `soop.calendar`, `soop.categories`, `soop.recentSessions`, `soop.measurement`.

- [ ] **Step 1: Extend the API regression test** with fixture sessions and snapshots; assert the new SOOP sections and null-safe follower/fanclub fields.
- [ ] **Step 2: Run target test and verify RED.**
- [ ] **Step 3: Add deep candidate-key extraction** for category/follower/fanclub values and retain `null` when unavailable.
- [ ] **Step 4: Load `data/soop-sessions.json` and feed sessions/history/live into `buildSoopAnalytics()` while preserving old `soop.monthly` VOD activity fields for compatibility.
- [ ] **Step 5: Run API and existing content regressions; verify GREEN.**
- [ ] **Step 6: Commit `feat: expose detailed SOOP analytics`.**

### Task 3: Telemetry state machine and permanent session writer

**Files:**
- Create: `scripts/collect-soop-telemetry.mjs`
- Create: `scripts/apply-soop-session.mjs`
- Create: `tests/soop-telemetry-regression.mjs`
- Create on telemetry branch after deployment config is active: `data/soop-live-state.json`

**Interfaces:**
- `advanceTelemetry(previousState, sample)` returns `{ state, finalizedSession }`.
- `applySessionStore(store, session)` returns idempotently updated `{version, sessions}`.

- [ ] **Step 1: Write state-transition tests** for offline→offline, offline→live, live→live, live→offline, category changes, missing viewer values, and duplicate finalized session IDs.
- [ ] **Step 2: Run target test and verify RED.**
- [ ] **Step 3: Implement collector pure exports plus CLI mode.** The CLI accepts `SOOP_STATE_PATH`, writes `SOOP_NEXT_STATE_PATH`, and if a session ends writes `SOOP_FINAL_SESSION_PATH`.
- [ ] **Step 4: Implement session-store writer** that upserts into `data/soop-sessions.json` and prints whether a change occurred.
- [ ] **Step 5: Run target tests and syntax checks; verify GREEN.**
- [ ] **Step 6: Commit `feat: add SOOP telemetry state machine`.**

### Task 4: Five-minute GitHub Actions collection without Vercel deployment spam

**Files:**
- Create: `.github/workflows/soop-telemetry.yml`
- Modify: `vercel.json`
- Modify: `.github/workflows/chunbong-data-snapshot.yml`
- Modify: `scripts/update-chunbong-data.mjs`
- Modify: `tests/chunbong-data-snapshot-regression.mjs`
- Create: `tests/soop-telemetry-workflow-regression.mjs`

**Interfaces:**
- Telemetry branch name: `data/soop-telemetry`.
- Vercel rule: `git.deploymentEnabled["data/soop-telemetry"] = false`.

- [ ] **Step 1: Add failing workflow/config regression assertions** for five-minute cron, contents write permission, main-code checkout, telemetry branch state persistence, finalized-session main commit, and Vercel branch deployment disable.
- [ ] **Step 2: Extend snapshot test** so SOOP follower/fanclub current values are persisted in the daily snapshot.
- [ ] **Step 3: Run both tests and verify RED.**
- [ ] **Step 4: Implement the workflow.** Fetch telemetry branch state with `git show`; run collector; commit next state only to telemetry branch; if a session finalizes, update `main` session JSON in a separate checkout and push once.
- [ ] **Step 5: Update daily snapshot payload** with `followerCount` and `fanclubCount`.
- [ ] **Step 6: Update `vercel.json` branch deployment config and run tests; verify GREEN.**
- [ ] **Step 7: Commit `ci: collect SOOP telemetry every five minutes`.**

### Task 5: SOOP / YouTube split UI, SVG charts, and calendar

**Files:**
- Modify: `data.html`
- Replace focused parts of: `data.js`
- Modify: `data.css`
- Modify: `tests/chunbong-data-ui-regression.mjs`

**Interfaces:**
- Platform tabs: `data-platform-tab="soop"`, `data-platform-tab="youtube"`.
- SOOP view modes: `daily`, `monthly`, `calendar`.
- Required roots: `data-soop-overview`, `data-soop-chart`, `data-soop-calendar`, `data-soop-calendar-detail`, `data-soop-categories`, `data-youtube-panel`.

- [ ] **Step 1: Update UI regression test** to require platform tabs, three SOOP view modes, calendar month controls, SVG chart renderer markers, data-quality labels, and dedicated YouTube panel.
- [ ] **Step 2: Run UI test and verify RED.**
- [ ] **Step 3: Restructure `data.html`** so SOOP and YouTube sections are separate panels with accessible tab buttons.
- [ ] **Step 4: Implement `data.js` renderers** for KPI cards, SVG line/bar charts, daily/monthly switching, calendar month navigation, date drill-down, category rows, YouTube channel/recent/top/trend panels, and URL hash persistence (`#soop` / `#youtube`).
- [ ] **Step 5: Add responsive CSS** for tabs, charts, calendar grid, detail drawer/card, metric source badges, and mobile behavior.
- [ ] **Step 6: Run UI test and syntax check; verify GREEN.**
- [ ] **Step 7: Commit `feat: add SOOP daily monthly calendar analytics UI`.**

### Task 6: Full regression and preview verification

**Files:**
- Temporary feature-only workflow if needed: `.github/workflows/chunbong-soop-analytics-verify.yml` (delete after success)

- [ ] **Step 1: Run `node --check data.js`, `node --check lib/chunbong-data.js`, `node --check lib/soop-analytics.js`, `node --check scripts/collect-soop-telemetry.mjs`, `node --check scripts/apply-soop-session.mjs`, and all `api/*.js`.**
- [ ] **Step 2: Run every `tests/*.mjs` and require all files to pass.**
- [ ] **Step 3: Wait for Vercel preview status success.**
- [ ] **Step 4: Preview smoke:** `data.html` HTTP 200; `/api/content?type=data` HTTP 200; SOOP `overview/daily/monthly/categories/recentSessions` arrays/objects exist; YouTube existing data remains present.
- [ ] **Step 5: Run collector in fixture/dry-run mode so no persistent telemetry commit is made during feature verification.**
- [ ] **Step 6: Remove temporary verification workflow and confirm final diff contains no temporary CI scaffolding.**

### Task 7: Merge, seed telemetry state, and production verification

**Files:**
- `data/soop-live-state.json` on `data/soop-telemetry` branch only.

- [ ] **Step 1: Open PR from `feat/chunbong-soop-analytics` to `main` with verification summary.**
- [ ] **Step 2: Confirm mergeable and Vercel preview success, then squash merge.**
- [ ] **Step 3: Confirm main Site regression and Vercel production success.**
- [ ] **Step 4: Fast-forward/reset `data/soop-telemetry` to the new main so its `vercel.json` contains the deployment-disabled rule, then add an empty telemetry state JSON on that branch.**
- [ ] **Step 5: Trigger/verify one telemetry workflow run.** If 춘봉 is offline, assert it safely records profile/offline state without creating a session; if live, assert one sample is appended.
- [ ] **Step 6: Production smoke:** platform tabs render, SOOP and YouTube data are separated, calendar and graphs are present, API returns `fallback=false` unless both platforms fail, and existing tarot/site regressions remain green.
- [ ] **Step 7: Report that measured average/max viewers and follower/fanclub deltas become meaningful as new samples accumulate; do not claim unavailable historical values were reconstructed.
