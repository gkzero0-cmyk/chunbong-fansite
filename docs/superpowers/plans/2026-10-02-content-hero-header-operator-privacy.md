# Content Hero, Header, and Operator Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Chunbong content hero with the supplied high-resolution artwork, eliminate header width/layout shifts, preserve the improved content reader/guide UX, and ensure unauthenticated operator visitors receive only the authentication shell with no dashboard markup.

**Architecture:** Keep public content data flows unchanged. Reuse the existing shared site header and notice-card contracts, but make header slots exist at first paint and lazy-load only data/behavior. Split the operator page into a public authentication shell plus an owner-protected dashboard fragment/API loaded only after `operator-session` succeeds.

**Tech Stack:** Static HTML/CSS/JS, Node/Vercel serverless API, Cloudinary image delivery, existing GitHub Actions regression/browser audits.

**Spec:** Conversation requirements approved on 2026-10-02.

## Global Constraints

- `춘봉 콘텐츠 → 적자생존` guide source remains `https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/` only.
- Do not add a new Vercel serverless function; extend the existing `/api/content` multiplexed route.
- Keep SOOP auto-ingest/publication behavior unchanged except for already-approved metadata fixes.
- Do not preload all post bodies; keep on-demand loading and session caching.
- Preserve GitHub/email owner authentication and one-year operator sessions.

## Review Focus

- Header must not grow/shrink between first paint and idle-loaded scripts.
- Nested `/contents/...` routes must keep root-relative assets/navigation.
- High-resolution hero must not fall back to the previous 320×180 source.
- Unauthenticated operator requests must not receive dashboard markup or operator data.
- Logout/session expiry must remove any injected dashboard markup immediately.

---

### Task 1: High-resolution Chunbong content hero
**Files:** `chunbong-contents.html`, `content-page-enhancements.css`, regression tests.
- [ ] Add failing regression assertions for the new high-resolution asset and responsive hero contract.
- [ ] Upload the supplied 1672×941 artwork as a dedicated Cloudinary asset.
- [ ] Replace the legacy/upscaled hero URL with responsive Cloudinary delivery from the new original.
- [ ] Verify desktop/mobile layout and image dimensions.

### Task 2: Stable shared header from first paint
**Files:** shared header HTML/runtime files, regression/browser tests.
- [ ] Add a failing test proving all header action slots exist before idle scripts run.
- [ ] Make the shared shell render fixed slots for operator/search/theme/MY/settings/notifications and let scripts bind state only.
- [ ] Keep expensive search/notification data loading lazy.
- [ ] Verify no CLS/header width change while navigating between representative pages.

### Task 3: Preserve content guide and inline post reader UX
**Files:** `chunbong-contents.js`, `official-wiki-guide.js`, shared notice styles/tests as needed.
- [ ] Lock the approved notice-card inline reader and guide accordion/search behavior in regression tests.
- [ ] Remove any remaining duplicate/modal reader code or eager body fetches.
- [ ] Verify public SOOP post body + attachments render in-page and restricted posts degrade safely.

### Task 4: Owner-only operator dashboard markup
**Files:** `operator.html`, `operator.js`, `lib/operator-center-api.js`, `api/content.js`, new dashboard fragment/module if needed, security tests.
- [ ] Add failing tests that unauthenticated `operator.html` contains no dashboard/tabs/cards and protected dashboard request returns 401.
- [ ] Move dashboard markup out of public `operator.html` into an owner-protected response on the existing `/api/content` route.
- [ ] After authenticated session validation, fetch/inject dashboard markup and initialize the dashboard.
- [ ] On logout/session failure, remove injected markup and show only auth UI.
- [ ] Verify direct unauthenticated API calls return 401 and no private markup/data.

### Task 5: Full verification and release
- [ ] Run site audit/regression tests, browser smoke, visual layout audit, and operator security checks.
- [ ] Open PR, inspect diff/checks, merge only after required checks are green.
- [ ] Verify Vercel Production READY and test the hero, header, content reader, nested routes, and unauthenticated operator behavior on production.
