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
assert.deepEqual(data.spreads.threeFlow.positions, ['과거·배경', '현재·핵심', '앞으로의 흐름']);
assert.deepEqual(data.spreads.fiveInsight.positions, ['현재 상황', '강점', '장애물', '조언', '예상 흐름']);
assert.equal(data.spreads.twelveCompass.positions.length, 12);

for (const card of data.cards) {
  assert.ok(card.nameKo, `${card.id} must have a Korean name`);
  assert.ok(card.meaningUpright && card.meaningReversed, `${card.id} must have both meanings`);
  for (const topicId of ['general','love','relations','broadcast','crew','content','career','money','direction']) {
    assert.ok(card.topicHints[topicId], `${card.id} must support ${topicId}`);
  }
  assert.ok(Number.isInteger(card.deckNumber) && card.deckNumber >= 1 && card.deckNumber <= 78, `${card.id} must have a stable deck number`);
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
assert.ok(tarot.buildCardInterpretation(sample, 'general', '핵심 메시지').includes(data.cards[0].nameKo));
assert.ok(tarot.buildSummary([sample], 'general', 'single').includes('가능성'));

const aiPayload = tarot.buildAiRequestPayload({
  question: '질문',
  topic: 'general',
  spreadId: 'single',
  selected: [{ card: data.cards[0], orientation: 'upright', position: '핵심 메시지' }]
});
assert.deepEqual(aiPayload, {
  question: '질문',
  topic: 'general',
  spreadId: 'single',
  cards: [{ id: data.cards[0].id, orientation: 'upright', position: '핵심 메시지' }]
});

const html = read('tarot.html');
for (const token of [
  'data-page="tarot"', 'id="tarot-setup"', 'id="tarot-number-panel"', 'id="tarot-number-inputs"',
  'id="tarot-number-error"', 'id="tarot-selected-slots"', 'id="tarot-sound-toggle"', 'id="tarot-question"',
  'id="tarot-deck"', 'id="tarot-confirm-selection"', 'id="tarot-results"', 'id="tarot-reading-grid"', 'id="tarot-summary"',
  'id="tarot-ai-panel"', 'id="tarot-ai-button"', 'id="tarot-ai-status"', 'id="tarot-ai-content"', 'id="tarot-card-zoom"',
  'tarot.css', 'tarot-quality.css', 'tarot-data.js', 'tarot.js'
]) assert.ok(html.includes(token), `tarot.html should include ${token}`);
assert.ok(html.includes('maxlength="500"'), 'question length should match server validation');
assert.ok(html.includes('종합타로'));
assert.ok(html.includes('5장'));
assert.ok(html.includes('12장'));
assert.ok(html.includes('숫자 직접 입력'));
assert.ok(html.includes('카드 직접 선택'));
assert.ok(html.includes('타로 결과는 재미와 자기성찰을 위한 참고용입니다.'));

const script = read('tarot.js');
assert.ok(script.includes("fetch('/api/tarot-reading'"), 'tarot frontend must call the local counseling endpoint');
assert.ok(script.includes('textContent'), 'counseling output must be rendered as text, not trusted HTML');
assert.ok(!script.includes('OPENAI_API_KEY'), 'client code must never contain the OpenAI API key name');
assert.ok(script.includes('assets/tarot/hd/pair-${String(pair).padStart(2, \'0\')}.avif'), 'tarot results must load the source-derived HD pair for the selected card');
assert.ok(script.includes('globalIndex = sheet * 13 + slot'), 'tarot renderer must map all 78 legacy slots into HD pairs');
assert.ok(script.includes('viewBox="0 0 960 1440"'), 'tarot renderer must crop one exact 960x1440 card region from a pair');
assert.ok(script.includes('width="1920" height="1440"'), 'SVG crop must preserve the pair asset pixel geometry');
assert.ok(script.includes('feConvolveMatrix'), 'tarot artwork must use the mild sharpening pass');
assert.ok(!script.includes("backgroundSize = '200% 100%'"), 'result rendering must not rely on CSS background sprite scaling');
assert.ok(script.includes('toggleDirectSelection'), 'direct selection must support cancel and reselect');
assert.ok(script.includes('selectionCanComplete'), 'direct selection reveal must require the configured count');

const css = read('tarot.css');
for (const token of [
  '.tarot-stage', '.tarot-card-back', '.tarot-card-art', '.tarot-reading-grid', '.tarot-ai-panel', '.tarot-ai-content',
  '.tarot-number-inputs', '.tarot-selected-slots', '@keyframes tarotShuffle', '@keyframes tarotReveal', '@media (prefers-reduced-motion: reduce)'
]) assert.ok(css.includes(token), `tarot.css should include ${token}`);
const qualityCss = read('tarot-quality.css');
for (const token of ['.tarot-card-art-button', '.tarot-card-art-svg', '.tarot-card-dialog', '.tarot-card-back.selected']) {
  assert.ok(qualityCss.includes(token), `tarot-quality.css should include ${token}`);
}
assert.ok(qualityCss.includes('max-width:320px'), 'normal result cards should remain within the detail-preserving display width');
assert.ok(qualityCss.includes('width:min(72vw,600px)'), 'zoom view should provide a substantially larger inspection view');

console.log('tarot expanded data, exact HD crop, reselect UI, page and styling regression test passed');
