# Header, Hero, and Operator Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Chunbong Content hero with the supplied high-resolution artwork, eliminate header width/CLS changes across navigation, preserve the improved content/post UX, and prevent unauthenticated users from receiving operator dashboard markup at all.

**Architecture:** Keep the existing static site and `/api/content` multiplexer. Make header enhancement scripts first-paint critical instead of idle-injected, use a real high-resolution static hero asset with responsive sizing, and split the operator page into a public auth shell plus an owner-only dashboard fragment returned by the existing server API. Preserve lazy loading for heavy data and source detail requests.

**Tech Stack:** Static HTML/CSS/JS, Node 22 serverless API, Vercel, Redis-backed owner session, node:test.

**Spec:** Conversation requirements confirmed 2026-10-02.

## Global Constraints
- Do not increase Vercel serverless function count.
- Keep GitHub/email owner authentication and the existing 1-year operator session behavior.
- Unauthenticated operator requests must not receive dashboard tabs/cards/labels in HTML or protected API responses.
- Keep heavy search, analytics, notification data fetching lazy; only reserve/render the header shell immediately.
- Keep Chunbong Content post bodies lazy-loaded and session-cached.
- Keep `/contents/...` nested navigation root-safe.

## Review Focus
- A cold navigation between any two pages must not first paint a shorter header and then expand.
- The hero must use the supplied artwork itself, not an upscaled 320x180 derivative.
- `/operator.html` source for an unauthenticated visitor must contain no dashboard panel markup.
- Direct calls to operator analytics/archive/system endpoints without a session must stay HTTP 401.
- Logging out must remove any injected dashboard markup from the DOM.

---

### Task 1: Lock regression contracts
**Files:**
- Create: `test/header-hero-operator-hardening.test.js`

- [ ] Assert site shell does not idle-load header structure scripts.
- [ ] Assert Chunbong Content hero references the new supplied asset and preserves shared hero sizing.
- [ ] Assert public `operator.html` contains only auth shell plus an empty protected mount.
- [ ] Assert the protected dashboard handler calls `requireOwner` before returning markup.
- [ ] Run `npm test` and confirm the new assertions fail before implementation.

### Task 2: Stabilize the shared header
**Files:**
- Modify: `site-shell.js`
- Modify only shared CSS if required for reserved tool slots.

- [ ] Load header structure/enhancement code synchronously during shell initialization instead of `requestIdleCallback`.
- [ ] Keep data-heavy search indexes, analytics, and notification network work lazy.
- [ ] Keep a stable header footprint while auth/personal state resolves.
- [ ] Run regression tests.

### Task 3: Replace the Chunbong Content hero asset
**Files:**
- Create: `assets/chunbong-content-hero-hq.webp`
- Modify: `chunbong-contents.html`
- Modify: `content-page-enhancements.css` only if sizing needs adjustment.

- [ ] Store an optimized derivative made directly from the supplied 1672x941 image.
- [ ] Use width/height and responsive delivery without `e_gen_restore` or the old 320x180 source.
- [ ] Keep desktop 16:9-style hero placement and mobile behavior consistent with the common page hero.
- [ ] Run regression/browser checks.

### Task 4: Hide operator dashboard structure from unauthenticated users
**Files:**
- Preserve current dashboard source server-side under `lib/`.
- Modify: `operator.html`
- Modify: `operator.js`
- Modify: `api/content.js`
- Modify: `lib/operator-center-api.js`

- [ ] Make `operator.html` contain only the auth card and an empty protected mount.
- [ ] Add an owner-only dashboard-markup handler to the existing `/api/content` multiplexer; no new serverless function.
- [ ] On successful session verification, fetch markup, mount it, then initialize dashboard listeners/data.
- [ ] On auth failure/logout, clear the protected mount and show only auth UI.
- [ ] Keep all existing operator data endpoints protected by `requireOwner` and same-origin checks for writes.
- [ ] Run full tests and direct unauthenticated API checks.

### Task 5: Verification and release
- [ ] Run full `npm test` plus existing site audit/regression/browser smoke/visual workflows.
- [ ] Create PR, inspect diff, merge only after required checks pass.
- [ ] Verify Vercel Production is READY on the merge SHA.
- [ ] Verify hero asset, stable header, unauthorized operator HTML/API behavior, and authorized dashboard boot contract in Production.
