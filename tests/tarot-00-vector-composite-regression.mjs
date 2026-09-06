import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('tarot.html', root), 'utf8');
const jsUrl = new URL('tarot-composite.js', root);
const cssUrl = new URL('tarot-composite.css', root);

assert.ok(fs.existsSync(jsUrl), 'tarot-composite.js must exist so full-card raster rendering can be replaced by a vector composite');
assert.ok(fs.existsSync(cssUrl), 'tarot-composite.css must exist so upgraded cards can cancel legacy whole-card reversal and preserve crisp sizing');
assert.ok(html.includes('<link rel="stylesheet" href="tarot-composite.css">'), 'tarot.html must load the vector-composite CSS after the existing tarot quality CSS');
assert.ok(html.includes('<script src="tarot-composite.js"></script>'), 'tarot.html must load the vector-composite browser upgrader after tarot.js');

const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const composite = require('../tarot-composite.js');
const wandsNine = data.cards.find(card => card.id === 'wands-09');
const moon = data.cards.find(card => card.id === 'major-18');

assert.ok(wandsNine, 'fixture card wands-09 must exist');
assert.ok(moon, 'fixture card major-18 must exist');
assert.deepEqual(composite.cardDisplayMeta(wandsNine), { title: 'NINE OF WANDS', rankMark: 'IX' });
assert.deepEqual(composite.cardDisplayMeta(moon), { title: 'THE MOON', rankMark: 'XVIII' });
assert.deepEqual(
  composite.descriptorFromLegacyImage('assets/tarot/hd/pair-22.avif', '-960'),
  { cardIndex: 45, url: 'assets/tarot/hd/pair-22.avif', sourceX: -960 }
);

const upright = composite.buildCompositeSvg(wandsNine, { url: 'assets/tarot/hd/pair-22.avif', sourceX: 0 }, false, 'test-upright');
assert.match(upright, /class="tarot-composite-svg"/, 'composite must render its own SVG shell');
assert.match(upright, /class="tarot-vector-frame"/, 'frame must be vector markup, not inherited raster pixels');
assert.match(upright, /class="tarot-vector-title"[^>]*>NINE OF WANDS<\/text>/, 'English card title must be live SVG text');
assert.match(upright, /class="tarot-vector-rank"[^>]*>IX<\/text>/, 'rank mark must be live SVG text');
assert.match(upright, /clipPath id="test-upright-art-clip"><rect x="88" y="126" width="784" height="1060"/, 'illustration crop must exclude the original raster rank/title regions');
assert.match(upright, /class="tarot-composite-art-layer" clip-path="url\(#test-upright-art-clip\)"/, 'the illustration viewport must remain fixed');
assert.doesNotMatch(upright, /feConvolveMatrix|tarot-sharp/, 'composite must not sharpen raster text because raster text is no longer displayed');

const reversed = composite.buildCompositeSvg(wandsNine, { url: 'assets/tarot/hd/pair-22.avif', sourceX: 0 }, true, 'test-reversed');
assert.match(reversed, /class="tarot-composite-art-layer" clip-path="url\(#test-reversed-art-clip\)"/, 'reversed readings must keep the illustration clipping viewport fixed');
assert.match(reversed, /class="tarot-composite-art-image"[^>]*transform="rotate\(180 480 656\)"/, 'reversed readings must rotate only the raster illustration around the crop center');
assert.doesNotMatch(reversed, /class="tarot-composite-art-layer" transform="rotate/, 'the clipping group itself must never rotate');
assert.match(reversed, /class="tarot-vector-title"[^>]*>NINE OF WANDS<\/text>/, 'vector title must remain upright and readable in reversed readings');
assert.doesNotMatch(reversed, /tarot-vector-title"[^>]*transform="rotate/, 'title itself must never be reversed');

console.log('tarot vector-composite regression test passed');
