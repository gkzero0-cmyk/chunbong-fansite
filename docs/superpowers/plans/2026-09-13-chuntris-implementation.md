# 춘트리스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 춘봉 팬사이트에 PC·모바일에서 플레이 가능한 `춘트리스`를 추가하고, 클래식 무한모드와 40줄 타임어택, 현대식 테트리스 조작, 춘봉 캐릭터 리액션 20종, 로컬 최고기록, 운영 smoke test를 제공한다.

**Architecture:** 게임 규칙은 `chuntris-engine.js`의 브라우저/Node 공용 엔진으로 분리하고, `chuntris.js`는 Canvas 렌더링·입력·DOM 상태 반영만 담당한다. `chuntris-audio.js`는 Web Audio를 독립 관리하고, 사용자 제공 이미지 20장은 `assets/chuntris/`에 의미 기반 파일명으로 저장한다. 기존 팬사이트의 정적 HTML/CSS/JS 구조와 `data-page`/`data-nav` 내비게이션 패턴을 그대로 따른다.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Canvas 2D, Web Audio API, localStorage, Node.js 24 regression scripts, GitHub Actions, Playwright 1.55.0 production smoke, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-13-chuntris-design.md`

## Global Constraints

- 외부 게임 엔진/프레임워크를 추가하지 않는다.
- 보드는 visible 10×20, 내부 10×22(hidden row 2개)로 관리한다.
- 7-bag, Hold, Next 5, Ghost, SRS wall kick, Soft/Hard Drop, lock delay 500ms를 지원한다.
- 키 반복은 DAS 150ms / ARR 40ms를 사용한다.
- 클래식 점수: Single 100, Double 300, Triple 500, Tetris 800 × level; Soft Drop +1/cell; Hard Drop +2/cell.
- T-Spin 점수: 0 line 400, Single 800, Double 1200, Triple 1600 × level; Mini는 별도 분류하지 않는다.
- Combo는 두 번째 연속 clear부터 `50 × combo × level`, non-clear lock 시 -1로 초기화한다.
- Back-to-Back은 Tetris 및 1줄 이상 T-Spin에 적용하고 연속 대상 clear의 기본 점수에 1.5배를 적용한다.
- 클래식 level은 10 lines마다 +1, gravity는 `max(80, 1000 * 0.85^(level - 1))` ms다.
- 40줄 모드는 level 1 / gravity 1000ms 고정이며 40 lines 도달 즉시 completed 처리한다.
- 최고점수/기록/사운드 설정은 spec의 v1 localStorage key를 그대로 사용한다.
- 창이 hidden 되면 자동 pause하고, resize/orientation change는 게임 상태를 잃지 않는다.
- `prefers-reduced-motion`에서는 강한 flash/scale animation을 줄인다.
- 사용자 제공 20개 이미지는 모두 repo asset으로 보관하되 비슷한 표정은 같은 상태의 variation으로 사용해도 된다.

---

### Task 1: 게임 엔진의 기본 자료구조, 7-bag, 이동·Ghost를 TDD로 구축

**Files:**
- Create: `chuntris-engine.js`
- Create: `tests/chuntris-engine-core-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- Produces: `globalThis.ChuntrisEngine` 및 CommonJS export.
- Produces: `PIECE_TYPES`, `BOARD_WIDTH`, `VISIBLE_ROWS`, `HIDDEN_ROWS`, `BOARD_ROWS`, `SHAPES`, `createSevenBag(random)`, `createEmptyBoard()`, `collides(board, piece)`, `ghostY(board, piece)`, `gravityMs(level, mode)`, `ChuntrisGame`.
- `ChuntrisGame` constructor: `new ChuntrisGame({ mode = 'classic', random = Math.random })`.
- `ChuntrisGame#getSnapshot()`은 UI가 읽을 plain object를 반환한다.

- [ ] **Step 1: 핵심 엔진 회귀 테스트를 먼저 작성한다**

```js
// tests/chuntris-engine-core-regression.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  PIECE_TYPES, createSevenBag, createEmptyBoard,
  ghostY, gravityMs, ChuntrisGame
} = require('../chuntris-engine.js');

const bag = createSevenBag(() => 0.42);
assert.equal(bag.length, 7);
assert.deepEqual([...bag].sort(), [...PIECE_TYPES].sort());

const board = createEmptyBoard();
assert.equal(board.length, 22);
assert.ok(board.every(row => row.length === 10));

const game = new ChuntrisGame({ mode: 'classic', random: () => 0.42 });
let state = game.getSnapshot();
assert.equal(state.board.length, 22);
assert.equal(state.next.length >= 5, true);
assert.equal(state.status, 'idle');

game.start(0);
state = game.getSnapshot();
assert.equal(state.status, 'playing');
assert.equal(Number.isFinite(ghostY(state.board, state.active)), true);
assert.equal(gravityMs(1, 'classic'), 1000);
assert.equal(gravityMs(99, 'classic'), 80);
assert.equal(gravityMs(99, 'sprint40'), 1000);
console.log('chuntris engine core regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-engine-core-regression.mjs`

Expected: FAIL because `../chuntris-engine.js` does not exist.

- [ ] **Step 3: 최소 엔진 골격과 7-bag/보드/스폰/충돌/Ghost를 구현한다**

`chuntris-engine.js`는 IIFE로 브라우저 전역을 만들고 Node에서는 `module.exports = API`를 설정한다. `createSevenBag`은 Fisher-Yates를 사용하고 주입된 `random()`만 사용한다. `ChuntrisGame`은 `board`, `active`, `next`, `hold`, `canHold`, `score`, `lines`, `level`, `combo`, `backToBack`, `status`, `mode`, `elapsedMs`, `startedAt`을 소유한다.

- [ ] **Step 4: 엔진 테스트와 syntax check를 통과시킨다**

Run:

```bash
node --check chuntris-engine.js
node tests/chuntris-engine-core-regression.mjs
```

Expected: both exit 0.

- [ ] **Step 5: Site regression workflow에 새 JS syntax checks를 추가한다**

`.github/workflows/site-regression.yml`의 `Check JavaScript syntax`에 다음 세 줄을 최종적으로 포함하도록 시작한다. 이 Task에서는 엔진만 존재하므로 우선 첫 줄을 추가하고, 이후 Task에서 나머지를 추가한다.

```yaml
node --check chuntris-engine.js
```

- [ ] **Step 6: 커밋한다**

```bash
git add chuntris-engine.js tests/chuntris-engine-core-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: add Chuntris core engine"
```

---

### Task 2: SRS 회전, Hold, Hard/Soft Drop, lock delay를 엔진에 추가

**Files:**
- Modify: `chuntris-engine.js`
- Create: `tests/chuntris-engine-controls-regression.mjs`

**Interfaces:**
- Consumes: `ChuntrisGame`, board/piece constants from Task 1.
- Produces methods: `moveHorizontal(direction)`, `softDrop()`, `hardDrop()`, `rotate(direction)`, `holdPiece()`, `advance(nowMs)`.
- `rotate(direction)` accepts `1` for clockwise and `-1` for counter-clockwise and returns boolean success.
- `hardDrop()` returns moved cell count and immediately locks the piece.
- `softDrop()` returns boolean and awards +1 only when the piece actually moves down.

- [ ] **Step 1: 회전/Hold/Drop 실패 테스트를 작성한다**

```js
// tests/chuntris-engine-controls-regression.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ChuntrisGame } = require('../chuntris-engine.js');

const game = new ChuntrisGame({ mode: 'classic', random: () => 0.2 });
game.start(0);
const before = game.getSnapshot();
assert.equal(game.moveHorizontal(-1), true);
assert.equal(game.rotate(1), true);
assert.equal(game.holdPiece(), true);
assert.equal(game.holdPiece(), false, 'hold must be limited to once before lock');

const scoreBeforeDrop = game.getSnapshot().score;
const moved = game.hardDrop();
assert.ok(moved >= 0);
assert.equal(game.getSnapshot().score, scoreBeforeDrop + moved * 2);
assert.equal(game.getSnapshot().canHold, true, 'hold resets after lock');

const pauseGame = new ChuntrisGame({ mode: 'classic', random: () => 0.4 });
pauseGame.start(0);
pauseGame.advance(1000);
assert.ok(pauseGame.getSnapshot().active.y > before.active.y || pauseGame.getSnapshot().status === 'gameover');
console.log('chuntris controls regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-engine-controls-regression.mjs`

Expected: FAIL because control methods are absent/incomplete.

- [ ] **Step 3: SRS kick table과 조작 메서드를 구현한다**

`I/J/L/S/T/Z`와 `O`를 구분하고 표준 JLSTZ/I SRS kick offsets를 rotation transition별 table로 정의한다. 회전 성공 시 `lastAction = 'rotate'`와 rotation metadata를 보존한다. Hold 후 새 piece는 rotation 0/spawn position에서 시작한다.

- [ ] **Step 4: lock delay를 구현한다**

`advance(nowMs)`에서 gravity step을 누적하고, 바닥 접촉 시 `groundedAt`을 기록한다. 좌우 이동/성공 회전으로 다시 떠오르면 `groundedAt = null`; 계속 접촉한 상태에서 500ms가 지나면 lock한다.

- [ ] **Step 5: 테스트를 통과시킨다**

Run:

```bash
node --check chuntris-engine.js
node tests/chuntris-engine-core-regression.mjs
node tests/chuntris-engine-controls-regression.mjs
```

Expected: all exit 0.

- [ ] **Step 6: 커밋한다**

```bash
git add chuntris-engine.js tests/chuntris-engine-controls-regression.mjs
git commit -m "feat: add Chuntris modern controls"
```

---

### Task 3: 라인 삭제, T-Spin, Combo/B2B, 두 모드 완료 규칙을 TDD로 추가

**Files:**
- Modify: `chuntris-engine.js`
- Create: `tests/chuntris-engine-scoring-regression.mjs`

**Interfaces:**
- Produces pure helpers: `clearCompletedLines(board)`, `scoreClear({ lines, tSpin, level, combo, backToBack })`.
- `scoreClear` returns `{ points, nextCombo, nextBackToBack, b2bApplied }`.
- `ChuntrisGame` lock result updates `lines`, `level`, `combo`, `backToBack`, `score`, and in sprint mode may set `status = 'completed'`.

- [ ] **Step 1: 점수/완료 회귀 테스트를 작성한다**

```js
// tests/chuntris-engine-scoring-regression.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { scoreClear, gravityMs, ChuntrisGame } = require('../chuntris-engine.js');

assert.equal(scoreClear({ lines: 1, tSpin: false, level: 2, combo: -1, backToBack: false }).points, 200);
assert.equal(scoreClear({ lines: 4, tSpin: false, level: 1, combo: -1, backToBack: false }).points, 800);
assert.equal(scoreClear({ lines: 2, tSpin: true, level: 1, combo: -1, backToBack: false }).points, 1200);
const b2b = scoreClear({ lines: 4, tSpin: false, level: 1, combo: 0, backToBack: true });
assert.equal(b2b.b2bApplied, true);
assert.ok(b2b.points > 800);
const combo = scoreClear({ lines: 1, tSpin: false, level: 1, combo: 0, backToBack: false });
assert.equal(combo.nextCombo, 1);
assert.equal(combo.points, 150);
assert.equal(gravityMs(11, 'classic') < gravityMs(1, 'classic'), true);

const sprint = new ChuntrisGame({ mode: 'sprint40', random: () => 0.3 });
sprint.start(100);
sprint.state.lines = 39;
sprint.applyClearEvent({ lines: 1, tSpin: false }, 12345);
assert.equal(sprint.getSnapshot().status, 'completed');
assert.equal(sprint.getSnapshot().lines, 40);
assert.equal(sprint.getSnapshot().elapsedMs, 12245);
console.log('chuntris scoring regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-engine-scoring-regression.mjs`

Expected: FAIL because scoring helpers / `applyClearEvent` are absent.

- [ ] **Step 3: 점수 규칙을 spec 그대로 구현한다**

T-Spin 판정은 `lastAction === 'rotate'`, active type T, rotation center의 4 corner 중 3개 이상 occupied/outside 조건으로 한다. `applyClearEvent(event, nowMs)`는 실제 lock path에서도 호출하는 단일 점수/상태 전이 함수로 사용한다.

- [ ] **Step 4: classic level과 sprint completion을 구현한다**

classic은 `Math.floor(lines / 10) + 1`; sprint40는 level 1 고정. sprint completion 시 `elapsedMs = nowMs - startedAt - pausedDurationMs`로 확정하고 이후 `advance()`가 시간을 늘리지 않게 한다.

- [ ] **Step 5: 엔진 전체 테스트를 통과시킨다**

Run:

```bash
node tests/chuntris-engine-core-regression.mjs
node tests/chuntris-engine-controls-regression.mjs
node tests/chuntris-engine-scoring-regression.mjs
```

Expected: all exit 0.

- [ ] **Step 6: 커밋한다**

```bash
git add chuntris-engine.js tests/chuntris-engine-scoring-regression.mjs
git commit -m "feat: add Chuntris scoring and game modes"
```

---

### Task 4: 사용자 제공 춘봉 이미지 20장을 정규화해 asset으로 추가

**Files:**
- Create: `assets/chuntris/idle.webp`
- Create: `assets/chuntris/gameover.webp`
- Create: `assets/chuntris/dizzy.webp`
- Create: `assets/chuntris/cry-a.webp`
- Create: `assets/chuntris/cry-b.webp`
- Create: `assets/chuntris/alert.webp`
- Create: `assets/chuntris/sweat.webp`
- Create: `assets/chuntris/money.webp`
- Create: `assets/chuntris/smile.webp`
- Create: `assets/chuntris/question.webp`
- Create: `assets/chuntris/sparkle.webp`
- Create: `assets/chuntris/loading.webp`
- Create: `assets/chuntris/sigh.webp`
- Create: `assets/chuntris/smug.webp`
- Create: `assets/chuntris/burnout.webp`
- Create: `assets/chuntris/excited.webp`
- Create: `assets/chuntris/sleep.webp`
- Create: `assets/chuntris/love.webp`
- Create: `assets/chuntris/angry.webp`
- Create: `assets/chuntris/calm.webp`
- Create: `tests/chuntris-assets-regression.mjs`

**Interfaces:**
- Produces stable asset URLs consumed by `chuntris.js` reaction map.
- Source mapping, in upload order:
  1. `춘봉(20260913-004611).webp` → `idle.webp`
  2. `vts-2025-12-31_09h54_59.png` → `gameover.webp`
  3. `vts-2025-12-31_09h55_09(1).png` → `dizzy.webp`
  4. `vts-2025-12-31_09h55_29.png` → `cry-a.webp`
  5. `vts-2025-12-31_09h55_37.png` → `cry-b.webp`
  6. `vts-2025-12-31_09h55_49.png` → `alert.webp`
  7. `vts-2025-12-31_09h55_57.png` → `sweat.webp`
  8. `vts-2025-12-31_09h56_04.png` → `money.webp`
  9. `vts-2025-12-31_09h57_23.png` → `smile.webp`
  10. `vts-2025-12-31_09h57_32.png` → `question.webp`
  11. `vts-2025-12-31_09h57_41.png` → `sparkle.webp`
  12. `vts-2025-12-31_09h57_49.png` → `loading.webp`
  13. `vts-2025-12-31_09h58_12.png` → `sigh.webp`
  14. `vts-2025-12-31_09h58_19.png` → `smug.webp`
  15. `vts-2025-12-31_09h58_28.png` → `burnout.webp`
  16. `vts-2025-12-31_09h58_42.png` → `excited.webp`
  17. `vts-2025-12-31_09h58_49.png` → `sleep.webp`
  18. `vts-2025-12-31_09h58_56.png` → `love.webp`
  19. `vts-2025-12-31_09h59_04.png` → `angry.webp`
  20. `vts-2025-12-31_09h59_11.png` → `calm.webp`

- [ ] **Step 1: asset 존재/투명 이미지 회귀 테스트를 작성한다**

```js
// tests/chuntris-assets-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const names = ['idle','gameover','dizzy','cry-a','cry-b','alert','sweat','money','smile','question','sparkle','loading','sigh','smug','burnout','excited','sleep','love','angry','calm'];
for (const name of names) {
  const path = new URL(`../assets/chuntris/${name}.webp`, import.meta.url);
  assert.ok(fs.existsSync(path), `${name}.webp missing`);
  assert.ok(fs.statSync(path).size > 1024, `${name}.webp too small`);
}
console.log('chuntris assets regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-assets-regression.mjs`

Expected: FAIL on first missing asset.

- [ ] **Step 3: 원본 RGBA를 WebP로 변환한다**

실행 환경에서 Pillow를 사용해 원본 alpha를 유지하고, 1920×1080 이미지는 실제 캐릭터 bounding box를 기준으로 투명 여백을 과도하게 남기지 않되 원형 효과(!, ?, Zzz, 돈 등)가 잘리지 않게 24px padding을 둔다. 긴 변은 최대 900px로 리사이즈하고 WebP quality 88, method 6으로 저장한다. 첫 794×875 원본도 같은 최대 900px 규칙으로 처리한다.

- [ ] **Step 4: asset test를 통과시킨다**

Run: `node tests/chuntris-assets-regression.mjs`

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add assets/chuntris tests/chuntris-assets-regression.mjs
git commit -m "assets: add Chuntris reaction character set"
```

---

### Task 5: 춘트리스 페이지와 반응형 레이아웃을 만든다

**Files:**
- Create: `chuntris.html`
- Create: `chuntris.css`
- Create: `tests/chuntris-ui-regression.mjs`

**Interfaces:**
- `body[data-page="chuntris"]`.
- Required IDs: `chuntris-game`, `chuntris-board`, `chuntris-hold`, `chuntris-next`, `chuntris-score`, `chuntris-level`, `chuntris-lines`, `chuntris-time`, `chuntris-best`, `chuntris-reaction`, `chuntris-status`, `chuntris-start`, `chuntris-pause`, `chuntris-sound`, `chuntris-volume`, `chuntris-mobile-controls`.
- Mode buttons: `[data-chuntris-mode="classic"]`, `[data-chuntris-mode="sprint40"]`.
- Control buttons: `[data-chuntris-action="left|soft-drop|right|rotate-ccw|rotate-cw|hold|hard-drop"]`.

- [ ] **Step 1: UI contract test를 먼저 작성한다**

```js
// tests/chuntris-ui-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');
assert.ok(html.includes('<title>춘트리스 | 춘봉 팬사이트</title>'));
assert.ok(html.includes('data-page="chuntris"'));
for (const id of ['chuntris-game','chuntris-board','chuntris-hold','chuntris-next','chuntris-score','chuntris-level','chuntris-lines','chuntris-time','chuntris-best','chuntris-reaction','chuntris-status','chuntris-start','chuntris-pause','chuntris-sound','chuntris-volume','chuntris-mobile-controls']) {
  assert.ok(html.includes(`id="${id}"`), id);
}
for (const mode of ['classic','sprint40']) assert.ok(html.includes(`data-chuntris-mode="${mode}"`));
for (const action of ['left','soft-drop','right','rotate-ccw','rotate-cw','hold','hard-drop']) assert.ok(html.includes(`data-chuntris-action="${action}"`));
assert.ok(css.includes('@media'));
assert.ok(css.includes('touch-action'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('chuntris UI regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-ui-regression.mjs`

Expected: FAIL because page files do not exist.

- [ ] **Step 3: HTML을 기존 팬사이트 shell에 맞춰 작성한다**

`styles.css`와 `chuntris.css`를 load하고 header/footer는 기존 페이지 패턴을 사용한다. hero에는 `08 / CHUNTRIS`, `춘트리스`, 두 모드 설명을 넣는다. `canvas#chuntris-board`에는 `width="320" height="640" aria-label="춘트리스 10×20 게임 보드"`를 설정하고 주변에 텍스트 상태를 제공한다.

- [ ] **Step 4: CSS desktop/mobile layout을 구현한다**

Desktop은 Hold / Board / Next+Stats+Reaction 3열, mobile은 board 중심 single-column + compact status + 하단 control grid로 전환한다. 게임 영역에 `touch-action: none`, 버튼에는 최소 44px target, reduced-motion override를 둔다.

- [ ] **Step 5: UI regression을 통과시킨다**

Run:

```bash
node tests/chuntris-ui-regression.mjs
```

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add chuntris.html chuntris.css tests/chuntris-ui-regression.mjs
git commit -m "feat: add Chuntris game page"
```

---

### Task 6: Canvas 렌더링, 키보드/모바일 입력, 저장, 캐릭터 리액션을 연결

**Files:**
- Create: `chuntris.js`
- Create: `tests/chuntris-runtime-regression.mjs`
- Modify: `chuntris.html`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- Consumes: `globalThis.ChuntrisEngine`.
- Produces `globalThis.ChuntrisApp` with `{ start, pause, setMode, render, getGame }` for production diagnostics.
- Reaction map uses the 20 stable asset names from Task 4.
- localStorage keys: `chuntris.bestScore.classic.v1`, `chuntris.bestTime.sprint40.v1`.

- [ ] **Step 1: runtime source contract test를 작성한다**

```js
// tests/chuntris-runtime-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const token of ['requestAnimationFrame','devicePixelRatio','ArrowLeft','ArrowRight','ArrowDown','Space','chuntris.bestScore.classic.v1','chuntris.bestTime.sprint40.v1','visibilitychange','assets/chuntris/gameover.webp','assets/chuntris/money.webp','assets/chuntris/sleep.webp']) {
  assert.ok(js.includes(token), token);
}
assert.ok(js.includes('DAS_MS = 150'));
assert.ok(js.includes('ARR_MS = 40'));
console.log('chuntris runtime regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-runtime-regression.mjs`

Expected: FAIL because `chuntris.js` does not exist.

- [ ] **Step 3: Canvas renderer를 구현한다**

DPR에 맞춰 backing-store를 resize하고 logical 320×640 좌표로 grid/fixed cells/ghost/active를 순서대로 그린다. Hold와 Next는 작은 별도 canvas 또는 동일 draw helper를 사용하는 DOM canvas로 그린다. 각 tetromino는 type별 명확한 색상과 highlight/border를 둔다.

- [ ] **Step 4: game loop와 keyboard/touch 입력을 구현한다**

`requestAnimationFrame(now => game.advance(now))`를 사용한다. `keydown`에서 Arrow/Space/X/Z/C/Shift/P/Esc를 처리하고 게임 활성 중인 키만 preventDefault한다. 좌우/soft-drop은 pointerdown 후 DAS 150ms, ARR 40ms interval; pointerup/pointercancel/blur에서 반복을 반드시 해제한다.

- [ ] **Step 5: 저장/모드/자동 pause를 구현한다**

localStorage는 try/catch wrapper를 사용한다. classic gameover 시 score가 best보다 높으면 저장하고, sprint completed 시 elapsedMs가 기존 값보다 작거나 기존 값이 없을 때 저장한다. `document.visibilitychange`에서 hidden + playing이면 pause한다.

- [ ] **Step 6: 캐릭터 reaction state resolver를 구현한다**

우선순위는 `gameover/completed > critical(85%) > danger(70%) > special clear/combo > normal clear > idle`. 매핑은 최소 다음을 지킨다.

```js
const REACTION_ASSETS = {
  idle: 'assets/chuntris/idle.webp',
  gameover: 'assets/chuntris/gameover.webp',
  dizzy: 'assets/chuntris/dizzy.webp',
  cryA: 'assets/chuntris/cry-a.webp',
  cryB: 'assets/chuntris/cry-b.webp',
  alert: 'assets/chuntris/alert.webp',
  sweat: 'assets/chuntris/sweat.webp',
  money: 'assets/chuntris/money.webp',
  smile: 'assets/chuntris/smile.webp',
  question: 'assets/chuntris/question.webp',
  sparkle: 'assets/chuntris/sparkle.webp',
  loading: 'assets/chuntris/loading.webp',
  sigh: 'assets/chuntris/sigh.webp',
  smug: 'assets/chuntris/smug.webp',
  burnout: 'assets/chuntris/burnout.webp',
  excited: 'assets/chuntris/excited.webp',
  sleep: 'assets/chuntris/sleep.webp',
  love: 'assets/chuntris/love.webp',
  angry: 'assets/chuntris/angry.webp',
  calm: 'assets/chuntris/calm.webp'
};
```

1 line→smile, 2→sparkle, 3→love, Tetris→money, combo 3+→sparkle/excited variation, combo 6+→excited, danger→alert/sweat, critical→burnout/cry variation, pause or 10s inactivity→sleep, completed→love/sparkle, new best→money, gameover→gameover. transient normal 800ms / special 1200ms.

- [ ] **Step 7: script order를 HTML에 연결한다**

`chuntris.html` 하단은 공통 `page.js` 뒤에 `chuntris-engine.js`, `chuntris-audio.js`(Task 7에서 생성), `chuntris.js` 순서를 최종 목표로 한다. Task 6에서는 audio file이 아직 없으므로 `chuntris-engine.js`와 `chuntris.js`만 연결하고 Task 7에서 audio tag를 사이에 추가한다.

- [ ] **Step 8: runtime tests와 syntax를 통과시킨다**

Run:

```bash
node --check chuntris-engine.js
node --check chuntris.js
node tests/chuntris-runtime-regression.mjs
node tests/chuntris-ui-regression.mjs
```

Expected: all exit 0.

- [ ] **Step 9: Site regression workflow에 runtime syntax check를 추가한다**

```yaml
node --check chuntris-engine.js
node --check chuntris.js
```

- [ ] **Step 10: 커밋한다**

```bash
git add chuntris.js chuntris.html tests/chuntris-runtime-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: wire Chuntris gameplay and reactions"
```

---

### Task 7: Web Audio 효과음과 설정 저장을 추가

**Files:**
- Create: `chuntris-audio.js`
- Create: `tests/chuntris-audio-regression.mjs`
- Modify: `chuntris.html`
- Modify: `chuntris.js`
- Modify: `.github/workflows/site-regression.yml`

**Interfaces:**
- Produces `globalThis.ChuntrisAudio` with `resume()`, `play(name)`, `setEnabled(value)`, `setVolume(value)`, `getSettings()`.
- Supported names: `move`, `rotate`, `lock`, `line`, `tetris`, `levelup`, `gameover`, `complete`.
- localStorage keys: `chuntris.sound.enabled.v1`, `chuntris.sound.volume.v1`.

- [ ] **Step 1: audio source test를 작성한다**

```js
// tests/chuntris-audio-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const js = fs.readFileSync(new URL('../chuntris-audio.js', import.meta.url), 'utf8');
for (const token of ['AudioContext','chuntris.sound.enabled.v1','chuntris.sound.volume.v1','move','rotate','lock','line','tetris','levelup','gameover','complete']) assert.ok(js.includes(token), token);
console.log('chuntris audio regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-audio-regression.mjs`

Expected: FAIL because file does not exist.

- [ ] **Step 3: 합성 효과음 모듈을 구현한다**

첫 user gesture 전에는 `AudioContext`를 만들지 않는다. `play(name)`은 oscillator/gain/noise를 40~220ms 범위로 조합한다. master gain은 저장 volume 0..1을 사용하고 enabled false면 no-op한다.

- [ ] **Step 4: UI에 ON/OFF와 volume을 연결한다**

`#chuntris-sound`는 `aria-pressed`; `#chuntris-volume`은 0..100 range. 첫 Start 또는 control gesture에서 `ChuntrisAudio.resume()` 호출. engine action 결과에 따라 효과음을 호출하되 반복 key 이동 sound가 과도하지 않게 35ms 이상 throttle한다.

- [ ] **Step 5: HTML script order를 완성한다**

```html
<script src="content.js"></script>
<script src="page.js"></script>
<script src="chuntris-engine.js"></script>
<script src="chuntris-audio.js"></script>
<script src="chuntris.js"></script>
```

- [ ] **Step 6: regression과 syntax를 통과시킨다**

Run:

```bash
node --check chuntris-audio.js
node --check chuntris.js
node tests/chuntris-audio-regression.mjs
node tests/chuntris-runtime-regression.mjs
```

Expected: all exit 0.

- [ ] **Step 7: Site regression workflow에 audio syntax check를 추가한다**

최종 workflow에 아래 세 줄이 함께 있어야 한다.

```yaml
node --check chuntris-engine.js
node --check chuntris-audio.js
node --check chuntris.js
```

- [ ] **Step 8: 커밋한다**

```bash
git add chuntris-audio.js chuntris.html chuntris.js tests/chuntris-audio-regression.mjs .github/workflows/site-regression.yml
git commit -m "feat: add Chuntris sound effects"
```

---

### Task 8: 팬사이트 모든 주요 페이지에 춘트리스 내비게이션을 연결

**Files:**
- Modify: `index.html`
- Modify: `schedule.html`
- Modify: `notice.html`
- Modify: `vod.html`
- Modify: `clips.html`
- Modify: `fanart.html`
- Modify: `tarot.html`
- Modify: `youtube.html`
- Modify: `data.html`
- Modify: `history.html`
- Modify: `chuntris.html`
- Create: `tests/chuntris-navigation-regression.mjs`

**Interfaces:**
- All main navs include `<a data-nav="chuntris" href="chuntris.html">춘트리스</a>`.
- `chuntris.html` body uses `data-page="chuntris"`, allowing existing `page.js` `setupNavigation()` to set active state without modifying `page.js`.

- [ ] **Step 1: nav regression test를 작성한다**

```js
// tests/chuntris-navigation-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris'];
for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes('data-nav="chuntris" href="chuntris.html">춘트리스</a>'), page);
}
const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="chuntris"'));
console.log('chuntris navigation regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-navigation-regression.mjs`

Expected: FAIL on `index` before nav links are added.

- [ ] **Step 3: 모든 11개 페이지의 main nav에 동일한 링크를 추가한다**

기존 순서를 크게 흔들지 않고 `TAROT`과 `유튜브` 사이에 `춘트리스`를 배치한다.

- [ ] **Step 4: nav regression을 통과시킨다**

Run: `node tests/chuntris-navigation-regression.mjs`

Expected: PASS.

- [ ] **Step 5: 전체 static regression을 실행한다**

Run:

```bash
set -e
for file in tests/*.mjs; do node "$file"; done
```

Expected: every test exits 0.

- [ ] **Step 6: 커밋한다**

```bash
git add index.html schedule.html notice.html vod.html clips.html fanart.html tarot.html youtube.html data.html history.html chuntris.html tests/chuntris-navigation-regression.mjs
git commit -m "feat: link Chuntris across fan site navigation"
```

---

### Task 9: 운영 Chromium smoke workflow를 추가하고 실제 게임 상호작용을 검증

**Files:**
- Create: `.github/workflows/chuntris-production-smoke.yml`
- Create: `tests/chuntris-production-smoke-source-regression.mjs`

**Interfaces:**
- Production URL: `https://chunbong-fansite.vercel.app/chuntris.html`.
- Workflow path triggers: `chuntris.html`, `chuntris.css`, `chuntris-engine.js`, `chuntris-audio.js`, `chuntris.js`, `assets/chuntris/**`, workflow itself.

- [ ] **Step 1: workflow source regression을 작성한다**

```js
// tests/chuntris-production-smoke-source-regression.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const yml = fs.readFileSync(new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url), 'utf8');
for (const token of ['chuntris.html','chuntris-engine.js','assets/chuntris/**','playwright@1.55.0','chunbong-fansite.vercel.app/chuntris.html','data-chuntris-mode','chuntris-start']) assert.ok(yml.includes(token), token);
console.log('chuntris production smoke source regression passed');
```

- [ ] **Step 2: RED를 확인한다**

Run: `node tests/chuntris-production-smoke-source-regression.mjs`

Expected: FAIL because workflow does not exist.

- [ ] **Step 3: HTTP readiness loop를 구현한다**

최대 60회, 5초 간격으로 production page/CSS/engine/runtime 및 `assets/chuntris/idle.webp`, `assets/chuntris/gameover.webp`가 HTTP 200인지 확인한다. 페이지 내용에 `춘트리스`, `data-chuntris-mode="classic"`, `data-chuntris-mode="sprint40"`, `chuntris.js`가 모두 존재해야 ready로 간주한다.

- [ ] **Step 4: Playwright Chromium smoke를 구현한다**

Workflow에서 `npm install --no-save --no-package-lock playwright@1.55.0` + `npx playwright install chromium` 후 다음을 검증한다.

```js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('https://chunbong-fansite.vercel.app/chuntris.html', { waitUntil: 'networkidle' });
assert.equal(await page.locator('#chuntris-board').count(), 1);
await page.locator('[data-chuntris-mode="classic"]').click();
await page.locator('#chuntris-start').click();
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('KeyX');
await page.keyboard.press('Space');
await page.waitForTimeout(100);
const classic = await page.evaluate(() => ({
  status: document.querySelector('#chuntris-game').dataset.gameStatus,
  score: Number(document.querySelector('#chuntris-score').textContent.replace(/[^0-9]/g, '')),
  app: Boolean(window.ChuntrisApp?.getGame?.())
}));
assert.equal(classic.status, 'playing');
assert.ok(classic.score >= 0);
assert.equal(classic.app, true);
await page.locator('#chuntris-pause').click();
assert.equal(await page.locator('#chuntris-game').getAttribute('data-game-status'), 'paused');
await page.locator('[data-chuntris-mode="sprint40"]').click();
await page.locator('#chuntris-start').click();
assert.equal(await page.locator('#chuntris-game').getAttribute('data-mode'), 'sprint40');
await browser.close();
```

모바일 viewport 390×844를 별도로 열어 `#chuntris-mobile-controls`가 visible이고 `data-chuntris-action="left"`, `hard-drop` 버튼을 click할 수 있는지도 확인한다.

- [ ] **Step 5: workflow source regression을 통과시킨다**

Run: `node tests/chuntris-production-smoke-source-regression.mjs`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add .github/workflows/chuntris-production-smoke.yml tests/chuntris-production-smoke-source-regression.mjs
git commit -m "test: add Chuntris production smoke"
```

---

### Task 10: 전체 검증, PR, main 병합, 운영 배포를 확인

**Files:**
- Review all files changed in Tasks 1-9.

**Interfaces:**
- No new interfaces; this task proves the feature against the approved spec.

- [ ] **Step 1: JavaScript syntax를 전체 확인한다**

Run:

```bash
node --check chuntris-engine.js
node --check chuntris-audio.js
node --check chuntris.js
```

Expected: all exit 0.

- [ ] **Step 2: 춘트리스 전용 regression을 모두 실행한다**

Run:

```bash
node tests/chuntris-engine-core-regression.mjs
node tests/chuntris-engine-controls-regression.mjs
node tests/chuntris-engine-scoring-regression.mjs
node tests/chuntris-assets-regression.mjs
node tests/chuntris-ui-regression.mjs
node tests/chuntris-runtime-regression.mjs
node tests/chuntris-audio-regression.mjs
node tests/chuntris-navigation-regression.mjs
node tests/chuntris-production-smoke-source-regression.mjs
```

Expected: all exit 0.

- [ ] **Step 3: 기존 전체 Site regression과의 회귀를 확인한다**

Run:

```bash
set -e
count=0
for file in tests/*.mjs; do
  echo "==> $file"
  node "$file"
  count=$((count + 1))
done
echo "REGRESSION_TEST_FILES=$count"
```

Expected: exit 0, zero failed files.

- [ ] **Step 4: 브라우저 수동 체크를 한다**

Local/static preview에서 desktop과 390px mobile viewport로 다음을 확인한다: 두 모드 시작, Hold, Next 5, Ghost, 좌우/회전/Hard Drop, pause/resume, 모바일 long press release, 캐릭터 이미지 load, sound toggle/volume, resize 후 board 유지, hidden→pause.

- [ ] **Step 5: 구현 branch에서 PR을 열고 diff를 review한다**

PR 설명에는 두 모드, 엔진/UI/audio/assets 분리, TDD test files, 운영 smoke workflow를 명시한다. 변경된 binary asset 20개가 모두 `assets/chuntris/` 아래인지 확인한다.

- [ ] **Step 6: PR CI 성공 후 main에 병합한다**

Site regression이 success인 것을 확인하고 merge한다. 병합 전 head SHA가 review한 SHA와 같은지 확인한다.

- [ ] **Step 7: main Vercel status를 확인한다**

병합 commit의 combined status에서 Vercel `Deployment has completed` / `success`를 확인한다.

- [ ] **Step 8: main의 `Chuntris production smoke`가 success인지 확인한다**

HTTP readiness + desktop Chromium + mobile control 단계가 모두 성공해야 완료로 판정한다.

- [ ] **Step 9: 운영 URL을 실제로 재확인한다**

`https://chunbong-fansite.vercel.app/chuntris.html`에서 page title, 두 mode button, Canvas, Hold/Next, reaction image, mobile controls가 노출되는지 확인하고, production browser에서 최소 한 번 Hard Drop 후 score/status가 갱신되는 것을 확인한다.

- [ ] **Step 10: 최종 완료 보고에 증거를 남긴다**

최종 답변에는 merge PR 번호, main commit SHA, Site regression run 결과, Vercel status, Chuntris production smoke run 결과, 운영 URL을 포함한다.
