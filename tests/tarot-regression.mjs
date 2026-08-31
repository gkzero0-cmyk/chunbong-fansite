import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

const data = require('../tarot-data.js');
const tarot = require('../tarot.js');

assert.equal(data.cards.length, 78, 'tarot deck must contain 78 cards');
assert.equal(data.cards.filter(card => card.arcana === 'major').length, 22, 'deck must contain 22 major cards');
assert.equal(data.cards.filter(card => card.arcana === 'minor').length, 56, 'deck must contain 56 minor cards');
assert.equal(new Set(data.cards.map(card => card.id)).size, 78, 'all tarot card ids must be unique');
assert.deepEqual(data.spreads.pastPresentFuture.positions, ['과거', '현재', '미래']);
assert.deepEqual(data.spreads.situationAdviceOutcome.positions, ['상황', '조언', '결과']);

for (const card of data.cards) {
  assert.ok(card.nameKo, `${card.id} must have a Korean name`);
  assert.ok(card.meaningUpright && card.meaningReversed, `${card.id} must have both meanings`);
  assert.ok(card.topicHints.daily && card.topicHints.concern && card.topicHints.love && card.topicHints.money && card.topicHints.game, `${card.id} must support every topic`);
  assert.ok(Number.isInteger(card.imageSheet) && card.imageSheet >= 0 && card.imageSheet < 6, `${card.id} must map to one of six source slots`);
  assert.ok(Number.isInteger(card.imageSlot) && card.imageSlot >= 0 && card.imageSlot < 13, `${card.id} must map to a valid source slot`);
}

const deterministic = (() => {
  const values = [0.99, 0.01, 0.75, 0.25, 0.6, 0.4];
  let index = 0;
  return () => values[index++ % values.length];
})();
const shuffled = tarot.shuffleDeck(data.cards.slice(0, 8), deterministic);
assert.equal(new Set(shuffled.map(card => card.id)).size, 8, 'shuffle must not duplicate cards');
assert.equal(tarot.orientationFromRandom(() => 0.1), 'upright');
assert.equal(tarot.orientationFromRandom(() => 0.9), 'reversed');
const sample = { card: data.cards[0], orientation: 'upright' };
assert.ok(tarot.buildCardInterpretation(sample, 'daily', '현재').includes(data.cards[0].nameKo));
assert.ok(tarot.buildSummary([sample], 'daily', 'single').includes('가능성'));

const aiPayload = tarot.buildAiRequestPayload({
  question: '질문',
  topic: 'concern',
  spreadId: 'single',
  selected: [{ card: data.cards[0], orientation: 'upright', position: '메시지' }]
});
assert.deepEqual(aiPayload, {
  question: '질문',
  topic: 'concern',
  spreadId: 'single',
  cards: [{ id: data.cards[0].id, orientation: 'upright', position: '메시지' }]
});

const html = read('tarot.html');
for (const token of [
  'data-page="tarot"', 'id="tarot-setup"', 'id="tarot-spread-options"', 'id="tarot-question"',
  'id="tarot-deck"', 'id="tarot-results"', 'id="tarot-reading-grid"', 'id="tarot-summary"',
  'id="tarot-ai-panel"', 'id="tarot-ai-button"', 'id="tarot-ai-status"', 'id="tarot-ai-content"',
  'tarot.css', 'tarot-data.js', 'tarot.js'
]) assert.ok(html.includes(token), `tarot.html should include ${token}`);
assert.ok(html.includes('maxlength="500"'), 'question length should match server validation');
assert.ok(html.includes('과거 · 현재 · 미래'));
assert.ok(html.includes('상황 · 조언 · 결과'));
assert.ok(html.includes('타로 결과는 재미와 자기성찰을 위한 참고용입니다.'));

const script = read('tarot.js');
assert.ok(script.includes("fetch('/api/tarot-reading'"), 'tarot frontend must call the server-side AI endpoint');
assert.ok(script.includes('textContent'), 'AI output must be rendered as text, not trusted HTML');
assert.ok(!script.includes('OPENAI_API_KEY'), 'client code must never contain the OpenAI API key name');
assert.ok(script.includes('assets/tarot/hd/pair-${String(pair).padStart(2, \'0\')}.avif'), 'tarot results must load the source-derived HD pair for the selected card');
assert.ok(script.includes("backgroundSize = '200% 100%'"), 'tarot renderer must crop one card from a two-card HD pair');
assert.ok(script.includes('globalIndex = sheet * 13 + slot'), 'tarot renderer must map all 78 legacy slots into HD pairs');

const css = read('tarot.css');
for (const token of [
  '.tarot-stage', '.tarot-card-back', '.tarot-card-art', '.tarot-reading-grid', '.tarot-ai-panel', '.tarot-ai-content',
  '@keyframes tarotShuffle', '@keyframes tarotReveal', '@media (prefers-reduced-motion: reduce)'
]) assert.ok(css.includes(token), `tarot.css should include ${token}`);
assert.ok(css.includes('max-width:320px'), 'tarot artwork must not be enlarged beyond its source-derived width');

console.log('tarot data, original HD pair logic, AI UI, page and styling regression test passed');
