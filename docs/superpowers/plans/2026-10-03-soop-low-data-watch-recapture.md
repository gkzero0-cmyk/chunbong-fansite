# SOOP Low-Data Watch + Exact Recapture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the permanent five-minute SOOP watcher tab with an operator-scoped 15-minute one-shot watcher and make selective recapture decisions from exact per-post Redis state so posts such as `208562045` cannot disappear from the plan without a reason.

**Architecture:** The Tampermonkey userscript remains the authenticated browser boundary. The operator page schedules one-shot board scans through GM storage, while the existing `/api/content` function gains an owner-only multiplex route that reads only requested post IDs with bounded `MGET`; the recapture planner queries that exact route and fails open to recapture if status lookup fails.

**Tech Stack:** JavaScript, Tampermonkey GM APIs, Vercel Node functions, Redis REST commands, GitHub Actions regression tests.

**Spec:** `docs/superpowers/specs/2026-10-03-soop-low-data-watch-recapture-design.md`

## Global Constraints

- Collector userscript version becomes exactly `1.4.7`.
- `SOOP_WATCH_INTERVAL_MS` becomes exactly `15*60*1000`.
- `SOOP_MEDIA_COLLECTOR_VERSION` stays `8`.
- No permanent `#chunbong-soop-watch` tab and no watcher `location.reload()` loop.
- No new Vercel function file, server Cron, Redis heartbeat, or continuous diagnostic polling.
- Exact recapture status reads at most 80 requested numeric post IDs using bounded batch reads.
- Owner authentication remains required for operator status data.
- Production code must not hardcode `208562045` or `204274449`.

## Review Focus

- Multiple operator tabs must not open duplicate SOOP scans for the same due time; regression must assert a GM-storage lease contract.
- A closed operator page must not schedule browser or server work; regression must assert scheduling is operator-page-only.
- Exact-status failure must not silently exclude a public source; planner unit regression must assert fail-open recapture.
- Internal SOOP sources must remain excluded from automatic public recapture; planner unit regression must assert this explicitly.
- Existing image-positive imports must remain excluded without loading the latest-250 inbox; backend/planner regression must assert exact `imageCount > 0` behavior.

---

### Task 1: Pin the new watcher and recapture contracts with failing regression tests

**Files:**
- Create: `tests/soop-low-data-watch-v147-regression.mjs`
- Modify: `tests/soop-diagnostics-media-v146-regression.mjs`

**Interfaces:**
- Consumes: current collector, diagnostics API, recapture guard, and content multiplex source.
- Produces: executable source-level and pure-function assertions used by Tasks 2-4.

- [ ] **Step 1: Write the failing test** asserting collector v1.4.7, 15-minute interval, one-shot watch marker, no watcher reload loop, GM lease, exact status API route, exact planner behavior, max-80 ID validation, no full archive/inbox scan, and no production hardcoded target IDs.
- [ ] **Step 2: Run the regression in GitHub Actions / site regression and verify RED** because v1.4.7 / exact status route / one-shot watcher are not implemented yet.
- [ ] **Step 3: Commit the RED test** without production changes.

### Task 2: Add owner-only exact SOOP recapture status reads

**Files:**
- Modify: `lib/operator-soop-diagnostics-api.js`
- Modify: `api/content.js`

**Interfaces:**
- Consumes: `contentArchive._internals.redisCommand`, `BROWSER_IMPORT_PREFIX`, `SOOP_DIAGNOSTIC_PREFIX`, `normalizeBrowserImportPayload`, and `operatorCenter._internals.requireOwner`.
- Produces: `handleOperatorSoopRecaptureStatus(req,res)` and pure `_internals.readRecaptureStatus(postIds)` returning `{postId,hasImport,imageCount,importStoredAt,diagnosticPhase,diagnosticAcceptedCount,diagnosticStoredAt}`.

- [ ] **Step 1: Run the focused regression and confirm the backend assertions are RED.**
- [ ] **Step 2: Implement numeric ID normalization/deduplication capped at 80 and two bounded `MGET` calls only for requested IDs.**
- [ ] **Step 3: Multiplex `type==='operator-content-soop-recapture-status'` through existing `api/content.js`; do not create a new `/api` file.**
- [ ] **Step 4: Run focused regression and verify backend GREEN.**
- [ ] **Step 5: Commit backend changes.**

### Task 3: Make selective recapture exact and explainable

**Files:**
- Modify: `operator-soop-recapture-guard.js`
- Modify: `operator-soop-diagnostics.js`
- Modify: `operator-redis-diagnostics.js`

**Interfaces:**
- Consumes: archive item sources plus `operator-content-soop-recapture-status` exact rows.
- Produces: exported pure `buildSoopRecapturePlan(payload,statusRows,statusLookupOk)` returning `{targets,summary,rows}` where public sources with missing/zero-image state recapture, image-positive sources exclude, internal sources exclude, and lookup failure fails open.

- [ ] **Step 1: Run planner regression and verify RED.**
- [ ] **Step 2: Implement exact public source extraction and batched status lookup; stop using latest-250 `browserImports` as the final decision source.**
- [ ] **Step 3: Preserve sequential one-post-at-a-time recapture and publish plan summary/reasons to the diagnostics module using browser session state only.**
- [ ] **Step 4: Bump operator child-module cache keys so browsers cannot retain the old planner.**
- [ ] **Step 5: Run focused regressions and verify GREEN.**
- [ ] **Step 6: Commit planner/UI changes.**

### Task 4: Replace the permanent SOOP watcher with a 15-minute one-shot scan

**Files:**
- Modify: `chunbong-content-collector.user.js`
- Modify: watcher-related assertions in `tests/soop-low-data-watch-v147-regression.mjs` and stale v1.4.6 cadence assertion in `tests/soop-diagnostics-media-v146-regression.mjs`.

**Interfaces:**
- Consumes: existing `watchEnabled`, `scanSoopBoard('watch')`, `soopHandled()`, GM storage, `GM_openInTab`.
- Produces: v1.4.7 operator-page scheduler, `SOOP_WATCH_HASH='chunbong-soop-watch-once'`, GM lease with ~2-minute TTL, and one-shot SOOP board tab that scans once then closes.

- [ ] **Step 1: Run watcher regression and verify RED.**
- [ ] **Step 2: Change metadata/runtime version to 1.4.7 and interval to 15 minutes while keeping media generation 8.**
- [ ] **Step 3: Remove permanent watcher heartbeat/reload behavior; make the SOOP watch-marker page scan once and close.**
- [ ] **Step 4: Schedule due checks only from the operator-page userscript, with GM-storage next-run time and short lease to prevent duplicate scans across operator tabs.**
- [ ] **Step 5: Preserve manual immediate checks and watch-stop semantics, clearing scheduled state/lease when stopped.**
- [ ] **Step 6: Run focused regressions and verify GREEN.**
- [ ] **Step 7: Commit watcher changes.**

### Task 5: Whole-branch verification, merge, production verification, and target diagnosis

**Files:**
- No additional production file expected unless verification exposes a defect.

**Interfaces:**
- Consumes: Tasks 1-4 complete branch.
- Produces: merged `main`, READY Production, and a data-backed classification for `208562045` after the authenticated browser has v1.4.7.

- [ ] **Step 1: Run the repository regression suite, relevant browser smokes, syntax checks, and Vercel function-budget guard; record any unrelated failures explicitly.**
- [ ] **Step 2: Review the complete branch diff for privacy, resource usage, duplicate timers, and fail-open recapture behavior.**
- [ ] **Step 3: Open PR, wait for required GitHub Actions, fix only evidence-backed failures, then merge after green verification.**
- [ ] **Step 4: Verify Production deployment is READY, Production userscript reports v1.4.7, operator cache keys are current, and recent runtime errors/warnings are empty.**
- [ ] **Step 5: Query/observe exact recapture status for `208562045` through the authenticated operator flow: classify it as source-missing, zero-image/missing-import and therefore recapture-required, or image-positive and therefore display/linkage-only. Do not claim recovery without post-run evidence.**
