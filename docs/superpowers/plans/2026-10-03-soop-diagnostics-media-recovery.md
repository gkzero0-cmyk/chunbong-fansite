# SOOP Diagnostics and Media Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make targeted SOOP recapture diagnosable in Operator Center and recover legitimate rendered SOOP/Afreeca post images when canonical `NORMAL_BBS` discovery returns zero images.

**Architecture:** Keep the existing browser collector and authenticated operator archive API. Add bounded diagnostic reads to the existing operator list response, derive a privacy-safe diagnostic view in `operator-contents.js`, and add a generation-8 fallback that only runs after canonical media discovery fails. No new schedule or polling loop is introduced.

**Tech Stack:** Vanilla JavaScript, Node.js 24 regression scripts, Vercel functions, Upstash Redis, GitHub Actions.

**Spec:** User-approved design in the 2026-10-03 conversation.

## Global Constraints

- Collector userscript version becomes `1.4.6`; SOOP media collector generation becomes `8`.
- Normal SOOP watcher cadence stays exactly 5 minutes.
- Diagnostics remain privacy-safe: no cookies, local/session storage, query secrets, or page contents.
- Diagnostic reads are bounded to the latest 40 post IDs.
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

- [ ] Write assertions for diagnostic view statuses, bounded operator diagnostics, collector v1.4.6/generation 8, same-origin iframe scanning, trusted rendered-media filtering, and unchanged 5-minute cadence.
- [ ] Open the PR and verify Site regression fails for the missing implementation.

### Task 2: Operator diagnostics

**Files:**
- Modify: `lib/chunbong-content-archive-api.js`
- Modify: `operator-contents.js`
- Modify: `operator.html`

- [ ] Read at most 40 latest diagnostic records from Redis and return them as `soopDiagnostics` from the authenticated operator list endpoint.
- [ ] Add `soopDiagnosticViewRows(archiveRows, imports, diagnostics)` and render a compact per-post status panel.
- [ ] Verify the new regression passes for operator-side behavior.

### Task 3: Media-zero fallback

**Files:**
- Modify: `chunbong-content-collector.user.js`

- [ ] Bump userscript to 1.4.6 and SOOP media generation to 8.
- [ ] When canonical post assets are still zero, inspect large rendered images from trusted SOOP/Afreeca hosts in content roots and accessible iframe documents, rejecting common decorative/station assets.
- [ ] Keep diagnostics counts and the 5-minute watcher unchanged.
- [ ] Verify all regression workflows pass.

### Task 4: Release verification

- [ ] Review the PR diff for privacy/resource regressions.
- [ ] Merge after green checks.
- [ ] Verify the main SHA and Production deployment/log health.
