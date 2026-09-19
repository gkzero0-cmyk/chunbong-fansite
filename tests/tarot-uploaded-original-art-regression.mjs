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
const first = composite.originalArtworkDescriptor(data.cards[0]);
assert.equal(first.cardIndex, 0);
assert.equal(first.sheet, 0);
assert.equal(first.slot, 0);
assert.equal(first.cropX, 0);
assert.equal(first.sourceX, 0);
assert.equal(first.sheetWidth, 898);
assert.match(first.url, /c_crop,g_north_west,h_1488,w_898,x_0,y_0\/f_auto\/q_auto\/chunbong-fansite\/tarot-original\/sheet-0\.avif$/, 'first card should use a cropped uploaded-original Cloudinary derivative');

const second = composite.originalArtworkDescriptor(data.cards[1]);
assert.equal(second.cropX, 898, 'second card crop should advance by one exact uploaded-original card width');
assert.equal(second.sourceX, 0, 'cropped derivatives should render from x=0');

const last = composite.originalArtworkDescriptor(data.cards[77]);
assert.equal(last.cardIndex, 77);
assert.equal(last.sheet, 5);
assert.equal(last.slot, 12);
assert.equal(last.cropX, 12 * 898);
assert.equal(last.sheetWidth, 898);
assert.match(last.url, /x_10776,y_0\/f_auto\/q_auto\/chunbong-fansite\/tarot-original\/sheet-5\.avif$/, 'last card should map to a cropped sheet 5 slot 12 derivative');

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /href="https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_crop,g_north_west,h_1488,w_898,x_0,y_0\/f_auto\/q_auto\/chunbong-fansite\/tarot-original\/sheet-0\.avif"/, 'composite should render a cropped uploaded-original Cloudinary derivative instead of the old super-resolution pair');
assert.match(svg, /viewBox="0 0 898 1488"/, 'one original 898×1488 card must be isolated before it is scaled into the vector frame');
assert.match(svg, /class="tarot-composite-art-viewport"/, 'the selected source cell must be clipped before direction rotation');
assert.match(svg, /width="898" height="1488"/, 'the cropped single-card derivative must preserve one card native pixel geometry');

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
assert.match(compositeCss, /#tarot-deck \.tarot-card-back-number\{[^}]*display:grid[^}]*place-items:center[^}]*width:46px[^}]*height:46px/, 'direct-selection number should use one consistent centered celestial DOM badge');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\.selected\{[^}]*opacity:1/, 'selected card must keep the center number legible');
assert.match(compositeCss, /\.tarot-composite-art-image\{filter:none/, 'uploaded original artwork should not be reprocessed by a CSS clarity filter');

console.log('tarot uploaded original art and centered-number regression test passed');