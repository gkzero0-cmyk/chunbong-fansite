import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Cloudinary-backed uploaded-original tarot regression.
const require = createRequire(import.meta.url);
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const CLOUDINARY_BASE = 'https://res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/tarot-original';

assert.equal(typeof composite.originalArtworkDescriptor, 'function', 'composite renderer should expose original artwork mapping');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[0]), {
  cardIndex: 0,
  sheet: 0,
  slot: 0,
  url: `${CLOUDINARY_BASE}/sheet-0.avif`,
  sourceX: 0,
  sheetWidth: 11674,
  sheetHeight: 1488,
  cellWidth: 898,
  cellHeight: 1488
}, 'first card should use the first uploaded-original Cloudinary sheet slot');
assert.equal(composite.originalArtworkDescriptor(data.cards[1]).sourceX, -898, 'second card should advance by one exact uploaded-original card width');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[77]), {
  cardIndex: 77,
  sheet: 5,
  slot: 12,
  url: `${CLOUDINARY_BASE}/sheet-5.avif`,
  sourceX: -(12 * 898),
  sheetWidth: 11674,
  sheetHeight: 1488,
  cellWidth: 898,
  cellHeight: 1488
}, 'last card should map to sheet 5 slot 12');

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /href="https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/chunbong-fansite\/tarot-original\/sheet-0\.avif"/, 'composite should render the uploaded-original Cloudinary sheet instead of the old super-resolution pair');
assert.match(svg, /viewBox="0 0 898 1488"/, 'one original 898×1488 card must be isolated before it is scaled into the vector frame');
assert.match(svg, /class="tarot-composite-art-viewport"/, 'the selected source cell must be clipped before direction rotation');
assert.match(svg, /width="11674" height="1488"/, 'the full 13-card original sheet must preserve its native pixel geometry');

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
