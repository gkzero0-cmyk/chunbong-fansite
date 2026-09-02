# Expanded Tarot Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the fan-site tarot from 1/3-card readings into a 78-card experience supporting 1/3/5/12 cards, 9 topics, number-entry/direct-selection modes, reveal effects, generated sound, and free local rule-based-v2 counseling.

**Architecture:** Keep the existing 78-card dataset, HD AVIF pair renderer, page shell, and `/api/tarot-reading` contract. Extend `tarot-data.js` into the canonical topic/spread/deck-number source, normalize both selection modes into one `selected` structure in `tarot.js`, and upgrade the server engine to derive validation and synthesis from the canonical spread definitions. Motion and Web Audio remain client-only and must never block card selection or results.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, CommonJS-compatible `tarot-data.js` and `tarot.js` exports for Node regression tests, Vercel Node API route, Web Audio API, existing GitHub Actions/Vercel deployment.

**Spec:** `docs/superpowers/specs/2026-09-02-tarot-expanded-readings-design.md`

## Global Constraints

- Keep exactly 78 tarot cards and the existing 39 source-derived HD AVIF pair assets.
- Active topics must be exactly: `general`, `love`, `relations`, `broadcast`, `crew`, `content`, `career`, `money`, `direction`.
- Supported reading sizes must be exactly 1, 3, 5, and 12 cards.
- Number-entry values must be unique integers from 1 through 78 and must not reveal card identity before result reveal.
- Direct-selection mode must make all 78 shuffled card backs eligible for selection.
- Sound uses Web Audio only; no external audio files or URLs.
- Sound preference key is `chunbongTarotSound`; default ON when no stored preference exists, but playback starts only after a user gesture unlocks audio.
- Preserve `prefers-reduced-motion: reduce` support and never depend on animation completion for functionality.
- Keep `/api/tarot-reading` free and local: `provider: local-tarot-engine`, `model: rule-based-v2`; do not add paid or external AI.
- Question limit remains 500 characters.
- Do not restructure or remove unrelated SOOP, schedule, notice, CATCH, VOD, fan-art, or YouTube behavior.

---

### Task 1: Canonical 9-topic, 4-spread, 78-card data model

**Files:**
- Modify: `tarot-data.js`
- Test: `tests/tarot-expanded-data-regression.mjs`

**Interfaces:**
- Produces: `DATA.topics` with 9 IDs; `DATA.spreads.single|threeFlow|fiveInsight|twelveCompass`; `card.deckNumber` from 1..78; `card.topicHints[topicId]` for all 9 topics.
- Consumers: Tasks 2-6.

- [ ] **Step 1: Write the failing data regression test**

Create `tests/tarot-expanded-data-regression.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');

const topicIds = ['general','love','relations','broadcast','crew','content','career','money','direction'];
assert.deepEqual(Object.keys(data.topics), topicIds);
assert.deepEqual(Object.keys(data.spreads), ['single','threeFlow','fiveInsight','twelveCompass']);
assert.deepEqual(data.spreads.single.positions, ['핵심 메시지']);
assert.deepEqual(data.spreads.threeFlow.positions, ['과거·배경','현재·핵심','앞으로의 흐름']);
assert.deepEqual(data.spreads.fiveInsight.positions, ['현재 상황','강점','장애물','조언','예상 흐름']);
assert.deepEqual(data.spreads.twelveCompass.positions, [
  '현재 상태','내면','외부 환경','관계','강점','약점',
  '기회','장애물','조언','가까운 흐름','장기 흐름','최종 방향'
]);
assert.equal(data.cards.length, 78);
assert.deepEqual(data.cards.map(card => card.deckNumber), Array.from({ length: 78 }, (_, i) => i + 1));
for (const card of data.cards) {
  for (const topicId of topicIds) assert.ok(card.topicHints[topicId], `${card.id} missing ${topicId}`);
}
console.log('expanded tarot data regression test passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/tarot-expanded-data-regression.mjs`

Expected: FAIL because the current data has five topics, no 5/12-card spreads, and no `deckNumber`.

- [ ] **Step 3: Implement the canonical topics/spreads/deck numbering**

In `tarot-data.js`, replace the current topic/spread definitions with:

```js
const topics = {
  general: { label: '종합타로' },
  love: { label: '연애' },
  relations: { label: '인간관계' },
  broadcast: { label: '방송' },
  crew: { label: '크루' },
  content: { label: '콘텐츠' },
  career: { label: '진로' },
  money: { label: '금전' },
  direction: { label: '앞으로의 방향' }
};

const spreads = {
  single: { label: '한 장 메시지', positions: ['핵심 메시지'] },
  threeFlow: { label: '3장 흐름', positions: ['과거·배경','현재·핵심','앞으로의 흐름'] },
  fiveInsight: { label: '5장 인사이트', positions: ['현재 상황','강점','장애물','조언','예상 흐름'] },
  twelveCompass: { label: '12장 종합 나침반', positions: [
    '현재 상태','내면','외부 환경','관계','강점','약점',
    '기회','장애물','조언','가까운 흐름','장기 흐름','최종 방향'
  ] }
};
```

Make `topicHints(focus)` return all 9 keys, using topic-specific context without changing the card's base upright/reversed meaning. Change `withImageSlot` to:

```js
const withImageSlot = (card, index) => ({
  ...card,
  deckNumber: index + 1,
  imageSheet: Math.floor(index / 13),
  imageSlot: index % 13
});
```

- [ ] **Step 4: Run focused regressions**

Run:

```bash
node tests/tarot-expanded-data-regression.mjs
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
```

Expected: the new test PASS; update legacy tarot assertions only where old topic/spread IDs are intentionally replaced; HD assets remain PASS.

- [ ] **Step 5: Commit**

```bash
git add tarot-data.js tests/tarot-expanded-data-regression.mjs tests/tarot-regression.mjs
git commit -m "feat: expand tarot topics and spreads"
```

---

### Task 2: Shared selection helpers for number mode and 78-card direct mode

**Files:**
- Modify: `tarot.js`
- Test: `tests/tarot-selection-modes-regression.mjs`

**Interfaces:**
- Consumes: `DATA.cards[*].deckNumber`, `DATA.spreads` from Task 1.
- Produces: `spreadIdForCount(count)`, `validateDeckNumbers(values, count)`, `buildNumberSelections(values, topic, spreadId, randomFn)`, existing `shuffleDeck`, normalized selection objects `{ card, orientation, position, deckNumber }`.
- Consumers: Task 3 UI and Task 5 payload/API integration.

- [ ] **Step 1: Write the failing helper regression**

Create `tests/tarot-selection-modes-regression.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');

assert.equal(tarot.spreadIdForCount(1), 'single');
assert.equal(tarot.spreadIdForCount(3), 'threeFlow');
assert.equal(tarot.spreadIdForCount(5), 'fiveInsight');
assert.equal(tarot.spreadIdForCount(12), 'twelveCompass');
assert.throws(() => tarot.spreadIdForCount(2));

assert.deepEqual(tarot.validateDeckNumbers(['1','78'], 2), [1, 78]);
for (const bad of [
  { values: ['0'], count: 1 }, { values: ['79'], count: 1 },
  { values: ['1.5'], count: 1 }, { values: [''], count: 1 },
  { values: ['3','3'], count: 2 }
]) assert.throws(() => tarot.validateDeckNumbers(bad.values, bad.count));

const picks = tarot.buildNumberSelections(['1','78'], 'general', 'twoTest', () => 0.1, ['A','B']);
assert.equal(picks[0].card, data.cards[0]);
assert.equal(picks[1].card, data.cards[77]);
assert.deepEqual(picks.map(x => x.deckNumber), [1, 78]);
assert.deepEqual(picks.map(x => x.position), ['A','B']);
assert.ok(picks.every(x => x.orientation === 'upright'));

const shuffled = tarot.shuffleDeck(data.cards, () => 0.5);
assert.equal(shuffled.length, 78);
assert.equal(new Set(shuffled.map(card => card.id)).size, 78);
console.log('tarot selection modes regression test passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/tarot-selection-modes-regression.mjs`

Expected: FAIL because the helper functions do not yet exist.

- [ ] **Step 3: Add minimal pure helpers and export them**

Add to `tarot.js` before DOM-only code:

```js
function spreadIdForCount(count) {
  const map = { 1: 'single', 3: 'threeFlow', 5: 'fiveInsight', 12: 'twelveCompass' };
  const spreadId = map[Number(count)];
  if (!spreadId) throw new Error('invalid_card_count');
  return spreadId;
}

function validateDeckNumbers(values, count) {
  if (!Array.isArray(values) || values.length !== Number(count)) throw new Error('invalid_number_count');
  const numbers = values.map(value => {
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) throw new Error('invalid_deck_number');
    const number = Number(text);
    if (!Number.isInteger(number) || number < 1 || number > 78) throw new Error('invalid_deck_number');
    return number;
  });
  if (new Set(numbers).size !== numbers.length) throw new Error('duplicate_deck_number');
  return numbers;
}

function buildNumberSelections(values, topic, spreadId, randomFn = random01, positionsOverride = null) {
  const positions = positionsOverride || DATA.spreads[spreadId]?.positions;
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}
```

Export all three through `TAROT_API`.

- [ ] **Step 4: Run helper and existing unit regressions**

Run:

```bash
node tests/tarot-selection-modes-regression.mjs
node tests/tarot-regression.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tarot.js tests/tarot-selection-modes-regression.mjs
git commit -m "feat: add tarot selection mode helpers"
```

---

### Task 3: Expand the setup UI and direct-selection interaction

**Files:**
- Modify: `tarot.html`
- Modify: `tarot.js`
- Modify: `tarot.css`
- Test: `tests/tarot-expanded-ui-regression.mjs`

**Interfaces:**
- Consumes: selection helpers from Task 2.
- Produces DOM contracts: `name="topic"` with 9 values; `name="count"` with 1/3/5/12; `name="selection-mode"` with `number|cards`; `#tarot-number-panel`; `#tarot-number-inputs`; `#tarot-number-error`; `#tarot-selected-slots`; `#tarot-sound-toggle`; all 78 card backs in direct mode.
- Consumers: Task 4 effects/audio and Task 5 result/API flow.

- [ ] **Step 1: Write the failing UI regression**

Create `tests/tarot-expanded-ui-regression.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tarot.css', import.meta.url), 'utf8');

for (const value of ['general','love','relations','broadcast','crew','content','career','money','direction']) {
  assert.ok(html.includes(`name="topic" value="${value}"`));
}
for (const value of ['1','3','5','12']) assert.ok(html.includes(`name="count" value="${value}"`));
assert.ok(html.includes('name="selection-mode" value="number"'));
assert.ok(html.includes('name="selection-mode" value="cards"'));
for (const id of ['tarot-number-panel','tarot-number-inputs','tarot-number-error','tarot-selected-slots','tarot-sound-toggle']) {
  assert.ok(html.includes(`id="${id}"`));
}
assert.ok(js.includes('state.deck.slice(0, 78)'));
assert.ok(js.includes('validateDeckNumbers'));
assert.ok(js.includes('selectionMode'));
assert.ok(css.includes('.tarot-number-inputs'));
assert.ok(css.includes('.tarot-selected-slots'));
console.log('expanded tarot UI regression test passed');
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node tests/tarot-expanded-ui-regression.mjs`

Expected: FAIL on missing topics, count options, selection mode controls, and full 78-card rendering.

- [ ] **Step 3: Expand `tarot.html` setup controls**

Replace the current topic/count/spread chooser with:

```html
<fieldset class="tarot-choice-group"><legend>무엇을 볼까요?</legend>
  <label><input type="radio" name="topic" value="general" checked><span>종합타로</span></label>
  <label><input type="radio" name="topic" value="love"><span>연애</span></label>
  <label><input type="radio" name="topic" value="relations"><span>인간관계</span></label>
  <label><input type="radio" name="topic" value="broadcast"><span>방송</span></label>
  <label><input type="radio" name="topic" value="crew"><span>크루</span></label>
  <label><input type="radio" name="topic" value="content"><span>콘텐츠</span></label>
  <label><input type="radio" name="topic" value="career"><span>진로</span></label>
  <label><input type="radio" name="topic" value="money"><span>금전</span></label>
  <label><input type="radio" name="topic" value="direction"><span>앞으로의 방향</span></label>
</fieldset>
<fieldset class="tarot-choice-group"><legend>몇 장을 볼까요?</legend>
  <label><input type="radio" name="count" value="1" checked><span>1장</span></label>
  <label><input type="radio" name="count" value="3"><span>3장</span></label>
  <label><input type="radio" name="count" value="5"><span>5장</span></label>
  <label><input type="radio" name="count" value="12"><span>12장</span></label>
</fieldset>
<fieldset class="tarot-choice-group"><legend>카드 선택 방식</legend>
  <label><input type="radio" name="selection-mode" value="number" checked><span>숫자 직접 입력</span></label>
  <label><input type="radio" name="selection-mode" value="cards"><span>카드 직접 선택</span></label>
</fieldset>
<section id="tarot-number-panel" class="tarot-number-panel">
  <div id="tarot-number-inputs" class="tarot-number-inputs"></div>
  <p id="tarot-number-error" class="tarot-number-error" role="alert"></p>
</section>
<button id="tarot-sound-toggle" class="tarot-sound-toggle" type="button" aria-pressed="true">효과음 ON</button>
```

- [ ] **Step 4: Implement mode-specific setup and full-deck rendering in `tarot.js`**

Change state defaults to `topic: 'general'`, `selectionMode: 'number'`, and derive `spreadId` with `spreadIdForCount(count)`. Add `renderNumberInputs(count)` that creates exactly `count` number inputs with `min=1`, `max=78`, `inputMode='numeric'`, and labels `1번째 카드` etc. In `startReading()`:

```js
if (state.selectionMode === 'number') {
  const values = [...byId('tarot-number-inputs').querySelectorAll('input')].map(input => input.value);
  try {
    state.selected = buildNumberSelections(values, state.topic, state.spreadId);
    byId('tarot-number-error').textContent = '';
  } catch (error) {
    byId('tarot-number-error').textContent = error.message === 'duplicate_deck_number'
      ? '같은 숫자는 중복해서 사용할 수 없습니다.'
      : '1부터 78 사이의 정수를 필요한 장수만큼 입력해 주세요.';
    return;
  }
  beginReveal();
  return;
}
state.deck = shuffleDeck(DATA.cards);
state.selected = [];
renderDeck();
```

Change `renderDeck()` to use `state.deck.slice(0, 78)` and render `#tarot-selected-slots` with one slot per spread position. When `selectCard()` succeeds, append the normalized selection with `deckNumber: card.deckNumber`, mark the original back disabled, and fill the matching slot without showing the face/name.

- [ ] **Step 5: Add responsive CSS for controls, 78-card arena, slots, 5/12-card result grids**

Add focused classes:

```css
.tarot-number-panel{display:grid;gap:10px}
.tarot-number-inputs{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}
.tarot-number-inputs input{width:100%;padding:12px;border:1px solid #37302d;border-radius:12px;background:#090909;color:#fff}
.tarot-number-error{min-height:1.4em;margin:0;color:#ff9a72;font-size:13px}
.tarot-selected-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:18px}
.tarot-selected-slot{padding:9px;border:1px dashed #55463d;border-radius:10px;text-align:center;color:#8f837a}
.tarot-selected-slot.is-filled{border-style:solid;border-color:#ff8b48;color:#ffad70;background:#ff6b1810}
.tarot-deck{max-height:720px;overflow:auto;align-content:flex-start}
.tarot-reading-grid[data-count="5"]{grid-template-columns:repeat(3,minmax(0,1fr))}
.tarot-reading-grid[data-count="12"]{grid-template-columns:repeat(4,minmax(0,1fr))}
```

Keep card art `max-width:320px`; add media-query reductions to max 3 columns under 900px, max 2 under 700px, one column under 430px.

- [ ] **Step 6: Run UI regressions**

Run:

```bash
node tests/tarot-expanded-ui-regression.mjs
node tests/tarot-selection-modes-regression.mjs
node tests/tarot-regression.mjs
```

Expected: PASS after updating intentional legacy copy assertions.

- [ ] **Step 7: Commit**

```bash
git add tarot.html tarot.js tarot.css tests/tarot-expanded-ui-regression.mjs tests/tarot-regression.mjs
git commit -m "feat: add expanded tarot selection UI"
```

---

### Task 4: Add non-blocking reveal effects and Web Audio cues

**Files:**
- Modify: `tarot.js`
- Modify: `tarot.css`
- Test: `tests/tarot-effects-audio-regression.mjs`

**Interfaces:**
- Produces: `createTarotSoundController(storage, AudioContextCtor)`, `soundController.play('shuffle'|'select'|'reveal'|'complete')`, `beginReveal()` phase transition, CSS classes `is-selecting`, `is-revealing`, `is-complete`.
- Consumers: Task 5 result flow.

- [ ] **Step 1: Write failing effects/audio regression**

Create `tests/tarot-effects-audio-regression.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const css = fs.readFileSync(new URL('../tarot.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');

const memory = new Map();
const storage = { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k,v) => memory.set(k,v) };
const sound = tarot.createTarotSoundController(storage, null);
assert.equal(sound.enabled(), true);
sound.setEnabled(false);
assert.equal(storage.getItem('chunbongTarotSound'), 'off');
assert.equal(sound.enabled(), false);

for (const token of ['@keyframes tarotSelect','@keyframes tarotReveal','@keyframes tarotCompleteGlow','@keyframes tarotSpark']) assert.ok(css.includes(token));
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
assert.ok(js.includes("play('shuffle')"));
assert.ok(js.includes("play('select')"));
assert.ok(js.includes("play('reveal')"));
assert.ok(js.includes("play('complete')"));
assert.ok(!js.match(/\.(mp3|wav|ogg)/i));
console.log('tarot effects and audio regression test passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/tarot-effects-audio-regression.mjs`

Expected: FAIL because sound controller and new keyframes do not exist.

- [ ] **Step 3: Implement a small injectable sound controller**

Add a pure/exported factory in `tarot.js`:

```js
function createTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const key = 'chunbongTarotSound';
  let isEnabled = storage?.getItem?.(key) !== 'off';
  let context = null;
  const ensureContext = () => {
    if (!isEnabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    if (context.state === 'suspended') context.resume?.();
    return context;
  };
  const tone = (frequency, duration, gain = 0.035, offset = 0) => {
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.value = frequency;
    amp.gain.setValueAtTime(gain, ctx.currentTime + offset);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + duration);
  };
  return {
    enabled: () => isEnabled,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) { isEnabled = Boolean(value); storage?.setItem?.(key, isEnabled ? 'on' : 'off'); },
    play(name) {
      if (!isEnabled) return;
      try {
        if (name === 'select') tone(520, 0.08);
        if (name === 'reveal') { tone(220, 0.18, 0.025); tone(740, 0.12, 0.025, 0.08); }
        if (name === 'complete') { tone(440, 0.12); tone(554, 0.12, 0.03, 0.11); tone(659, 0.16, 0.03, 0.22); }
        if (name === 'shuffle') { tone(180, 0.07, 0.018); tone(260, 0.07, 0.018, 0.06); }
      } catch (_) {}
    }
  };
}
```

Wire the visible toggle to `aria-pressed`, `효과음 ON/OFF`, and user gesture unlock. Audio exceptions must be swallowed.

- [ ] **Step 4: Implement phase-safe reveal sequencing**

Add `beginReveal()` that sets `state.phase = 'revealing'`, renders results immediately into the DOM with per-card CSS delay variables, and uses a short timer only for cosmetic completion. Functional state must not depend on `animationend`:

```js
function beginReveal() {
  state.phase = 'revealing';
  renderResults();
  const cards = [...byId('tarot-reading-grid').querySelectorAll('.tarot-card-result')];
  const step = state.count === 12 ? 70 : 130;
  cards.forEach((card, index) => card.style.setProperty('--reveal-delay', `${index * step}ms`));
  soundController.play('reveal');
  const finish = () => {
    state.phase = 'results';
    byId('tarot-results').classList.add('is-complete');
    soundController.play('complete');
  };
  if (prefersReducedMotion()) finish();
  else setTimeout(finish, Math.min(1400, cards.length * step + 420));
}
```

- [ ] **Step 5: Add CSS keyframes and reduced-motion overrides**

Add `tarotSelect`, refine `tarotReveal`, add `tarotCompleteGlow` and `tarotSpark`; apply animation via classes and `animation-delay:var(--reveal-delay,0ms)`. In reduced-motion media query set these animations to `none!important` and keep reversed-art orientation intact.

- [ ] **Step 6: Run effects regressions**

Run:

```bash
node tests/tarot-effects-audio-regression.mjs
node tests/tarot-expanded-ui-regression.mjs
node tests/tarot-selection-modes-regression.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tarot.js tarot.css tests/tarot-effects-audio-regression.mjs
git commit -m "feat: add tarot reveal effects and sound"
```

---

### Task 5: Upgrade free local counseling API to rule-based-v2

**Files:**
- Modify: `api/tarot-reading.js`
- Modify: `tests/tarot-ai-api-regression.mjs`
- Test: `tests/tarot-expanded-api-regression.mjs`

**Interfaces:**
- Consumes: canonical `DATA.topics` and `DATA.spreads` from Task 1; normalized card payloads from Tasks 2-3.
- Produces: HTTP 200 `{ reading, provider:'local-tarot-engine', model:'rule-based-v2' }` for valid 1/3/5/12-card requests; HTTP 400 `{ error:'invalid_request' }` for invalid payloads.

- [ ] **Step 1: Write failing expanded API regression**

Create `tests/tarot-expanded-api-regression.mjs`:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');
const data = require('../tarot-data.js');

assert.equal(api.LOCAL_PROVIDER, 'local-tarot-engine');
assert.equal(api.LOCAL_MODEL, 'rule-based-v2');

for (const [spreadId, count] of [['single',1],['threeFlow',3],['fiveInsight',5],['twelveCompass',12]]) {
  const positions = data.spreads[spreadId].positions;
  const body = {
    question: '현재 흐름을 점검해줘', topic: 'general', spreadId,
    cards: data.cards.slice(0, count).map((card, i) => ({ id: card.id, orientation: i % 2 ? 'reversed' : 'upright', position: positions[i] }))
  };
  const validated = api.validateReadingRequest(body);
  const reading = api.generateLocalReading(validated);
  assert.equal(reading.cards.length, count);
  assert.ok(reading.overall.length > 80);
  assert.ok(reading.summary.length > 20);
}

for (const topic of Object.keys(data.topics)) {
  const body = { question:'', topic, spreadId:'single', cards:[{ id:data.cards[0].id, orientation:'upright', position:'핵심 메시지' }] };
  assert.doesNotThrow(() => api.validateReadingRequest(body));
}

assert.throws(() => api.validateReadingRequest({
  question:'', topic:'general', spreadId:'threeFlow',
  cards:[{ id:data.cards[0].id, orientation:'upright', position:'과거·배경' }]
}));
console.log('expanded local tarot API regression test passed');
```

- [ ] **Step 2: Run API test and verify RED**

Run: `node tests/tarot-expanded-api-regression.mjs`

Expected: FAIL on model version and 5/12-card validation.

- [ ] **Step 3: Derive validation count from spread positions**

Change:

```js
const LOCAL_MODEL = 'rule-based-v2';
```

Replace hard-coded `[1,3]` validation with:

```js
const positions = DATA.spreads[spreadId].positions;
if (cards.length !== positions.length || ![1,3,5,12].includes(cards.length)) {
  throw httpError('invalid_card_count', 400);
}
```

Keep duplicate card, orientation, exact position, topic, spread, and 500-character validation.

- [ ] **Step 4: Add aggregate spread synthesis helpers**

Add focused helpers:

```js
function summarizeDistribution(cards) {
  const majorCount = cards.filter(item => item.card.arcana === 'major').length;
  const reversedCount = cards.filter(item => item.orientation === 'reversed').length;
  const suits = new Map();
  for (const item of cards) if (item.card.suit) suits.set(item.card.suit, (suits.get(item.card.suit) || 0) + 1);
  const dominantSuit = [...suits.entries()].sort((a,b) => b[1] - a[1])[0] || null;
  return { majorCount, reversedCount, dominantSuit };
}

function buildTwelveCardThemes(validated) {
  if (validated.cards.length !== 12) return '';
  const groups = {
    core: validated.cards.slice(0, 4),
    resources: validated.cards.slice(4, 7),
    friction: validated.cards.slice(7, 9),
    direction: validated.cards.slice(9, 12)
  };
  return `핵심 흐름은 ${groups.core.map(x => x.card.nameKo).join(', ')}에서, 강점과 기회는 ${groups.resources.map(x => x.card.nameKo).join(', ')}에서, 조정할 지점은 ${groups.friction.map(x => x.card.nameKo).join(', ')}에서, 앞으로의 방향은 ${groups.direction.map(x => x.card.nameKo).join(', ')}에서 읽을 수 있습니다.`;
}
```

Use distribution plus first/last card and, for 12 cards, grouped themes inside `buildOverall`, `buildAdvice`, and `buildSummary`. Keep wording reflective, not deterministic.

- [ ] **Step 5: Update the legacy API regression to the intentional new contract**

Change old expected model from `rule-based-v1` to `rule-based-v2`, old topic IDs/spread positions to the canonical Task 1 values, and add one real handler invocation for a 12-card payload that asserts status 200 and provider/model.

- [ ] **Step 6: Run API regressions**

Run:

```bash
node tests/tarot-expanded-api-regression.mjs
node tests/tarot-ai-api-regression.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/tarot-reading.js tests/tarot-expanded-api-regression.mjs tests/tarot-ai-api-regression.mjs
git commit -m "feat: expand free local tarot reading engine"
```

---

### Task 6: Integrate results, payloads, copy, and accessibility end-to-end

**Files:**
- Modify: `tarot.js`
- Modify: `tarot.html`
- Modify: `tarot.css`
- Modify: `tests/tarot-regression.mjs`
- Test: `tests/tarot-expanded-integration-regression.mjs`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: final client payload for all spread sizes, deck number shown only after reveal, 1/3/5/12 result grids, counseling panel that accepts 12 card responses, accessible progress/toggle/error states.

- [ ] **Step 1: Write failing integration regression**

Create `tests/tarot-expanded-integration-regression.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');

const selected = data.cards.slice(0, 12).map((card, index) => ({
  card, orientation:'upright', position:data.spreads.twelveCompass.positions[index], deckNumber:card.deckNumber
}));
const payload = tarot.buildAiRequestPayload({ question:'12장 테스트', topic:'direction', spreadId:'twelveCompass', selected });
assert.equal(payload.cards.length, 12);
assert.equal(payload.cards[11].position, '최종 방향');

const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');
assert.ok(js.includes('deckNumber'));
assert.ok(js.includes('data-count'));
assert.ok(html.includes('1~78'));
assert.ok(html.includes('무료 자동 타로 상담'));
console.log('expanded tarot integration regression test passed');
```

- [ ] **Step 2: Run integration test and verify RED**

Run: `node tests/tarot-expanded-integration-regression.mjs`

Expected: FAIL until result rendering and copy are updated.

- [ ] **Step 3: Finalize result rendering**

In `renderResults()` set:

```js
byId('tarot-reading-grid').dataset.count = String(state.count);
```

Include deck number after reveal in `.tarot-card-copy`, for example:

```html
<small>${direction} · DECK ${selection.deckNumber}</small>
```

Do not show deck number-to-name mapping in number inputs or selection slots before reveal.

Change `buildSummary` and base client interpretation to use new topics/spreads without assuming only one/three cards. Ensure 12-card base summary remains concise enough to read before optional counseling.

- [ ] **Step 4: Finalize payload and counseling rendering**

Keep `buildAiRequestPayload()` shape unchanged except that it naturally carries 5/12 selected cards. Ensure `renderAiReading()` iterates arbitrary `reading.cards.length`, and button/status wording remains `무료 자동 타로 상담` rather than AI-provider wording.

- [ ] **Step 5: Finish accessible UI text**

Ensure:

```html
<p class="tarot-number-help">1~78 사이 숫자를 카드 장수만큼 직접 입력하세요. 같은 숫자는 한 번만 사용할 수 있습니다.</p>
```

Selection status uses `aria-live="polite"`; number errors use `role="alert"`; sound toggle keeps `aria-pressed`; disabled selected backs remain keyboard-inert through `disabled`.

- [ ] **Step 6: Run integration and legacy tarot regressions**

Run:

```bash
node tests/tarot-expanded-integration-regression.mjs
node tests/tarot-expanded-ui-regression.mjs
node tests/tarot-effects-audio-regression.mjs
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tarot.html tarot.js tarot.css tests/tarot-expanded-integration-regression.mjs tests/tarot-regression.mjs
git commit -m "feat: complete expanded tarot experience"
```

---

### Task 7: Full regression, production deploy, and acceptance probe

**Files:**
- Modify only if required by test coverage: `.github/workflows/catch-regression.yml`
- Create temporarily on a validation branch if needed: `.github/workflows/tarot-expanded-full-validation.yml`
- Reuse or update production probe on non-main verification branch; do not leave temporary probe workflows on `main`.

**Interfaces:**
- Consumes: completed Tasks 1-6.
- Produces: green full regression, clean `main`, successful Vercel production, observed 12-card HTTP 200 with `local-tarot-engine` / `rule-based-v2`.

- [ ] **Step 1: Run syntax checks**

Run:

```bash
node --check script.js
node --check page.js
node --check tarot-data.js
node --check tarot.js
for file in api/*.js; do node --check "$file"; done
```

Expected: all exit 0.

- [ ] **Step 2: Run every regression test**

Run:

```bash
set -e
count=0
for file in tests/*.mjs; do
  echo "=== $file ==="
  node "$file"
  count=$((count + 1))
done
echo "TOTAL_TEST_FILES=$count"
```

Expected: every test PASS, including SOOP/notice/schedule/CATCH and all tarot asset tests.

- [ ] **Step 3: Verify source-derived tarot assets remain unchanged**

Run the existing HD asset regression and confirm `assets/tarot/hd/pair-00.avif` through `pair-38.avif` remain present and the current combined SHA expectation still passes.

- [ ] **Step 4: Promote the clean implementation commit to `main`**

Only promote after Steps 1-3 are green. Do not merge temporary validation workflow commits into `main`.

- [ ] **Step 5: Verify main CI and Vercel deployment**

Confirm the `Site regression` workflow for the promoted main SHA completes with `success`, and the Vercel commit status for the same SHA is `success`.

- [ ] **Step 6: Probe production static resources**

Against `https://chunbong-fansite.vercel.app` verify:

```bash
curl --fail --silent --show-error --location --output /dev/null https://chunbong-fansite.vercel.app/
curl --fail --silent --show-error --location --output /tmp/pair-38.avif https://chunbong-fansite.vercel.app/assets/tarot/hd/pair-38.avif
test -s /tmp/pair-38.avif
```

Expected: both HTTP 200.

- [ ] **Step 7: Probe a real 12-card production POST**

Construct payload from the first 12 canonical cards using the exact `twelveCompass` positions:

```json
{
  "question": "앞으로의 방송과 콘텐츠 방향을 점검해줘",
  "topic": "direction",
  "spreadId": "twelveCompass",
  "cards": [
    {"id":"major-00","orientation":"upright","position":"현재 상태"},
    {"id":"major-01","orientation":"reversed","position":"내면"},
    {"id":"major-02","orientation":"upright","position":"외부 환경"},
    {"id":"major-03","orientation":"reversed","position":"관계"},
    {"id":"major-04","orientation":"upright","position":"강점"},
    {"id":"major-05","orientation":"reversed","position":"약점"},
    {"id":"major-06","orientation":"upright","position":"기회"},
    {"id":"major-07","orientation":"reversed","position":"장애물"},
    {"id":"major-08","orientation":"upright","position":"조언"},
    {"id":"major-09","orientation":"reversed","position":"가까운 흐름"},
    {"id":"major-10","orientation":"upright","position":"장기 흐름"},
    {"id":"major-11","orientation":"reversed","position":"최종 방향"}
  ]
}
```

Expected: HTTP 200, `reading.cards.length === 12`, `provider === 'local-tarot-engine'`, `model === 'rule-based-v2'`.

- [ ] **Step 8: Report completion only with observed evidence**

Final report must include the final `main` SHA, full-test result count, main CI status, Vercel deployment status, homepage/HD asset HTTP 200, and real 12-card production POST HTTP 200. If any acceptance probe fails, report the blocker instead of claiming completion.
