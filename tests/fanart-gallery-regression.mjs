import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const detailUrl = new URL('../lib/fanart-detail.js', import.meta.url);
const publicDetailUrl = new URL('../lib/content-api/fanart-detail.js', import.meta.url);
const galleryUrl = new URL('../fanart-gallery.js', import.meta.url);
const contentApiUrl = new URL('../api/content.js', import.meta.url);\nconst fanartListUrl = new URL('../lib/content-api/fanart.js', import.meta.url);\nconst fanartPageUrl = new URL('../page-fanart.js', import.meta.url);

assert.equal(fs.existsSync(detailUrl), true, 'fanart detail implementation must live outside the public api directory');
assert.equal(fs.existsSync(publicDetailUrl), false, 'fanart detail must not consume an extra top-level Vercel Function');
assert.equal(fs.existsSync(galleryUrl), true, 'fanart gallery runtime must exist');

const detail = require(fileURLToPath(detailUrl));
assert.equal(typeof detail.extractImages, 'function', 'fanart detail helper must expose image extraction for regression testing');
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
assert.doesNotThrow(() => new Function(gallery), 'fanart gallery runtime must be valid JavaScript');
assert.match(gallery, /\/api\/content\?type=fanart-detail&id=/, 'gallery must use the existing multiplexed content API for selected-post images');
assert.match(gallery, /fanart-gallery-prev/, 'gallery must provide a previous-image control');
assert.match(gallery, /fanart-gallery-next/, 'gallery must provide a next-image control');
assert.match(gallery, /ArrowLeft/, 'gallery must support left-arrow keyboard navigation');
assert.match(gallery, /ArrowRight/, 'gallery must support right-arrow keyboard navigation');\nassert.match(gallery, /ChunbongCache\.fetchJson\('fanart-detail:'\+articleId/, 'gallery should reuse cached detail payloads');\n\nconst fanartList = fs.readFileSync(fanartListUrl, 'utf8');\nassert.doesNotMatch(fanartList, /Promise\.all\(raw\.slice\(0,12\)[\\s\\S]*map\(enrich\)/, 'fanart list must not block on per-article detail enrichment');\nassert.match(fanartList, /LIST_CACHE_TTL_MS=5\*60\*1000/, 'fanart list should keep a warm runtime cache');\nconst fanartPage = fs.readFileSync(fanartPageUrl, 'utf8');\nassert.match(fanartPage, /IntersectionObserver/, 'fanart thumbnails should lazy hydrate near the viewport');\nassert.match(fanartPage, /activeThumbLoads < 2/, 'fanart thumbnail hydration should limit request concurrency');

const contentApi = fs.readFileSync(contentApiUrl, 'utf8');
assert.match(contentApi, /type==='fanart-detail'/, 'content API must route fanart detail requests');\nassert.match(contentApi, /Vercel-CDN-Cache-Control','public, max-age=600/, 'fanart list should have an explicit Vercel CDN cache');\nassert.match(contentApi, /Vercel-CDN-Cache-Control','public, max-age=3600/, 'fanart detail should have a longer Vercel CDN cache');

const content = fs.readFileSync(new URL('../content.js', import.meta.url), 'utf8');
assert.match(content, /fanart-gallery\.js/, 'fanart page must load the gallery runtime');

console.log('fanart multi-image gallery regression checks passed');
