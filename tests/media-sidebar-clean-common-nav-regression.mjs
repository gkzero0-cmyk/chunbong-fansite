import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const content = read('content.js');
const filter = read('content-filter.js');

assert.match(content, /document\.body\.dataset\.page\s*!==\s*['"]fanart['"]/, 'content filter assets must only load on fanart');
assert.doesNotMatch(content, /\['vod','clips','youtube','fanart'\]/, 'video pages must not load the legacy content filter/search runtime');
assert.match(filter, /if\(page!==['"]fanart['"]\)return;/, 'content-filter runtime must be fanart-only');
assert.doesNotMatch(filter, /media-section-switcher/, 'legacy duplicate media switcher must be removed');
assert.doesNotMatch(filter, /다시보기에서 검색|핫클립에서 검색|유튜브에서 검색/, 'video sidebar search must not be generated');

for (const page of ['vod.html','clips.html','youtube.html']) {
  const html = read(page);
  assert.equal((html.match(/class="media-local-nav"/g) || []).length, 1, `${page} must render exactly one media navigation row`);
  assert.match(html, /content\.js\?v=2/, `${page} must bust the shared content runtime cache`);
}

console.log('media sidebar clean common navigation regression passed');
