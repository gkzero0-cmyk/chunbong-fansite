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
