import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const first = tarot.cardArtworkDescriptor(data.cards[0]);
assert.deepEqual(first, {
  pair: 0,
  pairSlot: 0,
  url: 'assets/tarot/original/pair-00.webp',
  sourceX: 0
}, 'first card should use the uploaded original-art atlas');

const second = tarot.cardArtworkDescriptor(data.cards[1]);
assert.equal(second.url, 'assets/tarot/original/pair-00.webp');
assert.equal(second.sourceX, -898, 'right card in an uploaded pair should use the original 898px source width');

const last = tarot.cardArtworkDescriptor(data.cards[77]);
assert.equal(last.url, 'assets/tarot/original/pair-38.webp');
assert.equal(last.sourceX, -898);

for (let pair = 0; pair < 39; pair += 1) {
  const file = new URL(`assets/tarot/original/pair-${String(pair).padStart(2, '0')}.webp`, root);
  const stat = fs.statSync(file);
  assert.ok(stat.size > 250_000, `${file.pathname} should contain a full-resolution uploaded-art pair`);
}

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/original/pair-00.webp', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /viewBox="0 0 898 1488"/, 'composite should preserve the uploaded artwork aspect and full source frame');
assert.match(svg, /width="1796" height="1488"/, 'pair source must retain both 898x1488 uploaded originals without low-res stretching');
assert.match(svg, /preserveAspectRatio="xMidYMid meet"/, 'uploaded artwork should not be cropped or stretched');

const compositeCss = read('tarot-composite.css');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\{[^}]*display:grid[^}]*place-items:center/, 'direct-selection card numbers must be centered by the card button itself');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back span::after\{[^}]*width:44px[^}]*height:44px/, 'direct-selection number should use one consistent centered circular badge');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\.selected\{[^}]*opacity:1/, 'selected card must keep the center number legible');

console.log('tarot uploaded original art and centered-number regression test passed');
