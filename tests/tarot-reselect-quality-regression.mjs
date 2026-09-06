import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const positions = data.spreads.threeFlow.positions;
let selected = [];
selected = tarot.toggleDirectSelection(selected, data.cards[0], 0, positions, 3, () => 0.1);
selected = tarot.toggleDirectSelection(selected, data.cards[1], 1, positions, 3, () => 0.9);
assert.equal(selected.length, 2, 'two direct picks should be kept');
assert.deepEqual(selected.map(item => item.position), positions.slice(0, 2));
assert.equal(selected[0].orientation, 'upright');
assert.equal(selected[1].orientation, 'reversed');

selected = tarot.toggleDirectSelection(selected, data.cards[0], 0, positions, 3, () => 0.1);
assert.equal(selected.length, 1, 'clicking an already-selected card should cancel it');
assert.equal(selected[0].deckIndex, 1, 'the other selected card should remain selected');
assert.equal(selected[0].position, positions[0], 'remaining cards should be re-numbered into spread positions');

selected = tarot.toggleDirectSelection(selected, data.cards[2], 2, positions, 3, () => 0.1);
selected = tarot.toggleDirectSelection(selected, data.cards[3], 3, positions, 3, () => 0.1);
assert.equal(tarot.selectionCanComplete(selected, 3), true, 'reading should only be completable at the requested count');
const full = selected;
selected = tarot.toggleDirectSelection(selected, data.cards[4], 4, positions, 3, () => 0.1);
assert.deepEqual(selected, full, 'a fourth card must not be appended when three are requested');

const descriptor = tarot.cardArtworkDescriptor({ imageSheet: 0, imageSlot: 1 });
assert.deepEqual(descriptor, {
  pair: 0,
  pairSlot: 1,
  url: 'assets/tarot/hd/pair-00.avif',
  sourceX: -960
});

const html = read('tarot.html');
assert.ok(html.includes('id="tarot-confirm-selection"'), 'direct selection needs an explicit selection-complete button');
assert.ok(html.includes('id="tarot-card-zoom"'), 'tarot results need a native large-card dialog');

const script = read('tarot.js');
assert.ok(script.includes('toggleDirectSelection'), 'frontend must use toggle semantics instead of permanently disabling picked cards');
assert.ok(script.includes('selectionCanComplete'), 'frontend must gate reveal behind the requested card count');
assert.ok(script.includes('feConvolveMatrix'), 'result artwork should use a mild same-origin SVG sharpening filter');
assert.ok(script.includes('tarot-confirm-selection'), 'frontend must wait for explicit confirmation before reveal');
assert.ok(!script.includes("button.disabled = true;\n    button.classList.add('selected');\n    soundController.play('select');\n    renderSelectedSlots();\n    byId('tarot-selection-status').textContent = `78장 중 ${state.selected.length}/${state.count}장을 선택했습니다.`;\n    if (state.selected.length === state.count) beginReveal();"), 'filling the requested count must not auto-reveal immediately');

const css = read('tarot.css');
assert.ok(css.includes('.tarot-card-art-button'), 'result card artwork should be an interactive zoom control');
assert.ok(css.includes('.tarot-card-dialog'), 'large-card dialog styling should exist');

console.log('tarot reselect and sharper artwork regression test passed');
