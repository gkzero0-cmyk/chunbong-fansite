import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const DELIVERY = 'https://res.cloudinary.com/lyppgyei/image/upload';
const cardUrl = (sheet, slot) =>
  `${DELIVERY}/c_crop,g_north_west,h_1488,w_898,x_${slot * 898},y_0/q_100/f_avif/chunbong-fansite/tarot-original/sheet-${sheet}.avif`;

assert.equal(typeof composite.originalArtworkDescriptor, 'function');
assert.equal(typeof composite.originalCardCropUrl, 'function');
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[0]), {
  cardIndex: 0,
  sheet: 0,
  slot: 0,
  url: cardUrl(0, 0),
  sourceX: 0,
  sheetWidth: 898,
  sheetHeight: 1488,
  cellWidth: 898,
  cellHeight: 1488
});
assert.deepEqual(composite.originalArtworkDescriptor(data.cards[77]), {
  cardIndex: 77,
  sheet: 5,
  slot: 12,
  url: cardUrl(5, 12),
  sourceX: 0,
  sheetWidth: 898,
  sheetHeight: 1488,
  cellWidth: 898,
  cellHeight: 1488
});

const parsed = composite.descriptorFromLegacyImage(cardUrl(5, 12), '0');
assert.equal(parsed.cardIndex, 77);
assert.equal(parsed.url, cardUrl(5, 12));
assert.equal(parsed.sheetWidth, 898);
assert.equal(parsed.sheetHeight, 1488);

const svg = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  false,
  'uploaded-original-test'
);
assert.match(svg, /c_crop,g_north_west,h_1488,w_898,x_0,y_0\/q_100\/f_avif/, 'composite should render a server-cropped original card');
assert.match(svg, /viewBox="0 0 898 1488"/, 'one original 898×1488 card must be isolated before vector compositing');
assert.match(svg, /width="898" height="1488"/, 'the raster layer should contain one card instead of the full 13-card sheet');
assert.doesNotMatch(svg, /width="11674" height="1488"/, 'full source sheets must not be downloaded by result cards');

const reversed = composite.buildCompositeSvg(
  data.cards[0],
  { url: 'assets/tarot/hd/pair-00.avif', sourceX: 0 },
  true,
  'uploaded-original-reversed'
);
assert.match(reversed, /class="tarot-composite-art-rotation" transform="rotate\(180 480 656\)"/);
assert.doesNotMatch(reversed, /class="tarot-vector-title"[^>]*transform=/);

const compositeCss = read('tarot-composite.css');
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\{[^}]*display:grid[^}]*place-items:center/);
assert.match(compositeCss, /#tarot-deck \.tarot-card-back-number\{[^}]*display:grid[^}]*place-items:center[^}]*width:44px[^}]*height:44px/);
assert.match(compositeCss, /#tarot-deck \.tarot-card-back\.selected\{[^}]*opacity:1/);
assert.match(compositeCss, /\.tarot-composite-art-image\{filter:none/);

console.log('tarot cropped original art and centered-number regression test passed');
