import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

assert.equal(tarot.deckBackLabel(0), '1', 'first direct-selection card back must show 1');
assert.equal(tarot.deckBackLabel(77), '78', 'last direct-selection card back must show 78');
assert.equal(tarot.deckBackLabel(8), '9', 'card-back numbering must stay one-based across the deck');

const source = fs.readFileSync(new URL('tarot.js', root), 'utf8');
assert.ok(!source.includes('<span>CB</span>'), 'legacy CB card-back label must not remain in the direct-selection renderer');
assert.ok(source.includes('deckBackLabel(index)'), 'direct-selection renderer must use the shared one-based label helper');

const wandsNine = data.cards.find(card => card.id === 'wands-09');
assert.ok(wandsNine, 'fixture card wands-09 must exist');
const svg = composite.buildCompositeSvg(
  wandsNine,
  { url: 'assets/tarot/hd/pair-22.avif', sourceX: 0 },
  false,
  'clarity-test'
);
assert.match(svg, /id="clarity-test-art-sharpen"/, 'composite must define an illustration-only sharpen filter');
assert.match(
  svg,
  /class="tarot-composite-art-image"[^>]*filter="url\(#clarity-test-art-sharpen\)"/,
  'the raster illustration must use the sharpen filter'
);
assert.doesNotMatch(svg, /class="tarot-vector-title"[^>]*filter=/, 'live vector title must not be sharpened');
assert.doesNotMatch(svg, /class="tarot-vector-rank"[^>]*filter=/, 'live vector rank must not be sharpened');

const compositeCss = fs.readFileSync(new URL('tarot-composite.css', root), 'utf8');
assert.ok(!compositeCss.includes('filter:drop-shadow('), 'whole SVG must not be drop-shadow filtered because that can rasterize and soften vector text/frame');

console.log('tarot clarity and numbered card-back regression test passed');
