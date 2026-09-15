# Chuntris Global Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Redis-backed global TOP 10 leaderboard and rebalance the Chuntris screen so ranking, HOLD/current score, board, NEXT/character, and keyboard help all fit cleanly on desktop and mobile.

**Architecture:** `chuntris-ranking-core.js` contains pure ranking rules shared by browser and server. `api/chuntris-ranking.js` validates requests and stores one best record per nickname in Upstash Redis through its REST API. `chuntris.js` owns nickname persistence, ranking fetch/submit, and safe DOM rendering, while `chuntris.html`/`chuntris.css` implement the five-region desktop layout and responsive mobile order.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 24, Vercel Serverless Functions, Upstash Redis REST API via native `fetch`, Node `assert`, Playwright Chromium.

**Spec:** `docs/superpowers/specs/2026-09-14-chuntris-global-ranking-design.md`

## Global Constraints

- TOP 10 is split into `classic` and `sprint40`.
- Nickname is required before Start; trim/collapse whitespace; allow 2–16 characters using Korean, Latin letters, digits, space, `_`, `-` only.
- One best record per normalized nickname and mode.
- Classic sort: score desc → lines desc → achievedAt asc.
- Sprint sort: timeMs asc → score desc → achievedAt asc; only completed 40-line runs may be stored.
- Redis credentials exist only in `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` server environments.
- Ranking/network failures never stop gameplay after nickname validation.
- Desktop order: global ranking → HOLD + current score → board → NEXT + large character → keyboard help.
- HOLD is compact, NEXT is larger, score panel and character are visibly larger than current production.
- Mobile order: board → current score → NEXT → character → HOLD → ranking → keyboard help; touch controls stay sticky.
- Preserve the existing transparent restored Chunbong reaction asset and the current game-engine behavior.
- Work on a feature branch until Preview verification is complete; do not intentionally spam Production deployments while Hobby limits are active.

---

### Task 1: Shared ranking rules

**Files:**
- Create: `chuntris-ranking-core.js`
- Create: `tests/chuntris-ranking-core-regression.mjs`

**Interfaces:**
- `normalizeNickname(value) -> string`
- `validateNickname(value) -> {ok:true,displayName,key}|{ok:false,error}`
- `validateRecord(input) -> {ok:true,record}|{ok:false,error}`
- `isBetterRecord(mode,candidate,current) -> boolean`
- `sortRecords(mode,records) -> new array`
- `formatTime(timeMs) -> mm:ss.mmm`

- [ ] **Step 1: Write the failing core test**

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chuntris-ranking-core.js');

assert.equal(Core.normalizeNickname('  춘   봉  '), '춘 봉');
assert.equal(Core.validateNickname('춘봉_01').ok, true);
assert.equal(Core.validateNickname('a').ok, false);
assert.equal(Core.validateNickname('춘봉<script>').ok, false);
assert.equal(Core.validateNickname('12345678901234567').ok, false);

assert.equal(Core.validateRecord({ mode:'classic', nickname:'춘봉', score:1000, lines:10, level:2, timeMs:60000 }).ok, true);
assert.equal(Core.validateRecord({ mode:'sprint40', nickname:'춘봉', score:8000, lines:39, level:1, timeMs:90000 }).ok, false);
assert.equal(Core.isBetterRecord('classic', {score:200,lines:2,achievedAt:'2026-09-14T00:00:02.000Z'}, {score:100,lines:8,achievedAt:'2026-09-14T00:00:01.000Z'}), true);
assert.equal(Core.isBetterRecord('sprint40', {timeMs:80000,score:1000,achievedAt:'2026-09-14T00:00:02.000Z'}, {timeMs:90000,score:9000,achievedAt:'2026-09-14T00:00:01.000Z'}), true);
assert.deepEqual(Core.sortRecords('classic', [
  {displayName:'B',score:100,lines:5,achievedAt:'2026-09-14T00:00:02.000Z'},
  {displayName:'A',score:200,lines:1,achievedAt:'2026-09-14T00:00:03.000Z'},
  {displayName:'C',score:100,lines:6,achievedAt:'2026-09-14T00:00:01.000Z'}
]).map(v => v.displayName), ['A','C','B']);
assert.equal(Core.formatTime(91321), '01:31.321');
console.log('Chuntris ranking core regression passed');
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chuntris-ranking-core-regression.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the pure module**

Use these constants and exact validation boundaries:

```js
const MODES = new Set(['classic', 'sprint40']);
const NICKNAME_RE = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/u;
const MAX_SCORE = 100000000;
const MAX_LINES = 100000;
const MAX_LEVEL = 10000;
const MAX_TIME_MS = 86400000;
```

The implementation body must include these concrete rules:

```js
function normalizeNickname(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function validateNickname(value) {
  const displayName = normalizeNickname(value);
  if (displayName.length < 2 || displayName.length > 16 || !NICKNAME_RE.test(displayName)) {
    return { ok:false, error:'invalid_nickname' };
  }
  return { ok:true, displayName, key:displayName.toLocaleLowerCase('ko-KR') };
}

function validInt(value, max) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function validateRecord(input) {
  if (!input || !MODES.has(input.mode)) return { ok:false, error:'invalid_mode' };
  const nickname = validateNickname(input.nickname);
  if (!nickname.ok) return nickname;
  if (!validInt(input.score, MAX_SCORE) || !validInt(input.lines, MAX_LINES) || !validInt(input.level, MAX_LEVEL) || !validInt(input.timeMs, MAX_TIME_MS)) {
    return { ok:false, error:'invalid_record' };
  }
  if (input.mode === 'sprint40' && (input.lines < 40 || input.timeMs <= 0)) return { ok:false, error:'incomplete_sprint' };
  return { ok:true, record:{ mode:input.mode, displayName:nickname.displayName, key:nickname.key, score:input.score, lines:input.lines, level:input.level, timeMs:input.timeMs } };
}

function isBetterRecord(mode, candidate, current) {
  if (!current) return true;
  if (mode === 'classic') {
    if (candidate.score !== current.score) return candidate.score > current.score;
    if (candidate.lines !== current.lines) return candidate.lines > current.lines;
  } else {
    if (candidate.timeMs !== current.timeMs) return candidate.timeMs < current.timeMs;
    if (candidate.score !== current.score) return candidate.score > current.score;
  }
  return String(candidate.achievedAt) < String(current.achievedAt);
}

function sortRecords(mode, records) {
  return [...records].sort((a,b) => {
    if (mode === 'classic') return (b.score-a.score) || (b.lines-a.lines) || String(a.achievedAt).localeCompare(String(b.achievedAt));
    return (a.timeMs-b.timeMs) || (b.score-a.score) || String(a.achievedAt).localeCompare(String(b.achievedAt));
  });
}

function formatTime(ms) {
  const safe = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
}
```

Export with:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ChuntrisRankingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // constants and functions above live here
  return { normalizeNickname, validateNickname, validateRecord, isBetterRecord, sortRecords, formatTime };
});
```

- [ ] **Step 4: Verify GREEN**

```bash
node tests/chuntris-ranking-core-regression.mjs
```

- [ ] **Step 5: Commit**

```bash
git add chuntris-ranking-core.js tests/chuntris-ranking-core-regression.mjs
git commit -m "feat: add Chuntris ranking rules"
```

---

### Task 2: Upstash Redis API

**Files:**
- Create: `api/chuntris-ranking.js`
- Create: `tests/chuntris-ranking-api-regression.mjs`

**Interfaces:**
- GET `/api/chuntris-ranking?mode=classic|sprint40` → `{mode,entries}`.
- POST `/api/chuntris-ranking` → `{mode,updated,personalBest,entries}`.
- Redis keys: `chuntris:classic:players`, `chuntris:sprint40:players`.

- [ ] **Step 1: Write a mocked API test**

Use a `Map` as fake Redis and mock `global.fetch`. Assert:

```js
assert.equal(getEmpty.statusCode, 200);
assert.deepEqual(getEmpty.body.entries, []);
assert.equal(firstClassic.body.updated, true);
assert.equal(firstClassic.body.entries[0].score, 1000);
assert.equal(lowerClassic.body.updated, false);
assert.equal(higherClassic.body.updated, true);
assert.equal(incompleteSprint.statusCode, 400);
assert.equal(fasterSprint.body.updated, true);
assert.equal(slowerSprint.body.updated, false);
assert.equal(invalidNickname.statusCode, 400);
assert.equal(unsupportedMethod.statusCode, 405);
assert.equal(missingEnv.statusCode, 503);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chuntris-ranking-api-regression.mjs
```

- [ ] **Step 3: Implement `api/chuntris-ranking.js`**

Use `require('../chuntris-ranking-core.js')`. The Redis adapter is:

```js
async function redisCommand(command, ...args) {
  const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const path = [command, ...args].map(v => encodeURIComponent(String(v))).join('/');
  const response = await fetch(`${base}/${path}`, {
    headers: { Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}
```

Handler rules:

```js
const KEY_BY_MODE = {
  classic:'chuntris:classic:players',
  sprint40:'chuntris:sprint40:players'
};
```

- GET/POST only; all other methods return 405 and `Allow: GET, POST`.
- Missing Redis env returns `503 {error:'ranking_unavailable'}`.
- GET reads JSON map with `GET`, defaults to `{}`, sorts through `Core.sortRecords`, returns TOP 10.
- POST calls `Core.validateRecord(req.body)`, creates server `achievedAt`, updates only when `Core.isBetterRecord` is true, then `SET`s the JSON map.
- POST ignores any client-supplied `achievedAt`.
- GET cache: `public, max-age=10, stale-while-revalidate=20`; POST: `no-store`.
- Redis errors return 503 without leaking URL/token.

- [ ] **Step 4: Verify GREEN**

```bash
node tests/chuntris-ranking-core-regression.mjs && node tests/chuntris-ranking-api-regression.mjs
```

- [ ] **Step 5: Commit**

```bash
git add api/chuntris-ranking.js tests/chuntris-ranking-api-regression.mjs
git commit -m "feat: add Chuntris Redis leaderboard API"
```

---

### Task 3: Five-region HTML structure

**Files:**
- Modify: `chuntris.html`
- Create: `tests/chuntris-ranking-ui-regression.mjs`
- Modify: `tests/chuntris-ui-regression.mjs`

**Interfaces:**
- New IDs: `chuntris-nickname`, `chuntris-ranking`, `chuntris-ranking-status`, `chuntris-ranking-list`.
- Ranking tabs: `data-chuntris-ranking-mode="classic"`, `data-chuntris-ranking-mode="sprint40"`.
- Region classes: `chuntris-ranking-rail`, `chuntris-left-panel`, `chuntris-board-wrap`, `chuntris-right-panel`, `chuntris-help-rail`.

- [ ] **Step 1: Write failing markup contract**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
for (const token of ['id="chuntris-nickname"','id="chuntris-ranking"','id="chuntris-ranking-status"','id="chuntris-ranking-list"','data-chuntris-ranking-mode="classic"','data-chuntris-ranking-mode="sprint40"','class="chuntris-ranking-rail','class="chuntris-help-rail']) assert.ok(html.includes(token), token);
assert.ok(html.indexOf('chuntris-ranking-core.js') < html.indexOf('chuntris.js'));
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chuntris-ranking-ui-regression.mjs
```

- [ ] **Step 3: Modify markup**

Add toolbar nickname control:

```html
<label class="chuntris-nickname-label" for="chuntris-nickname"><span>닉네임</span><input id="chuntris-nickname" maxlength="16" autocomplete="nickname" placeholder="2~16자"></label>
```

Make `.chuntris-layout` direct children, in this order:

```html
<aside id="chuntris-ranking" class="chuntris-ranking-rail">...</aside>
<aside class="chuntris-side chuntris-left-panel">HOLD then stats</aside>
<div class="chuntris-board-wrap">existing board</div>
<aside class="chuntris-side chuntris-right-panel">NEXT then reaction</aside>
<aside class="chuntris-help-rail">existing KEYS content</aside>
```

Ranking panel body:

```html
<div class="chuntris-ranking-head"><div><span class="eyebrow">GLOBAL</span><h2>전체 랭킹</h2></div><div class="chuntris-ranking-tabs" role="group" aria-label="전체 랭킹 모드"><button type="button" class="is-active" data-chuntris-ranking-mode="classic" aria-pressed="true">클래식</button><button type="button" data-chuntris-ranking-mode="sprint40" aria-pressed="false">40줄</button></div></div>
<p id="chuntris-ranking-status" class="chuntris-ranking-status" aria-live="polite">랭킹 불러오는 중…</p>
<ol id="chuntris-ranking-list" class="chuntris-ranking-list"></ol>
```

Add `chuntris-hold-panel` and `chuntris-next-panel` classes to those two section wrappers. Load `chuntris-ranking-core.js` immediately before `chuntris.js`.

- [ ] **Step 4: Update old UI assertions and run**

```bash
node tests/chuntris-ranking-ui-regression.mjs && node tests/chuntris-ui-regression.mjs
```

- [ ] **Step 5: Commit**

```bash
git add chuntris.html tests/chuntris-ranking-ui-regression.mjs tests/chuntris-ui-regression.mjs
git commit -m "feat: restructure Chuntris game panels"
```

---

### Task 4: Responsive sizing and layout

**Files:**
- Modify: `chuntris.css`
- Modify: `tests/chuntris-responsive-quality-regression.mjs`

- [ ] **Step 1: Add failing CSS assertions**

Require these markers:

```js
assert.match(css,/grid-template-areas:[^;]*"ranking left board right help"/);
assert.match(css,/\.chuntris-ranking-rail\s*\{[^}]*grid-area:ranking/);
assert.match(css,/\.chuntris-help-rail\s*\{[^}]*grid-area:help/);
assert.match(css,/#chuntris-hold\s*\{[^}]*max-height:/);
assert.match(css,/#chuntris-next\s*\{[^}]*width:min\(100%,180px\)/);
assert.match(css,/\.chuntris-reaction\s*\{[^}]*150px/);
assert.ok(css.includes('touch-action:pan-y pinch-zoom'));
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chuntris-responsive-quality-regression.mjs
```

- [ ] **Step 3: Implement wide desktop layout**

```css
.chuntris-layout{display:grid;grid-template-columns:minmax(190px,240px) minmax(145px,175px) minmax(150px,calc(var(--chuntris-stage-height)/2)) minmax(170px,205px) minmax(180px,220px);grid-template-areas:"ranking left board right help";justify-content:center;align-items:stretch;gap:12px;width:100%;max-width:100%;height:var(--chuntris-stage-height);min-height:0}
.chuntris-ranking-rail{grid-area:ranking;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.chuntris-left-panel{grid-area:left;grid-template-rows:auto minmax(0,1fr)}
.chuntris-board-wrap{grid-area:board}
.chuntris-right-panel{grid-area:right;grid-template-rows:minmax(0,1fr) auto}
.chuntris-help-rail{grid-area:help}
#chuntris-hold{width:min(100%,130px);max-height:105px;margin:0 auto}
#chuntris-next{width:min(100%,180px);margin:auto}
.chuntris-reaction{width:min(100%,150px)}
.chuntris-ranking-list{min-height:0;overflow:auto;list-style:none;margin:8px 0 0;padding:0}
```

At `max-width:1180px` and `min-width:821px`:

```css
.chuntris-layout{grid-template-columns:minmax(140px,170px) minmax(150px,calc(var(--chuntris-stage-height)/2)) minmax(165px,200px);grid-template-areas:"left board right" "ranking ranking help";height:auto}
```

At `max-width:820px`, use `display:contents` for the two inner side wrappers and this area order:

```css
.chuntris-layout{grid-template-columns:minmax(0,1fr);grid-template-areas:"board" "score" "next" "reaction" "hold" "ranking" "help";height:auto}
.chuntris-left-panel,.chuntris-right-panel{display:contents}
.chuntris-stats{grid-area:score}
.chuntris-next-panel{grid-area:next}
.chuntris-reaction-card{grid-area:reaction}
.chuntris-hold-panel{grid-area:hold}
.chuntris-ranking-rail{grid-area:ranking}
.chuntris-help-rail{grid-area:help}
```

Do not hide ranking, help, or character on mobile.

- [ ] **Step 4: Run responsive and engine regressions**

```bash
node tests/chuntris-responsive-quality-regression.mjs
node tests/chuntris-ui-regression.mjs
node tests/chuntris-engine-controls-regression.mjs
node tests/chuntris-engine-core-regression.mjs
node tests/chuntris-engine-scoring-regression.mjs
```

- [ ] **Step 5: Commit**

```bash
git add chuntris.css tests/chuntris-responsive-quality-regression.mjs
git commit -m "feat: rebalance Chuntris responsive layout"
```

---

### Task 5: Client nickname and ranking lifecycle

**Files:**
- Modify: `chuntris.js`
- Modify: `tests/chuntris-ranking-ui-regression.mjs`

- [ ] **Step 1: Add failing source assertions**

```js
const js=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
for(const token of ["const NICKNAME_KEY = 'chuntris.nickname.v1'","'/api/chuntris-ranking'",'ChuntrisRankingCore','loadRanking','submitRanking','data-chuntris-ranking-mode']) assert.ok(js.includes(token),token);
assert.ok(!js.includes('innerHTML = entry.nickname'));
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chuntris-ranking-ui-regression.mjs
```

- [ ] **Step 3: Add ranking constants and DOM refs**

```js
const RankingCore=root.ChuntrisRankingCore;
const NICKNAME_KEY='chuntris.nickname.v1';
const RANKING_ENDPOINT='/api/chuntris-ranking';
```

Extend `els` with nickname, ranking status/list, and ranking-mode buttons. Hydrate nickname from localStorage.

- [ ] **Step 4: Block Start only for invalid nickname**

```js
function currentNickname(){const result=RankingCore?.validateNickname(els.nickname?.value||'');return result?.ok?result:null;}
```

At the start of `start()`:

```js
const nickname=currentNickname();
if(!nickname){els.status.textContent='닉네임은 한글/영문/숫자/공백/_/- 조합으로 2~16자 입력해 주세요.';els.nickname?.focus();return;}
storageSet(NICKNAME_KEY,nickname.displayName);
```

- [ ] **Step 5: Implement safe TOP 10 loading/rendering**

Maintain `rankingMode` and monotonic `rankingRequestId`. Build each `<li>` with `document.createElement` and `.textContent` for nickname/metric. Highlight the current nickname with `is-current-player`. Classic metric is score; Sprint metric is `RankingCore.formatTime(timeMs)`.

```js
async function loadRanking(nextMode=mode){
  rankingMode=nextMode==='sprint40'?'sprint40':'classic';
  const requestId=++rankingRequestId;
  if(els.rankingStatus) els.rankingStatus.textContent='랭킹 불러오는 중…';
  try{
    const response=await fetch(`${RANKING_ENDPOINT}?mode=${encodeURIComponent(rankingMode)}`,{headers:{accept:'application/json'}});
    if(!response.ok) throw new Error(`ranking ${response.status}`);
    const payload=await response.json();
    if(requestId!==rankingRequestId) return;
    renderRanking(Array.isArray(payload.entries)?payload.entries:[]);
  }catch{
    if(requestId===rankingRequestId&&els.rankingStatus) els.rankingStatus.textContent='랭킹을 불러오지 못했어요. 게임은 계속할 수 있어요.';
  }
}
```

- [ ] **Step 6: Submit only terminal records**

Use `lastSubmittedTerminal` to prevent duplicate POSTs during render frames. Submit Classic on transition to `gameover`; Sprint only on transition to `completed`.

```js
async function submitRanking(state){
  const nickname=currentNickname();
  if(!nickname)return;
  const key=`${mode}:${state.status}:${state.elapsedMs}:${state.score}:${state.lines}`;
  if(key===lastSubmittedTerminal)return;
  lastSubmittedTerminal=key;
  try{
    const response=await fetch(RANKING_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({mode,nickname:nickname.displayName,score:state.score,lines:state.lines,level:state.level,timeMs:state.elapsedMs})});
    if(!response.ok) throw new Error(`ranking ${response.status}`);
    const payload=await response.json();
    if(payload.mode===rankingMode&&Array.isArray(payload.entries)) renderRanking(payload.entries);
  }catch{
    if(els.rankingStatus) els.rankingStatus.textContent='기록 저장에 실패했어요. 게임 기록은 기기 안에 유지돼요.';
  }
}
```

Call with `void submitRanking(state)`; never await it in `render()`.

- [ ] **Step 7: Initialize and expose smoke hooks**

```js
root.ChuntrisApp={start,pause,setMode,render,loadRanking,getNickname:()=>els.nickname?.value||'',getGame:()=>game};
loadRanking(mode);
```

- [ ] **Step 8: Run regressions and commit**

```bash
node tests/chuntris-ranking-core-regression.mjs
node tests/chuntris-ranking-api-regression.mjs
node tests/chuntris-ranking-ui-regression.mjs
node tests/chuntris-runtime-regression.mjs
node tests/chuntris-ui-regression.mjs
git add chuntris.js tests/chuntris-ranking-ui-regression.mjs
git commit -m "feat: connect Chuntris global rankings"
```

---

### Task 6: Production smoke coverage

**Files:**
- Modify: `.github/workflows/chuntris-production-smoke.yml`
- Modify: `tests/chuntris-production-smoke-source-regression.mjs`

- [ ] **Step 1: Make source regression fail on missing ranking coverage**

Require workflow tokens `chuntris-ranking-core.js`, `/api/chuntris-ranking?mode=classic`, `#chuntris-nickname`, `.chuntris-ranking-rail`, `.chuntris-help-rail`, and all five viewports.

- [ ] **Step 2: Add readiness checks**

Fetch `chuntris-ranking-core.js` and ranking GET. Require HTML ranking IDs and CSS rail classes. Once Production env is configured, require ranking GET 200 with `{mode:'classic',entries:Array}`.

- [ ] **Step 3: Update browser smoke**

Before each Start:

```js
await page.locator('#chuntris-nickname').fill('SmokeTester');
```

At 1280×900 assert bounding-box X order:

```js
const [ranking,left,board,right,help]=await Promise.all(['.chuntris-ranking-rail','.chuntris-left-panel','.chuntris-board-wrap','.chuntris-right-panel','.chuntris-help-rail'].map(s=>page.locator(s).boundingBox()));
assert.ok(ranking&&left&&board&&right&&help);
assert.ok(ranking.x<left.x&&left.x<board.x&&board.x<right.x&&right.x<help.x);
```

Assert score is below HOLD, character below NEXT, NEXT width > HOLD width, reaction width >=120px, and no horizontal overflow at 1280×900, 1280×740, 900×800, 390×844, 360×800.

- [ ] **Step 4: Run all Chuntris regressions**

```bash
node tests/chuntris-production-smoke-source-regression.mjs
for test in tests/chuntris-*-regression.mjs; do node "$test"; done
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/chuntris-production-smoke.yml tests/chuntris-production-smoke-source-regression.mjs
git commit -m "test: cover Chuntris rankings and side rails"
```

---

### Task 7: Upstash/Vercel environment and Preview verification

**Files:** none.

- [ ] **Step 1: Create/select one Upstash Redis database** and copy its REST URL/token without committing or echoing secrets.
- [ ] **Step 2: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`** to Vercel Preview and Production scopes.
- [ ] **Step 3: Wait for exactly one feature-branch Preview deployment**; do not create repeated no-op commits.
- [ ] **Step 4: Verify Preview GET/POST behavior** with a `PreviewSmoke` nickname: first Classic POST updates, lower score does not, higher score does; Sprint 39 lines returns 400; completed 40-line faster record replaces slower record.
- [ ] **Step 5: Verify Preview browser layout** at 1280×900, 1280×740, 900×800, 390×844, 360×800; require nickname gate, TOP 10 rendering, enlarged NEXT/score/character, no white character background, no overflow, no clipped board, and correct mobile order.
- [ ] **Step 6: Remove `PreviewSmoke` directly in the Upstash console** before Production launch; do not create a public delete API.

---

### Task 8: PR, merge, Production verification

**Files:** no new application files expected.

- [ ] **Step 1: Bring current `main` into the feature branch** and preserve all newer Chuntris fixes.
- [ ] **Step 2: Run the focused regression suite:**

```bash
node tests/chuntris-ranking-core-regression.mjs
node tests/chuntris-ranking-api-regression.mjs
node tests/chuntris-ranking-ui-regression.mjs
node tests/chuntris-ui-regression.mjs
node tests/chuntris-responsive-quality-regression.mjs
node tests/chuntris-production-smoke-source-regression.mjs
for test in tests/chuntris-engine-*-regression.mjs; do node "$test"; done
```

- [ ] **Step 3: Open PR** stating that Upstash env is required, ranking is casual/not cheat-proof, gameplay degrades gracefully, and Production retries must respect Hobby limits.
- [ ] **Step 4: Require Site regression, Chuntris regressions, and Vercel Preview Ready** before merge.
- [ ] **Step 5: Squash merge only after Preview and Redis API are validated.**
- [ ] **Step 6: Run Production smoke** and require ranking GET 200, correct five-region desktop order, mobile order, no overflow/clipping, working Classic/Sprint controls, and transparent restored character.
- [ ] **Step 7: Disable the Chuntris deployment watcher** only after Production deploy and Production smoke both succeed.
