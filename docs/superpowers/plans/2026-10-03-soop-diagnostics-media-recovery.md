# SOOP Diagnostics and Media Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make targeted SOOP recapture diagnosable in Operator Center and recover legitimate rendered SOOP/Afreeca post images when canonical `NORMAL_BBS` discovery returns zero images.

**Architecture:** Keep the existing browser collector and stored privacy-safe diagnostics. Read diagnostics through the existing multiplexed `/api/content` Vercel function with an owner-authenticated `operator-content-soop-diagnostics` type; cap each read to the latest 40 post IDs and batch the matching diagnostic/import records with `MGET`. Keep the existing Redis diagnostics runtime behind its original entry file and load the new SOOP diagnostics UI beside it. Add a generation-8 browser fallback that runs only after canonical media discovery fails. No new Vercel function, schedule, or recurring polling loop is introduced.

**Tech Stack:** Vanilla JavaScript, Node.js 24 regression scripts, Vercel functions, Upstash Redis, GitHub Actions.

**Spec:** User-approved design in the 2026-10-03 conversation.

## Global Constraints

- Collector userscript version becomes `1.4.6`; SOOP media collector generation becomes `8`.
- Normal SOOP watcher cadence stays exactly 5 minutes.
- Diagnostics remain privacy-safe: no cookies, browser storage, query secrets, or page contents leave the collector through the diagnostics route.
- Diagnostic reads are bounded to the latest 40 post IDs and do not load the full archive/inbox.
- Vercel serverless function count must not increase.
- Recovery logic stays generic and must not hardcode validation post IDs.
- No new scheduled job, public polling loop, or separate storage system.

## Review Focus

- Expired diagnostic Redis keys must not break Operator Center loading.
- An existing capture with real images must report healthy even if an older diagnostic recorded zero accepted images.
- Restricted/body-empty diagnostics must be distinguishable from media-zero captures.
- Rendered-media fallback must reject common station/profile/banner chrome.
- Inaccessible cross-origin iframes must be skipped without aborting capture.

---

### Task 1: Regression contract

**Files:**
- Create: `tests/soop-diagnostics-media-v146-regression.mjs`

- [x] Write assertions for diagnostic view statuses, bounded operator diagnostics, collector v1.4.6/generation 8, accessible iframe scanning, trusted rendered-media filtering, unchanged 5-minute cadence, and unchanged Vercel function count.
- [x] Open PR #477 and verify Site regression fails for the missing implementation.

### Task 2: Operator diagnostics

**Files:**
- Create: `lib/operator-soop-diagnostics-api.js`
- Modify: `api/content.js`
- Create: `operator-soop-diagnostics.js`
- Split legacy runtime: `operator-redis-diagnostics.js` + `operator-redis-diagnostics-core.js`

- [x] Read at most 40 latest diagnostic post IDs and batch diagnostic/import records without loading the full archive or collector inbox.
- [x] Route the read through the existing `/api/content` function so the Vercel function budget remains unchanged.
- [x] Render a compact per-post status panel and keep targeted IDs in session storage across an operator-page refresh.
- [x] Refresh only through explicit/lifecycle one-shot calls; do not add an interval poll.

### Task 3: Media-zero fallback

**Files:**
- Modify: `chunbong-content-collector.user.js`

- [x] Bump userscript to 1.4.6 and SOOP media generation to 8.
- [x] When canonical post assets are still zero, inspect large rendered images from trusted SOOP/Afreeca hosts in content roots and accessible iframe documents, rejecting common decorative/station assets.
- [x] Keep diagnostics counts and the 5-minute watcher unchanged.
- [ ] Verify the complete repository regression suite and visual layout audit pass.

### Task 4: Release verification

- [ ] Review the PR diff for privacy/resource regressions.
- [ ] Merge after green checks.
- [ ] Verify the main SHA and Production deployment/log health.
