# 춘박게임 + 미니게임 허브 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 춘봉 팬사이트에 상위 `미니게임` 허브를 추가하고 기존 춘트리스와 새 수박게임 스타일 `춘박게임`을 연결하며, 춘박게임에 1~11단계 합체 물리·점수·게임오버·전체 TOP 10 랭킹을 제공한다.

**Architecture:** 사이트 정보구조는 `minigames.html` 허브를 중심으로 정리하고 기존 `chuntris.html` 주소는 유지한다. 춘박게임은 `chunbak-game-core.js`의 순수 규칙/점수/스폰 헬퍼와 `chunbak.js`의 Matter.js 물리·DOM/Canvas 런타임을 분리하며, 랭킹은 `chunbak-ranking-core.js` + `lib/chunbak-ranking-api.js`로 분리한 뒤 기존 `/api/content` 멀티플렉서에 `type=chunbak-ranking`으로 연결한다. 현재 저장소의 Node 24 단일-file regression test 패턴을 따르고 새 Vercel Function 엔트리는 만들지 않는다.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Matter.js 0.20.0 vendored static asset, Canvas 2D, Pointer Events, localStorage, Upstash Redis REST API, Node.js 24 regression scripts, GitHub Actions, Playwright 1.55.0 production smoke, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-17-chunbak-minigame-design.md`

## Global Constraints

- 상단 네비게이션의 기존 `춘트리스` 단독 항목은 `미니게임`으로 교체하고 `minigames.html`을 가리킨다.
- 홈 카드 그리드에는 `미니게임` 카드를 노출한다.
- `minigames.html`에는 `춘트리스 → chuntris.html`과 `춘박게임 → chunbak.html` 두 게임 카드를 노출한다.
- 기존 `chuntris.html` URL은 유지하며 직접 접근이 계속 가능해야 한다.
- 춘박게임은 첨부된 11장의 1254×1254 RGBA PNG를 1~11단계로 사용한다.
- 같은 단계 2개가 충돌하면 다음 단계 1개로 합체하고 `11 + 11`은 합체하지 않는다.
- 신규 드롭은 1~5단계만 사용하고 확률은 35%, 27%, 18%, 12%, 8%다.
- 합체 점수는 결과 단계 2~11에 대해 `20, 40, 80, 140, 220, 340, 520, 760, 1080, 1500`이다.
- 연속 합체는 1.25초 이내일 때 combo를 이어가며 combo 보너스는 `min(combo * 10, 100)`으로 계산한다.
- 위험선 위 체류가 약 2초 연속일 때만 게임오버 처리한다.
- 전체 TOP 10 랭킹은 높은 score → 높은 maxLevel → 더 이른 achievedAt 순으로 정렬하고 같은 닉네임은 최고 기록만 보관한다.
- 랭킹 저장은 기존 Upstash Redis 환경변수와 `/api/content` 멀티플렉서를 재사용한다.
- Redis key는 `chunbak:classic:players`다.
- `api/chunbak-ranking.js` 같은 별도 Vercel Function 엔트리를 만들지 않는다.
- 랭킹 API가 실패해도 게임 플레이는 가능해야 한다.
- PC와 모바일 모두 가로 overflow 없이 게임판과 핵심 컨트롤이 viewport 안에서 사용 가능해야 한다.

---

## File Structure

### New files
- `minigames.html` — 미니게임 허브 마크업.
- `minigames.css` — 미니게임 허브 전용 레이아웃/카드.
- `chunbak.html` — 춘박게임 페이지 마크업.
- `chunbak.css` — 춘박게임 데스크톱/모바일 레이아웃.
- `chunbak-game-core.js` — 단계 데이터, 스폰 선택, 합체 판정, 점수/콤보, 위험선 타이머 순수 로직.
- `chunbak-ranking-core.js` — 닉네임 정규화/검증, 기록 검증, better-record, sort.
- `lib/chunbak-ranking-api.js` — GET/POST + Redis 처리.
- `chunbak.js` — Matter.js 월드, 이미지 로딩, 드롭/충돌/합체, 렌더링, 랭킹 UI.
- `assets/vendor/matter-0.20.0.min.js` — Matter.js 0.20.0 브라우저 번들.
- `assets/chunbak/1.png` ... `assets/chunbak/11.png` — 사용자 제공 단계 이미지.
- `tests/minigames-navigation-regression.mjs`
- `tests/chunbak-assets-regression.mjs`
- `tests/chunbak-game-core-regression.mjs`
- `tests/chunbak-ranking-core-regression.mjs`
- `tests/chunbak-ranking-api-regression.mjs`
- `tests/chunbak-ranking-function-budget-regression.mjs`
- `tests/chunbak-ui-regression.mjs`
- `tests/chunbak-runtime-source-regression.mjs`
- `tests/chunbak-ranking-ui-regression.mjs`
- `tests/chunbak-responsive-regression.mjs`
- `tests/chunbak-production-smoke-source-regression.mjs`
- `.github/workflows/chunbak-production-smoke.yml`

### Modified files
- `index.html`, `schedule.html`, `notice.html`, `vod.html`, `clips.html`, `fanart.html`, `tarot.html`, `youtube.html`, `data.html`, `history.html`, `chuntris.html`
- `api/content.js`
- `.github/workflows/site-regression.yml`
- `tests/chuntris-navigation-regression.mjs`

---

### Task 1: 네비게이션을 `미니게임` 허브 구조로 전환

**Files:**
- Create: `tests/minigames-navigation-regression.mjs`, `minigames.html`, `minigames.css`
- Modify: `index.html`, `schedule.html`, `notice.html`, `vod.html`, `clips.html`, `fanart.html`, `tarot.html`, `youtube.html`, `data.html`, `history.html`, `chuntris.html`, `tests/chuntris-navigation-regression.mjs`

**Interfaces:**
- Produces: 모든 주요 페이지의 `<a data-nav="minigames" href="minigames.html">미니게임</a>`.
- Produces: `minigames.html`의 `data-page="minigames"`.
- Produces: 허브 카드 링크 `href="chuntris.html"`, `href="chunbak.html"`.
- `chuntris.html`은 기존 URL/게임 스크립트를 유지하되 `body data-page="minigames"`로 바꾼다.

- [ ] **Step 1: 실패 테스트를 먼저 작성한다**

```js
// tests/minigames-navigation-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris','minigames'];
const link = 'data-nav="minigames" href="minigames.html">미니게임</a>';
for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(link));
  assert.equal(html.includes('data-nav="chuntris" href="chuntris.html">춘트리스</a>'), false);
}
const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(home.includes('<strong>미니게임</strong>'));
const hub = fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');
assert.ok(hub.includes('href="chuntris.html"'));
assert.ok(hub.includes('href="chunbak.html"'));
assert.ok(hub.includes('춘트리스') && hub.includes('춘박게임'));
console.log('minigames navigation regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/minigames-navigation-regression.mjs`

Expected: FAIL because `minigames.html` does not exist/current nav still exposes 춘트리스.

- [ ] **Step 3: 허브/홈 카드/공통 nav를 구현한다**

`minigames.html`은 기존 `styles.css`와 `minigames.css`를 로드한다. 핵심 카드:

```html
<a class="minigame-card" href="chuntris.html"><span>BLOCK PUZZLE</span><strong>춘트리스</strong><p>클래식 무한 · 40줄 타임어택</p><b>플레이 →</b></a>
<a class="minigame-card is-featured" href="chunbak.html"><span>MERGE PUZZLE</span><strong>춘박게임</strong><p>같은 춘봉을 합쳐 11단계까지 키워보세요.</p><b>플레이 →</b></a>
```

홈 portal grid에는:

```html
<a class="portal-card reveal" href="minigames.html"><small>10 / MINI GAME</small><strong>미니게임</strong><p>춘트리스와 춘박게임을 한곳에서 골라 플레이합니다.</p><b>→</b></a>
```

각 주요 HTML의 기존 춘트리스 nav를 `data-nav="minigames" href="minigames.html">미니게임</a>`로 교체하고 `chuntris.html` body를 `data-page="minigames"`로 변경한다.

- [ ] **Step 4: 기존 춘트리스 내비 테스트를 새 구조에 맞춘다**

```js
const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="minigames"'));
assert.ok(chuntris.includes('data-nav="minigames" href="minigames.html">미니게임</a>'));
assert.ok(chuntris.includes('id="chuntris-game"'));
```

- [ ] **Step 5: GREEN을 확인한다**

Run: `node tests/minigames-navigation-regression.mjs && node tests/chuntris-navigation-regression.mjs`

Expected: both exit 0.

- [ ] **Step 6: 커밋한다**

```bash
git add index.html schedule.html notice.html vod.html clips.html fanart.html tarot.html youtube.html data.html history.html chuntris.html minigames.html minigames.css tests/minigames-navigation-regression.mjs tests/chuntris-navigation-regression.mjs
git commit -m "feat: add minigame hub navigation"
```

---

### Task 2: 춘박 11단계 에셋과 순수 게임 규칙을 TDD로 구축

**Files:**
- Create: `assets/chunbak/1.png` ... `assets/chunbak/11.png`, `chunbak-game-core.js`, `tests/chunbak-assets-regression.mjs`, `tests/chunbak-game-core-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- Produces: `globalThis.ChunbakGameCore` + CommonJS export.
- Produces: `STAGES`, `SPAWN_WEIGHTS`, `MERGE_SCORES`, `MAX_STAGE`, `pickSpawnStage(random)`, `mergeResult(aStage,bStage)`, `scoreMerge(resultStage,comboCount)`, `nextCombo(previousMergeAt,nowMs,previousCombo)`, `updateDangerState(...)`.

- [ ] **Step 1: 에셋/규칙 실패 테스트를 작성한다**

```js
// tests/chunbak-game-core-regression.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chunbak-game-core.js');
assert.equal(Core.STAGES.length, 11);
assert.equal(Core.mergeResult(1,1), 2);
assert.equal(Core.mergeResult(10,10), 11);
assert.equal(Core.mergeResult(11,11), null);
assert.equal(Core.mergeResult(2,3), null);
assert.deepEqual(Core.scoreMerge(2,1), {base:20,bonus:10,total:30});
assert.deepEqual(Core.scoreMerge(11,20), {base:1500,bonus:100,total:1600});
assert.equal(Core.nextCombo(1000,2000,2), 3);
assert.equal(Core.nextCombo(1000,2300,2), 1);
const rolls=[0,.349,.35,.619,.62,.799,.80,.919,.92,.999];
assert.deepEqual(rolls.map(v=>Core.pickSpawnStage(()=>v)), [1,1,2,2,3,3,4,4,5,5]);
assert.deepEqual(Core.updateDangerState({startedAt:1000,aboveLine:true,nowMs:3000,thresholdMs:2000}), {startedAt:1000,gameOver:true});
console.log('chunbak game core regression passed');
```

```js
// tests/chunbak-assets-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
for(let level=1;level<=11;level+=1){
  const url=new URL(`../assets/chunbak/${level}.png`,import.meta.url);
  assert.equal(fs.existsSync(url),true);
  const bytes=fs.readFileSync(url);
  assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
  assert.ok(bytes.length>10000);
}
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-assets-regression.mjs; node tests/chunbak-game-core-regression.mjs`

Expected: FAIL because assets/core do not exist.

- [ ] **Step 3: 사용자 PNG 원본 bytes를 1.png~11.png로 저장한다**

Alpha를 flatten/re-encode하지 않고 원본 PNG bytes를 그대로 저장한다.

- [ ] **Step 4: core를 최소 구현한다**

```js
(() => {
  'use strict';
  const MAX_STAGE=11;
  const RADII=[0,22,27,33,40,48,57,67,78,90,103,118];
  const MERGE_SCORES=Object.freeze({2:20,3:40,4:80,5:140,6:220,7:340,8:520,9:760,10:1080,11:1500});
  const SPAWN_WEIGHTS=Object.freeze([.35,.27,.18,.12,.08]);
  const STAGES=Object.freeze(Array.from({length:MAX_STAGE},(_,i)=>Object.freeze({id:i+1,radius:RADII[i+1],image:`assets/chunbak/${i+1}.png`})));
  function pickSpawnStage(random=Math.random){let r=Math.min(.999999999,Math.max(0,Number(random())||0)),c=0;for(let i=0;i<SPAWN_WEIGHTS.length;i+=1){c+=SPAWN_WEIGHTS[i];if(r<c)return i+1;}return 5;}
  function mergeResult(a,b){return a===b&&a>=1&&a<MAX_STAGE?a+1:null;}
  function scoreMerge(stage,combo=1){const base=MERGE_SCORES[stage]||0,bonus=Math.min(Math.max(0,combo)*10,100);return{base,bonus,total:base+bonus};}
  function nextCombo(last,now,combo){return Number.isFinite(last)&&now-last<=1250?Math.max(1,combo+1):1;}
  function updateDangerState({startedAt=null,aboveLine=false,nowMs=0,thresholdMs=2000}){if(!aboveLine)return{startedAt:null,gameOver:false};const start=Number.isFinite(startedAt)?startedAt:nowMs;return{startedAt:start,gameOver:nowMs-start>=thresholdMs};}
  const API={MAX_STAGE,STAGES,SPAWN_WEIGHTS,MERGE_SCORES,pickSpawnStage,mergeResult,scoreMerge,nextCombo,updateDangerState};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  globalThis.ChunbakGameCore=API;
})();
```

- [ ] **Step 5: workflow syntax check와 GREEN을 확인한다**

Add `node --check chunbak-game-core.js` to site regression.

Run: `node --check chunbak-game-core.js && node tests/chunbak-assets-regression.mjs && node tests/chunbak-game-core-regression.mjs`

- [ ] **Step 6: 커밋한다**

```bash
git add assets/chunbak chunbak-game-core.js tests/chunbak-assets-regression.mjs tests/chunbak-game-core-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: add Chunbak stages and game rules"
```

---

### Task 3: 춘박 랭킹 core를 TDD로 구현

**Files:**
- Create: `chunbak-ranking-core.js`, `tests/chunbak-ranking-core-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- `normalizeNickname`, `validateNickname`, `validateRecord`, `isBetterRecord`, `sortRecords`.
- Record: `{mode:'classic',key,displayName,score,maxLevel,achievedAt?}`.

- [ ] **Step 1: 실패 테스트를 작성한다**

```js
const valid=Core.validateRecord({mode:'classic',nickname:'춘봉',score:1200,maxLevel:8});
assert.equal(valid.ok,true);
assert.equal(Core.validateNickname('a').ok,false);
assert.equal(Core.validateNickname('춘봉<script>').ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:-1,maxLevel:8}).ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:100,maxLevel:12}).ok,false);
assert.equal(Core.isBetterRecord('classic',{score:200,maxLevel:5,achievedAt:'2026-09-17T00:00:02.000Z'},{score:200,maxLevel:4,achievedAt:'2026-09-17T00:00:01.000Z'}),true);
assert.deepEqual(Core.sortRecords('classic',[
 {displayName:'B',score:100,maxLevel:5,achievedAt:'2026-09-17T00:00:02.000Z'},
 {displayName:'A',score:200,maxLevel:2,achievedAt:'2026-09-17T00:00:03.000Z'},
 {displayName:'C',score:100,maxLevel:6,achievedAt:'2026-09-17T00:00:03.000Z'},
 {displayName:'D',score:100,maxLevel:6,achievedAt:'2026-09-17T00:00:01.000Z'}
]).map(v=>v.displayName),['A','D','C','B']);
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-ranking-core-regression.mjs`

- [ ] **Step 3: validation/sort를 구현한다**

Exact constraints: name 2..16 chars; allow Korean/English/digits/space/underscore/hyphen; score integer 0..10,000,000; maxLevel integer 1..11; mode only classic. Sort is score desc → maxLevel desc → achievedAt asc. Export CommonJS + `globalThis.ChunbakRankingCore`.

- [ ] **Step 4: GREEN + syntax**

Run: `node --check chunbak-ranking-core.js && node tests/chunbak-ranking-core-regression.mjs`

Add `node --check chunbak-ranking-core.js` to site regression.

- [ ] **Step 5: 커밋한다**

```bash
git add chunbak-ranking-core.js tests/chunbak-ranking-core-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: add Chunbak ranking core"
```

---

### Task 4: 기존 `/api/content`에 춘박 랭킹 API를 멀티플렉싱

**Files:**
- Create: `lib/chunbak-ranking-api.js`, `tests/chunbak-ranking-api-regression.mjs`, `tests/chunbak-ranking-function-budget-regression.mjs`
- Modify: `api/content.js`, `.github/workflows/site-regression.yml`

**Interfaces:**
- GET `/api/content?type=chunbak-ranking&mode=classic` → `{mode:'classic',entries:[...]}`.
- POST `/api/content?type=chunbak-ranking` body `{mode:'classic',nickname,score,maxLevel}`.
- Redis key `chunbak:classic:players`.

- [ ] **Step 1: API/Function-budget 실패 테스트를 작성한다**

Tests must mirror `tests/chuntris-ranking-api-regression.mjs`: in-memory mocked Redis GET/SET, first score update, lower score rejection, same-score higher maxLevel update, invalid nickname 400, non-JSON 415, cross-origin 403, unsupported method 405, KV env fallback and missing-env 503.

Budget test:

```js
import fs from 'node:fs'; import assert from 'node:assert/strict';
assert.equal(fs.existsSync(new URL('../api/chunbak-ranking.js',import.meta.url)),false);
const api=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
assert.ok(api.includes("type==='chunbak-ranking'"));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-ranking-api-regression.mjs; node tests/chunbak-ranking-function-budget-regression.mjs`

- [ ] **Step 3: API library를 구현한다**

Reuse the proven envelope in `lib/chuntris-ranking-api.js`: GET/POST only, Upstash→KV env fallback, same-origin POST, JSON-only POST, GET cache `public, max-age=10, stale-while-revalidate=20`, POST no-store, full-map JSON GET/SET, Top 10 only. `publicEntry` returns `{rank,nickname,score,maxLevel,achievedAt}`.

- [ ] **Step 4: `api/content.js`에 handler를 연결한다**

```js
const handleChunbakRanking = require('../lib/chunbak-ranking-api');
...
if(type==='chuntris-ranking') return handleChuntrisRanking(req,res);
if(type==='chunbak-ranking') return handleChunbakRanking(req,res);
```

- [ ] **Step 5: GREEN을 확인한다**

Add `node --check lib/chunbak-ranking-api.js` to site regression, then run:

```bash
node --check lib/chunbak-ranking-api.js
node --check api/content.js
node tests/chunbak-ranking-core-regression.mjs
node tests/chunbak-ranking-api-regression.mjs
node tests/chunbak-ranking-function-budget-regression.mjs
```

- [ ] **Step 6: 커밋한다**

```bash
git add lib/chunbak-ranking-api.js api/content.js tests/chunbak-ranking-api-regression.mjs tests/chunbak-ranking-function-budget-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: add Chunbak global ranking API"
```

---

### Task 5: 춘박게임 페이지 UI와 Matter.js 의존성을 고정

**Files:**
- Create: `chunbak.html`, `chunbak.css`, `assets/vendor/matter-0.20.0.min.js`, `tests/chunbak-ui-regression.mjs`

**Interfaces:**
- Required IDs: `chunbak-game`, `chunbak-nickname`, `chunbak-start`, `chunbak-restart`, `chunbak-score`, `chunbak-best`, `chunbak-max-level`, `chunbak-ranking-status`, `chunbak-ranking-list`, `chunbak-stage`, `chunbak-canvas`, `chunbak-danger-line`, `chunbak-next`, `chunbak-stage-legend`, `chunbak-overlay`.
- Canvas logical size: 420×680.
- `body data-page="minigames"`; common nav contains `data-nav="minigames"`.

- [ ] **Step 1: 실패 테스트를 작성한다**

```js
const html=fs.readFileSync(new URL('../chunbak.html',import.meta.url),'utf8');
for(const id of ['chunbak-game','chunbak-nickname','chunbak-start','chunbak-restart','chunbak-score','chunbak-best','chunbak-max-level','chunbak-ranking-status','chunbak-ranking-list','chunbak-stage','chunbak-canvas','chunbak-danger-line','chunbak-next','chunbak-stage-legend','chunbak-overlay']) assert.ok(html.includes(`id="${id}"`));
assert.ok(html.includes('data-page="minigames"'));
assert.ok(html.includes('data-nav="minigames" href="minigames.html">미니게임</a>'));
assert.ok(html.includes('assets/vendor/matter-0.20.0.min.js'));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-ui-regression.mjs`

- [ ] **Step 3: Matter.js official 0.20.0 browser bundle을 vendoring한다**

Store as `assets/vendor/matter-0.20.0.min.js`, preserve license header, do not add it to package.json.

- [ ] **Step 4: page shell + responsive CSS를 구현한다**

Script order:

```html
<script src="content.js"></script><script src="page.js"></script>
<script src="assets/vendor/matter-0.20.0.min.js"></script>
<script src="chunbak-game-core.js"></script><script src="chunbak-ranking-core.js"></script><script src="chunbak.js"></script>
```

Desktop game grid: ranking/stats left, 420×680 stage center, NEXT/legend/help right. Mobile ≤900px becomes one column. Stage uses `touch-action:none`; do not mask page overflow globally.

- [ ] **Step 5: GREEN을 확인한다**

Run: `node tests/chunbak-ui-regression.mjs`

- [ ] **Step 6: 커밋한다**

```bash
git add chunbak.html chunbak.css assets/vendor/matter-0.20.0.min.js tests/chunbak-ui-regression.mjs
git commit -m "feat: add Chunbak game page shell"
```

---

### Task 6: Matter.js 물리 런타임과 합체/게임오버를 TDD로 연결

**Files:**
- Create: `chunbak.js`, `tests/chunbak-runtime-source-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- `const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking'`.
- Logical world 420×680; danger line Y 105.
- Body metadata `plugin.chunbak={stage,merging:false}`.
- `createPiece(stage,x,y)`, `dropCurrent()`, `handleCollisionPairs(pairs,nowMs)`, `resetGame()`.

- [ ] **Step 1: source 실패 테스트를 작성한다**

```js
const js=fs.readFileSync(new URL('../chunbak.js',import.meta.url),'utf8');
for(const token of ["const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking'",'Matter.Engine.create','Matter.Bodies.circle','collisionStart','Core.mergeResult','Core.pickSpawnStage','Core.updateDangerState','requestAnimationFrame','pointermove','pointerdown','localStorage']) assert.ok(js.includes(token));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-runtime-source-regression.mjs`

- [ ] **Step 3: Matter world/image preload/createPiece를 구현한다**

Preload all 11 images before start; any failure disables start with `캐릭터 이미지를 불러오지 못했습니다.`. Engine uses gravity y=1.05 and static left/right/floor bodies. Piece body:

```js
function createPiece(stage,x,y){
  const meta=Core.STAGES[stage-1];
  const body=Matter.Bodies.circle(x,y,meta.radius,{restitution:.08,friction:.12,frictionStatic:.35,density:.0017});
  body.plugin.chunbak={stage,merging:false};
  Matter.World.add(world,body); return body;
}
```

- [ ] **Step 4: Pointer Events drop를 구현한다**

`pointermove` maps clientX to logical stage X and clamps by current radius. `pointerdown` drops only while playing and after a 260ms cooldown. New stage uses `Core.pickSpawnStage(Math.random)`.

- [ ] **Step 5: collisionStart merge를 구현한다**

For each pair: read metadata → `Core.mergeResult` → skip null/locked → lock both → midpoint/velocity → remove both → create next stage → apply velocity → update combo through `Core.nextCombo` → add `Core.scoreMerge(...).total` → update maxLevel. Because 11+11 returns null, final-stage pieces remain.

- [ ] **Step 6: 2초 danger/gameover와 Canvas render를 구현한다**

On each RAF, `aboveLine = dynamicBodies.some(body => body.bounds.min.y < 105)`, then `Core.updateDangerState(...thresholdMs:2000)`. Gameover disables drop, shows overlay, saves local best key `chunbak:best:v1`. Canvas draws each PNG centered on body position/angle and a semi-transparent current drop preview.

- [ ] **Step 7: GREEN + syntax**

Add `node --check chunbak.js` to site regression.

Run: `node --check chunbak.js && node tests/chunbak-game-core-regression.mjs && node tests/chunbak-runtime-source-regression.mjs && node tests/chunbak-ui-regression.mjs`

- [ ] **Step 8: 커밋한다**

```bash
git add chunbak.js tests/chunbak-runtime-source-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: implement Chunbak physics gameplay"
```

---

### Task 7: 닉네임·전체 TOP 10 랭킹 UI를 게임 종료 흐름에 연결

**Files:**
- Modify: `chunbak.js`, `chunbak.html`
- Create: `tests/chunbak-ranking-ui-regression.mjs`

**Interfaces:**
- `loadRanking() -> Promise<void>`, `submitRanking() -> Promise<void>`.
- nickname localStorage key `chunbak:nickname:v1`.
- Ranking failure never stops gameplay.

- [ ] **Step 1: 실패 테스트를 작성한다**

```js
assert.ok(js.includes('async function loadRanking'));
assert.ok(js.includes('async function submitRanking'));
assert.ok(js.includes("fetch(`${RANKING_ENDPOINT}&mode=classic`"));
assert.ok(js.includes('chunbak:nickname:v1'));
assert.ok(js.includes('랭킹을 불러올 수 없습니다'));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-ranking-ui-regression.mjs`

- [ ] **Step 3: nickname restore/validate + GET render를 구현한다**

Restore `chunbak:nickname:v1`. Invalid nickname does not block practice play but does block submission with inline status. GET ranking uses `/api/content?type=chunbak-ranking&mode=classic`. Render nickname via `textContent`, not HTML interpolation.

- [ ] **Step 4: gameover POST를 구현한다**

POST `{mode:'classic',nickname:displayName,score,maxLevel}`. Success rerenders returned entries; fetch failure displays `점수는 저장되지 않았지만 게임은 계속 플레이할 수 있습니다.` and never throws into gameplay.

- [ ] **Step 5: GREEN을 확인한다**

Run: `node --check chunbak.js && node tests/chunbak-ranking-ui-regression.mjs && node tests/chunbak-ranking-api-regression.mjs`

- [ ] **Step 6: 커밋한다**

```bash
git add chunbak.js chunbak.html tests/chunbak-ranking-ui-regression.mjs
git commit -m "feat: connect Chunbak leaderboard UI"
```

---

### Task 8: responsive 품질과 전체 Site regression을 통합

**Files:**
- Create: `tests/chunbak-responsive-regression.mjs`
- Modify: `chunbak.css`, `.github/workflows/site-regression.yml`
- Modify `tests/multipage-smoke.mjs` only if it has an explicit page allowlist.

- [ ] **Step 1: responsive 실패 테스트를 작성한다**

```js
const css=fs.readFileSync(new URL('../chunbak.css',import.meta.url),'utf8');
assert.ok(css.includes('grid-template-columns'));
assert.ok(css.includes('@media(max-width:900px)')||css.includes('@media (max-width: 900px)'));
assert.ok(css.includes('min(100%,420px)')||css.includes('min(100%, 420px)'));
assert.equal(css.includes('overflow-x:hidden'),false);
assert.ok(css.includes('touch-action:none')||css.includes('touch-action: none'));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-responsive-regression.mjs`

Expected: FAIL on an explicitly missing responsive contract. If it unexpectedly passes, add an assertion for a real missing mobile contract before modifying production CSS.

- [ ] **Step 3: CSS를 최소 수정한다**

Use `.chunbak-stage{width:min(100%,420px);aspect-ratio:420/680;}`; desktop 3 columns; ≤900px one column; ≤520px page padding ≤12px; canvas `display:block;width:100%;height:100%`.

- [ ] **Step 4: 전체 regression + syntax checks를 실행한다**

```bash
set -e
for file in tests/*.mjs; do echo "==> $file"; node "$file"; done
node --check chunbak-game-core.js
node --check chunbak-ranking-core.js
node --check lib/chunbak-ranking-api.js
node --check chunbak.js
node --check api/content.js
```

- [ ] **Step 5: 커밋한다**

```bash
git add chunbak.css tests/chunbak-responsive-regression.mjs .github/workflows/site-regression.yml
git commit -m "test: cover Chunbak responsive integration"
```

If `tests/multipage-smoke.mjs` has an explicit page list, update it in this same task and include that exact file in the commit.

---

### Task 9: 전용 Production smoke로 실제 운영 페이지를 검증

**Files:**
- Create: `.github/workflows/chunbak-production-smoke.yml`, `tests/chunbak-production-smoke-source-regression.mjs`

**Interfaces:**
- Base URL `https://chunbong-fansite.vercel.app`.
- Viewports: desktop 1440×900, mobile 390×844.
- API smoke uses GET + invalid POST only, so ranking is not polluted.

- [ ] **Step 1: workflow source 실패 테스트를 작성한다**

```js
const yml=fs.readFileSync(new URL('../.github/workflows/chunbak-production-smoke.yml',import.meta.url),'utf8');
for(const token of ['chunbak.html','minigames.html','assets/chunbak/11.png','type=chunbak-ranking','1440','390','playwright']) assert.ok(yml.includes(token));
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chunbak-production-smoke-source-regression.mjs`

- [ ] **Step 3: workflow를 구현한다**

Use Node 24 and:

```bash
npm install --no-save playwright@1.55.0
npx playwright install --with-deps chromium
curl -fsS https://chunbong-fansite.vercel.app/minigames.html >/dev/null
curl -fsS https://chunbong-fansite.vercel.app/chunbak.html >/dev/null
for n in $(seq 1 11); do curl -fsS "https://chunbong-fansite.vercel.app/assets/chunbak/$n.png" >/dev/null; done
curl -fsS 'https://chunbong-fansite.vercel.app/api/content?type=chunbak-ranking&mode=classic' >/tmp/chunbak-ranking.json
```

Invalid POST must return 400:

```bash
status=$(curl -sS -o /tmp/chunbak-invalid.json -w '%{http_code}' -H 'content-type: application/json' -H 'origin: https://chunbong-fansite.vercel.app' -X POST --data '{"mode":"classic","nickname":"x","score":1,"maxLevel":1}' 'https://chunbong-fansite.vercel.app/api/content?type=chunbak-ranking')
test "$status" = "400"
```

Playwright must verify hub links, no horizontal overflow at both viewports, canvas within viewport, nickname fill/start, one pointer drop, non-idle status, restart returns score to 0.

- [ ] **Step 4: GREEN을 확인한다**

Run: `node tests/chunbak-production-smoke-source-regression.mjs`

- [ ] **Step 5: 커밋한다**

```bash
git add .github/workflows/chunbak-production-smoke.yml tests/chunbak-production-smoke-source-regression.mjs
git commit -m "ci: add Chunbak production smoke"
```

---

### Task 10: 최종 회귀 검증, 배포 상태, 운영 smoke 확인

**Files:**
- No new production file by default; modify only files implicated by a failing verification.

- [ ] **Step 1: 전체 regression + application JS syntax를 다시 실행한다**

```bash
set -e
for file in tests/*.mjs; do node "$file"; done
node --check chunbak-game-core.js
node --check chunbak-ranking-core.js
node --check lib/chunbak-ranking-api.js
node --check chunbak.js
node --check api/content.js
node --check chuntris-engine.js
node --check chuntris-ranking-core.js
node --check chuntris.js
```

- [ ] **Step 2: working tree를 검토한다**

```bash
git status --short
git diff --check
git log --oneline -10
```

Verify: no accidental `api/chunbak-ranking.js`, stage assets exactly 1.png~11.png, no unrelated changes.

- [ ] **Step 3: final production commit의 GitHub/Vercel checks를 확인한다**

Required fresh success: `Site regression`, Vercel combined status, `Chunbak production smoke`.

- [ ] **Step 4: 운영 URL을 직접 확인한다**

- `https://chunbong-fansite.vercel.app/minigames.html`
- `https://chunbong-fansite.vercel.app/chunbak.html`
- `https://chunbong-fansite.vercel.app/chuntris.html`
- `https://chunbong-fansite.vercel.app/api/content?type=chunbak-ranking&mode=classic`

Verify home/top nav → 미니게임, hub → both games, existing Chuntris works, Chunbak loads all 11 images, drop/merge/restart work, stage 11 is terminal, ranking GET is valid, invalid POST does not insert a record.

- [ ] **Step 5: verification defect가 있었다면 실제 수정 파일만 별도 커밋하고 Steps 1-4를 반복한다**

For example, if only responsive CSS/test needed fixing:

```bash
git status --short
git add chunbak.css tests/chunbak-responsive-regression.mjs
git commit -m "fix: resolve Chunbak production verification"
```

For a different defect, stage only the concrete files shown by `git status --short` that were changed for that defect; do not reuse the example filenames mechanically.
