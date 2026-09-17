# Chuntris Immersive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Chuntris around a mode-selection start flow and enlarged play surface, move ranking/sound/controls into modal utilities, make nickname optional/local-only when blank, preserve exact pause/resume semantics, and add dedicated hard-drop plus SINGLE/DOUBLE/TRIPLE/QUAD visual/audio feedback.

**Architecture:** Keep `chuntris-engine.js` as the gameplay source of truth and concentrate UI state, modal orchestration, optional nickname policy, and presentation event dispatch in `chuntris.js`. Keep Web Audio in `chuntris-audio.js`, semantic view/modal containers in `chuntris.html`, and responsive presentation in `chuntris.css` / `chuntris-fullscreen.css`. Existing `/api/content?type=chuntris-ranking` remains unchanged.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Canvas 2D, Web Audio API, localStorage, existing Chuntris engine/ranking core, Node regression tests, GitHub Actions preview/live smoke.

**Spec:** `docs/superpowers/specs/2026-09-17-chuntris-immersive-ui-design.md`

## Global Constraints

- Preserve Classic Endless and 40-line Time Attack rules; 40-line mode terminates at 40 cleared lines and records final time.
- Blank nickname must allow play, update local best records, and never POST a global ranking entry.
- Named valid nickname keeps the existing global ranking behavior.
- Active desktop play must not keep ranking/help rails permanently visible.
- Manual pause must preserve board, active piece, HOLD, NEXT queue, score, lines, combo, and elapsed time.
- Utility modals resume only when that modal itself auto-paused an actively playing game.
- Exact ordinary line-clear labels: 1 `SINGLE`, 2 `DOUBLE`, 3 `TRIPLE`, 4 `QUAD`, regardless of combo/T-Spin state.
- Dedicated audio events: `harddrop`, `single`, `double`, `triple`, `quad`; do not double-play generic `line`/`tetris` clear audio.
- Preserve existing sound persistence keys `chuntris.sound.enabled.v1` and `chuntris.sound.volume.v1`.
- Preserve mobile touch controls and HOLD/NEXT/reaction behavior.
- Respect `prefers-reduced-motion` by removing board shake and reducing animation intensity.

---

### Task 1: Lock the new HTML/UI contracts with failing regressions

**Files:**
- Create: `tests/chuntris-immersive-ui-regression.mjs`
- Modify: `tests/chuntris-ui-regression.mjs`
- Test: `tests/chuntris-immersive-ui-regression.mjs`

**Interfaces:**
- Consumes: existing `chuntris.html` markup.
- Produces: stable DOM ids/data attributes used by later JS/CSS tasks: `chuntris-start-view`, `chuntris-play-view`, `chuntris-mode-classic`, `chuntris-mode-sprint40`, `chuntris-player-step`, `chuntris-utility-ranking`, `chuntris-utility-sound`, `chuntris-utility-controls`, `chuntris-utility-pause`, `chuntris-modal`, `chuntris-modal-body`, `chuntris-pause-continue`, `chuntris-pause-new`, `chuntris-clear-label`, `chuntris-harddrop-fx`.

- [ ] **Step 1: Write the failing source-contract test**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
for (const marker of [
  'id="chuntris-start-view"', 'id="chuntris-play-view"',
  'id="chuntris-mode-classic"', 'id="chuntris-mode-sprint40"',
  'id="chuntris-player-step"', 'id="chuntris-utility-ranking"',
  'id="chuntris-utility-sound"', 'id="chuntris-utility-controls"',
  'id="chuntris-utility-pause"', 'id="chuntris-modal"',
  'id="chuntris-pause-continue"', 'id="chuntris-pause-new"',
  'id="chuntris-clear-label"', 'id="chuntris-harddrop-fx"'
]) assert.ok(html.includes(marker), marker);
assert.ok(!html.includes('class="chuntris-ranking-rail"'));
assert.ok(!html.includes('class="chuntris-help-rail"'));
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/chuntris-immersive-ui-regression.mjs`
Expected: FAIL on missing `chuntris-start-view`.

- [ ] **Step 3: Update the legacy UI regression expectations**

Change old assertions that require permanently visible ranking/help rails so they instead require ranking/controls content inside the modal shell and require the existing board/HOLD/NEXT/mobile controls to remain present.

- [ ] **Step 4: Re-run both tests and keep them RED until Task 2 markup exists**

Run: `node tests/chuntris-immersive-ui-regression.mjs && node tests/chuntris-ui-regression.mjs`
Expected: FAIL only for intentionally missing new markup.

- [ ] **Step 5: Commit**

```bash
git add tests/chuntris-immersive-ui-regression.mjs tests/chuntris-ui-regression.mjs
git commit -m "test: define immersive Chuntris UI contracts"
```

### Task 2: Build the start/play/modal markup and enlarged three-column shell

**Files:**
- Modify: `chuntris.html`
- Modify: `chuntris.css`
- Modify: `chuntris-fullscreen.css`
- Test: `tests/chuntris-immersive-ui-regression.mjs`

**Interfaces:**
- Consumes: DOM ids from Task 1.
- Produces: semantic start mode step, optional player step, active play view, compact utility cluster, common modal shell, pause actions, modal ranking/sound/controls panels, presentation overlay elements.

- [ ] **Step 1: Add the start view and optional player step**

Use two large buttons with `data-chuntris-mode="classic"` / `sprint40`; keep `#chuntris-player-step` hidden until mode selection. Nickname copy must state optional/local-only behavior.

- [ ] **Step 2: Replace the five-column active layout with a three-column core**

Desktop grid areas must be `left board right`; move ranking/help content out of the grid and into modal panel templates/sections.

- [ ] **Step 3: Add game utility buttons outside the board**

Add compact controls for ranking, sound, key controls, and pause, reachable on desktop and mobile.

- [ ] **Step 4: Add the common modal shell and pause/new-game confirmation structures**

The common shell must expose an accessible title, close button, modal body, ranking tabs/list, sound controls, controls help, pause actions, and new-game confirmation actions.

- [ ] **Step 5: Add presentation layers**

Place `#chuntris-clear-label` and `#chuntris-harddrop-fx` inside/over the board wrapper without changing canvas dimensions or engine rules.

- [ ] **Step 6: Implement responsive CSS and reduced-motion declarations**

Desktop prioritizes board height/width; tablet compresses side panels; mobile maximizes board width and renders modal as near-full-screen/bottom-sheet. Add `@media (prefers-reduced-motion: reduce)` rules that disable shake and reduce transitions.

- [ ] **Step 7: Run markup regressions**

Run: `node tests/chuntris-immersive-ui-regression.mjs && node tests/chuntris-ui-regression.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add chuntris.html chuntris.css chuntris-fullscreen.css tests/chuntris-immersive-ui-regression.mjs tests/chuntris-ui-regression.mjs
git commit -m "feat: add immersive Chuntris start and play shell"
```

### Task 3: Add explicit UI state and optional nickname behavior

**Files:**
- Create: `tests/chuntris-flow-regression.mjs`
- Modify: `chuntris.js`

**Interfaces:**
- Consumes: Task 2 DOM ids.
- Produces: `setViewState(nextState)`, `openUtilityModal(kind)`, `closeUtilityModal()`, `openPauseMenu()`, `continueGame()`, `returnToStartForNewGame()`, and a blank-safe `currentNickname()`/`start()` policy.

- [ ] **Step 1: Write source/runtime contract tests for state transitions and blank nickname**

Require `start-mode`, `start-player`, `playing`, `paused`, `terminal` state strings; require blank nickname path to call `game.start(...)` without validation failure; require ranking submission to short-circuit when nickname is absent.

- [ ] **Step 2: Run RED**

Run: `node tests/chuntris-flow-regression.mjs`
Expected: FAIL because current `start()` blocks blank nickname and explicit view state does not exist.

- [ ] **Step 3: Implement explicit view state**

Maintain `uiState` separately from engine status. Initial view is `start-mode`; choosing a mode moves to `start-player`; starting moves to `playing`; terminal engine states map to `terminal`.

- [ ] **Step 4: Make nickname optional**

`currentNickname()` returns `null` for blank input without treating it as an error. Persist only valid non-empty nicknames. `start()` must not focus or reject blank nickname. `submitRanking()` must return immediately on `null` nickname.

- [ ] **Step 5: Keep local best updates independent from ranking submission**

Do not change `updateRecords()` dependence on nickname; it must still persist classic/sprint local records for blank play.

- [ ] **Step 6: Run flow and existing ranking regressions**

Run: `node tests/chuntris-flow-regression.mjs && node tests/chuntris-ranking-regression.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add chuntris.js tests/chuntris-flow-regression.mjs
git commit -m "feat: add Chuntris start flow and optional nickname"
```

### Task 4: Implement modal pause/resume semantics and pause menu

**Files:**
- Create: `tests/chuntris-modal-pause-regression.mjs`
- Modify: `chuntris.js`
- Modify: `chuntris.css`

**Interfaces:**
- Consumes: engine `pause(now)` / `resume(now)` and Task 3 UI-state helpers.
- Produces: modal bookkeeping flag `modalAutoPaused`, trigger restoration, manual pause menu, nested sound/controls from pause without accidental resume.

- [ ] **Step 1: Write failing tests for auto-pause bookkeeping**

Assert source contains a dedicated boolean/bookkeeping value for “this modal caused the pause”, and that close logic resumes only under that condition.

- [ ] **Step 2: Run RED**

Run: `node tests/chuntris-modal-pause-regression.mjs`
Expected: FAIL because current code only toggles pause directly.

- [ ] **Step 3: Implement utility-modal open/close rules**

If engine is `playing`, opening ranking/sound/controls pauses it and records `modalAutoPaused = true`. If engine is already `paused`, keep `false`. Closing resumes only when `modalAutoPaused` is true.

- [ ] **Step 4: Implement manual pause menu**

Pause button, `P`, and `Escape` with no utility modal open all invoke the same pause-menu path. Continue resumes the same engine state; sound/controls opened from pause do not resume on close.

- [ ] **Step 5: Implement new-game confirmation**

`새 게임` opens confirmation; confirm resets the engine and returns to `start-player` for the currently selected mode; cancel returns to pause menu without altering game state.

- [ ] **Step 6: Add focus/scroll/input protection**

When modal is open, disable background game input and body/page scrolling as appropriate; restore focus to the trigger where practical.

- [ ] **Step 7: Run modal regressions**

Run: `node tests/chuntris-modal-pause-regression.mjs && node tests/chuntris-flow-regression.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add chuntris.js chuntris.css tests/chuntris-modal-pause-regression.mjs
git commit -m "feat: add Chuntris modal and pause state machine"
```

### Task 5: Add dedicated hard-drop and line-clear audio events

**Files:**
- Create: `tests/chuntris-audio-effects-regression.mjs`
- Modify: `chuntris-audio.js`
- Modify: `chuntris.js`

**Interfaces:**
- Consumes: existing `ChuntrisAudio.play(name)` API.
- Produces: supported events `harddrop`, `single`, `double`, `triple`, `quad`.

- [ ] **Step 1: Write failing audio contract tests**

Assert all five event names are present in `supported`; assert `chuntris.js` maps hard-drop to `harddrop`, 1→`single`, 2→`double`, 3→`triple`, 4→`quad`; assert generic `line`/`tetris` are not also dispatched for those clears.

- [ ] **Step 2: Run RED**

Run: `node tests/chuntris-audio-effects-regression.mjs`
Expected: FAIL on missing `harddrop`/clear-specific events.

- [ ] **Step 3: Implement Web Audio signatures**

Add short low-frequency impact + transient for `harddrop`; progressively richer/pitched signatures for `single`, `double`, `triple`, `quad`, all through the existing master gain.

- [ ] **Step 4: Update event dispatch**

Hard drop calls only `play('harddrop')` for the dedicated impact event. Clear observation chooses exactly one of `single`/`double`/`triple`/`quad`; retain other unrelated sounds such as level-up and game-over.

- [ ] **Step 5: Run audio regressions**

Run: `node tests/chuntris-audio-effects-regression.mjs && node tests/chuntris-audio-regression.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add chuntris-audio.js chuntris.js tests/chuntris-audio-effects-regression.mjs
git commit -m "feat: add Chuntris hard-drop and clear sounds"
```

### Task 6: Add hard-drop and SINGLE/DOUBLE/TRIPLE/QUAD visual presentation

**Files:**
- Create: `tests/chuntris-effects-regression.mjs`
- Modify: `chuntris.js`
- Modify: `chuntris.css`

**Interfaces:**
- Consumes: Task 2 effect DOM and engine `lastClear` snapshot details.
- Produces: `showHardDropEffect(...)`, `showClearEffect(lines, clearDetail)`, exact line-label map.

- [ ] **Step 1: Write failing effect mapping tests**

Require exact mapping object/logic: `{1:'SINGLE',2:'DOUBLE',3:'TRIPLE',4:'QUAD'}` and dedicated hard-drop effect call from hard-drop action.

- [ ] **Step 2: Run RED**

Run: `node tests/chuntris-effects-regression.mjs`
Expected: FAIL because presentation helpers do not exist.

- [ ] **Step 3: Implement hard-drop effect**

Capture pre-drop active-piece/ghost positions before `game.hardDrop()`, then render a 150–250 ms trail/impact effect and short board shake class. Reduced-motion uses flash only.

- [ ] **Step 4: Implement line-clear label and row-flash effect**

On new `lastClear`, show exact label by `lines` and intensity class `is-single`/`is-double`/`is-triple`/`is-quad`; clear the transient class/text after ~0.7–1.0 s without blocking input.

- [ ] **Step 5: Keep reaction mapping aligned**

1→smile, 2→sparkle, 3→love/high excitement, 4→strongest celebration. Combo may affect reaction duration but must not change the label.

- [ ] **Step 6: Run effect regressions**

Run: `node tests/chuntris-effects-regression.mjs && node tests/chuntris-runtime-source-regression.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add chuntris.js chuntris.css tests/chuntris-effects-regression.mjs
git commit -m "feat: add Chuntris drop and line-clear effects"
```

### Task 7: Update responsive/live smoke coverage for the immersive UI

**Files:**
- Modify: `tests/chuntris-layout-regression.mjs`
- Create: `tests/chuntris-immersive-responsive-regression.mjs`
- Modify: `.github/workflows/chuntris-preview-live-smoke.yml`
- Modify: `.github/workflows/chuntris-preview-layout-smoke.yml`

**Interfaces:**
- Consumes: final HTML/CSS/JS from Tasks 2–6.
- Produces: preview gates for desktop 1440×900, tablet 1024×768, mobile 390×844.

- [ ] **Step 1: Add source responsive contracts**

Require three-column desktop grid, modal mobile breakpoint, utility cluster, reduced-motion rules, and absence of permanent active-play ranking/help columns.

- [ ] **Step 2: Run RED/GREEN source regression**

Run: `node tests/chuntris-immersive-responsive-regression.mjs`
Expected: PASS once CSS from prior tasks is complete; otherwise fix only layout contract gaps.

- [ ] **Step 3: Update live smoke flow**

Browser smoke should: open start screen, choose Classic, start with blank nickname, verify board visible/larger, open ranking and close, open sound and close, open controls and close, pause, continue, and confirm no horizontal overflow.

- [ ] **Step 4: Add mobile/tablet layout checks**

At 1024×768 and 390×844 assert utility controls are reachable, modal fits viewport, board does not overflow, mobile controls remain visible/usable.

- [ ] **Step 5: Run local source tests**

Run: `node tests/chuntris-layout-regression.mjs && node tests/chuntris-immersive-responsive-regression.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/chuntris-layout-regression.mjs tests/chuntris-immersive-responsive-regression.mjs .github/workflows/chuntris-preview-live-smoke.yml .github/workflows/chuntris-preview-layout-smoke.yml
git commit -m "test: cover immersive Chuntris responsive flow"
```

### Task 8: Full regression, PR review, preview verification, merge readiness

**Files:**
- Modify only if tests expose real regressions.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: merge-ready PR with fresh evidence.

- [ ] **Step 1: Run JavaScript syntax checks**

Run: `node --check chuntris.js && node --check chuntris-audio.js && node --check chuntris-engine.js`
Expected: exit 0.

- [ ] **Step 2: Run the complete relevant local regression set**

Run all `tests/chuntris-*.mjs` plus the site multipage/navigation regression files referenced by `site-regression.yml`.
Expected: 0 failures.

- [ ] **Step 3: Open/update draft PR and wait for CI**

PR body must list start flow, optional nickname/local-only behavior, modal/pause semantics, enlarged board, hard-drop effect/audio, clear labels/audio, and responsive coverage.

- [ ] **Step 4: Verify Preview deployment**

Require Vercel Preview success and both Chuntris preview live/layout smoke workflows green on the final head SHA.

- [ ] **Step 5: Review diff against the spec**

Confirm no engine scoring/randomization/board-dimension changes, no anonymous ranking POST path, no removal of mobile controls, and no duplicate generic line/tetris clear audio.

- [ ] **Step 6: Mark PR ready only after fresh evidence**

Record CI run numbers/head SHA in the PR body.

- [ ] **Step 7: Merge only when requested/allowed and production deployment is available**

After merge, verify canonical production start/play/modal markers and run the existing production smoke when Vercel quota allows deployment.
