# Chuntris Immersive UI Redesign

Date: 2026-09-17
Status: Approved design, implementation pending
Branch: `feat/chuntris-immersive-ui-20260917`

## Goal

Redesign the existing Chuntris page so the actual playfield receives substantially more screen space while preserving the existing game engine, Classic Endless mode, 40-line Time Attack mode, ranking API, local best records, mobile controls, HOLD/NEXT panels, and character reactions.

The redesign replaces always-visible ranking and keyboard-help rails with contextual menus and modal panels. It also adds stronger visual and audio feedback for hard drops and line clears.

## User-visible flow

### 1. Entry / mode selection

When `chuntris.html` opens, the game does not immediately show the full play layout. The initial state is a dedicated start screen.

The first step presents two large mode choices:

- **클래식 무한** — existing endless score mode.
- **40줄 타임어택** — existing sprint mode that ends immediately when the player clears 40 total lines and records the completion time.

The 40-line mode remains a terminal 40-line sprint. It does not become an endless mode.

Below the mode selector, compact utility buttons open modal panels for:

- 전체 랭킹
- 소리 설정
- 키 조작법

### 2. Optional nickname step

After a mode is selected, the start screen reveals a nickname input and the game-start button.

Nickname behavior:

- Nickname is optional.
- Empty nickname never blocks game start.
- If nickname is valid and non-empty, terminal records may be submitted to the existing global ranking API.
- If nickname is empty, no global ranking POST is attempted.
- Empty-nickname play still updates the existing device-local best score / best sprint time.
- Existing nickname persistence remains for users who enter one.

### 3. Active play

After starting, the page switches to a play-focused layout. The permanently visible global-ranking rail and keyboard-help rail are removed from the play grid.

Desktop play uses a three-column core layout:

1. HOLD + score/statistics
2. enlarged game board
3. NEXT + Chunbong reaction panel

The game board is the visual priority and should grow as large as the viewport reasonably allows without clipping HOLD/NEXT or essential statistics.

A compact utility-button cluster sits outside the board near the upper-right of the game area. The available controls are:

- 랭킹
- 소리
- 키조작
- 일시정지

The buttons must remain accessible on desktop and mobile without permanently occupying the board's side-column width.

### 4. Contextual modal panels

Ranking, sound, and controls share one modal-shell system so focus management, close behavior, responsive layout, and pause behavior stay consistent.

#### Ranking modal

- Shows the existing global TOP 10 list.
- Retains Classic / 40-line ranking tabs.
- Uses the existing `/api/content?type=chuntris-ranking` API contract.
- Highlights the current named player when applicable.
- Anonymous/local-only play does not create a global ranking entry.

#### Sound modal

- Effects ON/OFF.
- Volume range 0–100.
- Uses existing localStorage keys:
  - `chuntris.sound.enabled.v1`
  - `chuntris.sound.volume.v1`
- Applies immediately to existing and new effects.

#### Controls modal

Shows the existing keyboard mapping clearly:

- Left / Right: move
- Down: soft drop
- Z / X or Up: rotate
- Space: hard drop
- C / Shift: HOLD
- P / Escape: pause

### 5. Modal pause semantics

Opening ranking, sound, or controls while a game is actively playing automatically pauses the game before the modal appears.

Closing a utility modal resumes the game only if that modal itself paused an actively playing game. It must not resume a game that was already manually paused before the modal opened.

The same rule applies to keyboard-initiated and button-initiated flows.

### 6. Pause menu

Manual pause opens a dedicated pause modal while preserving all current game state.

The pause menu contains:

- **계속하기** — resumes the same board, current piece, HOLD, NEXT queue, score, lines, combo, and elapsed-time state.
- **새 게임** — abandons the current round and returns to the start flow for the current mode, with confirmation before destructive reset.
- **소리 설정** — opens the shared sound panel without resuming gameplay.
- **키 조작법** — opens the shared controls panel without resuming gameplay.

P and Escape use this same pause/resume state machine rather than a separate path.

### 7. Game over and 40-line completion

Classic game over and 40-line completion keep their existing score/time semantics.

Terminal states must allow the player to:

- start a new game,
- view ranking,
- view sound settings,
- view key controls.

For 40-line Time Attack, the final clear completes the run, freezes the final time, applies the final line-clear presentation, updates local best time, and submits globally only when a valid non-empty nickname is present.

## Playfield layout

### Desktop

The previous five-column arrangement (`ranking | left | board | right | help`) becomes the three-column play layout (`left | board | right`).

The board target size should use available viewport height first and then available width, with responsive CSS limits rather than a hard-coded fixed canvas display size.

The HOLD and NEXT panels remain readable but narrower than the board. Stats may be compacted vertically to preserve board height.

The site header remains outside the game surface. Game utility controls stay visually associated with the game rather than returning to the site navigation header.

### Tablet

The core board remains centered and receives priority. HOLD/stats and NEXT/reaction may reduce width before moving below the board.

### Mobile

The board receives maximum practical width.

- Existing touch controls remain.
- Utility buttons remain available as a compact fixed/sticky cluster near the top of the game surface.
- HOLD, NEXT, reaction, and stats stack compactly below/around the board as viewport width requires.
- Ranking / sound / controls use near-full-screen modal or bottom-sheet presentation.
- When a modal is open, background scrolling and game input are disabled.

## Hard-drop presentation

Hard drop receives its own visual and audio event instead of reusing only the ordinary lock feedback.

### Visual

On Space / hard-drop action:

- render a short orange vertical trail along the piece's drop path,
- render a brief impact ring / flash at the landing position,
- apply a very small, short board impact shake,
- keep the full effect approximately 150–250 ms so repeated drops remain comfortable.

For `prefers-reduced-motion: reduce`:

- do not shake the board,
- reduce the effect to a short brightness / impact flash.

### Audio

Add a dedicated `harddrop` sound event using the existing Web Audio architecture. It should be a short low-frequency impact plus click/transient and must obey the same ON/OFF and volume settings as all other game effects.

## Line-clear presentation

The game engine's scoring and line-clear rules remain unchanged. Presentation reacts to the existing clear result.

### Clear labels

Exactly these labels are shown for ordinary 1–4 line clears:

- 1 line: **SINGLE**
- 2 lines: **DOUBLE**
- 3 lines: **TRIPLE**
- 4 lines: **QUAD**

The label appears centered over the playfield for roughly 0.7–1.0 seconds and does not block input after the underlying engine is ready for the next piece.

### Visual intensity

- SINGLE: short white/orange row flash and modest label.
- DOUBLE: stronger flash and glow.
- TRIPLE: stronger multi-row sweep and larger label.
- QUAD: strongest orange/gold flash and glow.

Cleared rows first flash, then visually wipe outward / disappear. The effect is presentation-only and must not alter board mutation timing or score calculations in the engine.

Existing Chunbong reaction feedback stays integrated:

- SINGLE → positive/smile reaction
- DOUBLE → sparkle reaction
- TRIPLE → high-excitement/love reaction
- QUAD → strongest celebration reaction

### Audio

Add distinct Web Audio events:

- `single`
- `double`
- `triple`
- `quad`

Increasing clear count increases pitch/harmonic richness. Existing generic `line` / `tetris` playback must not double-trigger alongside the new clear-specific sounds.

All clear sounds obey the persisted sound-enabled and volume settings.

## State model

The UI should use explicit view state rather than infer everything from scattered DOM visibility.

Recommended top-level UI states:

- `start-mode`
- `start-player`
- `playing`
- `paused`
- `terminal`

Modal state is orthogonal:

- `none`
- `ranking`
- `sound`
- `controls`
- `pause`
- `new-game-confirm`

The UI controller records whether opening a utility modal caused an automatic pause. Only that condition authorizes automatic resume when the modal closes.

The existing `ChuntrisGame` engine remains the source of truth for board/gameplay state.

## Code boundaries

Implementation should keep concerns separated:

### `chuntris-engine.js`

Do not redesign engine rules. Only add an engine-facing event detail if absolutely necessary for presentation and impossible to obtain from the existing snapshot. Existing Classic and 40-line behavior must remain compatible.

### `chuntris.js`

Becomes the coordinator for:

- start-flow state,
- optional nickname policy,
- pause/resume semantics,
- modal orchestration,
- game utility actions,
- ranking load/submit decisions,
- presentation-event dispatch.

Avoid putting large animation drawing routines directly into unrelated ranking/state functions.

### `chuntris-audio.js`

Extend supported sound events for:

- `harddrop`
- `single`
- `double`
- `triple`
- `quad`

Keep the current Web Audio/localStorage architecture.

### `chuntris.css` / `chuntris-fullscreen.css`

Own the redesigned start screen, enlarged three-column play layout, utility cluster, modal shell, pause menu, responsive stacking, line-clear label presentation, hard-drop/clear animations, and reduced-motion fallback.

### `chuntris.html`

Define semantic containers for the start flow, enlarged play surface, modal shell(s), utility controls, and presentation overlays. Remove always-visible ranking/help rails from the active-play layout while retaining their content inside modal panels.

## Accessibility and interaction

- Modal panels have accessible labels/titles.
- Keyboard focus moves into an opened modal and returns to the triggering control on close where practical.
- Escape closes non-pause utility modals according to the pause semantics; when no utility modal is open during play, Escape invokes pause.
- Hidden start/play sections are not keyboard-focusable.
- Sound controls expose their current enabled state.
- Range control remains keyboard-operable.
- Animation is reduced under `prefers-reduced-motion`.

## Ranking and persistence rules

Global ranking behavior remains backwards-compatible for named players.

A global submission requires a valid, non-empty nickname. Blank nickname means local-only play and never sends a ranking POST.

Existing persistence is retained:

- Classic local best score
- 40-line local best time
- Last valid nickname, when supplied
- Sound enabled state
- Sound volume

No anonymous `익명` global entry is created for blank nickname.

## Testing strategy

Implementation follows TDD on a feature branch.

### Contract / source regression

Add tests that fail before implementation for:

- initial dedicated mode-selection view,
- mode selection revealing optional nickname/start step,
- blank nickname allowed to start,
- blank nickname suppressing global ranking submission,
- named nickname preserving ranking submission,
- utility buttons for ranking / sound / controls / pause,
- removal of always-visible ranking and help rails from active-play layout,
- three-column desktop play layout contract,
- pause modal actions,
- modal-triggered pause/resume bookkeeping,
- `harddrop`, `single`, `double`, `triple`, `quad` audio event support,
- exact SINGLE / DOUBLE / TRIPLE / QUAD mapping,
- reduced-motion fallback declarations.

### Runtime tests

Verify:

- Classic starts with blank nickname.
- Sprint starts with blank nickname and still terminates at 40 cleared lines.
- Blank terminal play updates local best but does not POST ranking.
- Valid named terminal play still submits ranking.
- Opening ranking/sound/controls during play pauses.
- Closing the modal resumes only when it caused the pause.
- Opening a child settings/controls panel from manual pause never resumes on close.
- Continue from pause preserves board/piece/HOLD/NEXT/score/lines/time state.
- New game resets only after confirmation.
- Hard drop dispatches one hard-drop presentation/audio event.
- 1/2/3/4-line clears produce the exact label and one matching clear sound without duplicate generic line/tetris sound.

### Visual / responsive smoke

Preview smoke must cover at minimum:

- desktop around 1440×900,
- tablet around 1024×768,
- mobile around 390×844.

Checks include:

- enlarged board with no permanent ranking/help rails,
- no horizontal overflow,
- utility buttons reachable,
- start screen usable,
- modal content fits viewport,
- mobile game controls remain usable,
- pause and resume work,
- line-clear overlay does not permanently obscure the board.

### Existing regression gates

Before merge:

- complete Site regression must pass,
- existing Chuntris engine/ranking tests must pass,
- existing preview live/layout smoke must be updated as needed and pass,
- new immersive-UI smoke must pass.

After merge / when Vercel production deployment is available:

- verify canonical production page contains the new start/play/modal structure,
- verify Classic gameplay,
- verify 40-line terminal behavior,
- verify blank nickname local-only behavior,
- verify pause/resume,
- verify ranking/sound/controls modal access,
- verify hard-drop and line-clear presentation hooks.

## Non-goals

This redesign does not:

- change Tetris board dimensions,
- change scoring rules,
- change piece randomization,
- change lock delay / DAS / ARR rules unless an existing regression requires preserving current constants,
- turn 40-line Time Attack into an endless mode,
- create a new ranking backend,
- create anonymous global ranking entries,
- remove mobile touch controls,
- replace Web Audio with external audio files.

## Acceptance criteria

The feature is ready to merge only when all of the following are true:

1. A visitor sees a mode-selection start screen before the play surface.
2. Selecting a mode exposes an optional nickname field and start action.
3. Blank nickname starts the game and remains global-ranking silent while preserving local best records.
4. Active desktop play uses an enlarged three-column core and no always-visible ranking/help rails.
5. Ranking, sound, and controls are available through modal utility buttons.
6. Manual pause offers Continue, New Game, Sound Settings, and Key Controls.
7. Continue restores the exact current game rather than resetting it.
8. Hard drop has dedicated visual feedback and a dedicated sound.
9. Line clears display exact SINGLE / DOUBLE / TRIPLE / QUAD labels for 1/2/3/4 lines.
10. Each line-clear count has distinct presentation and sound without duplicate generic clear audio.
11. 40-line Time Attack still ends at 40 total cleared lines and records the finish time.
12. Desktop/tablet/mobile regression and smoke checks pass.
13. Existing Classic, sprint, ranking, audio persistence, HOLD/NEXT, reactions, and mobile controls remain functional.
