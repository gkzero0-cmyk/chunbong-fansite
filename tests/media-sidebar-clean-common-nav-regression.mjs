import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => {
  const url = new URL('../' + file, import.meta.url);
  return fs.existsSync(url) ? fs.readFileSync(url, 'utf8') : '';
};

const filter = read('content-filter.js');
const cleanup = read('media-sidebar-cleanup.js');

assert.match(filter, /if\(page!==['"]fanart['"]\)return;/, 'content-filter runtime must be fanart-only');
assert.doesNotMatch(filter, /media-section-switcher/, 'legacy duplicate media switcher must be removed');
assert.doesNotMatch(filter, /다시보기에서 검색|핫클립에서 검색|유튜브에서 검색/, 'video sidebar search must not be generated');
assert.match(cleanup, /\.media-section-switcher/, 'cleanup runtime must remove a legacy duplicate media switcher left by an old cache');
assert.match(cleanup, /\[data-content-filter\]/, 'cleanup runtime must remove a legacy video search left by an old cache');
assert.match(cleanup, /MutationObserver/, 'cleanup runtime must catch late legacy insertions');

for (const page of ['vod.html','clips.html','youtube.html']) {
  const html = read(page);
  assert.equal((html.match(/class="media-local-nav"/g) || []).length, 1, `${page} must render exactly one media navigation row`);
  assert.match(html, /media-sidebar-cleanup\.js\?v=1/, `${page} must load the media sidebar cleanup runtime`);
}

console.log('media sidebar clean common navigation regression passed');
