import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

const fanartApi = read('lib/content-api/fanart.js');
const fanartPage = read('page-fanart.js');
const fanartGallery = read('fanart-gallery.js');
const contentApi = read('api/content.js');
const imageApi = read('api/image.js');
const shell = read('site-shell.js');
const sw = read('service-worker.js');
const chunbak = read('chunbak.js');
const multiplayer = read('score-race-multiplayer.js');
const shared = read('lib/content-api/_shared.js');

assert.equal(fanartApi.includes('.map(enrich)'), false, 'fanart list must not fan out into every article detail');
assert.match(fanartApi, /getJson\(url,naverHeaders,4000\)/, 'fanart list should have a bounded upstream wait');
assert.match(fanartPage, /DETAIL_CONCURRENCY = 2/, 'fanart thumbnails should hydrate with bounded concurrency');
assert.match(fanartPage, /IntersectionObserver/, 'fanart details should load only near the viewport');
assert.match(fanartPage, /fanart-detail:/, 'fanart detail results should use the shared client cache');
assert.match(fanartGallery, /ChunbongCache\.fetchJson\('fanart-detail:'/, 'fanart modal should reuse cached detail data');
assert.match(contentApi, /Vercel-CDN-Cache-Control','public, max-age=600/, 'fanart list should have an explicit Vercel CDN policy');
assert.match(contentApi, /max-age=21600, stale-while-revalidate=86400/, 'fanart detail should receive a long-lived CDN cache');
assert.match(imageApi, /Vercel-CDN-Cache-Control/, 'proxied fanart images should use the Vercel CDN');
assert.match(shared, /AbortController/, 'external APIs should have a timeout guard');

assert.match(shell, /const inflight=new Map\(\)/, 'duplicate in-flight client requests should be collapsed');
assert.match(shell, /heavyPage='\|fanart\|minigames\|chuntris\|chunbak\|chungwagame\|chuncortile\|'/, 'heavy pages should defer non-critical shell enhancements');
assert.match(shell, /personalPriorityPages='\|home\|myhub\|tarot\|'/, 'heavy pages should not eagerly load personal hub assets');

assert.match(sw, /chunbong-pwa-20260923-v32/, 'service worker cache version should be bumped');
assert.match(sw, /\['script','style'\][\s\S]*staleWhileRevalidate\(request, event\)/, 'scripts and styles should use stale-while-revalidate');
assert.equal(sw.includes("'/chunbong-contents.js'"), false, 'content archive code should not be pre-cached for every visitor');
assert.equal(sw.includes("'/personal-hub.js'"), false, 'personal hub should not be pre-cached for every visitor');
assert.equal(sw.includes("'/daily-fortune.js'"), false, 'daily fortune should not be pre-cached for every visitor');

assert.match(chunbak, /new Set\(\[currentStage, nextStage\]\)/, 'Chunbak should gate on only first-needed images');
assert.match(chunbak, /function stopLoop\(\)/, 'Chunbak should stop idle animation work');
assert.match(chunbak, /scheduleIdle\(\(\) => \{ void loadRanking\(\); \}/, 'Chunbak ranking should be deferred');
assert.match(multiplayer, /setInterval\(refresh,1200\)/, 'multiplayer room polling should be reduced');
assert.match(multiplayer, /setInterval\(sync,1000\)/, 'multiplayer progress writes should be reduced');

const require = createRequire(import.meta.url);
const originalFetch = global.fetch;
let fetchCount = 0;
global.fetch = async () => {
  fetchCount += 1;
  return {
    ok: true,
    json: async () => ({ message:{ result:{ articleList:[{ articleId:123, subject:'테스트 팬아트', writeDateTimestamp:Date.now() }] } } })
  };
};
try {
  delete require.cache[require.resolve('../lib/content-api/fanart.js')];
  const fetchFanart = require('../lib/content-api/fanart.js');
  const items = await fetchFanart();
  assert.equal(fetchCount, 1, 'one fanart list request must not trigger article-detail fanout');
  assert.equal(items.length, 1);
  assert.equal(items[0].thumb, '');
} finally {
  global.fetch = originalFetch;
}

console.log('performance optimization regression passed');
