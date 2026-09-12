import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tarot.css', import.meta.url), 'utf8');

for (const value of ['general','love','partner','relations','broadcast','content','crew','money','choice','direction']) {
  assert.ok(html.includes(`name="topic" value="${value}"`));
}
assert.ok(html.includes('어떻게 볼까요?'));
assert.ok(html.includes('id="tarot-spread-options"'));
assert.ok(html.includes('name="spread" value="single"'));
assert.ok(html.includes('name="spread" value="threeFlow"'));
assert.ok(html.includes('name="spread" value="fiveInsight"'));
assert.ok(html.includes('name="spread" value="twelveCompass"'));
assert.ok(html.includes('name="selection-mode" value="number"'));
assert.ok(html.includes('name="selection-mode" value="cards"'));
for (const id of ['tarot-number-panel','tarot-number-inputs','tarot-number-error','tarot-selected-slots','tarot-sound-toggle']) {
  assert.ok(html.includes(`id="${id}"`));
}
assert.ok(js.includes('state.deck.slice(0, 78)'));
assert.ok(js.includes('selectionMode'));
assert.ok(js.includes('renderSpreadChoices'));
assert.ok(js.includes('READING_CONFIG.choicesForTopic'));
assert.ok(css.includes('.tarot-number-inputs'));
assert.ok(css.includes('.tarot-selected-slots'));
console.log('topic-aware expanded tarot UI regression test passed');
