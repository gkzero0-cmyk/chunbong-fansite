import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

assert.equal(typeof composite.originalArtworkDescriptor, 'function', 'composite renderer should expose original artwork mapping');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[0]), {
  cardIndex: 0,
  pair: 0,
  pairSlot: 0,
  url: 'assets/tarot/original/pair-00.avif',
  sourceX: 0,
  pairWidth: 1440,
  pairHeight: 1193
}, 'first card should map to the first uploaded-original pair slot');
assert.equal(composite.originalArtworkDescriptor(data.cards[1]).sourceX, -720, 'second card should use the next 720px source cell');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[77]), {
  cardIndex: 77,
  pair: 38,
  pairSlot: 1,
  url: 'assets/tarot/original/pair-38.avif',
  sourceX: -720,
  pairWidth: 1440,
  pairHeight: 1193
}, 'last card should map to pair 38 slot 1');

for (let pair = 0; pair < 39; pair += 1) {
  const file = new URL(`assets/tarot/original/pair-${String(pair).padStart(2, '0')}.avif`, root);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 30_000, `${file.pathname} should contain uploaded-original artwork, not a tiny placeholder`);
}

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /href="assets\/tarot\/original\/pair-00\.avif"/, 'composite should render the uploaded-original pair instead of the old super-resolution pair');
assert.match(svg, /width="1280" height="1060"/, 'two 720px original cells should scale together without stretching one card independently');
assert.match(svg, /class="tarot-composite-art-viewport"/, 'the selected source cell must be clipped before direction rotation');
assert.match(svg, /x="160" y="126" width="640" height="1060"/, 'uploaded portrait art should use the centered 640×1060 viewport');

const reversed = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  true,
  'uploaded-original-reversed'
);
assert.match(reversed, /class="tarot-composite-art-rotation" transform="rotate\(180 480 656\)"/, 'reversed readings should rotate the isolated uploaded illustration only');
assert.doesNotMatch(reversed, /class="tarot-vector-title"[^>]*transform=/, 'vector labels must remain upright');

const compositeCss = read('tarot-composite.css');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\{[^}]*display:grid[^}]*place-items:center/, 'direct-selection card numbers must be centered by the card button itself');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back span::after\{[^}]*width:44px[^}]*height:44px/, 'direct-selection number should use one consistent centered circular badge');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\.selected\{[^}]*opacity:1/, 'selected card must keep the center number legible');
assert.match(compositeCss, /\.tarot-composite-art-image\{filter:none/, 'uploaded original artwork should not be reprocessed by a CSS clarity filter');

console.log('tarot uploaded original art and centered-number regression test passed');
