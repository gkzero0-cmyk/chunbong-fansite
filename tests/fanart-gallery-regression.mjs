import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const detailUrl = new URL('../api/fanart-detail.js', import.meta.url);
const galleryUrl = new URL('../fanart-gallery.js', import.meta.url);

assert.equal(fs.existsSync(detailUrl), true, 'fanart detail endpoint must exist');
assert.equal(fs.existsSync(galleryUrl), true, 'fanart gallery runtime must exist');

const detail = require(fileURLToPath(detailUrl));
assert.equal(typeof detail.extractImages, 'function', 'fanart detail endpoint must expose image extraction for regression testing');
const images = detail.extractImages(`
  <p><img src="https://example.com/one.jpg?x=1&amp;y=2"></p>
  <p><img data-lazy-src="https://example.com/two.png"></p>
  <p><img src="https://example.com/one.jpg?x=1&amp;y=2"></p>
`);
assert.deepEqual(images, [
  'https://example.com/one.jpg?x=1&y=2',
  'https://example.com/two.png'
], 'all original post images must be extracted in order without duplicates');

const gallery = fs.readFileSync(galleryUrl, 'utf8');
assert.match(gallery, /\/api\/fanart-detail\?id=/, 'gallery must fetch images from the selected original post');
assert.match(gallery, /fanart-gallery-prev/, 'gallery must provide a previous-image control');
assert.match(gallery, /fanart-gallery-next/, 'gallery must provide a next-image control');
assert.match(gallery, /ArrowLeft/, 'gallery must support left-arrow keyboard navigation');
assert.match(gallery, /ArrowRight/, 'gallery must support right-arrow keyboard navigation');

const content = fs.readFileSync(new URL('../content.js', import.meta.url), 'utf8');
assert.match(content, /fanart-gallery\.js/, 'fanart page must load the gallery runtime');

console.log('fanart multi-image gallery regression checks passed');
