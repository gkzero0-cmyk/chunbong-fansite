# Chunbak Immersive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Chunbak so it starts from a compact optional-nickname screen, keeps GLOBAL TOP 10 visible during play, adds Chuntris-style utility/pause modals, preserves local-only anonymous records, and adds cute stage-aware merge audio, particles, and time-based COMBO feedback.

**Architecture:** Keep the existing Matter.js 420×680 physics world, ranking endpoint, score formula, 11 stage assets, and danger-line rules unchanged. `chunbak.js` coordinates explicit `start / playing / paused / gameover` states, shared ranking data, utility-modal pause/resume, and presentation events. `chunbak-audio.js` remains independent but gains `playMerge(stage, combo)`. Merge effects are DOM/CSS presentation layers positioned from physics coordinates and never modify Matter bodies.

**Tech Stack:** Static HTML/CSS/JavaScript, Matter.js 0.20.0, Web Audio API, Node.js 24 regression scripts, Playwright 1.55.0 in GitHub Actions, Vercel production.

**Spec:** `docs/superpowers/specs/2026-09-17-chunbak-immersive-ui-design.md`

## Global Constraints

- Keep logical physics coordinates exactly `420 × 680`.
- Keep 11 stage images and merge progression unchanged.
- Keep the danger threshold at approximately 2 seconds and preserve per-body tracking.
- Keep `/api/content?type=chunbak-ranking` with mode `classic`.
- Keep existing base scores and combo bonus formula.
- Empty nickname can play but must never POST to the global leaderboard.
- Non-empty invalid nickname can play but must not POST.
- Combo uses the existing 1250ms `Core.nextCombo()` rule across drops.
- Show combo text only from `COMBO x2` upward.
- Desktop play keeps `SCORE / BEST / MAX` and `GLOBAL TOP 10` visible at left.
- Utility modals opened during play auto-pause and auto-resume only if the pre-modal state was playing.
- Utility panels opened from manual pause return to the pause panel; they never silently resume.
- Pause duration must not consume danger-line or combo timing.
- Preserve `chunbak.sound.enabled.v1` and `chunbak.sound.volume.v1`.
- Support `prefers-reduced-motion: reduce`.
- Do not change the ranking API implementation, Matter.js vendor bundle, or stage PNGs.

## File Structure

**Modify**
- `chunbak.html` — start/play views, persistent TOP 10, utility buttons, modal panels, FX layers.
- `chunbak.css` — immersive layout, modal/bottom-sheet, merge/combo animation, responsive ordering.
- `chunbak.js` — state flow, nickname policy, ranking state, pause timing, modal stack, merge presentation.
- `chunbak-audio.js` — cute casual sound palette and `playMerge(stage, combo)`.
- `tests/chunbak-audio-regression.mjs`
- `tests/chunbak-ranking-ui-regression.mjs`
- `.github/workflows/chunbak-production-smoke.yml`
- `tests/chunbak-production-smoke-source-regression.mjs`

**Create**
- `tests/chunbak-immersive-state-regression.mjs`
- `tests/chunbak-pause-timing-regression.mjs`
- `tests/chunbak-effects-regression.mjs`
- `.github/workflows/chunbak-preview-live-smoke.yml`

---

### Task 1: Start/Play Views and Optional Nickname

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.js`
- Modify: `chunbak.css`
- Create: `tests/chunbak-immersive-state-regression.mjs`
- Modify: `tests/chunbak-ranking-ui-regression.mjs`

**Interfaces:**
- DOM IDs: `chunbak-start-view`, `chunbak-play-view`, `chunbak-start`, `chunbak-nickname`.
- Runtime: `gameState`, `setView(state)`, `getNicknameState()`, `submitRanking()`.
- State values: `start`, `playing`, `paused`, `gameover`.

- [ ] **Step 1: Write the failing state test**

Create `tests/chunbak-immersive-state-regression.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const token of [
  'id="chunbak-start-view"', 'id="chunbak-play-view"',
  'id="chunbak-nickname"', 'id="chunbak-start"', '닉네임 (선택)'
]) assert.ok(html.includes(token), `missing ${token}`);
for (const token of [
  "let gameState = 'start'", 'function setView(',
  "kind: 'anonymous'", "kind: 'valid'", "kind: 'invalid'"
]) assert.ok(js.includes(token), `missing ${token}`);
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chunbak-immersive-state-regression.mjs
```

Expected: FAIL because the new views/state classifier do not exist.

- [ ] **Step 3: Build the start view and wrap the existing game layout in the play view**

`chunbak.html` must use:

```html
<section id="chunbak-start-view" class="chunbak-start-view">
  <div class="chunbak-start-card">
    <p class="eyebrow">MERGE PUZZLE</p>
    <h2>춘박게임</h2>
    <p>같은 단계의 춘봉을 합쳐 11단계까지 키워보세요.</p>
    <label class="chunbak-nickname-label" for="chunbak-nickname">
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
<section id="chunbak-play-view" class="chunbak-play-view" hidden></section>
```

Move the current stats/ranking/stage/NEXT/EVOLUTION markup intact into `#chunbak-play-view` in this task; Task 2 only changes its layout and adds utility/modal markup. Remove the old top toolbar rather than duplicating it.

Keep `#chunbak-start` disabled until all 11 images preload.

- [ ] **Step 4: Implement state and nickname classification**

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

Starting always calls `setView('playing')` and begins the game. Save nickname to localStorage only for `kind === 'valid'`.

- [ ] **Step 5: Make anonymous/invalid ranking submission local-only**

At the beginning of `submitRanking()`:

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

POST only `nicknameState.displayName` in the valid branch.

- [ ] **Step 6: Update ranking regression**

Add:

```js
assert.ok(js.includes("nicknameState.kind === 'anonymous'"));
assert.ok(js.includes('로컬 최고 기록만 저장되었습니다.'));
assert.ok(js.includes("nicknameState.kind === 'invalid'"));
```

- [ ] **Step 7: Run focused tests**

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

### Task 2: Persistent TOP 10, Utilities, and Modal Shell

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.css`
- Modify: `chunbak.js`
- Modify: `tests/chunbak-immersive-state-regression.mjs`

**Interfaces:**
- Shared ranking state: `rankingEntries`.
- Functions: `renderRankingList(target, entries)`, `renderRankings()`, `showModalPanel(panelName, options)`, `hideModalShell()`.
- DOM IDs: `chunbak-modal`, `chunbak-modal-title`, `chunbak-modal-close`, `chunbak-ranking-list`, `chunbak-ranking-modal-list`, `chunbak-sound`, `chunbak-volume`, `chunbak-pause`.

- [ ] **Step 1: Extend the state test and verify RED**

Add assertions for all IDs above plus `data-chunbak-open="ranking"`, `sound`, and `controls`, then run:

```bash
node tests/chunbak-immersive-state-regression.mjs
```

- [ ] **Step 2: Build the final desktop play markup**

Use this exact information hierarchy:
- `.chunbak-play-top`: status text + four utility buttons (`ranking`, `sound`, `controls`, `#chunbak-pause`).
- `.chunbak-left`: existing `.chunbak-stats`, then `.chunbak-ranking` containing status + `#chunbak-ranking-list`.
- `.chunbak-center`: existing `#chunbak-stage` with canvas, danger line, overlay.
- `.chunbak-right`: existing NEXT card, then EVOLUTION/1→11 legend.
- Remove the old always-visible `.chunbak-help` controls card.

The four utility buttons are:

```html
<div class="chunbak-utility-cluster">
  <button type="button" data-chunbak-open="ranking" aria-label="전체 랭킹">🏆</button>
  <button type="button" data-chunbak-open="sound" aria-label="소리 설정">🔊</button>
  <button type="button" data-chunbak-open="controls" aria-label="조작법">⌨</button>
  <button id="chunbak-pause" type="button" aria-label="일시정지">⏸</button>
</div>
```

- [ ] **Step 3: Add one shared accessible modal**

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
        <p id="chunbak-ranking-modal-status" aria-live="polite"></p>
        <ol id="chunbak-ranking-modal-list" class="chunbak-ranking-list"></ol>
      </section>
      <section data-chunbak-panel="sound" hidden>
        <button id="chunbak-sound" type="button" aria-pressed="true">효과음 ON</button>
        <label class="chunbak-volume-label" for="chunbak-volume">볼륨
          <input id="chunbak-volume" type="range" min="0" max="100" step="1" value="70">
        </label>
        <button type="button" data-chunbak-action="back-to-pause" hidden>← 일시정지 메뉴</button>
      </section>
      <section data-chunbak-panel="controls" hidden>
        <p><strong>PC</strong> 마우스로 위치 이동 후 클릭하여 드롭</p>
        <p><strong>모바일</strong> 원하는 위치를 터치하여 드롭</p>
        <p><strong>ESC</strong> 일시정지 / 계속하기</p>
        <p>위험선 위에 약 2초 머물면 게임오버</p>
        <button type="button" data-chunbak-action="back-to-pause" hidden>← 일시정지 메뉴</button>
      </section>
      <section data-chunbak-panel="pause" hidden>
        <div class="chunbak-pause-actions">
          <button class="btn btn-primary" type="button" data-chunbak-action="resume">계속하기</button>
          <button class="btn btn-ghost" type="button" data-chunbak-action="new-game">새 게임</button>
          <button type="button" data-chunbak-action="pause-sound">소리 설정</button>
          <button type="button" data-chunbak-action="pause-controls">조작법</button>
        </div>
      </section>
    </div>
  </section>
</div>
```

- [ ] **Step 4: Implement modal panel switching and focus restoration**

```js
let activePanel = null;
let modalReturnPanel = null;
let lastFocusedElement = null;
function showModalPanel(panelName, { returnPanel = null } = {}) {
  activePanel = panelName;
  modalReturnPanel = returnPanel;
  lastFocusedElement ||= document.activeElement;
  modal.hidden = false;
  document.body.classList.add('chunbak-modal-open');
  for (const panel of modalPanels) panel.hidden = panel.dataset.chunbakPanel !== panelName;
  modalTitle.textContent = ({ranking:'전체 랭킹',sound:'소리 설정',controls:'조작법',pause:'일시정지'})[panelName];
  modalClose.focus();
}
function hideModalShell() {
  modal.hidden = true;
  activePanel = null;
  modalReturnPanel = null;
  document.body.classList.remove('chunbak-modal-open');
  lastFocusedElement?.focus?.();
  lastFocusedElement = null;
}
```

Task 3 adds pause/resume policy around these helpers.

- [ ] **Step 5: Share one ranking result across both lists**

```js
let rankingEntries = [];
function renderRankingList(target, entries) {
  const fragment = document.createDocumentFragment();
  for (const entry of entries.slice(0, 10)) {
    const item = document.createElement('li');
    const rank = document.createElement('span');
    const name = document.createElement('strong');
    const record = document.createElement('span');
    rank.textContent = String(entry.rank ?? fragment.childNodes.length + 1);
    name.textContent = String(entry.nickname ?? '-');
    record.textContent = `${Number(entry.score) || 0} · Lv.${Number(entry.maxLevel) || 1}`;
    item.append(rank, name, record);
    fragment.appendChild(item);
  }
  target.replaceChildren(fragment);
}
function renderRankings() {
  renderRankingList(rankingList, rankingEntries);
  renderRankingList(rankingModalList, rankingEntries);
}
```

Both ranking status nodes receive the same GET/POST status copy.

- [ ] **Step 6: Add desktop layout/modal CSS**

```css
.chunbak-layout-immersive{display:grid;grid-template-columns:minmax(210px,280px) minmax(0,460px) minmax(210px,280px);grid-template-areas:"left center right";justify-content:center;align-items:start;gap:18px}
.chunbak-left{grid-area:left}.chunbak-center{grid-area:center}.chunbak-right{grid-area:right}
.chunbak-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px}
.chunbak-modal[hidden],.chunbak-start-view[hidden],.chunbak-play-view[hidden]{display:none!important}
.chunbak-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)}
.chunbak-modal-card{position:relative;z-index:1;width:min(92vw,620px);max-height:86dvh;overflow:auto;border:1px solid var(--line);border-radius:22px;background:var(--surface)}
.chunbak-modal-open{overflow:hidden}
```

- [ ] **Step 7: Run focused tests and commit**

```bash
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-ranking-ui-regression.mjs
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
- Functions: `pauseGame(reason)`, `resumeGame()`, `openUtilityModal(panelName)`, `closeUtilityModal()`, `openPauseMenu()`.
- State: `pausedAt`, `resumeAfterUtility`, `activePanel`, `modalReturnPanel`.
- Debug API: `pauseGame`, `resumeGame`, `getDebugState`.

- [ ] **Step 1: Write the failing pause timing test**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const token of ['function pauseGame(','function resumeGame(','pausedAt','resumeAfterUtility','modalReturnPanel','dangerStartedAtById','lastMergeAt','lastFrameAt = performance.now()',"event.key === 'Escape'"]) {
  assert.ok(js.includes(token), `missing ${token}`);
}
assert.ok(js.includes('startedAt + pauseDuration'));
assert.ok(js.includes('lastMergeAt + pauseDuration'));
```

- [ ] **Step 2: Verify RED**

```bash
node tests/chunbak-pause-timing-regression.mjs
```

- [ ] **Step 3: Implement pause/resume with clock compensation**

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
  dangerStartedAtById = Object.fromEntries(Object.entries(dangerStartedAtById).map(([id, startedAt]) => [id, startedAt + pauseDuration]));
  pausedAt = null;
  lastFrameAt = performance.now();
  gameState = 'playing';
  playing = true;
  root.dataset.gameStatus = 'playing';
  return true;
}
```

- [ ] **Step 4: Preserve danger state while paused**

Replace `if (!playing) { dangerStartedAtById = {}; return; }` with:

```js
if (gameState === 'paused') return;
if (gameState !== 'playing') {
  dangerStartedAtById = {};
  return;
}
```

- [ ] **Step 5: Implement utility and pause modal semantics**

```js
function openUtilityModal(panelName) {
  resumeAfterUtility = gameState === 'playing';
  if (resumeAfterUtility) pauseGame('utility');
  showModalPanel(panelName);
}
function openPauseMenu() {
  resumeAfterUtility = false;
  if (gameState === 'playing') pauseGame('manual');
  showModalPanel('pause');
}
function closeUtilityModal() {
  if (modalReturnPanel === 'pause') {
    showModalPanel('pause');
    return;
  }
  hideModalShell();
  const shouldResume = resumeAfterUtility;
  resumeAfterUtility = false;
  if (shouldResume && gameState === 'paused') resumeGame();
}
```

When pause buttons open sound/controls call `showModalPanel('sound',{returnPanel:'pause'})` or `showModalPanel('controls',{returnPanel:'pause'})`. The `back-to-pause` button calls `showModalPanel('pause')` without closing the modal shell.

- [ ] **Step 6: Wire ESC and action buttons**

Rules:
- Utility panel from play: ESC closes it and resumes.
- Sound/controls from pause: ESC returns to pause panel.
- Playing with no modal: ESC calls `openPauseMenu()`.
- Pause panel: ESC performs continue (`hideModalShell(); resumeGame()`).
- `data-chunbak-action="resume"`: hide modal then `resumeGame()`.
- `data-chunbak-action="new-game"`: hide modal then `resetGame({autoStart:true})`, `setView('playing')`.
- New game keeps nickname and audio settings.

- [ ] **Step 7: Extend debug API**

```js
globalThis.ChunbakGame = Object.freeze({
  createPiece, dropCurrent, handleCollisionPairs, resetGame, pauseGame, resumeGame,
  getDebugState: () => ({ gameState, score, combo, maxLevel, currentStage, nextStage })
});
```

- [ ] **Step 8: Run tests and commit**

```bash
node tests/chunbak-pause-timing-regression.mjs
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-a-danger-tracker-regression.mjs
node tests/chunbak-game-core-regression.mjs
git add chunbak.html chunbak.js tests/chunbak-pause-timing-regression.mjs tests/chunbak-immersive-state-regression.mjs
git commit -m "feat: add Chunbak pause and utility resume flow"
```

---

### Task 4: Cute Web Audio and Stage-Aware Merge Sounds

**Files:**
- Modify: `chunbak-audio.js`
- Modify: `chunbak.js`
- Modify: `tests/chunbak-audio-regression.mjs`

**Interfaces:**
- Keep `play(name)`, `resume()`, `setEnabled()`, `setVolume()`, `getSettings()`.
- Add `playMerge(stage, combo)` where stage is `2..11`, combo is `>=1`.

- [ ] **Step 1: Make audio regression RED**

Update assertions:

```js
assert.equal(typeof sandbox.ChunbakAudio.playMerge, 'function');
assert.ok(source.includes('function playMerge(stage, combo'));
const game = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const cue of ['start','drop','gameover']) assert.ok(game.includes(`Audio.play('${cue}')`));
assert.ok(game.includes('Audio.playMerge(resultStage, combo)'));
```

Run `node tests/chunbak-audio-regression.mjs` and expect FAIL.

- [ ] **Step 2: Implement stage-aware cute tones**

```js
function playMerge(stage, combo = 1) {
  if (!enabled || !context) return;
  const safeStage = Math.min(11, Math.max(2, Math.trunc(Number(stage) || 2)));
  const safeCombo = Math.max(1, Math.trunc(Number(combo) || 1));
  const base = 300 + safeStage * 28 + Math.min(safeCombo - 1, 5) * 12;
  if (safeStage <= 4) {
    tone(base, .055, 'sine', .07); tone(base * 1.5, .07, 'triangle', .05, .025);
  } else if (safeStage <= 7) {
    tone(base, .06, 'triangle', .075); tone(base * 1.25, .075, 'sine', .065, .035);
  } else if (safeStage <= 10) {
    tone(base, .065, 'triangle', .08); tone(base * 1.25, .08, 'triangle', .075, .035); tone(base * 1.5, .11, 'sine', .07, .075);
  } else {
    tone(660, .08, 'triangle', .09); tone(880, .10, 'triangle', .085, .05); tone(1100, .14, 'sine', .08, .11);
  }
}
```

Use sine/triangle notes for start/drop/gameover; remove harsh sawtooth game-over tones. Export `playMerge` on `ChunbakAudio`.

- [ ] **Step 3: Replace merge/highmerge runtime branching**

Call only:

```js
Audio.playMerge(resultStage, combo);
```

- [ ] **Step 4: Verify and commit**

```bash
node tests/chunbak-audio-regression.mjs
node tests/chunbak-game-core-regression.mjs
git add chunbak-audio.js chunbak.js tests/chunbak-audio-regression.mjs
git commit -m "feat: add cute stage-aware Chunbak audio"
```

---

### Task 5: Merge Particles and COMBO x2+

**Files:**
- Modify: `chunbak.html`
- Modify: `chunbak.css`
- Modify: `chunbak.js`
- Create: `tests/chunbak-effects-regression.mjs`

**Interfaces:**
- DOM IDs: `chunbak-fx-layer`, `chunbak-combo`.
- Functions: `effectTier(stage)`, `showMergeEffect({x,y,stage,combo})`, `showCombo(combo,x,y)`.

- [ ] **Step 1: Write failing effect regression**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chunbak.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const token of ['id="chunbak-fx-layer"','id="chunbak-combo"']) assert.ok(html.includes(token));
for (const token of ['function effectTier(','function showMergeEffect(','function showCombo(','COMBO x${combo}','Audio.playMerge(resultStage, combo)']) assert.ok(js.includes(token));
for (const token of ['chunbak-merge-ring','chunbak-particle','tier-low','tier-mid','tier-high','tier-final','prefers-reduced-motion']) assert.ok(css.includes(token));
```

Run `node tests/chunbak-effects-regression.mjs`; expect FAIL.

- [ ] **Step 2: Add stage presentation layers**

Inside `#chunbak-stage`, above the canvas and below game-over overlay:

```html
<div id="chunbak-fx-layer" class="chunbak-fx-layer" aria-hidden="true"></div>
<div id="chunbak-combo" class="chunbak-combo" aria-live="polite" aria-atomic="true"></div>
```

- [ ] **Step 3: Implement effect tiers and coordinates**

```js
function effectTier(stage) {
  if (stage <= 4) return 'low';
  if (stage <= 7) return 'mid';
  if (stage <= 10) return 'high';
  return 'final';
}
```

`showMergeEffect()` computes:

```js
const left = `${(x / WIDTH) * 100}%`;
const top = `${(y / HEIGHT) * 100}%`;
```

Every tier creates one ring. Particle counts are exactly low=4, mid=7, high=10, final=14. Symbols are local text (`✦`, `★`, `♥`); final also includes a `♛` marker. Every transient element removes itself on `animationend` plus a 1400ms timeout fallback.

- [ ] **Step 4: Implement COMBO display**

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

Call `Audio.playMerge(resultStage, combo)`, `showMergeEffect({x,y,stage:resultStage,combo})`, and `showCombo(combo,x,y)` after combo/score calculation.

- [ ] **Step 5: Add CSS animations and reduced-motion fallback**

```css
.chunbak-fx-layer{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}
.chunbak-combo{position:absolute;left:var(--combo-x,50%);top:var(--combo-y,48%);z-index:5;pointer-events:none;transform:translate(-50%,-50%);opacity:0}
.chunbak-merge-ring{position:absolute;left:var(--fx-x);top:var(--fx-y);width:70px;aspect-ratio:1;border:2px solid currentColor;border-radius:50%;transform:translate(-50%,-50%) scale(.35);animation:chunbakMergeRing .55s ease-out both}
.chunbak-particle{position:absolute;left:var(--fx-x);top:var(--fx-y);animation:chunbakParticlePop .65s ease-out both}
.chunbak-combo.is-visible{animation:chunbakComboPop .8s ease both}
@media(prefers-reduced-motion:reduce){.chunbak-merge-ring,.chunbak-particle{animation-duration:.16s}.chunbak-combo.is-visible{animation-duration:.35s}}
```

Define the three referenced keyframes and tier-specific size/glow rules; `tier-final` must be strongest.

- [ ] **Step 6: Verify and commit**

```bash
node tests/chunbak-effects-regression.mjs
node tests/chunbak-game-core-regression.mjs
node tests/chunbak-audio-regression.mjs
git add chunbak.html chunbak.css chunbak.js tests/chunbak-effects-regression.mjs
git commit -m "feat: add Chunbak merge effects and combo feedback"
```

---

### Task 6: Responsive Layout and Preview Smoke

**Files:**
- Modify: `chunbak.css`
- Create: `.github/workflows/chunbak-preview-live-smoke.yml`
- Modify: `tests/chunbak-immersive-state-regression.mjs`

**Interfaces:**
- Desktop: left stats/TOP10, center stage, right NEXT/EVOLUTION.
- Mobile order: status/utilities → stats → stage → NEXT → TOP10 → EVOLUTION.
- Browser sizes: `1440×900`, `1024×768`, `390×844`.

- [ ] **Step 1: Add responsive source assertions and verify RED if missing**

Require `.chunbak-layout-immersive`, `@media (max-width:900px)`, `@media (max-width:520px)`, `.chunbak-utility-cluster`, `.chunbak-modal-card`, then run `node tests/chunbak-immersive-state-regression.mjs`.

- [ ] **Step 2: Implement mobile order using `display:contents`**

```css
@media (max-width:900px){
  .chunbak-layout-immersive{grid-template-columns:1fr;display:flex;flex-direction:column;max-width:560px;margin-inline:auto}
  .chunbak-left,.chunbak-right{display:contents}
  .chunbak-stats{order:1}
  .chunbak-center{order:2}
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

The play-top status/utilities remain before the layout and therefore appear first on mobile.

- [ ] **Step 3: Create preview smoke workflow**

Create `.github/workflows/chunbak-preview-live-smoke.yml`, following the Vercel Preview resolver used by `chuntris-preview-live-smoke.yml`. Test all three viewports. For each viewport:

```js
await page.goto(`${preview}/chunbak.html`, {waitUntil:'networkidle'});
await page.waitForFunction(() => !document.querySelector('#chunbak-start')?.disabled);
assert.equal(await page.locator('#chunbak-play-view').isHidden(), true);
await page.locator('#chunbak-start').click();
assert.equal(await page.locator('#chunbak-start-view').isHidden(), true);
assert.equal(await page.locator('#chunbak-play-view').isVisible(), true);
assert.ok(await page.locator('#chunbak-ranking-list').count());
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
const stage = await page.locator('#chunbak-stage').boundingBox();
assert.ok(stage && stage.x >= -1 && stage.x + stage.width <= viewport.width + 1);
await page.locator('[data-chunbak-open="ranking"]').first().click();
assert.equal(await page.evaluate(() => ChunbakGame.getDebugState().gameState), 'paused');
await page.locator('#chunbak-modal-close').click();
assert.equal(await page.evaluate(() => ChunbakGame.getDebugState().gameState), 'playing');
await page.keyboard.press('Escape');
assert.equal(await page.evaluate(() => ChunbakGame.getDebugState().gameState), 'paused');
await page.locator('[data-chunbak-action="resume"]').click();
assert.equal(await page.evaluate(() => ChunbakGame.getDebugState().gameState), 'playing');
```

Nickname is intentionally blank. Do not POST a valid leaderboard record.

- [ ] **Step 4: Verify and commit**

```bash
node tests/chunbak-immersive-state-regression.mjs
node tests/chunbak-effects-regression.mjs
node tests/chunbak-pause-timing-regression.mjs
git add chunbak.css .github/workflows/chunbak-preview-live-smoke.yml tests/chunbak-immersive-state-regression.mjs
git commit -m "test: add Chunbak immersive preview smoke"
```

---

### Task 7: Production Smoke, Full Regression, Review, Merge, Deployment

**Files:**
- Modify: `.github/workflows/chunbak-production-smoke.yml`
- Modify: `tests/chunbak-production-smoke-source-regression.mjs`
- Verify: `.github/workflows/site-regression.yml`

- [ ] **Step 1: Make production smoke source regression RED**

Require these workflow tokens:

```js
for (const token of ['chunbak-audio.js','chunbak-start-view','chunbak-play-view','data-chunbak-open="ranking"','chunbak-modal-close','getDebugState()','chunbak-fx-layer','1440','1024','390','playwright']) {
  assert.ok(yml.includes(token), `missing ${token}`);
}
```

Run `node tests/chunbak-production-smoke-source-regression.mjs`; expect FAIL against the old workflow.

- [ ] **Step 2: Update production workflow trigger paths**

Add `chunbak-audio.js`, `tests/chunbak-*.mjs`, and `.github/workflows/chunbak-production-smoke.yml` while preserving existing Chunbak HTML/CSS/JS/core/assets/API/minigames paths.

- [ ] **Step 3: Replace old browser smoke with immersive smoke**

For `1440×900`, `1024×768`, and `390×844`:
1. wait for image preload;
2. start with nickname blank;
3. verify start hidden/play visible and no horizontal clipping;
4. verify persistent TOP 10 exists;
5. open ranking from play → state `paused`; close → `playing`;
6. ESC → pause; open sound from pause; use `back-to-pause`; continue → `playing`;
7. inject stage-1 pieces at exact coordinates `190,520` and `215,520`; wait for score > 0;
8. assert `#chunbak-fx-layer` and `#chunbak-combo` exist;
9. choose new game and assert score becomes `0`;
10. keep the existing invalid one-character ranking POST and require HTTP 400.

Do not create a valid ranking entry during smoke.

- [ ] **Step 4: Run all regressions and syntax checks**

```bash
set -e
for file in tests/*.mjs; do echo "==> $file"; node "$file"; done
node --check chunbak-game-core.js
node --check chunbak-ranking-core.js
node --check chunbak-audio.js
node --check chunbak.js
```

Expected: every command exits 0.

- [ ] **Step 5: Commit final smoke update**

```bash
git add .github/workflows/chunbak-production-smoke.yml tests/chunbak-production-smoke-source-regression.mjs
git commit -m "test: verify immersive Chunbak in production"
```

- [ ] **Step 6: Draft PR and final review gate**

Before Ready, require green:
- Site regression
- Chunbak preview live smoke
- Vercel Preview status/feedback

Review the final diff. Runtime changes may only be `chunbak.html`, `chunbak.css`, `chunbak.js`, `chunbak-audio.js`; other changes must be approved docs/tests/workflows. There must be no temporary patch workflow/script and no ranking API/vendor/PNG changes.

- [ ] **Step 7: Ready, squash merge, and production verification**

Mark Ready only after green checks. Squash merge with expected head SHA. After merge require:
- Vercel status `success` for merge SHA;
- main Site regression `success`;
- Chunbak production smoke `success`.

If Vercel is rate-limited, do not claim production is updated and do not make unrelated code changes.

- [ ] **Step 8: Completion report**

Report merge SHA, production URL, and production smoke evidence for start/play, persistent TOP 10, pause/modal resume, responsive layout, and merge FX.
