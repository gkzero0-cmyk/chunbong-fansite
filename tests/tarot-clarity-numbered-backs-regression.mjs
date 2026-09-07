import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

const wandsNine = data.cards.find(card => card.id === 'wands-09');
assert.ok(wandsNine, 'fixture card wands-09 must exist');
const svg = composite.buildCompositeSvg(
  wandsNine,
  { url: 'assets/tarot/hd/pair-22.avif', sourceX: 0 },
  false,
  'clarity-test'
);
assert.match(svg, /class="tarot-composite-art-image"/, 'composite must keep the raster illustration isolated from vector labels');
assert.doesNotMatch(svg, /class="tarot-vector-title"[^>]*filter=/, 'live vector title must not be filtered');
assert.doesNotMatch(svg, /class="tarot-vector-rank"[^>]*filter=/, 'live vector rank must not be filtered');

const compositeCss = fs.readFileSync(new URL('tarot-composite.css', root), 'utf8');
assert.ok(!compositeCss.includes('filter:drop-shadow('), 'whole SVG must not be drop-shadow filtered because that can rasterize and soften vector text/frame');
assert.match(
  compositeCss,
  /\.tarot-composite-art-image\{[^}]*filter:none/,
  'uploaded original artwork must not be softened or artificially sharpened by a CSS clarity filter'
);
assert.match(compositeCss, /#tarot-deck\{counter-reset:tarot-card-back\}/, 'direct-selection deck must reset a sequential card counter');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\{[^}]*counter-increment:tarot-card-back[^}]*display:grid[^}]*place-items:center/, 'every visible card back must increment and center its sequential number');
assert.match(compositeCss, /content:counter\(tarot-card-back\)/, 'card backs must display 1 through 78 instead of the CB placeholder');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back span::after\{[^}]*width:44px[^}]*height:44px/, 'desktop card-back number badge must have one stable centered circular size');

const tarotSource = fs.readFileSync(new URL('tarot.js', root), 'utf8');
assert.match(tarotSource, /aria-label="뒤집힌 타로 카드 \$\{index \+ 1\} 선택"/, 'numeric card-back positions must remain exposed to assistive technology');

console.log('tarot clarity and numbered card-back regression test passed');
