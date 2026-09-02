# Expanded Tarot Readings Design

Date: 2026-09-02
Repository: `gkzero0-cmyk/chunbong-fansite`
Status: Approved in chat; written-spec review pending before implementation

## 1. Goal

Expand the existing Chunbong fan-site tarot feature from a 1/3-card reading into a complete 78-card tarot experience that supports:

- 1-card, 3-card, 5-card, and 12-card readings
- 9 reading topics:
  - 종합타로
  - 연애
  - 인간관계
  - 방송
  - 크루
  - 콘텐츠
  - 진로
  - 금전
  - 앞으로의 방향
- Two selection methods:
  - direct number entry using integers 1 through 78
  - direct card-back selection from the shuffled 78-card deck
- richer card-selection and result-reveal motion
- optional generated sound effects using the browser Web Audio API
- the existing free local rule-based reading engine, with no paid AI or external inference service

The existing 78-card data set, 39 source-derived HD AVIF pair assets, site visual identity, and unrelated SOOP/schedule/notice/CATCH behavior must remain intact.

## 2. User Flow

### Number entry mode

1. Choose a reading topic.
2. Choose card count: 1, 3, 5, or 12.
3. Choose `숫자 직접 입력`.
4. Enter exactly the required number of unique integers from 1 through 78.
5. Optionally enter a question, maximum 500 characters.
6. Press the reading start button.
7. The chosen cards receive upright/reversed orientations and reveal in spread order.
8. Show per-card interpretations and an overall reading.
9. Offer the existing free automatic counseling-style reading from `/api/tarot-reading`.
10. Allow redraw or reset.

### Direct card selection mode

1. Choose a reading topic.
2. Choose card count: 1, 3, 5, or 12.
3. Choose `카드 직접 선택`.
4. Optionally enter a question, maximum 500 characters.
5. Press the shuffle/start button.
6. Show all 78 shuffled card backs.
7. Select exactly the required number of cards.
8. Reveal the selected cards in selection/spread order.
9. Show per-card interpretations and an overall reading.
10. Offer the existing free automatic counseling-style reading from `/api/tarot-reading`.
11. Allow redraw or reset.

The setup UI must not expose the identity of a numbered card before result reveal.

## 3. Reading Topics

`tarot-data.js` will expose exactly these active topic IDs and labels:

- `general` — 종합타로
- `love` — 연애
- `relations` — 인간관계
- `broadcast` — 방송
- `crew` — 크루
- `content` — 콘텐츠
- `career` — 진로
- `money` — 금전
- `direction` — 앞으로의 방향

Every card must support all 9 topic contexts.

The base upright/reversed card meanings remain canonical. Topic-specific text adds context rather than replacing the core meaning.

Topic context emphasizes:

- 종합타로: overall balance, timing, priorities, major life flow
- 연애: attraction, trust, emotional communication, boundaries, relationship pace
- 인간관계: trust, boundaries, conflict, reciprocity, communication
- 방송: consistency, performance, audience response, communication, stamina, momentum
- 크루: team roles, trust, collaboration, conflict, influence, group direction
- 콘텐츠: ideas, differentiation, execution, timing, audience reaction, sustainability
- 진로: strengths, skills, opportunities, decisions, responsibility, development
- 금전: resources, income, spending, stability, risk, priorities
- 앞으로의 방향: priorities, course correction, timing, next actions, long-term direction

## 4. Spread Definitions

The feature uses one canonical position set for each card count. Topic-specific interpretation changes how each position is discussed, but the position count and order stay stable.

### 1 card

Spread ID: `single`

1. 핵심 메시지

### 3 cards

Spread ID: `threeFlow`

1. 과거·배경
2. 현재·핵심
3. 앞으로의 흐름

### 5 cards

Spread ID: `fiveInsight`

1. 현재 상황
2. 강점
3. 장애물
4. 조언
5. 예상 흐름

### 12 cards

Spread ID: `twelveCompass`

1. 현재 상태
2. 내면
3. 외부 환경
4. 관계
5. 강점
6. 약점
7. 기회
8. 장애물
9. 조언
10. 가까운 흐름
11. 장기 흐름
12. 최종 방향

The server derives required card count from the spread definition and rejects mismatches.

## 5. Number Entry Mode

Number entry uses the canonical 78-card deck order.

- Valid values are integers 1 through 78 inclusive.
- Number `n` maps to `DATA.cards[n - 1]`.
- The chosen card count determines the exact number of visible numeric inputs.
- Inputs use `type="number"`, `inputmode="numeric"`, `min="1"`, and `max="78"`.
- Duplicate values are rejected before a reading begins.
- Missing values, decimals, non-numeric input, and out-of-range values are rejected.
- Validation is shown inline near the numeric controls.
- Entered values remain in place after validation errors so they can be corrected.
- The entered number-to-card mapping is not shown until result reveal.
- Input order determines spread position order.

Orientation is not entered by the user. Each accepted numbered card receives an upright/reversed orientation when the reading begins, using the existing cryptographically backed browser random source when available.

## 6. Direct Card Selection Mode

Direct selection presents all 78 shuffled card backs so every deck card is eligible for manual selection.

Behavior:

- The deck is shuffled before display.
- All 78 backs are rendered in the selection arena.
- The user selects exactly 1, 3, 5, or 12 cards depending on the chosen spread.
- A selected card cannot be selected twice.
- Selection order determines spread position order.
- Each selected card receives upright/reversed orientation at selection time.
- Results do not render until the required count is complete.
- The status line shows `selected / required` progress.
- A compact selected-slots strip above the deck shows filled selection positions without revealing card faces.
- The original selected back remains visibly locked and disabled in the deck.

Desktop uses a dense responsive card-back grid. Mobile uses smaller but readable card backs inside a taller scrollable selection area rather than compressing all 78 cards into one viewport.

## 7. State Model

`tarot.js` will maintain one explicit reading state with at least:

- `topic`
- `count`
- `spreadId`
- `selectionMode` (`number` or `cards`)
- `question`
- `deck`
- `selected`
- `phase` (`setup`, `selecting`, `revealing`, `results`)
- `readingSucceeded`
- `soundEnabled`

Both selection methods converge into the same normalized `selected` structure:

```js
{
  card,
  orientation,
  position,
  deckNumber
}
```

After normalization, rendering and server payload creation must not depend on the original selection method.

## 8. Card Numbering

Every card receives a stable `deckNumber` from 1 through 78 based on its canonical index in `DATA.cards`.

This number is distinct from Major Arcana numbering such as The Fool = 0.

Result cards display `deckNumber` after reveal so users can see which numbered card was entered or which canonical card was selected.

## 9. Motion Design

The existing black/orange Chunbong visual identity stays unchanged. Motion is enhanced without rebuilding unrelated site layout.

### Shuffle

When direct-card selection starts:

- card backs briefly converge toward the center
- cards fan/spread back into the selection area
- small rotation and depth offsets create a physical-deck feel

Number-entry mode uses a shorter deck-energy transition rather than rendering all 78 backs.

### Selection

A directly selected card:

- rises slightly
- gains a warm orange edge glow
- briefly scales up
- locks in place
- fills the next selected-slot indicator

### Reveal

After selection completes:

- the page enters the `revealing` phase
- cards appear in spread order
- each card uses a short 3D flip/reveal animation
- reversed cards finish the reveal rotated 180 degrees
- 12-card readings use a shorter stagger interval than 1/3/5-card readings so the total reveal sequence remains concise

### Result emphasis

After the final card reveal:

- the summary panel performs one subtle glow pulse
- one lightweight CSS/DOM spark burst plays once around the result heading
- the effect uses no external image asset

### Reduced motion

Existing `prefers-reduced-motion: reduce` support remains mandatory.

When reduced motion is requested:

- shuffle movement is disabled or simplified
- selected-card movement is removed
- flip/reveal animations are replaced by immediate appearance
- spark animation is disabled
- no feature functionality depends on animation completion events

## 10. Sound Design

No external audio files, copyrighted samples, or paid assets will be added.

Sound is generated in-browser using the Web Audio API.

Required cues:

- shuffle: short filtered-noise swish sequence
- select: short soft tap/chime
- reveal: low sweep plus small bell-like tone
- complete: brief three-note completion chime

Rules:

- no sound plays before a user gesture unlocks the audio context
- failures to initialize Web Audio never block tarot use
- a visible sound ON/OFF control is available on the tarot page
- the control uses `aria-pressed`
- preference is stored in local storage using `chunbongTarotSound`
- when no stored preference exists, sound defaults to ON
- sound preference is independent from reduced-motion preference
- no network request is used for sound

A small sound controller inside `tarot.js` is sufficient; no separate library or package is required.

## 11. Local Reading Engine

The feature continues to use `/api/tarot-reading` and the free local provider. No Vercel AI Gateway, OpenAI API, Groq, Cloudflare AI, or other paid/external model dependency is introduced.

The API keeps the current top-level response contract:

```json
{
  "reading": {
    "title": "...",
    "overall": "...",
    "cards": [],
    "advice": [],
    "summary": "..."
  },
  "model": "rule-based-v2",
  "provider": "local-tarot-engine"
}
```

`rule-based-v2` identifies the expanded 1/3/5/12-card and 9-topic logic.

### Validation

The API must:

- accept only the 9 configured topic IDs
- accept only configured spread IDs
- accept only 1, 3, 5, or 12 cards according to spread positions
- reject duplicate card IDs
- accept only upright/reversed orientations
- require position labels to match the selected spread order exactly
- keep the existing 500-character question maximum

### Interpretation inputs

Per-card interpretation uses:

- card identity
- upright/reversed orientation
- spread position
- selected topic context
- optional question

### Aggregate analysis

Overall/summary generation additionally considers:

- Major Arcana count
- reversed-card count and ratio
- suit distribution
- dominant suit when one exists
- first-card and final-card relationship
- concentration of court cards where relevant
- spread-specific groups for the 12-card layout

For 12-card readings, the engine must not merely concatenate twelve card meanings. It synthesizes grouped themes into:

- core flow
- strengths/resources
- friction/risks
- practical advice
- near-term vs long-term direction

Wording remains reflective and avoids deterministic claims about fate or guaranteed future events. The engine may use stable hash-based wording variation so identical inputs can remain reproducible while still choosing among multiple phrasing templates.

High-risk-question safeguards for medical, legal, financial/investment, safety, and self-harm terms remain in place.

## 12. UI Structure

`tarot.html` retains the existing page shell/header/footer and tarot visual container structure.

The setup form expands to include:

- 9 topic choices
- 4 card-count choices
- 2 selection-method choices
- number-entry panel shown only for numeric mode
- question textarea
- reading start/shuffle button whose label follows the selected mode
- sound toggle

The result area retains:

- card grid
- overall summary
- free automatic tarot counseling panel
- redraw/reset controls
- disclaimer

The current `tarot-ai-*` internal IDs/classes may remain to avoid unrelated CSS churn even though visible wording stays `무료 자동 타로 상담`.

## 13. Responsive Result Layout

Desktop result grids:

- 1 card: centered single column
- 3 cards: 3 columns
- 5 cards: auto-fit with up to 3 columns
- 12 cards: 4 columns when viewport width allows

Responsive behavior:

- below 900px: maximum 3 columns
- below 700px: maximum 2 columns
- below 430px: 1 column

Card art must never be enlarged beyond the existing source-derived 320px card width.

## 14. Error Handling

Client-side number-mode errors:

- required number missing
- duplicate number
- number outside 1–78
- non-integer number

These errors prevent reading start and preserve entered values for correction.

Server-side invalid payloads return the existing `400 { error: "invalid_request" }` pattern.

If the free local counseling endpoint fails:

- base card interpretations remain visible
- the counseling panel shows a retry message
- no card selection or result is lost

Audio failure is silent and non-blocking.

## 15. Files Expected to Change

Primary implementation files:

- `tarot.html`
- `tarot.css`
- `tarot.js`
- `tarot-data.js`
- `api/tarot-reading.js`
- tarot-specific regression tests under `tests/`

The existing site regression workflow may be updated only to include new tarot regression coverage if needed.

Do not restructure or remove unrelated SOOP, schedule, notice, CATCH, VOD, fan-art, or YouTube functionality.

## 16. Test Strategy

Implementation follows test-driven development.

Required regression coverage includes:

### Data

- exactly 78 unique cards remain
- exactly 9 active topics exist
- every card contains context for all 9 topics
- stable `deckNumber` values are exactly 1 through 78
- spread lengths are exactly 1, 3, 5, and 12

### Number selection

- valid 1–78 inputs map to expected canonical cards
- exact selected count is required
- duplicate values are rejected
- 0, 79, negative, decimal, empty, and non-numeric values are rejected
- input order maps to spread order

### Direct card selection

- all 78 card backs are eligible/rendered
- required count is enforced for 1/3/5/12
- duplicate selection is impossible
- selected order maps to spread order
- selected-slot progress is correct

### Reading engine/API

- all 9 topics validate
- all 4 spread sizes validate
- 12-card API output contains 12 per-card readings
- duplicate/invalid cards, invalid orientation, and invalid position return 400
- provider remains `local-tarot-engine`
- model is `rule-based-v2`
- no network AI call is required

### Effects/accessibility

- animation classes/keyframes for shuffle, select, reveal, and completion exist
- `prefers-reduced-motion` disables nonessential motion
- sound toggle is accessible and persistent
- sound defaults ON only after user-interaction unlock and respects stored OFF preference
- no external audio URL/file is required

### Existing regressions

Run all `tests/*.mjs` plus syntax checks for:

- `script.js`
- `page.js`
- `tarot-data.js`
- `tarot.js`
- every `api/*.js`

Existing notice/schedule/SOOP/CATCH behavior and all 39 HD tarot pair assets must continue to pass their current regression tests.

## 17. Production Acceptance Criteria

The feature is complete only when all of the following are observed on production:

1. Vercel production deployment succeeds.
2. Tarot page loads successfully.
3. 1, 3, 5, and 12 card modes are present.
4. All 9 topics are present.
5. Number entry accepts valid 1–78 values and rejects duplicates/out-of-range values.
6. Direct selection exposes the full shuffled 78-card deck.
7. Visual selection/reveal effects work without blocking reduced-motion users.
8. Sound cues work after user interaction and can be muted.
9. A real `/api/tarot-reading` POST for at least one 12-card reading returns HTTP 200.
10. Production response reports `provider: local-tarot-engine` and `model: rule-based-v2`.
11. Existing HD tarot images still return HTTP 200.
12. Existing site regression CI remains green.

## 18. Non-Goals

This change will not:

- add paid AI
- add user accounts or saved tarot history
- add server-side databases
- add third-party analytics
- add external music or sound asset dependencies
- redesign unrelated fan-site pages
- change canonical SOOP notice/schedule/CATCH behavior

## 19. Implementation Boundary

The implementation extends the current tarot subsystem rather than replacing the site architecture. Selection-mode differences end at normalization into the common selected-card structure. From that point onward, rendering, animations, API payloads, interpretation, and results use one shared path. This boundary prevents separate numeric/card implementations from drifting apart.