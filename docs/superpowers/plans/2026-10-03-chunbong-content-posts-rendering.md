# Chunbong Content Posts Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Chunbong content `게시글` tab newest-first, canonical-deduplicated, and expandable inside one stable card without increasing runtime API, Redis, or polling usage.

**Architecture:** Add DOM-independent post normalization helpers to `chunbong-contents.js`, render only normalized rows as stable post cards, and change `content-page-enhancements.js` so preview data loads into the existing card rather than inserting a sibling card. Preserve the existing source-preview API, lazy loading, memory cache, and session cache. Add an audit CLI that validates all public content post lists without becoming a runtime service.

**Tech Stack:** Vanilla JavaScript, Node 24 regression scripts, Playwright 1.55 browser smoke tests, existing Vercel/static site and `/api/content` contracts.

**Spec:** `docs/superpowers/specs/2026-10-03-chunbong-content-posts-rendering-design.md`

## Global Constraints

- `게시글` is newest → oldest; valid dated rows always precede unknown-date rows.
- Same SOOP post ID or canonical URL renders exactly once, including duplicates split across `timeline` and `media`.
- The best specific title, best date precision, and usable canonical URL survive duplicate merging.
- `기록` tab chronology is unchanged.
- Expanding/collapsing never creates or removes post cards; only the body state changes.
- Existing source-preview API contract, lazy fetch behavior, `previewCache`, and `sessionStorage` cache remain.
- Keep current SOOP/FMKorea preview eligibility.
- No new Redis reads/writes, API endpoint, Vercel function, cron, recurring polling, or new runtime dependency.
- Cache-bust changed JS/CSS assets so Production cannot keep serving the old sibling-card behavior.

## Review Focus

1. SOOP URL variants with query/hash/trailing slash must collapse to the same post ID.
2. Invalid/partial/unknown dates must never sort above a valid dated post.
3. If one duplicate has a specific title and another has the better date, the merged row must keep both best values.
4. Missing/invalid URLs must not cause unrelated posts to over-merge.
5. Repeated expand → collapse → expand, including preview failures, must never change card count or issue a second successful-preview fetch.

---

## Task 1: Add pure post normalization and stable sorting

**Files:**
- Modify: `chunbong-contents.js`
- Create: `tests/chunbong-post-normalization-regression.mjs`

**Interfaces:**
- `postCanonicalKey(row) -> string`
- `mergePostRows(primary, candidate) -> object`
- `normalizePostRows(item) -> object[]`
- Export all three on the existing Node/browser `ChunbongContents` API object.

- [ ] **Step 1: Write failing normalization regression fixtures.**

Cover at minimum:
- identical SOOP post IDs with `?query`, `#hash`, and trailing slash variants collapse to one row;
- rows with `2026-10-01`, `2026-09-23`, unknown date return in that order;
- same-date SOOP rows use post ID descending as a stable tiebreaker;
- the same URL in `timeline` and `media` yields one row;
- a placeholder-title duplicate plus a specific-title duplicate keeps the specific title;
- a day-precision duplicate plus unknown-date duplicate keeps the day date;
- two URL-less unrelated rows do not collapse merely because they share a generic title/type.

- [ ] **Step 2: Run the test and confirm RED.**

Run:
```bash
node tests/chunbong-post-normalization-regression.mjs
```
Expected: FAIL because the normalization helpers are not implemented/exported yet.

- [ ] **Step 3: Implement minimal pure helpers.**

Implementation requirements:
- extract SOOP `/station/chunbongtv/post/<id>` first and return a key such as `soop:<id>`;
- for other valid URLs, strip hash and non-identity query data before producing a canonical URL key;
- URL-less fallback key must include enough identity (`id`, title, date/type as available) to avoid unrelated merging;
- title quality must penalize generic placeholders such as `공식 게시글`, bare `게시글`, or numeric-ID-only variants;
- date quality must prefer `day` > `month/year` > `unknown`;
- normalized sort puts known dates descending, then same-day SOOP ID descending, then canonical key for stable non-SOOP order.

- [ ] **Step 4: Re-run focused verification.**

Run:
```bash
node tests/chunbong-post-normalization-regression.mjs
node --check chunbong-contents.js
```
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add chunbong-contents.js tests/chunbong-post-normalization-regression.mjs
git commit -m "feat: normalize Chunbong content posts"
```

---

## Task 2: Render one stable card and load previews inside it

**Files:**
- Modify: `chunbong-contents.js`
- Modify: `content-page-enhancements.js`
- Modify: `content-page-enhancements.css`
- Modify: `tests/chunbong-contents-browser-smoke.mjs`
- Create: `tests/chunbong-post-card-regression.mjs`

**Interfaces / markup contract:**
- `renderPosts(item)` consumes only `normalizePostRows(item)`.
- Exactly one `article.archive-post-card[data-archive-post-card]` per normalized row.
- Card includes:
  - `[data-post-toggle]` button,
  - `data-source-url` on the card,
  - `[data-source-notice-detail]` preview target,
  - `[data-post-body]` initially hidden/collapsed,
  - a separate external source link marked so the toggle handler does not intercept it.
- Enhancement code operates on the existing card and must not call `insertAdjacentElement('afterend', ...)` for post previews.

- [ ] **Step 1: Write static regression first.**

`tests/chunbong-post-card-regression.mjs` should assert:
- `renderPosts()` references `normalizePostRows(item)`;
- stable card/data markers exist;
- sibling-card insertion pattern is absent from `content-page-enhancements.js`;
- preview cache/session cache contracts remain present;
- source external links stay distinguishable from toggle controls.

- [ ] **Step 2: Extend browser smoke fixture before implementation.**

Add a post-heavy fixture (prefer `justserver-survival`) with:
- duplicate SOOP row in both `timeline` and `media`;
- three dated posts supplied out of order;
- one unknown-date post;
- sourcePreview route response for at least one successful post and one failure/null case.

Browser assertions:
- Posts tab shows unique cards newest-first;
- unknown date is last;
- initial card count equals the normalized unique count;
- expand first card → body appears inside that same card;
- collapse → expand again → card count is unchanged;
- successful sourcePreview request count for the same card is exactly one;
- source external link remains a real link and is not converted into a toggle;
- failed preview message stays inside the original card and does not add a sibling card.

- [ ] **Step 3: Run focused tests and confirm RED.**

Run:
```bash
node tests/chunbong-post-card-regression.mjs
```
Then run the existing browser smoke locally/CI when Playwright is available. Expected: new assertions fail on the current sibling-card implementation.

- [ ] **Step 4: Implement the stable-card renderer.**

In `chunbong-contents.js`:
- map normalized rows to cards instead of bare `<a>` rows;
- show title/type/date in the collapsed header;
- keep external source link separate;
- include empty hidden preview region in the card;
- preserve invalid/no-URL cards without rendering unsafe links.

In `content-page-enhancements.js`:
- replace `buildNotice(anchor)` with existing-card lookup and `openPostCard(card)`/equivalent;
- fetch only on first expansion;
- set loaded state after success so subsequent expansions are cache/DOM-only;
- failure state renders inside the card and still allows retry policy only if explicitly intended; default behavior should not create duplicate DOM;
- toggle only `hidden`, classes, `aria-expanded`, label and chevron;
- retain `previewCache`, `SESSION_PREFIX`, sourcePreview query contract, body/image sanitization and SOOP/FMKorea eligibility.

In CSS:
- adapt `.archive-source-notice` rules to `.archive-post-card`/in-card body as needed;
- preserve desktop/mobile readability and avoid adding a second visual container.

- [ ] **Step 5: Re-run focused tests.**

Run:
```bash
node tests/chunbong-post-normalization-regression.mjs
node tests/chunbong-post-card-regression.mjs
node --check chunbong-contents.js
node --check content-page-enhancements.js
```
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add chunbong-contents.js content-page-enhancements.js content-page-enhancements.css tests/chunbong-contents-browser-smoke.mjs tests/chunbong-post-card-regression.mjs
git commit -m "fix: keep Chunbong post previews inside one card"
```

---

## Task 3: Add a whole-archive posts audit and CI coverage

**Files:**
- Create: `scripts/audit-chunbong-posts.mjs`
- Create: `tests/chunbong-posts-audit-regression.mjs`
- Modify: `.github/workflows/chunbong-contents-browser-smoke.yml`

**Audit contract:**
- CLI accepts `BASE_URL` environment variable (default can be local development URL).
- Fetch existing `chunbong-contents` list, then each existing `chunbong-content&id=<id>` detail.
- Reuse the exported `normalizePostRows()` function rather than reimplementing sorting/dedupe rules.
- Exit non-zero if any content violates:
  - duplicate canonical key after normalization;
  - date order;
  - unknown date before known date;
  - a known better duplicate title being lost.
- Output compact per-content failures plus a final total summary.
- It is a one-shot validation tool only; never called by the browser/runtime.

- [ ] **Step 1: Write a failing audit regression.**

Use fixture data with duplicates, out-of-order dates and unknown dates to prove the audit catches raw bad input but passes the normalized output contract.

- [ ] **Step 2: Run and confirm RED.**

```bash
node tests/chunbong-posts-audit-regression.mjs
```
Expected: FAIL before the audit module exists.

- [ ] **Step 3: Implement the audit CLI/module.**

Keep network requests bounded to one list request plus one detail request per public content item. Do not add concurrency that could hammer Production; a small bounded concurrency (or sequential iteration) is preferred.

- [ ] **Step 4: Expand browser-smoke workflow path filters.**

Ensure `Chunbong content archive browser smoke` also runs when these relevant files change:
- `content-page-enhancements.js`
- `content-page-enhancements.css`
- `mobile-runtime-loader.js`
- `tests/chunbong-post-card-regression.mjs`
- `tests/chunbong-post-normalization-regression.mjs`
- `tests/chunbong-posts-audit-regression.mjs`
- `scripts/audit-chunbong-posts.mjs`

Do not add a scheduled workflow.

- [ ] **Step 5: Verify.**

```bash
node tests/chunbong-posts-audit-regression.mjs
node --check scripts/audit-chunbong-posts.mjs
```
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add scripts/audit-chunbong-posts.mjs tests/chunbong-posts-audit-regression.mjs .github/workflows/chunbong-contents-browser-smoke.yml
git commit -m "test: audit Chunbong posts across archive"
```

---

## Task 4: Bust caches and perform end-to-end verification

**Files:**
- Modify: `chunbong-contents.html`
- Modify: `mobile-runtime-loader.js`
- Modify: `content-page-enhancements.js` if its dynamic stylesheet URL needs coherence
- Update relevant regression assertions if version strings are pinned.

- [ ] **Step 1: Pin cache-version coherence in regression coverage.**

Before bumping, add assertions (existing/new post-card regression) that the HTML/loader/enhancement reference the intended new generations.

Expected RED against the old values:
- `chunbong-contents.js?v=4`
- `content-page-enhancements.css?v=6`
- `content-page-enhancements.js?v=7`

- [ ] **Step 2: Bump post-rendering assets together.**

Target generations:
- `chunbong-contents.js?v=5`
- `content-page-enhancements.css?v=7`
- `content-page-enhancements.js?v=8`

If `content-page-enhancements.js` dynamically injects its CSS fallback, update that URL to `v=7` too.

- [ ] **Step 3: Run focused verification.**

```bash
node tests/chunbong-post-normalization-regression.mjs
node tests/chunbong-post-card-regression.mjs
node tests/chunbong-posts-audit-regression.mjs
node --check chunbong-contents.js
node --check content-page-enhancements.js
node --check mobile-runtime-loader.js
node --check scripts/audit-chunbong-posts.mjs
```
Expected: PASS.

- [ ] **Step 4: Run repository/PR verification.**

Run the same regression loop used by Site regression when practical:
```bash
set -e
for file in tests/*.mjs; do node "$file"; done
```
Also require the PR checks:
- Site regression
- Chunbong content archive browser smoke
- Visual layout audit / applicable site visual check

If an unrelated pre-existing repository regression fails, document it with evidence and do not alter unrelated product code merely to silence it.

- [ ] **Step 5: Run whole-archive audit against Preview.**

After Vercel Preview is available:
```bash
BASE_URL=https://<preview-url> node scripts/audit-chunbong-posts.mjs
```
Expected: 0 ordering/dedup violations.

- [ ] **Step 6: Browser-check representative content.**

Verify at least:
- `justserver-survival`
- `leopel`
- one other content with many post rows

For each, confirm newest-first, no duplicates, unknown dates last, expand/collapse/re-expand keeps card count unchanged, source link works, and preview body/images remain inside one card on desktop and mobile viewport.

- [ ] **Step 7: Commit cache/version changes.**

```bash
git add chunbong-contents.html mobile-runtime-loader.js content-page-enhancements.js tests/
git commit -m "chore: refresh Chunbong post rendering assets"
```

- [ ] **Step 8: Open PR and review the diff.**

PR summary must explicitly call out:
- global Posts-tab newest-first behavior;
- canonical dedupe across timeline/media;
- removal of sibling-card insertion;
- unchanged sourcePreview API/cache behavior;
- no new Redis/API/polling resources;
- whole-archive audit result.

Check changed files for accidental edits outside the approved scope.

- [ ] **Step 9: Merge only after verification is green.**

After merge, confirm Vercel Production is READY on the merge SHA. Run:
```bash
BASE_URL=https://chunbong-fansite.vercel.app node scripts/audit-chunbong-posts.mjs
```
Expected: 0 violations.

Then verify Production runtime logs contain no new error/warning/fatal events attributable to this release and spot-check the representative content pages again.

## Final Acceptance Checklist

- [ ] All Posts tabs show known dates newest → oldest and unknown dates last.
- [ ] Canonical SOOP/URL duplicates are absent across every audited content item.
- [ ] Best title/date survive duplicate merging.
- [ ] `기록` chronology remains unchanged.
- [ ] Opening/closing a post never changes post-card count.
- [ ] Successful preview loads once per card/session path and reopens without another fetch.
- [ ] Preview errors stay inside the same card.
- [ ] No new API endpoint, serverless function, Redis usage, cron, or polling was introduced.
- [ ] Asset cache versions are coherent in HTML, runtime loader, and enhancement CSS fallback.
- [ ] Focused regressions, browser smoke, Site regression, whole-archive audit, and Production runtime checks pass.
