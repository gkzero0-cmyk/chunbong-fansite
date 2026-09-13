# Chuntris Global Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Redis-backed global TOP 10 leaderboard to Chuntris and rebalance the game screen so the left/right unused space carries useful ranking and control information without clipping the board on desktop or mobile.

**Architecture:** A pure shared ranking module defines nickname validation, record validation, better-record comparison, and leaderboard sorting. A Vercel serverless endpoint stores one best record per normalized nickname in Upstash Redis, while the existing `chuntris.js` integrates nickname persistence, leaderboard loading/submission, and non-blocking error handling. The page layout becomes a five-region desktop stage — global ranking, HOLD/current score, board, NEXT/character, keyboard help — with progressive collapse to the existing mobile flow.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 24, Vercel Serverless Functions, Upstash Redis REST API via native `fetch`, Node `assert`, Playwright Chromium in GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-chuntris-global-ranking-design.md`

## Global Constraints

- Global leaderboard shows TOP 10 and has separate Classic and 40-line Sprint rankings.
- Nickname is required before starting a new game, trimmed, 2–16 visible characters, and limited to Korean, Latin letters, digits, spaces, `_`, and `-`.
- Same normalized nickname retains only its best record per mode.
- Classic ranking sorts higher `score`, then higher `lines`, then earlier `achievedAt`.
- Sprint ranking accepts only completed 40-line runs and sorts lower `timeMs`, then higher `score`, then earlier `achievedAt`.
- Upstash credentials stay server-side in `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Ranking failures must never break or block the Chuntris game loop after a valid nickname has been supplied.
- HOLD stays left of the board and becomes shorter; the current score panel moves directly under HOLD and is enlarged.
- NEXT stays right of the board and is larger than HOLD; the character card stays under NEXT and is enlarged.
- The outer left rail contains the global leaderboard; the outer right rail contains keyboard instructions.
- Mobile order is board → current score → NEXT → character → HOLD → global ranking → keyboard guide; touch controls remain sticky.
- Existing transparent high-resolution Chunbong reaction asset remains in use.
- Existing Chuntris engine gameplay behavior is unchanged.
- Preview/feature branch work must not intentionally create Production deployments while Vercel Hobby deployment limits are active.

---

## File Structure

### New files

- `chuntris-ranking-core.js` — pure UMD/CommonJS ranking rules shared by browser and API; no DOM, no network, no storage.
- `api/chuntris-ranking.js` — Vercel API handler plus minimal Upstash REST adapter.
- `tests/chuntris-ranking-core-regression.mjs` — deterministic tests for nickname normalization, validation, comparison, and sorting.
- `tests/chuntris-ranking-api-regression.mjs` — mocked Upstash handler tests for GET/POST, failure modes, and same-nickname best-record updates.
- `tests/chuntris-ranking-ui-regression.mjs` — static/runtime-oriented contract test for HTML IDs, script order, client hooks, safe rendering, and submission triggers.

### Modified files

- `chuntris.html` — nickname input, outer ranking rail, score panel relocation, NEXT/character grouping, outer keyboard rail, script include for `chuntris-ranking-core.js`.
- `chuntris.css` — five-region desktop stage, component sizing, breakpoint collapse, mobile source/order guarantees.
- `chuntris.js` — nickname persistence, ranking controller, fetch/render/submit lifecycle, integration with terminal game states.
- `tests/chuntris-ui-regression.mjs` — update existing layout assertions to match the new semantic placement.
- `tests/chuntris-responsive-quality-regression.mjs` — assert five-region layout markers, desktop collapse rules, larger NEXT/score/character sizing, and mobile no-overflow rules.
- `.github/workflows/chuntris-production-smoke.yml` — include ranking core/API paths, nickname before Start, layout checks, and non-blocking ranking verification.

`chuntris-engine.js` is intentionally unchanged.

---

### Task 1: Shared ranking rules

**Files:**
- Create: `chuntris-ranking-core.js`
- Create: `tests/chuntris-ranking-core-regression.mjs`

**Interfaces:**
- Produces browser global `ChuntrisRankingCore` and CommonJS export with:
  - `normalizeNickname(value: unknown): string`
  - `validateNickname(value: unknown): { ok: true, displayName: string, key: string } | { ok: false, error: string }`
  - `validateRecord(input: unknown): { ok: true, record: object } | { ok: false, error: string }`
  - `isBetterRecord(mode: 'classic'|'sprint40', candidate: object, current?: object|null): boolean`
  - `sortRecords(mode: 'classic'|'sprint40', records: object[]): object[]`
  - `formatTime(timeMs: number): string`
- Consumed by `api/chuntris-ranking.js` and `chuntris.js`.

- [ ] **Step 1: Write the failing core regression test**

Create `tests/chuntris-ranking-core-regression.mjs` with explicit cases:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chuntris-ranking-core.js');

assert.equal(Core.normalizeNickname('  춘 봉  '), '춘 봉');
assert.deepEqual(Core.validateNickname('춘봉_01').ok, true);
assert.deepEqual(Core.validateNickname('a').ok, false);
assert.deepEqual(Core.validateNickname('춘봉<script>').ok, false);
assert.deepEqual(Core.validateNickname('12345678901234567').ok, false);

const classic = Core.validateRecord({
  mode: 'classic', nickname: '춘봉', score: 41554, lines: 82, level: 9, timeMs: 180000
});
assert.equal(classic.ok, true);

const incompleteSprint = Core.validateRecord({
  mode: 'sprint40', nickname: '춘봉', score: 8000, lines: 39, level: 1, timeMs: 90000
});
assert.equal(incompleteSprint.ok, false);

assert.equal(Core.isBetterRecord('classic', { score: 200, lines: 2, achievedAt: '2026-09-14T00:00:02.000Z' }, { score: 100, lines: 8, achievedAt: '2026-09-14T00:00:01.000Z' }), true);
assert.equal(Core.isBetterRecord('classic', { score: 100, lines: 7, achievedAt: '2026-09-14T00:00:02.000Z' }, { score: 100, lines: 8, achievedAt: '2026-09-14T00:00:01.000Z' }), false);
assert.equal(Core.isBetterRecord('sprint40', { timeMs: 80000, score: 1000, achievedAt: '2026-09-14T00:00:02.000Z' }, { timeMs: 90000, score: 9000, achievedAt: '2026-09-14T00:00:01.000Z' }), true);

const sorted = Core.sortRecords('classic', [
  { displayName: 'B', score: 100, lines: 5, achievedAt: '2026-09-14T00:00:02.000Z' },
  { displayName: 'A', score: 200, lines: 1, achievedAt: '2026-09-14T00:00:03.000Z' },
  { displayName: 'C', score: 100, lines: 6, achievedAt: '2026-09-14T00:00:01.000Z' }
]);
assert.deepEqual(sorted.map(item => item.displayName), ['A', 'C', 'B']);
assert.equal(Core.formatTime(91321), '01:31.321');
console.log('Chuntris ranking core regression passed');
```

- [ ] **Step 2: Run it and verify RED**

Run:

```bash
node tests/chuntris-ranking-core-regression.mjs
```

Expected: FAIL with `Cannot find module '../chuntris-ranking-core.js'`.

- [ ] **Step 3: Implement the pure ranking core**

Create `chuntris-ranking-core.js` as a UMD-style module. Use these exact constants and validation boundaries:

```js
const MODES = new Set(['classic', 'sprint40']);
const NICKNAME_RE = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/u;
const MAX_SCORE = 100000000;
const MAX_LINES = 100000;
const MAX_LEVEL = 10000;
const MAX_TIME_MS = 24 * 60 * 60 * 1000;
```

`normalizeNickname()` must collapse internal whitespace to one space and trim. `validateNickname()` must lowercase only the lookup key (`displayName.toLocaleLowerCase('ko-KR')`) and preserve display spelling. `validateRecord()` must coerce only already-finite integer numbers; do not accept numeric strings. Add `achievedAt` server-side later, not from client input. `sortRecords()` must return a copy, not mutate its input.

Wrap exports as:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ChuntrisRankingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // implementation
  return { normalizeNickname, validateNickname, validateRecord, isBetterRecord, sortRecords, formatTime };
});
```

- [ ] **Step 4: Run core regression and verify GREEN**

```bash
node tests/chuntris-ranking-core-regression.mjs
```

Expected: `Chuntris ranking core regression passed`.

- [ ] **Step 5: Commit**

```bash
git add chuntris-ranking-core.js tests/chuntris-ranking-core-regression.mjs
git commit -m "feat: add Chuntris ranking rules"
```

---

### Task 2: Upstash Redis ranking API

**Files:**
- Create: `api/chuntris-ranking.js`
- Create: `tests/chuntris-ranking-api-regression.mjs`

**Interfaces:**
- Consumes `require('../chuntris-ranking-core.js')`.
- GET `/api/chuntris-ranking?mode=classic|sprint40` → `{ mode, entries }`.
- POST `/api/chuntris-ranking` with validated JSON → `{ mode, updated, personalBest, entries }`.
- Redis keys are exactly `chuntris:classic:players` and `chuntris:sprint40:players`.

- [ ] **Step 1: Write the failing API regression test**

Create `tests/chuntris-ranking-api-regression.mjs`. Mock `global.fetch`, set temporary environment variables, construct Vercel-style `req`/`res`, and invoke the exported handler directly.

The in-memory mock must implement Upstash REST command URLs for `GET` and `SET` and preserve a `Map` by Redis key. The assertions must cover:

```js
assert.equal(getEmpty.statusCode, 200);
assert.deepEqual(getEmpty.body.entries, []);

assert.equal(firstClassic.statusCode, 200);
assert.equal(firstClassic.body.updated, true);
assert.equal(firstClassic.body.entries[0].nickname, '춘봉');
assert.equal(firstClassic.body.entries[0].score, 1000);

assert.equal(lowerClassic.body.updated, false);
assert.equal(lowerClassic.body.entries[0].score, 1000);

assert.equal(higherClassic.body.updated, true);
assert.equal(higherClassic.body.entries[0].score, 1500);

assert.equal(incompleteSprint.statusCode, 400);
assert.equal(fasterSprint.body.updated, true);
assert.equal(slowerSprint.body.updated, false);

assert.equal(invalidNickname.statusCode, 400);
assert.equal(unsupportedMethod.statusCode, 405);
```

Also delete `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for one request and assert `503` with a controlled JSON error rather than a thrown exception.

- [ ] **Step 2: Run API test and verify RED**

```bash
node tests/chuntris-ranking-api-regression.mjs
```

Expected: FAIL because `api/chuntris-ranking.js` does not exist.

- [ ] **Step 3: Implement the Upstash adapter and handler**

`api/chuntris-ranking.js` must:

1. Accept only `GET` and `POST`; return `405` plus `Allow: GET, POST` otherwise.
2. Resolve mode from query for GET and body for POST.
3. Return `503 { error: 'ranking_unavailable' }` if either Upstash variable is absent.
4. Send Upstash commands with:

```js
async function redisCommand(command, ...args) {
  const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const encoded = [command, ...args].map(part => encodeURIComponent(String(part))).join('/');
  const response = await fetch(`${base}/${encoded}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}
```

5. Use `GET key`, parse missing result as `{}`, and `SET key JSON.stringify(map)` only when a POST improves that nickname's record.
6. Generate `achievedAt = new Date().toISOString()` server-side.
7. Never accept `achievedAt` from the client as authoritative.
8. Return only TOP 10 after `Core.sortRecords(mode, Object.values(map)).slice(0, 10)` and map `displayName` to response field `nickname`.
9. Set GET cache header to `public, max-age=10, stale-while-revalidate=20`; set POST to `no-store`.
10. Set `Content-Type: application/json; charset=utf-8`.
11. Catch Redis/network errors and return `503 { error: 'ranking_unavailable' }` without leaking tokens or upstream URLs.

- [ ] **Step 4: Run API test and verify GREEN**

```bash
node tests/chuntris-ranking-api-regression.mjs
```

Expected: API regression passes all GET/POST/better-record/error cases.

- [ ] **Step 5: Run core + API tests together**

```bash
node tests/chuntris-ranking-core-regression.mjs && node tests/chuntris-ranking-api-regression.mjs
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add api/chuntris-ranking.js tests/chuntris-ranking-api-regression.mjs
git commit -m "feat: add Chuntris Redis leaderboard API"
```

---

### Task 3: Restructure Chuntris markup for five regions

**Files:**
- Modify: `chuntris.html`
- Create: `tests/chuntris-ranking-ui-regression.mjs`
- Modify: `tests/chuntris-ui-regression.mjs`

**Interfaces:**
- Adds DOM IDs consumed later by `chuntris.js`:
  - `#chuntris-nickname`
  - `#chuntris-ranking`
  - `#chuntris-ranking-status`
  - `#chuntris-ranking-list`
  - `[data-chuntris-ranking-mode="classic"]`
  - `[data-chuntris-ranking-mode="sprint40"]`
- Adds region classes consumed by CSS/smoke:
  - `.chuntris-ranking-rail`
  - `.chuntris-left-panel`
  - `.chuntris-board-wrap`
  - `.chuntris-right-panel`
  - `.chuntris-help-rail`

- [ ] **Step 1: Write failing static UI contract test**

Create `tests/chuntris-ranking-ui-regression.mjs` that reads `chuntris.html`, `chuntris.js`, and `chuntris.css` and initially asserts only the HTML contract:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');

for (const token of [
  'id="chuntris-nickname"',
  'id="chuntris-ranking"',
  'id="chuntris-ranking-status"',
  'id="chuntris-ranking-list"',
  'data-chuntris-ranking-mode="classic"',
  'data-chuntris-ranking-mode="sprint40"',
  'class="chuntris-ranking-rail',
  'class="chuntris-help-rail'
]) assert.ok(html.includes(token), `missing ${token}`);

const coreIndex = html.indexOf('chuntris-ranking-core.js');
const appIndex = html.indexOf('chuntris.js');
assert.ok(coreIndex > 0 && coreIndex < appIndex, 'ranking core must load before chuntris.js');

const layoutIndex = html.indexOf('class="chuntris-layout"');
const rankingIndex = html.indexOf('class="chuntris-ranking-rail');
const leftIndex = html.indexOf('class="chuntris-side chuntris-left-panel');
const boardIndex = html.indexOf('class="chuntris-board-wrap"');
const rightIndex = html.indexOf('class="chuntris-side chuntris-right-panel');
const helpIndex = html.indexOf('class="chuntris-help-rail');
assert.ok(rankingIndex > layoutIndex && rankingIndex < leftIndex);
assert.ok(leftIndex < boardIndex && boardIndex < rightIndex && rightIndex < helpIndex);

assert.ok(leftIndex < html.indexOf('id="chuntris-hold"'));
assert.ok(html.indexOf('id="chuntris-hold"') < html.indexOf('class="chuntris-stats"'));
assert.ok(rightIndex < html.indexOf('id="chuntris-next"'));
assert.ok(html.indexOf('id="chuntris-next"') < html.indexOf('class="chuntris-reaction-card"'));
console.log('Chuntris ranking UI markup regression passed');
```

- [ ] **Step 2: Run and verify RED**

```bash
node tests/chuntris-ranking-ui-regression.mjs
```

Expected: FAIL on missing nickname/ranking elements.

- [ ] **Step 3: Update `chuntris.html` markup**

Make these structural changes without changing canvas IDs or game controls:

1. Add nickname label inside the toolbar, between mode buttons and action buttons:

```html
<label class="chuntris-nickname-label" for="chuntris-nickname">
  <span>닉네임</span>
  <input id="chuntris-nickname" maxlength="16" autocomplete="nickname" inputmode="text" placeholder="2~16자">
</label>
```

2. Inside `.chuntris-layout`, place five direct children in this order:
   - `<aside id="chuntris-ranking" class="chuntris-ranking-rail">...TOP 10...</aside>`
   - `.chuntris-left-panel` containing HOLD first and `.chuntris-stats` second.
   - `.chuntris-board-wrap` unchanged.
   - `.chuntris-right-panel` containing NEXT first and character figure second.
   - `<aside class="chuntris-help-rail">` containing the existing KEYS content.
3. Remove the old KEYS section from inside `.chuntris-left-panel`.
4. Move the existing `.chuntris-stats` block from the right panel to under HOLD.
5. Keep character figure under NEXT, but do not duplicate IDs.
6. Add ranking panel skeleton:

```html
<div class="chuntris-ranking-head">
  <div><span class="eyebrow">GLOBAL</span><h2>전체 랭킹</h2></div>
  <div class="chuntris-ranking-tabs" role="group" aria-label="전체 랭킹 모드">
    <button type="button" class="is-active" data-chuntris-ranking-mode="classic" aria-pressed="true">클래식</button>
    <button type="button" data-chuntris-ranking-mode="sprint40" aria-pressed="false">40줄</button>
  </div>
</div>
<p id="chuntris-ranking-status" class="chuntris-ranking-status" aria-live="polite">랭킹 불러오는 중…</p>
<ol id="chuntris-ranking-list" class="chuntris-ranking-list"></ol>
```

7. Add `<script src="chuntris-ranking-core.js"></script>` immediately before `chuntris.js`.

- [ ] **Step 4: Update existing UI regression assertions**

In `tests/chuntris-ui-regression.mjs`, replace any expectation that KEYS lives in the left panel or stats live in the right panel with assertions that the existing canvas/control IDs still exist exactly once and that the new rail classes exist.

- [ ] **Step 5: Run static UI tests**

```bash
node tests/chuntris-ranking-ui-regression.mjs && node tests/chuntris-ui-regression.mjs
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add chuntris.html tests/chuntris-ranking-ui-regression.mjs tests/chuntris-ui-regression.mjs
git commit -m "feat: restructure Chuntris game panels"
```

---

### Task 4: Implement five-region responsive layout and larger panels

**Files:**
- Modify: `chuntris.css`
- Modify: `tests/chuntris-responsive-quality-regression.mjs`
- Modify: `tests/chuntris-ranking-ui-regression.mjs`

**Interfaces:**
- CSS grid areas on wide desktop: `ranking left board right help`.
- At constrained desktop widths, outer rails move below core three-column stage before board width is aggressively reduced.
- At `max-width: 820px`, source order becomes the single flow specified in Global Constraints.

- [ ] **Step 1: Extend responsive regression with failing expectations**

Add checks to `tests/chuntris-responsive-quality-regression.mjs` for these exact semantic markers:

```js
assert.match(css, /grid-template-areas:[^;]*"ranking left board right help"/);
assert.match(css, /\.chuntris-ranking-rail\s*\{[^}]*grid-area:ranking/);
assert.match(css, /\.chuntris-help-rail\s*\{[^}]*grid-area:help/);
assert.match(css, /#chuntris-hold\s*\{[^}]*max-height:/);
assert.match(css, /#chuntris-next\s*\{[^}]*width:min\(100%,1[5-9][0-9]px\)/);
assert.match(css, /\.chuntris-reaction\s*\{[^}]*1[2-9][0-9]px/);
assert.match(css, /@media\(max-width:820px\)[\s\S]*grid-template-areas:[^;]*"board"[^;]*"score"[^;]*"next"[^;]*"reaction"[^;]*"hold"[^;]*"ranking"[^;]*"help"/);
```

Also assert `.chuntris-layout` never sets a fixed pixel `min-width` and `.chuntris-game` retains `touch-action:pan-y pinch-zoom`.

- [ ] **Step 2: Run responsive test and verify RED**

```bash
node tests/chuntris-responsive-quality-regression.mjs
```

Expected: FAIL because five-area grid and new sizing are absent.

- [ ] **Step 3: Replace layout-specific CSS while preserving visual theme**

Keep existing colors, borders, transparent restored sprite, toolbar styling, canvas drawing, and touch controls. Rework only game-stage layout and panel sizing.

Wide desktop (`min-width: 1181px`) target:

```css
.chuntris-layout {
  display: grid;
  grid-template-columns: minmax(190px,240px) minmax(145px,175px) minmax(150px,calc(var(--chuntris-stage-height)/2)) minmax(170px,205px) minmax(180px,220px);
  grid-template-areas: "ranking left board right help";
  justify-content: center;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  height: var(--chuntris-stage-height);
  min-height: 0;
}
.chuntris-ranking-rail { grid-area: ranking; }
.chuntris-left-panel { grid-area: left; }
.chuntris-board-wrap { grid-area: board; }
.chuntris-right-panel { grid-area: right; }
.chuntris-help-rail { grid-area: help; }
```

Inner rails:

```css
.chuntris-left-panel { grid-template-rows: auto minmax(0,1fr); }
.chuntris-right-panel { grid-template-rows: minmax(0,1fr) auto; }
#chuntris-hold { width:min(100%,130px); max-height:105px; margin:0 auto; }
#chuntris-next { width:min(100%,180px); margin:auto; }
.chuntris-reaction { width:min(100%,150px); }
.chuntris-stats strong { font-size:clamp(1rem,1.5vw,1.25rem); }
```

Ranking rail must have an internal scroll area only for the list, not the whole page:

```css
.chuntris-ranking-rail { display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.chuntris-ranking-list { min-height:0; overflow:auto; list-style:none; margin:8px 0 0; padding:0; }
```

At `max-width: 1180px` and above 820px, use a three-column core row plus a second row for outer rails:

```css
.chuntris-layout {
  grid-template-columns: minmax(140px,170px) minmax(150px,calc(var(--chuntris-stage-height)/2)) minmax(165px,200px);
  grid-template-areas:
    "left board right"
    "ranking ranking help";
  height:auto;
}
```

Do not force the second row into the viewport-bounded game stage; core gameplay row must remain unclipped. Outer information may continue below it.

At `max-width: 820px`, assign classes/sections to areas so the visual order is exactly:

```css
.chuntris-layout {
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:
    "board"
    "score"
    "next"
    "reaction"
    "hold"
    "ranking"
    "help";
  height:auto;
}
```

Because stats/HOLD share the left aside and NEXT/reaction share the right aside in HTML, set those side as `display:contents` only inside the mobile breakpoint so their children can participate in the parent grid; explicitly give the child panels their areas using stable classes added in Task 3 (`.chuntris-hold-panel`, `.chuntris-stats`, `.chuntris-next-panel`, `.chuntris-reaction-card`). If Task 3 did not add those two panel classes, add them now before styling.

Keep `.chuntris-help-rail` visible on desktop; on mobile it becomes a normal full-width card instead of `display:none`.

- [ ] **Step 4: Run responsive/static tests and verify GREEN**

```bash
node tests/chuntris-responsive-quality-regression.mjs && node tests/chuntris-ranking-ui-regression.mjs
```

Expected: pass.

- [ ] **Step 5: Run existing Chuntris static regressions**

```bash
node tests/chuntris-assets-regression.mjs
node tests/chuntris-audio-regression.mjs
node tests/chuntris-engine-controls-regression.mjs
node tests/chuntris-engine-core-regression.mjs
node tests/chuntris-engine-scoring-regression.mjs
node tests/chuntris-runtime-regression.mjs
node tests/chuntris-ui-regression.mjs
```

Expected: all pass; no engine file changes are needed.

- [ ] **Step 6: Commit**

```bash
git add chuntris.css chuntris.html tests/chuntris-responsive-quality-regression.mjs tests/chuntris-ranking-ui-regression.mjs
git commit -m "feat: rebalance Chuntris responsive layout"
```

---

### Task 5: Integrate nickname and leaderboard lifecycle into the client

**Files:**
- Modify: `chuntris.js`
- Modify: `tests/chuntris-ranking-ui-regression.mjs`

**Interfaces:**
- Consumes browser global `ChuntrisRankingCore`.
- Uses endpoint `/api/chuntris-ranking`.
- Stores last valid nickname in `localStorage` key `chuntris.nickname.v1`.
- Adds methods to `window.ChuntrisApp` for smoke/debug only:
  - `loadRanking(mode = currentMode): Promise<void>`
  - `getNickname(): string`

- [ ] **Step 1: Extend the client regression with failing source-contract assertions**

Append to `tests/chuntris-ranking-ui-regression.mjs`:

```js
const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const token of [
  "const NICKNAME_KEY = 'chuntris.nickname.v1'",
  "'/api/chuntris-ranking'",
  'ChuntrisRankingCore',
  'loadRanking',
  'submitRanking',
  'textContent',
  'data-chuntris-ranking-mode'
]) assert.ok(js.includes(token), `missing client ranking token ${token}`);

assert.ok(!js.includes('innerHTML = entry.nickname'), 'nickname must never be injected with innerHTML');
```

- [ ] **Step 2: Run and verify RED**

```bash
node tests/chuntris-ranking-ui-regression.mjs
```

Expected: FAIL on missing ranking client hooks.

- [ ] **Step 3: Add DOM references and nickname persistence**

In `chuntris.js` add:

```js
const RankingCore = root.ChuntrisRankingCore;
const NICKNAME_KEY = 'chuntris.nickname.v1';
const RANKING_ENDPOINT = '/api/chuntris-ranking';
```

Extend `els` with nickname, ranking list/status, ranking mode buttons. On startup, hydrate nickname from `storageGet(NICKNAME_KEY, '')`.

Implement:

```js
function currentNickname() {
  const result = RankingCore?.validateNickname(els.nickname?.value || '');
  return result?.ok ? result : null;
}
```

When Start is pressed, validate nickname before starting. On invalid input, do not reset/start the game; set `els.status.textContent` to `닉네임은 한글/영문/숫자/공백/_/- 조합으로 2~16자 입력해 주세요.` and focus the nickname field. On valid input, persist `displayName` to `NICKNAME_KEY`.

- [ ] **Step 4: Implement safe leaderboard rendering**

Maintain:

```js
let rankingMode = 'classic';
let rankingRequestId = 0;
```

`renderRanking(entries)` must create DOM nodes and set nickname/metric with `.textContent`; never interpolate nickname into HTML. Each row contains rank, nickname, and one primary metric. Classic metric is localized score; Sprint metric uses `RankingCore.formatTime(timeMs)`. If the row nickname normalized key equals the current nickname key, add `is-current-player`.

`loadRanking(nextMode = mode)` must:
- normalize to `classic`/`sprint40`;
- increment `rankingRequestId` and ignore stale responses;
- set a lightweight `불러오는 중…` status;
- `fetch(`${RANKING_ENDPOINT}?mode=${encodeURIComponent(rankingMode)}`, { headers: { accept: 'application/json' } })`;
- render `entries` if response is OK;
- on failure, set `랭킹을 불러오지 못했어요. 게임은 계속할 수 있어요.` and leave gameplay functional.

Mode buttons inside the ranking panel change only the ranking view; game mode buttons continue to control gameplay. When gameplay mode changes, also call `loadRanking(mode)` and synchronize ranking tab pressed state.

- [ ] **Step 5: Submit records exactly once on terminal state transitions**

Create:

```js
let lastSubmittedTerminal = '';

async function submitRanking(state) {
  const nick = currentNickname();
  if (!nick) return;
  const terminalKey = `${mode}:${state.status}:${state.startedAt || 0}:${state.elapsedMs}:${state.score}`;
  if (terminalKey === lastSubmittedTerminal) return;
  lastSubmittedTerminal = terminalKey;

  const body = {
    mode,
    nickname: nick.displayName,
    score: state.score,
    lines: state.lines,
    level: state.level,
    timeMs: state.elapsedMs
  };

  try {
    const response = await fetch(RANKING_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`ranking ${response.status}`);
    const payload = await response.json();
    if (payload.mode === rankingMode && Array.isArray(payload.entries)) renderRanking(payload.entries);
  } catch {
    if (els.rankingStatus) els.rankingStatus.textContent = '기록 저장에 실패했어요. 게임 기록은 기기 안에 유지돼요.';
  }
}
```

Call it only on transition:
- Classic: `gameover` when `previousStatus !== 'gameover'`.
- Sprint: `completed` when `previousStatus !== 'completed'`.

Do not submit Sprint gameovers. Reset `lastSubmittedTerminal` in `start()` and `setMode()`.

The call must be fire-and-forget (`void submitRanking(state)`) so rendering/game loop never waits for the network.

- [ ] **Step 6: Initialize ranking and expose smoke hooks**

At app initialization:

```js
loadRanking(mode);
```

Extend the public object:

```js
root.ChuntrisApp = {
  start, pause, setMode, render,
  loadRanking,
  getNickname: () => els.nickname?.value || '',
  getGame: () => game
};
```

- [ ] **Step 7: Run ranking and existing runtime tests**

```bash
node tests/chuntris-ranking-core-regression.mjs
node tests/chuntris-ranking-api-regression.mjs
node tests/chuntris-ranking-ui-regression.mjs
node tests/chuntris-runtime-regression.mjs
node tests/chuntris-ui-regression.mjs
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add chuntris.js tests/chuntris-ranking-ui-regression.mjs
git commit -m "feat: connect Chuntris global rankings"
```

---

### Task 6: Strengthen Production smoke for the new UI and ranking endpoint

**Files:**
- Modify: `.github/workflows/chuntris-production-smoke.yml`
- Modify: `tests/chuntris-production-smoke-source-regression.mjs`

**Interfaces:**
- Production smoke still targets `https://chunbong-fansite.vercel.app/chuntris.html`.
- Ranking GET is allowed to return either `200` with entries or `503 ranking_unavailable` only while environment variables are intentionally absent during rollout; after env configuration in Task 7, require `200`.

- [ ] **Step 1: Update source regression first and verify RED**

Extend `tests/chuntris-production-smoke-source-regression.mjs` so the workflow source must mention:

```js
for (const token of [
  'chuntris-ranking-core.js',
  '/api/chuntris-ranking?mode=classic',
  '#chuntris-nickname',
  '.chuntris-ranking-rail',
  '.chuntris-help-rail',
  'Desktop 1280x900',
  'Short desktop 1280x740',
  'Compact desktop 900x800',
  'Mobile 390x844',
  'Mobile 360x800'
]) assert.ok(workflow.includes(token), `production smoke missing ${token}`);
```

Run:

```bash
node tests/chuntris-production-smoke-source-regression.mjs
```

Expected: FAIL on missing ranking tokens.

- [ ] **Step 2: Extend readiness checks**

In `Wait for production deployment`, additionally fetch:

```bash
curl -fsS "$BASE/chuntris-ranking-core.js" -o /dev/null
curl -fsS -H 'accept: application/json' "$BASE/api/chuntris-ranking?mode=classic" -o /tmp/chuntris-ranking.json
```

Require the HTML to contain `chuntris-nickname`, `chuntris-ranking-list`, and `chuntris-ranking-core.js`. Require CSS to contain `chuntris-ranking-rail` and `chuntris-help-rail`.

Once Production Upstash variables are configured, parse ranking JSON with Node and require `{ mode: 'classic', entries: Array }`.

- [ ] **Step 3: Update Playwright flow for nickname and layout**

Before every `#chuntris-start` click, fill:

```js
await page.locator('#chuntris-nickname').fill('SmokeTester');
```

On desktop 1280×900 assert the horizontal ordering by bounding boxes:

```js
const boxes = await Promise.all([
  page.locator('.chuntris-ranking-rail').boundingBox(),
  page.locator('.chuntris-left-panel').boundingBox(),
  page.locator('.chuntris-board-wrap').boundingBox(),
  page.locator('.chuntris-right-panel').boundingBox(),
  page.locator('.chuntris-help-rail').boundingBox()
]);
const [ranking, left, board, right, help] = boxes;
assert.ok(ranking && left && board && right && help);
assert.ok(ranking.x < left.x && left.x < board.x && board.x < right.x && right.x < help.x);
```

Also assert:
- score panel `y` is below HOLD canvas bottom;
- character card `y` is below NEXT canvas bottom;
- `#chuntris-next` rendered width is greater than `#chuntris-hold` rendered width;
- reaction rendered width is at least 120px on 1280×900;
- no horizontal overflow remains on all five existing viewports.

For 900×800, do not require five columns; require board/core side panels visible and outer rails present in document flow without overlap.

For mobile, verify CSS/source order through bounding box Y positions for board, stats, NEXT, reaction if visible, HOLD, ranking, help. If the character is hidden only at the smallest breakpoint, update the CSS requirement first — the approved design expects it in mobile flow, so preferred implementation is visible.

- [ ] **Step 4: Run source regression**

```bash
node tests/chuntris-production-smoke-source-regression.mjs
```

Expected: pass.

- [ ] **Step 5: Run the full Chuntris local regression set**

```bash
for test in tests/chuntris-*-regression.mjs; do echo "== $test =="; node "$test"; done
```

Expected: every Chuntris regression passes.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/chuntris-production-smoke.yml tests/chuntris-production-smoke-source-regression.mjs
git commit -m "test: cover Chuntris rankings and side rails"
```

---

### Task 7: Configure Upstash environments and verify Preview end-to-end

**Files:**
- No source file required unless the deployment platform demands config metadata.

**Interfaces:**
- Preview and Production need:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

- [ ] **Step 1: Create or select one Upstash Redis database**

Use a single database for Chuntris rankings; keys are already namespaced. Copy the REST URL and REST token. Do not paste credentials into source, commits, PR descriptions, Actions logs, or chat output.

- [ ] **Step 2: Add variables to Vercel Preview and Production scopes**

Set both variables in the `chunbong-fansite` Vercel project for Preview and Production. If direct connector support exists, use it; otherwise use Vercel dashboard Project Settings → Environment Variables.

- [ ] **Step 3: Trigger exactly one Preview deployment for the implementation branch**

Do not create repeated no-op commits. Wait for the existing branch deployment if one is already pending.

- [ ] **Step 4: API smoke Preview**

Use the Preview base URL and run:

```bash
curl -fsS "$PREVIEW/api/chuntris-ranking?mode=classic"
curl -fsS -X POST "$PREVIEW/api/chuntris-ranking" \
  -H 'content-type: application/json' \
  --data '{"mode":"classic","nickname":"PreviewSmoke","score":100,"lines":1,"level":1,"timeMs":1000}'
curl -fsS -X POST "$PREVIEW/api/chuntris-ranking" \
  -H 'content-type: application/json' \
  --data '{"mode":"classic","nickname":"PreviewSmoke","score":50,"lines":2,"level":1,"timeMs":2000}'
```

Expected:
- GET returns 200 with `entries` array.
- First POST has `updated:true`.
- Second/lower POST has `updated:false` and the stored score remains 100.

Then test Sprint with a completed 40-line record and ensure an incomplete 39-line submission returns 400.

- [ ] **Step 5: Browser Preview smoke**

Run Playwright or manually verify at 1280×900, 1280×740, 900×800, 390×844, 360×800:
- nickname is required;
- ranking loads;
- game starts after valid nickname;
- five-region wide desktop order is correct;
- score is below HOLD;
- NEXT and character are visibly larger than before;
- outer left has TOP 10 and outer right has KEYS;
- no horizontal overflow;
- board is not clipped;
- mobile order is correct;
- API failure, if simulated, does not stop gameplay.

- [ ] **Step 6: Remove Preview smoke record only if an admin-safe mechanism exists**

Do not add a public delete endpoint just to clean test data. If no safe operational Redis console cleanup is available, use a clearly prefixed nickname such as `PreviewSmoke` and remove that field/map entry directly in Upstash console before Production launch.

---

### Task 8: PR review, merge, and Production verification

**Files:**
- No additional application files expected.

- [ ] **Step 1: Rebase/merge current `main` into the feature branch before PR finalization**

Preserve any newer Chuntris changes. Resolve conflicts by retaining both newer fixes and this ranking/layout behavior; never reset `main` to the design branch snapshot.

- [ ] **Step 2: Run full local regression suite for touched scope**

```bash
node tests/chuntris-ranking-core-regression.mjs
node tests/chuntris-ranking-api-regression.mjs
node tests/chuntris-ranking-ui-regression.mjs
node tests/chuntris-ui-regression.mjs
node tests/chuntris-responsive-quality-regression.mjs
node tests/chuntris-production-smoke-source-regression.mjs
for test in tests/chuntris-engine-*-regression.mjs; do node "$test"; done
```

Expected: all pass.

- [ ] **Step 3: Open PR with deployment prerequisites stated**

PR body must say:
- Upstash variables are required in Preview/Production.
- Ranking is casual and not cheat-proof.
- Gameplay remains usable if ranking API is unavailable.
- Production should not be retriggered repeatedly if Vercel Hobby rate limits are active.

- [ ] **Step 4: Review changed files and CI**

Verify only the intended files plus the design/plan docs changed. Require Site regression and all Chuntris regressions to pass. Require Vercel Preview `Ready` before merge when rate limits permit.

- [ ] **Step 5: Merge once Preview is validated**

Prefer squash merge to keep the feature atomic. Do not merge while the Upstash Production variables are missing unless the user explicitly accepts launching the UI with a temporarily unavailable leaderboard.

- [ ] **Step 6: Verify Production after Vercel deploy is current**

Run/observe `Chuntris production smoke`. Require:
- Production `chuntris.html`, CSS/JS/core assets return successfully.
- `/api/chuntris-ranking?mode=classic` returns 200 JSON.
- 1280×900, 1280×740, 900×800, 390×844, 360×800 browser checks pass.
- No horizontal overflow or board clipping.
- Wide desktop order is ranking → HOLD/score → board → NEXT/character → KEYS.
- Transparent restored character asset remains visible with no white background.
- Classic gameplay and Sprint gameplay controls still work.

- [ ] **Step 7: Stop any temporary deployment watcher after success**

If an automation is watching Chuntris deployment, disable it only after Production deploy and Production smoke both succeed.
