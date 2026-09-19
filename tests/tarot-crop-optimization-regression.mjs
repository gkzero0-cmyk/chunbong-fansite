import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const composite = require('../tarot-composite.js');

const first = composite.originalArtworkDescriptor(data.cards[0]);
const second = composite.originalArtworkDescriptor(data.cards[1]);
const last = composite.originalArtworkDescriptor(data.cards[77]);

assert.equal(first.sheet, 0);
assert.equal(first.slot, 0);
assert.equal(first.cropX, 0);
assert.equal(first.sourceX, 0);
assert.equal(first.sheetWidth, 898);
assert.match(first.url, /c_crop,g_north_west,h_1488,w_898,x_0,y_0\/f_auto\/q_auto/);

assert.equal(second.cropX, 898);
assert.match(second.url, /x_898,y_0\/f_auto\/q_auto/);

assert.equal(last.sheet, 5);
assert.equal(last.slot, 12);
assert.equal(last.cropX, 10776);
assert.match(last.url, /sheet-5\.avif$/);
assert.doesNotMatch(last.url, /image\/upload\/chunbong-fansite\/tarot-original\/sheet-5\.avif$/, 'full 13-card sheet URL must not be used directly');

const svg = composite.buildCompositeSvg(data.cards[1], null, false, 'crop-test');
assert.match(svg, /width="898" height="1488"/, 'composite should render a single cropped card asset');
assert.doesNotMatch(svg, /width="11674"/, 'composite must not embed the full sheet geometry');

console.log('tarot Cloudinary crop optimization regression passed');
