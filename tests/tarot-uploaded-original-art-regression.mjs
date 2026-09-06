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
  sheet: 0,
  slot: 0,
  url: 'assets/tarot/original/sheet-0.avif',
  sourceX: 0,
  sheetWidth: 12480,
  sheetHeight: 1440
}, 'first card should map to the first uploaded-art sheet slot');
assert.equal(composite.originalArtworkDescriptor(data.cards[1]).sourceX, -960, 'second card should use the next exact 960px logical sheet cell');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[77]), {
  cardIndex: 77,
  sheet: 5,
  slot: 12,
  url: 'assets/tarot/original/sheet-5.avif',
  sourceX: -11520,
  sheetWidth: 12480,
  sheetHeight: 1440
}, 'last card should map to sheet 5 slot 12');

for (let sheet = 0; sheet < 6; sheet += 1) {
  const file = new URL(`assets/tarot/original/sheet-${sheet}.avif`, root);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 250_000, `${file.pathname} should contain uploaded-original artwork, not a tiny placeholder`);
}

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /href="assets\/tarot\/original\/sheet-0\.avif"/, 'composite should render the uploaded-original sheet instead of the old super-resolution pair');
assert.match(svg, /width="12480" height="1440"/, 'original sheet should use thirteen 960px logical cells without stretching individual cards');
assert.match(svg, /class="tarot-composite-art-viewport"/, 'sprite slot must be isolated in its own viewport before direction rotation');

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

console.log('tarot uploaded original art and centered-number regression test passed');
