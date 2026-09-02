# Expanded Tarot Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the fan-site tarot from 1/3-card readings into a 78-card experience supporting 1/3/5/12 cards, 9 topics, number-entry/direct-selection modes, reveal effects, generated sound, and free local rule-based-v2 counseling.

**Architecture:** Keep the existing 78-card dataset, HD AVIF pair renderer, page shell, and `/api/tarot-reading` response shape. Extend `tarot-data.js` into the canonical source for topics/spreads/deck numbering, normalize both selection modes into one `selected` structure in `tarot.js`, and upgrade the server engine to derive validation and synthesis from canonical spread definitions. Motion and Web Audio stay client-only and must never block selection or results.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, CommonJS-compatible `tarot-data.js` and `tarot.js` exports for Node regression tests, Vercel Node API route, Web Audio API, existing GitHub Actions/Vercel deployment.

**Spec:** `docs/superpowers/specs/2026-09-02-tarot-expanded-readings-design.md`

## Global Constraints

- Keep exactly 78 tarot cards and the existing 39 source-derived HD AVIF pair assets.
- Active topics are exactly: `general`, `love`, `relations`, `broadcast`, `crew`, `content`, `career`, `money`, `direction`.
- Supported reading sizes are exactly 1, 3, 5, and 12 cards.
- Number-entry values are unique integers from 1 through 78 and never reveal card identity before result reveal.
- Direct-selection mode makes all 78 shuffled card backs eligible for selection.
- Sound uses Web Audio only; no external audio files or URLs.
- Sound preference key is `chunbongTarotSound`; default ON when no stored preference exists, but playback starts only after a user gesture unlocks audio.
- Preserve `prefers-reduced-motion: reduce`; no feature logic depends on animation completion.
- Keep `/api/tarot-reading` free and local: `provider: local-tarot-engine`, `model: rule-based-v2`; add no paid/external AI.
- Question limit remains 500 characters.
- Do not restructure or remove unrelated SOOP, schedule, notice, CATCH, VOD, fan-art, or YouTube behavior.

---

### Task 1: Canonical 9-topic, 4-spread, 78-card data model

**Files:**
- Modify: `tarot-data.js`
- Modify: `tests/tarot-regression.mjs`
- Test: `tests/tarot-expanded-data-regression.mjs`

**Interfaces:**
- Produces: `DATA.topics`; `DATA.spreads.single|threeFlow|fiveInsight|twelveCompass`; `card.deckNumber`; `card.topicHints[topicId]` for all 9 topics.
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
assert.equal(new Set(data.cards.map(card => card.id)).size, 78);
assert.deepEqual(data.cards.map(card => card.deckNumber), Array.from({ length: 78 }, (_, i) => i + 1));
for (const card of data.cards) {
  for (const topicId of topicIds) assert.ok(card.topicHints[topicId], `${card.id} missing ${topicId}`);
}
console.log('expanded tarot data regression test passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/tarot-expanded-data-regression.mjs`

Expected: FAIL because the current data has five topics, no 5/12-card spreads, and no `deckNumber`.

- [ ] **Step 3: Implement topics and spreads**

Use exactly:

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

- [ ] **Step 4: Implement all 9 topic hints and stable deck numbers**

Replace `topicHints` with:

```js
const topicHints = focus => ({
  general: `종합 흐름에서는 ${focus}을 중심으로 균형, 타이밍, 우선순위를 함께 살펴보세요.`,
  love: `연애에서는 ${focus}이 감정 표현, 신뢰, 경계, 관계의 속도에 어떤 영향을 주는지 살펴보세요.`,
  relations: `인간관계에서는 ${focus}을 기준으로 신뢰, 소통, 갈등, 주고받는 균형을 점검해 보세요.`,
  broadcast: `방송에서는 ${focus}이 페이스, 시청자 반응, 소통, 지속성에 어떤 영향을 주는지 확인해 보세요.`,
  crew: `크루에서는 ${focus}을 역할, 협업, 신뢰, 갈등 조율과 연결해서 보세요.`,
  content: `콘텐츠에서는 ${focus}을 아이디어, 차별화, 실행력, 타이밍, 지속 가능성과 연결해 보세요.`,
  career: `진로에서는 ${focus}을 강점, 기술, 기회, 책임, 성장 방향과 연결해 보세요.`,
  money: `금전에서는 ${focus}을 수입, 지출, 자원 배분, 안정성, 위험 관리와 연결해 보세요.`,
  direction: `앞으로의 방향에서는 ${focus}을 우선순위, 방향 수정, 타이밍, 다음 행동과 연결해 보세요.`
});
```

Change `withImageSlot` to:

```js
const withImageSlot = (card, index) => ({
  ...card,
  deckNumber: index + 1,
  imageSheet: Math.floor(index / 13),
  imageSlot: index % 13
});
```

- [ ] **Step 5: Update the legacy tarot regression for intentional identifiers**

In `tests/tarot-regression.mjs`, replace old spread assertions with:

```js
assert.deepEqual(data.spreads.threeFlow.positions, ['과거·배경','현재·핵심','앞으로의 흐름']);
assert.deepEqual(data.spreads.fiveInsight.positions, ['현재 상황','강점','장애물','조언','예상 흐름']);
assert.equal(data.spreads.twelveCompass.positions.length, 12);
```

Replace the old five-topic hint assertion with:

```js
for (const topicId of ['general','love','relations','broadcast','crew','content','career','money','direction']) {
  assert.ok(card.topicHints[topicId], `${card.id} must support ${topicId}`);
}
```

Use `topic: 'general'` and `spreadId: 'single'` in the sample payload test.

- [ ] **Step 6: Run focused regressions**

Run:

```bash
node tests/tarot-expanded-data-regression.mjs
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
```

Expected: PASS; HD assets unchanged.

- [ ] **Step 7: Commit**

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
- Produces: `spreadIdForCount(count)`, `validateDeckNumbers(values, count)`, `buildNumberSelections(values, spreadId, randomFn)`, existing `shuffleDeck`, normalized `{ card, orientation, position, deckNumber }` selections.
- Consumers: Tasks 3, 4, 6.

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

assert.deepEqual(tarot.validateDeckNumbers(['1','40','78'], 3), [1,40,78]);
for (const bad of [
  { values: ['0'], count: 1 },
  { values: ['79'], count: 1 },
  { values: ['1.5'], count: 1 },
  { values: [''], count: 1 },
  { values: ['3','3','8'], count: 3 },
  { values: ['1','2'], count: 3 }
]) assert.throws(() => tarot.validateDeckNumbers(bad.values, bad.count));

const picks = tarot.buildNumberSelections(['1','40','78'], 'threeFlow', () => 0.1);
assert.deepEqual(picks.map(x => x.card), [data.cards[0], data.cards[39], data.cards[77]]);
assert.deepEqual(picks.map(x => x.deckNumber), [1,40,78]);
assert.deepEqual(picks.map(x => x.position), data.spreads.threeFlow.positions);
assert.ok(picks.every(x => x.orientation === 'upright'));

const shuffled = tarot.shuffleDeck(data.cards, () => 0.5);
assert.equal(shuffled.length, 78);
assert.equal(new Set(shuffled.map(card => card.id)).size, 78);
console.log('tarot selection modes regression test passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/tarot-selection-modes-regression.mjs`

Expected: FAIL because the helper functions do not exist.

- [ ] **Step 3: Add pure helpers and export them**

Add before DOM-only code:

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
    if (number < 1 || number > 78) throw new Error('invalid_deck_number');
    return number;
  });
  if (new Set(numbers).size !== numbers.length) throw new Error('duplicate_deck_number');
  return numbers;
}

function buildNumberSelections(values, spreadId, randomFn = random01) {
  const positions = DATA.spreads[spreadId]?.positions;
  if (!positions) throw new Error('invalid_spread');
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}
```

Export the three helpers through `TAROT_API`.

- [ ] **Step 4: Run helper and existing regressions**

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

### Task 3: Expand setup UI, number entry, and full 78-card direct selection

**Files:**
- Modify: `tarot.html`
- Modify: `tarot.js`
- Modify: `tarot.css`
- Test: `tests/tarot-expanded-ui-regression.mjs`

**Interfaces:**
- Consumes: Task 2 helpers.
- Produces: 9 topic controls, 1/3/5/12 controls, `number|cards` selection method, number input panel, 78-card arena, selected-slot strip, sound toggle placeholder.
- Consumers: Tasks 4 and 6.

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
assert.ok(js.includes('selectionMode'));
assert.ok(css.includes('.tarot-number-inputs'));
assert.ok(css.includes('.tarot-selected-slots'));
console.log('expanded tarot UI regression test passed');
```

- [ ] **Step 2: Run and verify RED**

Run: `node tests/tarot-expanded-ui-regression.mjs`

Expected: FAIL on new controls and 78-card rendering.

- [ ] **Step 3: Replace setup controls in `tarot.html`**

Use 9 topic radio labels with values from Task 1, four count radios (`1`,`3`,`5`,`12`), and:

```html
<fieldset class="tarot-choice-group"><legend>카드 선택 방식</legend>
  <label><input type="radio" name="selection-mode" value="number" checked><span>숫자 직접 입력</span></label>
  <label><input type="radio" name="selection-mode" value="cards"><span>카드 직접 선택</span></label>
</fieldset>
<section id="tarot-number-panel" class="tarot-number-panel">
  <p class="tarot-number-help">1~78 사이 숫자를 카드 장수만큼 직접 입력하세요. 같은 숫자는 한 번만 사용할 수 있습니다.</p>
  <div id="tarot-number-inputs" class="tarot-number-inputs"></div>
  <p id="tarot-number-error" class="tarot-number-error" role="alert"></p>
</section>
<button id="tarot-sound-toggle" class="tarot-sound-toggle" type="button" aria-pressed="true">효과음 ON</button>
```

Keep the 500-character textarea and existing results/counseling containers.

- [ ] **Step 4: Implement explicit state and mode setup in `tarot.js`**

Use:

```js
const state = {
  topic: 'general', count: 1, spreadId: 'single', selectionMode: 'number',
  question: '', deck: [], selected: [], phase: 'setup',
  readingSucceeded: false, soundEnabled: true
};
```

`readSetup()` must return `topic`, `count`, `spreadId: spreadIdForCount(count)`, `selectionMode`, and trimmed question.

Add:

```js
function renderNumberInputs(count) {
  byId('tarot-number-inputs').replaceChildren(...Array.from({ length: count }, (_, index) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.max = '78';
    input.step = '1';
    input.required = true;
    input.setAttribute('aria-label', `${index + 1}번째 카드 번호`);
    return input;
  }));
}
```

On count changes call `renderNumberInputs(Number(value))`. On selection-mode changes toggle `#tarot-number-panel` and update the start button label (`숫자로 카드 열기` vs `78장 카드 섞기`).

- [ ] **Step 5: Implement number-mode start behavior**

Inside `startReading()` after reading setup:

```js
if (state.selectionMode === 'number') {
  const values = [...byId('tarot-number-inputs').querySelectorAll('input')].map(input => input.value);
  try {
    state.selected = buildNumberSelections(values, state.spreadId);
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
```

Do not render card names or faces before `beginReveal()`.

- [ ] **Step 6: Implement direct-card selection for all 78 backs**

For card mode:

```js
state.deck = shuffleDeck(DATA.cards);
state.selected = [];
state.phase = 'selecting';
```

`renderDeck()` uses `state.deck.slice(0, 78)` and renders all 78 buttons. Render `#tarot-selected-slots` with `state.count` position labels. `selectCard(button)` appends:

```js
{
  card,
  orientation: orientationFromRandom(),
  position: DATA.spreads[state.spreadId].positions[state.selected.length],
  deckNumber: card.deckNumber
}
```

Then disable/lock the source button, fill only the corresponding slot indicator (no face/name), update `selected / required`, and call `beginReveal()` when exact count is reached.

- [ ] **Step 7: Add responsive UI CSS**

Add:

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

Keep `.tarot-card-art{max-width:320px}`. Under 900px cap result grids at 3 columns; under 700px at 2; under 430px at 1.

- [ ] **Step 8: Run UI regressions**

Run:

```bash
node tests/tarot-expanded-ui-regression.mjs
node tests/tarot-selection-modes-regression.mjs
node tests/tarot-regression.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add tarot.html tarot.js tarot.css tests/tarot-expanded-ui-regression.mjs tests/tarot-regression.mjs
git commit -m "feat: add expanded tarot selection UI"
```

---

### Task 4: Non-blocking reveal effects and Web Audio cues

**Files:**
- Modify: `tarot.js`
- Modify: `tarot.css`
- Test: `tests/tarot-effects-audio-regression.mjs`

**Interfaces:**
- Produces: `createTarotSoundController(storage, AudioContextCtor)`, `sound.play('shuffle'|'select'|'reveal'|'complete')`, `beginReveal()`, CSS selection/reveal/completion animations.
- Consumers: Task 6.

- [ ] **Step 1: Write the failing effects/audio regression**

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
const storage = { getItem:k => memory.has(k) ? memory.get(k) : null, setItem:(k,v) => memory.set(k,v) };
const sound = tarot.createTarotSoundController(storage, null);
assert.equal(sound.enabled(), true);
sound.setEnabled(false);
assert.equal(storage.getItem('chunbongTarotSound'), 'off');
assert.equal(sound.enabled(), false);
for (const token of ['@keyframes tarotSelect','@keyframes tarotReveal','@keyframes tarotCompleteGlow','@keyframes tarotSpark']) assert.ok(css.includes(token));
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
for (const cue of ['shuffle','select','reveal','complete']) assert.ok(js.includes(`play('${cue}')`));
assert.ok(js.includes('createBuffer'));
assert.ok(!js.match(/\.(mp3|wav|ogg)/i));
console.log('tarot effects and audio regression test passed');
```

- [ ] **Step 2: Run and verify RED**

Run: `node tests/tarot-effects-audio-regression.mjs`

Expected: FAIL on missing sound controller/keyframes.

- [ ] **Step 3: Implement injectable sound controller with filtered-noise shuffle**

Add and export:

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
  const tone = (frequency, duration, gain = 0.03, offset = 0) => {
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
  const swish = () => {
    const ctx = ensureContext();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.16), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    amp.gain.setValueAtTime(0.025, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start();
  };
  return {
    enabled: () => isEnabled,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) { isEnabled = Boolean(value); storage?.setItem?.(key, isEnabled ? 'on' : 'off'); },
    play(name) {
      if (!isEnabled) return;
      try {
        if (name === 'shuffle') swish();
        if (name === 'select') tone(520, 0.08);
        if (name === 'reveal') { tone(220, 0.18, 0.025); tone(740, 0.12, 0.025, 0.08); }
        if (name === 'complete') { tone(440, 0.12); tone(554, 0.12, 0.03, 0.11); tone(659, 0.16, 0.03, 0.22); }
      } catch (_) {}
    }
  };
}
```

- [ ] **Step 4: Wire toggle and user-gesture unlock**

Instantiate once in DOM mode. On sound-toggle click: call `unlock()`, invert enabled state, store it, update `aria-pressed`, and set label to `효과음 ON` or `효과음 OFF`. Also call `unlock()` from the setup submit/direct-card click user gesture before the first cue. Audio failure remains silent.

- [ ] **Step 5: Implement reveal sequence without animation dependencies**

Use:

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

Play `shuffle` after the direct deck is rendered and `select` after each direct selection.

- [ ] **Step 6: Add motion CSS and reduced-motion overrides**

Define `@keyframes tarotSelect`, `tarotReveal`, `tarotCompleteGlow`, `tarotSpark`; use `animation-delay:var(--reveal-delay,0ms)`. Apply one completion glow/spark to the summary/result heading. In `prefers-reduced-motion: reduce`, disable all new motion while preserving `.tarot-card-art.is-reversed{transform:rotate(180deg)}`.

- [ ] **Step 7: Run effects regressions**

Run:

```bash
node tests/tarot-effects-audio-regression.mjs
node tests/tarot-expanded-ui-regression.mjs
node tests/tarot-selection-modes-regression.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

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
- Consumes: Task 1 `DATA.topics`/`DATA.spreads`.
- Produces: valid 1/3/5/12 HTTP 200 readings; invalid payload HTTP 400; `provider:'local-tarot-engine'`, `model:'rule-based-v2'`.

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
    question:'현재 흐름을 점검해줘', topic:'general', spreadId,
    cards:data.cards.slice(0,count).map((card,i) => ({ id:card.id, orientation:i%2?'reversed':'upright', position:positions[i] }))
  };
  const validated = api.validateReadingRequest(body);
  const reading = api.generateLocalReading(validated);
  assert.equal(reading.cards.length, count);
  assert.ok(reading.overall.length > 80);
  assert.ok(reading.summary.length > 20);
}
for (const topic of Object.keys(data.topics)) {
  assert.doesNotThrow(() => api.validateReadingRequest({
    question:'', topic, spreadId:'single',
    cards:[{ id:data.cards[0].id, orientation:'upright', position:'핵심 메시지' }]
  }));
}
assert.throws(() => api.validateReadingRequest({
  question:'', topic:'general', spreadId:'threeFlow',
  cards:[{ id:data.cards[0].id, orientation:'upright', position:'과거·배경' }]
}));
console.log('expanded local tarot API regression test passed');
```

- [ ] **Step 2: Run and verify RED**

Run: `node tests/tarot-expanded-api-regression.mjs`

Expected: FAIL on model version and 5/12-card validation.

- [ ] **Step 3: Derive validation from canonical spreads**

Set:

```js
const LOCAL_MODEL = 'rule-based-v2';
```

Replace hard-coded `[1,3]` count logic with:

```js
const positions = DATA.spreads[spreadId].positions;
if (cards.length !== positions.length || ![1,3,5,12].includes(cards.length)) {
  throw httpError('invalid_card_count', 400);
}
```

Keep unique IDs, orientation, exact position order, topic/spread existence, and 500-character question validation.

- [ ] **Step 4: Add aggregate distribution and relationship helpers**

Add:

```js
function summarizeDistribution(cards) {
  const majorCount = cards.filter(item => item.card.arcana === 'major').length;
  const reversedCount = cards.filter(item => item.orientation === 'reversed').length;
  const courtCount = cards.filter(item => ['시종','기사','여왕','왕'].includes(item.card.rank)).length;
  const suits = new Map();
  for (const item of cards) if (item.card.suit) suits.set(item.card.suit, (suits.get(item.card.suit) || 0) + 1);
  const dominantSuit = [...suits.entries()].sort((a,b) => b[1] - a[1])[0] || null;
  return { majorCount, reversedCount, courtCount, dominantSuit };
}

function buildEdgeRelationship(validated) {
  const first = validated.cards[0];
  const last = validated.cards[validated.cards.length - 1];
  if (validated.cards.length === 1) return '';
  const firstKey = cardKeywords(first.card, first.orientation).split(',')[0].trim();
  const lastKey = cardKeywords(last.card, last.orientation).split(',')[0].trim();
  return `${first.position}의 ${firstKey}에서 ${last.position}의 ${lastKey}로 이어지는 변화를 함께 보면 시작점과 최종 방향의 차이가 더 선명해집니다.`;
}

function buildTwelveCardThemes(validated) {
  if (validated.cards.length !== 12) return '';
  const core = validated.cards.slice(0, 4).map(x => x.card.nameKo).join(', ');
  const resources = validated.cards.slice(4, 7).map(x => x.card.nameKo).join(', ');
  const friction = validated.cards.slice(7, 9).map(x => x.card.nameKo).join(', ');
  const direction = validated.cards.slice(9, 12).map(x => x.card.nameKo).join(', ');
  return `핵심 흐름은 ${core}, 강점과 기회는 ${resources}, 조정할 지점은 ${friction}, 가까운 흐름부터 최종 방향은 ${direction}의 연결로 읽을 수 있습니다.`;
}
```

- [ ] **Step 5: Use aggregate analysis in overall/advice/summary**

In `buildOverall()`, include `summarizeDistribution`, `buildEdgeRelationship`, and `buildTwelveCardThemes`. Add sentences for dominant suit only when its count is at least 3; for court cards only when `courtCount >= 3`; for high Major Arcana concentration use `majorCount >= Math.ceil(cards.length / 3)`. Preserve stable-hash phrasing choice and reflective, non-certain wording.

In `buildAdvice()`, keep the current high-risk safeguard and add a 12-card advice item using the `조언`, `가까운 흐름`, `장기 흐름`, `최종 방향` positions rather than repeating all 12 card texts.

- [ ] **Step 6: Update legacy API regression to v2**

In `tests/tarot-ai-api-regression.mjs`, replace old topic/spread/position values with `general` / `single` / `핵심 메시지`, expect `rule-based-v2`, and add one 12-card handler call that asserts 200, 12 card readings, provider, and model.

- [ ] **Step 7: Run API regressions**

Run:

```bash
node tests/tarot-expanded-api-regression.mjs
node tests/tarot-ai-api-regression.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/tarot-reading.js tests/tarot-expanded-api-regression.mjs tests/tarot-ai-api-regression.mjs
git commit -m "feat: expand free local tarot reading engine"
```

---

### Task 6: Integrate final results, payloads, copy, and accessibility

**Files:**
- Modify: `tarot.js`
- Modify: `tarot.html`
- Modify: `tarot.css`
- Modify: `tests/tarot-regression.mjs`
- Test: `tests/tarot-expanded-integration-regression.mjs`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: final arbitrary-size client payload/rendering, deck number after reveal only, 1/3/5/12 responsive grids, counseling panel for 12 cards, accessible progress/errors/toggle.

- [ ] **Step 1: Write failing integration regression**

Create `tests/tarot-expanded-integration-regression.mjs`:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');

const selected = data.cards.slice(0,12).map((card,index) => ({
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

- [ ] **Step 2: Run and verify RED**

Run: `node tests/tarot-expanded-integration-regression.mjs`

Expected: FAIL until final rendering/copy are connected.

- [ ] **Step 3: Finalize result rendering**

In `renderResults()` set:

```js
byId('tarot-reading-grid').dataset.count = String(state.count);
```

After reveal, card copy includes:

```html
<small>${direction} · DECK ${selection.deckNumber}</small>
```

Before reveal, number mode and selected-slot UI never include `card.nameKo` or card art.

- [ ] **Step 4: Make base summary and counseling payload size-agnostic**

`buildSummary()` must use first/last selection and aggregate counts without indexing `[2]`. `buildAiRequestPayload()` keeps the existing shape and maps every selected item:

```js
cards: (readingState.selected || []).map(({ card, orientation, position }) => ({
  id: card.id, orientation, position
}))
```

`renderAiReading()` continues iterating `reading.cards` without limiting length. Visible wording remains `무료 자동 타로 상담`.

- [ ] **Step 5: Finalize accessibility and phase copy**

`#tarot-selection-status` stays `aria-live="polite"`; number error stays `role="alert"`; sound toggle maintains `aria-pressed`; direct selected backs are real `disabled` buttons. Status messages distinguish `숫자를 확인하고 카드를 펼칩니다`, `78장 중 N장을 선택했습니다`, `카드를 순서대로 펼치고 있어요`, and `리딩이 준비됐습니다`.

- [ ] **Step 6: Run integration/legacy regressions**

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

### Task 7: Main CI, full regression, production deploy, and 12-card acceptance probe

**Files:**
- Modify: `.github/workflows/catch-regression.yml`
- Create temporarily on validation branch: `.github/workflows/tarot-expanded-full-validation.yml`
- Keep temporary validation workflow out of `main`.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: green full regression, clean main, successful Vercel deployment, real 12-card production HTTP 200 with `local-tarot-engine` / `rule-based-v2`.

- [ ] **Step 1: Add the new tarot regressions to permanent Site regression CI**

In `.github/workflows/catch-regression.yml`, after existing tarot tests add:

```yaml
      - name: Run expanded Tarot data regression
        run: node tests/tarot-expanded-data-regression.mjs
      - name: Run Tarot selection mode regression
        run: node tests/tarot-selection-modes-regression.mjs
      - name: Run expanded Tarot UI regression
        run: node tests/tarot-expanded-ui-regression.mjs
      - name: Run Tarot effects and audio regression
        run: node tests/tarot-effects-audio-regression.mjs
      - name: Run expanded Tarot API regression
        run: node tests/tarot-expanded-api-regression.mjs
      - name: Run expanded Tarot integration regression
        run: node tests/tarot-expanded-integration-regression.mjs
```

- [ ] **Step 2: Commit permanent CI coverage**

```bash
git add .github/workflows/catch-regression.yml
git commit -m "test: cover expanded tarot experience"
```

- [ ] **Step 3: Create a validation branch and temporary full-test workflow**

Create `.github/workflows/tarot-expanded-full-validation.yml` only on the validation branch:

```yaml
name: Tarot expanded full validation
on:
  push:
    branches: [validate/tarot-expanded-final]
jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Syntax checks
        run: |
          node --check script.js
          node --check page.js
          node --check tarot-data.js
          node --check tarot.js
          for file in api/*.js; do node --check "$file"; done
      - name: Run all regression tests
        run: |
          set -e
          count=0
          for file in tests/*.mjs; do
            echo "=== $file ==="
            node "$file"
            count=$((count + 1))
          done
          echo "TOTAL_TEST_FILES=$count"
```

- [ ] **Step 4: Verify the validation run is fully green**

Expected: syntax check PASS; every `tests/*.mjs` PASS; logs show the total test-file count. Specifically confirm existing SOOP/notice/schedule/CATCH tests and tarot HD asset tests still pass.

- [ ] **Step 5: Promote only the clean implementation/CI commit to `main`**

Do not promote the temporary validation workflow commit. Confirm main tree contains no `tarot-expanded-full-validation.yml`.

- [ ] **Step 6: Verify main Site regression and Vercel status**

For the final main SHA, require GitHub `Site regression` conclusion `success` and Vercel commit status `success` before production probing.

- [ ] **Step 7: Probe production home and HD asset**

Against `https://chunbong-fansite.vercel.app`:

```bash
home_status=$(curl --silent --show-error --location --output /tmp/home.html --write-out '%{http_code}' https://chunbong-fansite.vercel.app/)
asset_status=$(curl --silent --show-error --location --output /tmp/pair-38.avif --write-out '%{http_code}' https://chunbong-fansite.vercel.app/assets/tarot/hd/pair-38.avif)
test "$home_status" = '200'
test "$asset_status" = '200'
test -s /tmp/pair-38.avif
```

- [ ] **Step 8: Probe a real 12-card production POST**

POST:

```json
{
  "question":"앞으로의 방송과 콘텐츠 방향을 점검해줘",
  "topic":"direction",
  "spreadId":"twelveCompass",
  "cards":[
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

Expected: HTTP 200; `reading.cards.length === 12`; `provider === 'local-tarot-engine'`; `model === 'rule-based-v2'`.

- [ ] **Step 9: Report completion only with observed evidence**

Final report includes final main SHA, full-test count, main CI success, Vercel success, homepage/HD asset HTTP 200, and real 12-card production HTTP 200. If any acceptance condition fails, report the blocker instead of claiming completion.
