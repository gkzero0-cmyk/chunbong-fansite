# Chunbak Immersive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Chunbak so it starts from a compact optional-nickname screen, keeps GLOBAL TOP 10 visible during play, adds Chuntris-style utility/pause modals, preserves local-only anonymous records, and adds cute stage-aware merge audio, particles, and time-based COMBO feedback.

**Architecture:** Keep the existing Matter.js 420×680 physics world, ranking endpoint, score formula, 11 stage assets, and danger-line rules unchanged. `chunbak.js` becomes the coordinator for explicit `start / playing / paused / gameover` UI states, shared ranking data, utility-modal pause/resume, and presentation events. `chunbak-audio.js` remains an independent Web Audio module but gains `playMerge(stage, combo)`. Merge effects are DOM/CSS presentation layers positioned from physics coordinates and never modify Matter bodies.

**Tech Stack:** Static HTML/CSS/JavaScript, Matter.js 0.20.0, Web Audio API, Node.js 24 regression scripts, Playwright 1.55.0 in GitHub Actions, Vercel production.

**Spec:** `docs/superpowers/specs/2026-09-17-chunbak-immersive-ui-design.md`

## Global Constraints

- Keep logical physics coordinates exactly `420 × 680`.
- Keep 11 stage images and merge progression unchanged.
- Keep danger threshold at approximately 2 seconds and preserve per-body danger tracking.
- Keep ranking endpoint `/api/content?type=chunbak-ranking` and mode `classic`.
- Keep existing base scores and combo bonus formula.
- Empty nickname is valid for play but must never POST to the global leaderboard.
- A non-empty invalid nickname must not block play; it only disables global submission and may show an explanatory ranking status.
- Combo uses the existing 1250ms `Core.nextCombo()` rule across drops.
- Show combo text only from `COMBO x2` upward.
- Left `SCORE / BEST / MAX` and `GLOBAL TOP 10` remain visible during desktop play.
- Utility modals opened while playing auto-pause and auto-resume only if the pre-modal state was playing.
- Manual pause never auto-resumes when a nested utility panel closes.
- Pause duration must not consume danger-line or combo timing.
- Preserve `chunbak.sound.enabled.v1` and `chunbak.sound.volume.v1`.
- Support `prefers-reduced-motion: reduce`.

---

## File Structure

**Modify**
- `chunbak.html` — start/play views, utility buttons, shared modal, FX layers, persistent TOP 10 markup.
- `chunbak.css` — immersive 3-column layout, start card, modal/bottom-sheet, particle/combo animations, responsive rules.
- `chunbak.js` — state transitions, optional nickname policy, shared ranking state, pause/resume timing compensation, modal coordination, merge presentation hooks.
- `chunbak-audio.js` — cute casual sound palette and `playMerge(stage, combo)`.
- `tests/chunbak-audio-regression.mjs` — new audio API and persistence contract.
- `tests/chunbak-ranking-ui-regression.mjs` — anonymous/local-only and shared ranking contract.
- `.github/workflows/chunbak-production-smoke.yml` — production behavior and responsive browser smoke.
- `tests/chunbak-production-smoke-source-regression.mjs` — source contract for the new production smoke.

**Create**
- `tests/chunbak-immersive-state-regression.mjs` — start/play view, utility controls, pause/continue/new-game source contract.
- `tests/chunbak-pause-timing-regression.mjs` — pause-duration compensation contract.
- `tests/chunbak-effects-regression.mjs` — merge tiers, COMBO x2+, reduced-motion, FX coordinates.
- `.github/workflows/chunbak-preview-live-smoke.yml` — Playwright preview verification before merge.

No API or asset files should be changed for this feature.

---

### Task 1: Start View, Play View, and Optional Nickname Policy

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.js`
- Modify: `chunbak.css`
- Create: `tests/chunbak-immersive-state-regression.mjs`
- Modify: `tests/chunbak-ranking-ui-regression.mjs`

**Interfaces:**
- Produces DOM IDs: `chunbak-start-view`, `chunbak-play-view`, `chunbak-start`, `chunbak-nickname`.
- Produces runtime helpers: `setView(state)`, `getNicknameState()`, `submitRanking()` with anonymous short-circuit.
- Later tasks depend on `gameState` values `start`, `playing`, `paused`, `gameover`.

- [ ] **Step 1: Write the failing immersive state test**

Create `tests/chunbak-immersive-state-regression.mjs` with assertions equivalent to:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

for (const token of [
  'id="chunbak-start-view"',
  'id="chunbak-play-view"',
  'id="chunbak-nickname"',
  'id="chunbak-start"'
]) assert.ok(html.includes(token), `missing ${token}`);

assert.ok(js.includes("let gameState = 'start'"));
assert.ok(js.includes('function setView('));
assert.ok(js.includes("kind: 'anonymous'"));
assert.ok(js.includes("kind: 'valid'"));
assert.ok(js.includes("kind: 'invalid'"));
assert.ok(js.includes("nicknameState.kind !== 'valid'"));
assert.ok(html.includes('닉네임 (선택)'));
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node tests/chunbak-immersive-state-regression.mjs
```

Expected: FAIL because start/play views and explicit state helpers do not exist yet.

- [ ] **Step 3: Replace the toolbar-first HTML with start/play views**

Use this structural contract in `chunbak.html`:

```html
<section id="chunbak-start-view" class="chunbak-start-view">
  <div class="chunbak-start-card">
    <p class="eyebrow">MERGE PUZZLE</p>
    <h2>춘박게임</h2>
    <label for="chunbak-nickname">
      <span>닉네임 (선택)</span>
      <input id="chunbak-nickname" maxlength="16" autocomplete="nickname"
             placeholder="비워두면 로컬 기록만 저장">
    </label>
    <button id="chunbak-start" class="btn btn-primary" type="button" disabled>게임 시작</button>
    <div class="chunbak-start-utils">
      <button type="button" data-chunbak-open="ranking">🏆 전체 랭킹</button>
      <button type="button" data-chunbak-open="sound">🔊 소리 설정</button>
      <button type="button" data-chunbak-open="controls">⌨ 조작법</button>
    </div>
  </div>
</section>
<section id="chunbak-play-view" class="chunbak-play-view" hidden>
  <!-- Task 2 will fill the final 3-column play structure -->
</section>
```

Keep `#chunbak-start` disabled until all 11 images preload.

- [ ] **Step 4: Implement explicit state and nickname classification in `chunbak.js`**

Use this behavior:

```js
let gameState = 'start';

function setView(state) {
  gameState = state;
  startView.hidden = state !== 'start';
  playView.hidden = state === 'start';
  root.dataset.gameStatus = state;
}

function getNicknameState() {
  const raw = RankingCore.normalizeNickname(nicknameInput.value);
  if (!raw) return { kind:'anonymous' };
  const validation = RankingCore.validateNickname(raw);
  return validation.ok
    ? { kind:'valid', displayName:validation.displayName }
    : { kind:'invalid' };
}
```

At game start, store the nickname only when `kind === 'valid'`; never block play for anonymous or invalid input.

- [ ] **Step 5: Make ranking submission local-only for anonymous/invalid input**

At the top of `submitRanking()`:

```js
const nicknameState = getNicknameState();
if (nicknameState.kind === 'anonymous') {
  rankingStatus.textContent = '로컬 최고 기록만 저장되었습니다.';
  return;
}
if (nicknameState.kind === 'invalid') {
  rankingStatus.textContent = '전체 랭킹은 2~16자 닉네임을 입력한 기록만 등록됩니다.';
  return;
}
```

POST only `nicknameState.displayName` for the valid branch.

- [ ] **Step 6: Update ranking regression for anonymous policy**

Add source assertions to `tests/chunbak-ranking-ui-regression.mjs` for:

```js
assert.ok(js.includes("nicknameState.kind === 'anonymous'"));
assert.ok(js.includes('로컬 최고 기록만 저장되었습니다.'));
assert.ok(js.includes("nicknameState.kind === 'invalid'"));
```

- [ ] **Step 7: Run focused regressions**

Run:

```bash
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-ranking-ui-regression.mjs
node tests/chunbak-ranking-core-regression.mjs
node tests/chunbak-asset-gate-regression.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add chunbak.html chunbak.css chunbak.js tests/chunbak-immersive-state-regression.mjs tests/chunbak-ranking-ui-regression.mjs
git commit -m "feat: add Chunbak immersive start flow"
```

---

### Task 2: Persistent TOP 10, Utility Buttons, and Shared Modal

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.css`
- Modify: `chunbak.js`
- Modify: `tests/chunbak-immersive-state-regression.mjs`

**Interfaces:**
- Produces shared ranking state `rankingEntries`.
- Produces `renderRankingList(target, entries)` and `renderRankings()`.
- Produces `openUtilityModal(panelName)` and `closeUtilityModal()`; pause semantics are completed in Task 3.
- DOM IDs: `chunbak-modal`, `chunbak-modal-title`, `chunbak-modal-close`, `chunbak-ranking-list`, `chunbak-ranking-modal-list`, `chunbak-sound`, `chunbak-volume`, `chunbak-pause`.

- [ ] **Step 1: Extend the failing state test**

Require these tokens:

```js
for (const token of [
  'id="chunbak-ranking-list"',
  'id="chunbak-ranking-modal-list"',
  'id="chunbak-modal"',
  'id="chunbak-sound"',
  'id="chunbak-volume"',
  'id="chunbak-pause"',
  'data-chunbak-open="ranking"',
  'data-chunbak-open="sound"',
  'data-chunbak-open="controls"'
]) assert.ok(html.includes(token), `missing ${token}`);

assert.ok(js.includes('let rankingEntries = []'));
assert.ok(js.includes('function renderRankings('));
assert.ok(js.includes('function openUtilityModal('));
assert.ok(js.includes('function closeUtilityModal('));
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node tests/chunbak-immersive-state-regression.mjs
```

- [ ] **Step 3: Build the final desktop play layout**

Structure `#chunbak-play-view` as:

```html
<div class="chunbak-play-top">
  <p class="chunbak-play-status" aria-live="polite">같은 단계를 합쳐 11단계까지 키워보세요.</p>
  <div class="chunbak-utility-cluster">
    <button type="button" data-chunbak-open="ranking" aria-label="전체 랭킹">🏆</button>
    <button type="button" data-chunbak-open="sound" aria-label="소리 설정">🔊</button>
    <button type="button" data-chunbak-open="controls" aria-label="조작법">⌨</button>
    <button id="chunbak-pause" type="button" aria-label="일시정지">⏸</button>
  </div>
</div>
<div class="chunbak-layout chunbak-layout-immersive">
  <aside class="chunbak-left">
    <div class="chunbak-stats">...</div>
    <section class="chunbak-ranking">...
      <ol id="chunbak-ranking-list"></ol>
    </section>
  </aside>
  <div class="chunbak-center">...</div>
  <aside class="chunbak-right">
    <section class="chunbak-next-card">...</section>
    <section class="chunbak-evolution">...</section>
  </aside>
</div>
```

Do not keep the old always-visible controls panel.

- [ ] **Step 4: Add one shared modal container**

Use one `role="dialog"` shell with panels selected via `data-chunbak-panel`:

```html
<div id="chunbak-modal" class="chunbak-modal" role="dialog" aria-modal="true"
     aria-labelledby="chunbak-modal-title" hidden>
  <div class="chunbak-modal-backdrop" data-chunbak-close></div>
  <section class="chunbak-modal-card">
    <header>
      <h2 id="chunbak-modal-title">춘박게임</h2>
      <button id="chunbak-modal-close" type="button" aria-label="닫기">×</button>
    </header>
    <div class="chunbak-modal-body">
      <section data-chunbak-panel="ranking" hidden>
        <p id="chunbak-ranking-modal-status"></p>
        <ol id="chunbak-ranking-modal-list"></ol>
      </section>
      <section data-chunbak-panel="sound" hidden>
        <button id="chunbak-sound" type="button" aria-pressed="true">효과음 ON</button>
        <label>볼륨 <input id="chunbak-volume" type="range" min="0" max="100" step="1" value="70"></label>
      </section>
      <section data-chunbak-panel="controls" hidden>...</section>
      <section data-chunbak-panel="pause" hidden>...</section>
    </div>
  </section>
</div>
```

- [ ] **Step 5: Share one ranking result between persistent and modal lists**

Refactor ranking rendering to:

```js
let rankingEntries = [];

function renderRankingList(target, entries) {
  // build the same rank/name/score/Lv rows for the supplied target
}

function renderRankings() {
  renderRankingList(rankingList, rankingEntries);
  renderRankingList(rankingModalList, rankingEntries);
}
```

`loadRanking()` and successful `submitRanking()` assign `rankingEntries = payload.entries || []` and call `renderRankings()`.

- [ ] **Step 6: Add CSS for the 3-column layout and modal**

Desktop contract:

```css
.chunbak-layout-immersive{
  display:grid;
  grid-template-columns:minmax(210px,280px) minmax(0,460px) minmax(210px,280px);
  grid-template-areas:"left center right";
  justify-content:center;
  align-items:start;
  gap:18px;
}
.chunbak-modal[hidden],.chunbak-start-view[hidden],.chunbak-play-view[hidden]{display:none!important}
```

Keep the game stage aspect ratio `420 / 680`; enlarge only through CSS width.

- [ ] **Step 7: Run focused tests**

```bash
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-ranking-ui-regression.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add chunbak.html chunbak.css chunbak.js tests/chunbak-immersive-state-regression.mjs
git commit -m "feat: add Chunbak utility modal and persistent ranking"
```

---

### Task 3: Pause/Resume, ESC, New Game, and Time Compensation

**Files:**
- Modify: `chunbak.js`
- Modify: `chunbak.html`
- Create: `tests/chunbak-pause-timing-regression.mjs`
- Modify: `tests/chunbak-immersive-state-regression.mjs`

**Interfaces:**
- Produces `pauseGame(reason)`, `resumeGame()`, `openPauseMenu()`, `openUtilityModal(panelName)`, `closeUtilityModal()`.
- Maintains `pausedAt`, `resumeAfterUtility`, and `gameState`.
- Exposes testable debug methods on `globalThis.ChunbakGame`: `pauseGame`, `resumeGame`, `getDebugState`.

- [ ] **Step 1: Write the failing pause timing test**

Create `tests/chunbak-pause-timing-regression.mjs` as a source contract:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const token of [
  'function pauseGame(',
  'function resumeGame(',
  'pausedAt',
  'resumeAfterUtility',
  'dangerStartedAtById',
  'lastMergeAt',
  'lastFrameAt = performance.now()',
  "event.key === 'Escape'"
]) assert.ok(js.includes(token), `missing ${token}`);
assert.ok(js.includes('startedAt + pauseDuration'));
assert.ok(js.includes('lastMergeAt + pauseDuration'));
```

- [ ] **Step 2: Run and verify RED**

```bash
node tests/chunbak-pause-timing-regression.mjs
```

- [ ] **Step 3: Implement manual pause/resume**

Use this state behavior:

```js
let pausedAt = null;
let resumeAfterUtility = false;

function pauseGame(reason = 'manual') {
  if (gameState !== 'playing') return false;
  pausedAt = performance.now();
  gameState = 'paused';
  playing = false;
  root.dataset.gameStatus = 'paused';
  return true;
}

function resumeGame() {
  if (gameState !== 'paused') return false;
  const now = performance.now();
  const pauseDuration = pausedAt == null ? 0 : Math.max(0, now - pausedAt);
  if (Number.isFinite(lastMergeAt)) lastMergeAt += pauseDuration;
  dangerStartedAtById = Object.fromEntries(
    Object.entries(dangerStartedAtById).map(([id, startedAt]) => [id, startedAt + pauseDuration])
  );
  pausedAt = null;
  lastFrameAt = performance.now();
  gameState = 'playing';
  playing = true;
  root.dataset.gameStatus = 'playing';
  return true;
}
```

- [ ] **Step 4: Stop danger evaluation from clearing timers while paused**

Replace the existing `if (!playing) { dangerStartedAtById = {}; return; }` behavior. Use:

```js
if (gameState === 'paused') return;
if (gameState !== 'playing') {
  dangerStartedAtById = {};
  return;
}
```

This is required so pause/resume compensation has state to shift.

- [ ] **Step 5: Implement utility-modal auto-pause semantics**

```js
function openUtilityModal(panelName) {
  resumeAfterUtility = gameState === 'playing';
  if (resumeAfterUtility) pauseGame('utility');
  showModalPanel(panelName);
}

function closeUtilityModal() {
  hideModal();
  const shouldResume = resumeAfterUtility;
  resumeAfterUtility = false;
  if (shouldResume && gameState === 'paused') resumeGame();
}
```

When the pause menu opens `sound` or `controls`, set `resumeAfterUtility = false` so closing those nested panels returns to pause instead of gameplay.

- [ ] **Step 6: Wire ESC and pause buttons**

Behavior:
- If a non-pause utility panel is open: ESC closes it.
- Else if `gameState === 'playing'`: ESC opens the pause panel and pauses.
- Else if pause panel is open: ESC continues the current game.
- `계속하기` calls `resumeGame()`.
- `새 게임` closes the modal and calls `resetGame({autoStart:true})` without changing nickname/audio settings.

- [ ] **Step 7: Update the debug API for browser smoke**

Expose:

```js
globalThis.ChunbakGame = Object.freeze({
  createPiece,
  dropCurrent,
  handleCollisionPairs,
  resetGame,
  pauseGame,
  resumeGame,
  getDebugState: () => ({ gameState, score, combo, maxLevel, currentStage, nextStage })
});
```

- [ ] **Step 8: Run regressions**

```bash
node tests/chunbak-pause-timing-regression.mjs
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-a-danger-tracker-regression.mjs
node tests/chunbak-game-core-regression.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add chunbak.html chunbak.js tests/chunbak-pause-timing-regression.mjs tests/chunbak-immersive-state-regression.mjs
git commit -m "feat: add Chunbak pause and utility resume flow"
```

---

### Task 4: Cute Web Audio Palette and Stage-Aware Merge Sounds

**Files:**
- Modify: `chunbak-audio.js`
- Modify: `chunbak.js`
- Modify: `tests/chunbak-audio-regression.mjs`

**Interfaces:**
- `ChunbakAudio.play(name)` continues to support `start`, `drop`, `gameover`.
- New `ChunbakAudio.playMerge(stage, combo)` accepts integer stage `2..11` and combo `>=1`.
- Existing `setEnabled`, `setVolume`, `getSettings`, localStorage keys remain unchanged.

- [ ] **Step 1: Update the audio test to require the new API**

Replace the old runtime expectation for direct `merge/highmerge` calls with:

```js
assert.equal(typeof sandbox.ChunbakAudio.playMerge, 'function');
assert.ok(source.includes('function playMerge(stage, combo')); 
assert.ok(source.includes('chunbak.sound.enabled.v1'));
assert.ok(source.includes('chunbak.sound.volume.v1'));

const game = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const cue of ['start', 'drop', 'gameover']) {
  assert.ok(game.includes(`Audio.play('${cue}')`));
}
assert.ok(game.includes('Audio.playMerge(resultStage, combo)'));
```

Retain persistence assertions for enabled/volume.

- [ ] **Step 2: Run audio test and verify RED**

```bash
node tests/chunbak-audio-regression.mjs
```

- [ ] **Step 3: Implement cute short-envelope synthesis**

Keep `tone()` but add a higher-level merge API:

```js
function playMerge(stage, combo = 1) {
  if (!enabled || !context) return;
  const safeStage = Math.min(11, Math.max(2, Math.trunc(Number(stage) || 2)));
  const safeCombo = Math.max(1, Math.trunc(Number(combo) || 1));
  const base = 300 + safeStage * 28 + Math.min(safeCombo - 1, 5) * 12;

  if (safeStage <= 4) {
    tone(base, 0.055, 'sine', 0.07);
    tone(base * 1.5, 0.07, 'triangle', 0.05, 0.025);
  } else if (safeStage <= 7) {
    tone(base, 0.06, 'triangle', 0.075);
    tone(base * 1.25, 0.075, 'sine', 0.065, 0.035);
  } else if (safeStage <= 10) {
    tone(base, 0.065, 'triangle', 0.08);
    tone(base * 1.25, 0.08, 'triangle', 0.075, 0.035);
    tone(base * 1.5, 0.11, 'sine', 0.07, 0.075);
  } else {
    tone(660, 0.08, 'triangle', 0.09);
    tone(880, 0.10, 'triangle', 0.085, 0.05);
    tone(1100, 0.14, 'sine', 0.08, 0.11);
  }
}
```

Also soften `drop`, `start`, and `gameover`: short sine/triangle notes, no harsh sawtooth game-over stack.

- [ ] **Step 4: Switch merge runtime calls**

In `handleCollisionPairs()` replace `merge/highmerge` branching with:

```js
Audio.playMerge(resultStage, combo);
```

- [ ] **Step 5: Run tests**

```bash
node tests/chunbak-audio-regression.mjs
node tests/chunbak-game-core-regression.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add chunbak-audio.js chunbak.js tests/chunbak-audio-regression.mjs
git commit -m "feat: add cute stage-aware Chunbak audio"
```

---

### Task 5: Merge Particles and COMBO x2+ Feedback

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.css`
- Modify: `chunbak.js`
- Create: `tests/chunbak-effects-regression.mjs`

**Interfaces:**
- DOM IDs: `chunbak-fx-layer`, `chunbak-combo`.
- Runtime helpers: `showMergeEffect({x,y,stage,combo})`, `showCombo(combo,x,y)`.
- Coordinates are physics-space values and must be converted to percentages with `x / WIDTH * 100` and `y / HEIGHT * 100`.

- [ ] **Step 1: Write the failing effects test**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chunbak.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

for (const token of ['id="chunbak-fx-layer"','id="chunbak-combo"']) {
  assert.ok(html.includes(token), `missing ${token}`);
}
for (const token of ['function showMergeEffect(', 'function showCombo(', 'COMBO x${combo}', 'Audio.playMerge(resultStage, combo)']) {
  assert.ok(js.includes(token), `missing ${token}`);
}
for (const token of ['chunbak-merge-ring','chunbak-particle','tier-low','tier-mid','tier-high','tier-final','prefers-reduced-motion']) {
  assert.ok(css.includes(token), `missing ${token}`);
}
```

- [ ] **Step 2: Run and verify RED**

```bash
node tests/chunbak-effects-regression.mjs
```

- [ ] **Step 3: Add presentation layers inside `#chunbak-stage`**

```html
<div id="chunbak-fx-layer" class="chunbak-fx-layer" aria-hidden="true"></div>
<div id="chunbak-combo" class="chunbak-combo" aria-live="polite" aria-atomic="true"></div>
```

They must sit above the canvas but below the game-over overlay and use `pointer-events:none`.

- [ ] **Step 4: Implement tiered merge effects**

Use tier selection:

```js
function effectTier(stage) {
  if (stage <= 4) return 'low';
  if (stage <= 7) return 'mid';
  if (stage <= 10) return 'high';
  return 'final';
}
```

`showMergeEffect({x,y,stage,combo})` must:
- compute `left = x / WIDTH * 100` and `top = y / HEIGHT * 100`;
- create one ring at every tier;
- create 4 particles for low, 7 for mid, 10 for high, 14 plus crown/confetti markers for final;
- remove transient nodes on `animationend` and also with a timeout fallback under 1500ms.

Use symbols/classes such as `✦`, `★`, `♥` through `textContent`; do not use remote images.

- [ ] **Step 5: Implement COMBO x2+**

```js
function showCombo(combo, x, y) {
  if (combo < 2) return;
  comboNode.textContent = `COMBO x${combo}`;
  comboNode.style.setProperty('--combo-x', `${(x / WIDTH) * 100}%`);
  comboNode.style.setProperty('--combo-y', `${(y / HEIGHT) * 100}%`);
  comboNode.classList.remove('is-visible');
  void comboNode.offsetWidth;
  comboNode.classList.add('is-visible');
}
```

Call both presentation functions immediately after score/combo calculation in `handleCollisionPairs()`.

- [ ] **Step 6: Add CSS animations with reduced-motion fallback**

Required classes:

```css
.chunbak-fx-layer,.chunbak-combo{position:absolute;inset:0;pointer-events:none}
.chunbak-merge-ring{position:absolute;left:var(--fx-x);top:var(--fx-y);...}
.chunbak-particle{position:absolute;left:var(--fx-x);top:var(--fx-y);...}
.chunbak-combo.is-visible{animation:chunbakComboPop .8s ease both}
@media(prefers-reduced-motion:reduce){
  .chunbak-merge-ring,.chunbak-particle{animation-duration:.16s;transform:none}
  .chunbak-combo.is-visible{animation-duration:.35s}
}
```

- [ ] **Step 7: Run tests**

```bash
node tests/chunbak-effects-regression.mjs
node tests/chunbak-game-core-regression.mjs
node tests/chunbak-audio-regression.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add chunbak.html chunbak.css chunbak.js tests/chunbak-effects-regression.mjs
git commit -m "feat: add Chunbak merge effects and combo feedback"
```

---

### Task 6: Responsive Layout and Preview Browser Smoke

**Files:**
- Modify: `chunbak.css`
- Create: `.github/workflows/chunbak-preview-live-smoke.yml`
- Modify: `tests/chunbak-immersive-state-regression.mjs`

**Interfaces:**
- Desktop: left stats/TOP10, center stage, right NEXT/EVOLUTION.
- Mobile order: utility/status → stats → game stage → NEXT → TOP10 → EVOLUTION.
- Preview smoke must test `1440×900`, `1024×768`, and `390×844`.

- [ ] **Step 1: Add source assertions for responsive contracts**

Require CSS tokens:

```js
const css = fs.readFileSync(new URL('../chunbak.css', import.meta.url), 'utf8');
for (const token of [
  '.chunbak-layout-immersive',
  '@media (max-width:900px)',
  '@media (max-width:520px)',
  '.chunbak-utility-cluster',
  '.chunbak-modal-card'
]) assert.ok(css.includes(token), `missing ${token}`);
```

- [ ] **Step 2: Run source test and verify any missing contract is RED**

```bash
node tests/chunbak-immersive-state-regression.mjs
```

- [ ] **Step 3: Implement mobile ordering and bottom-sheet modal**

At `max-width:900px`, set the immersive grid to one column and explicit order. At `max-width:520px`, use full-width modal bottom sheet:

```css
@media (max-width:900px){
  .chunbak-layout-immersive{grid-template-columns:1fr;grid-template-areas:"left" "center" "right"}
  .chunbak-center{order:2}
  .chunbak-stats{order:1}
  .chunbak-next-card{order:3}
  .chunbak-ranking{order:4}
  .chunbak-evolution{order:5}
  .chunbak-stage{width:min(calc(100vw - 28px),460px)}
}
@media (max-width:520px){
  .chunbak-modal{align-items:end;padding:0}
  .chunbak-modal-card{width:100%;max-height:88dvh;border-radius:22px 22px 0 0}
}
```

Use CSS ordering so persistent TOP 10 stays after NEXT on mobile.

- [ ] **Step 4: Create `chunbak-preview-live-smoke.yml`**

Trigger on PRs to `main` when Chunbak files, tests, or this workflow change. Copy the proven Vercel preview resolution pattern from `chuntris-preview-live-smoke.yml`, then use Playwright assertions equivalent to:

```js
for (const viewport of [
  {width:1440,height:900},
  {width:1024,height:768},
  {width:390,height:844}
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${preview}/chunbak.html`, { waitUntil:'networkidle' });
  await page.waitForFunction(() => !document.querySelector('#chunbak-start')?.disabled);
  assert.equal(await page.locator('#chunbak-play-view').isHidden(), true);
  await page.locator('#chunbak-start').click(); // nickname intentionally blank
  assert.equal(await page.locator('#chunbak-start-view').isHidden(), true);
  assert.equal(await page.locator('#chunbak-play-view').isVisible(), true);
  assert.ok(await page.locator('#chunbak-ranking-list').count());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

  await page.locator('[data-chunbak-open="ranking"]').first().click();
  assert.equal((await page.evaluate(() => ChunbakGame.getDebugState().gameState)), 'paused');
  await page.locator('#chunbak-modal-close').click();
  assert.equal((await page.evaluate(() => ChunbakGame.getDebugState().gameState)), 'playing');

  await page.keyboard.press('Escape');
  assert.equal((await page.evaluate(() => ChunbakGame.getDebugState().gameState)), 'paused');
  await page.locator('[data-chunbak-action="resume"]').click();
  assert.equal((await page.evaluate(() => ChunbakGame.getDebugState().gameState)), 'playing');

  await page.close();
}
```

Also verify canvas/stage bounding boxes remain inside viewport width.

- [ ] **Step 5: Run source regressions locally**

```bash
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-effects-regression.mjs
node tests/chunbak-pause-timing-regression.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add chunbak.css .github/workflows/chunbak-preview-live-smoke.yml tests/chunbak-immersive-state-regression.mjs
git commit -m "test: add Chunbak immersive preview smoke"
```

---

### Task 7: Production Smoke, Full Regression, Review, Merge, and Deployment Verification

**Files:**
- Modify: `.github/workflows/chunbak-production-smoke.yml`
- Modify: `tests/chunbak-production-smoke-source-regression.mjs`
- Verify: `.github/workflows/site-regression.yml`

**Interfaces:**
- Production URL: `https://chunbong-fansite.vercel.app/chunbak.html`.
- Existing ranking validation POST must remain 400 for invalid one-character nickname.
- Production smoke must exercise the new start/play/modal/pause/merge flow, not the removed toolbar layout.

- [ ] **Step 1: Update production smoke source regression first**

Require new workflow tokens:

```js
for (const token of [
  'chunbak-audio.js',
  'chunbak-start-view',
  'chunbak-play-view',
  'data-chunbak-open="ranking"',
  'chunbak-modal-close',
  'getDebugState()',
  'COMBO x',
  '1440',
  '1024',
  '390',
  'playwright'
]) assert.ok(yml.includes(token), `missing ${token}`);
```

- [ ] **Step 2: Run and verify RED against the old workflow**

```bash
node tests/chunbak-production-smoke-source-regression.mjs
```

- [ ] **Step 3: Update production workflow paths**

Add `chunbak-audio.js` and the new test/workflow-relevant files to the `paths:` trigger. Keep API, assets, and minigames paths.

- [ ] **Step 4: Replace browser smoke with immersive flow assertions**

For `1440×900`, `1024×768`, and `390×844`:
- wait for asset preload;
- start with nickname blank;
- verify start hidden/play visible;
- verify canvas and document have no horizontal clipping;
- verify desktop left TOP 10 exists;
- open ranking utility while playing and confirm `paused`;
- close and confirm `playing`;
- ESC to pause, open sound panel from pause, return to pause, then continue;
- create two stage-1 pieces with `ChunbakGame.createPiece(1,...)` and wait for score > 0;
- verify FX layer exists and audio runtime loads;
- new game resets score to `0`;
- ranking API invalid POST still returns 400.

Do not submit a valid leaderboard record during smoke.

- [ ] **Step 5: Run every regression file**

```bash
set -e
for file in tests/*.mjs; do
  echo "==> $file"
  node "$file"
done
```

Expected: every test PASS.

- [ ] **Step 6: Run syntax checks matching Site regression**

```bash
node --check chunbak-game-core.js
node --check chunbak-ranking-core.js
node --check chunbak-audio.js
node --check chunbak.js
```

Expected: no output and exit 0.

- [ ] **Step 7: Commit final smoke update**

```bash
git add .github/workflows/chunbak-production-smoke.yml tests/chunbak-production-smoke-source-regression.mjs
git commit -m "test: verify immersive Chunbak in production"
```

- [ ] **Step 8: Open or update Draft PR and wait for checks**

Required green checks before Ready:
- Site regression
- Chunbak preview live smoke
- Vercel Preview deployment/feedback status

If any check fails, use systematic debugging and fix the root cause before proceeding.

- [ ] **Step 9: Perform final PR diff review**

Confirm changed runtime files are limited to:
- `chunbak.html`
- `chunbak.css`
- `chunbak.js`
- `chunbak-audio.js`
- approved tests/workflows/docs

Confirm there are no temporary patch scripts/workflows and no changes to ranking API, Matter.js vendor file, or stage PNG assets.

- [ ] **Step 10: Mark PR Ready and squash merge with expected head SHA**

Use squash merge only after all checks are green and the head SHA has not moved.

- [ ] **Step 11: Verify Vercel production status and production smoke**

After merge:
- Vercel status for the merge commit must be `success`.
- Main Site regression must be `success`.
- `Chunbak production smoke` must be `success`.

If Vercel is rate-limited, do not claim production is updated. Report the exact blocker and wait/retry later rather than making unrelated code changes.

- [ ] **Step 12: Final completion report**

Report the merge SHA, production URL, and evidence that the production smoke passed the new immersive flow.
