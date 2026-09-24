import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const fanartApi=read('lib/content-api/fanart.js');
const fanartPage=read('page-fanart.js');
const gallery=read('fanart-gallery.js');
const api=read('api/content.js');
const shell=read('site-shell.js');
const sw=read('service-worker.js');
const vercel=JSON.parse(read('vercel.json'));
const chunbakCore=read('chunbak-game-core.js');
const chunbak=read('chunbak.js');
const multiplayer=read('score-race-multiplayer.js');

assert.doesNotMatch(fanartApi,/Promise\.all\(raw\.slice\(0,12\)[\s\S]*map\(enrich\)/,'fanart list must not block on per-post detail enrichment');
assert.match(fanartApi,/LIST_CACHE_TTL_MS=30\*60\*1000/,'fanart list should keep a thirty-minute warm runtime cache');
assert.match(fanartPage,/activeThumbLoads < 2/,'fanart thumbnail hydration must have bounded concurrency');
assert.match(fanartPage,/IntersectionObserver/,'fanart detail images should load near the viewport');
assert.match(gallery,/ChunbongCache\.fetchJson\('fanart-detail:'\+articleId/,'fanart gallery should reuse session detail cache');

assert.match(api,/Vercel-CDN-Cache-Control','public, max-age=1800/,'fanart list needs explicit edge caching');
assert.match(api,/Vercel-CDN-Cache-Control','public, max-age=3600/,'fanart detail needs a longer edge cache');

assert.match(sw,/const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/,'performance cache must follow the deployed build');
assert.match(sw,/\['script','style'\][\s\S]*boundedNetworkFirst\(request, event, 450\)/,'JS/CSS should use bounded network-first');
for(const heavy of ['/personal-hub.js','/chunbong-contents.js','/activity-center.js','/daily-fortune.js']){
  assert.ok(!sw.includes("'"+heavy+"'"),heavy+' should not inflate the initial PWA install');
}
assert.match(shell,/runIdle\(\(\)=>loadScript\('site-improvements\.js'\)\)/,'site improvements should defer to idle time');
assert.doesNotMatch(shell,/personalPriorityPages='[^']*fanart/,'fanart should not synchronously load personal hub');
assert.doesNotMatch(shell,/personalPriorityPages='[^']*minigames/,'minigames should not synchronously load personal hub');

const jsCache=(vercel.headers||[]).find(row=>row.source==='/(.*).js');
const cssCache=(vercel.headers||[]).find(row=>row.source==='/(.*).css');
assert.ok(jsCache?.headers?.some(h=>h.key==='Cache-Control'&&/max-age=300/.test(h.value)),'JS browser cache policy missing');
assert.ok(cssCache?.headers?.some(h=>h.key==='Cache-Control'&&/max-age=300/.test(h.value)),'CSS browser cache policy missing');

assert.match(chunbakCore,/res\.cloudinary\.com\/lyppgyei\/image\/upload\/f_auto,q_auto:good,c_limit,w_512/,'Chunbak stage art should use high-quality resized CDN delivery');
assert.match(chunbakCore,/fallbackImage:/,'Chunbak stage art must keep a local fallback');
assert.match(chunbak,/pending\.splice\(0, 2\)/,'Chunbak should warm stage art in small batches');
assert.match(chunbak,/if \(!frameId && playing\)/,'Chunbak should not render continuously before play');

assert.match(multiplayer,/refreshInFlight/,'multiplayer polling must prevent overlapping refresh requests');
assert.match(multiplayer,/progressInFlight/,'multiplayer progress updates must prevent overlap');
assert.match(multiplayer,/setInterval\(refresh,1000\)/,'multiplayer room polling should be throttled');
assert.match(multiplayer,/setInterval\(sync,1000\)/,'multiplayer progress updates should be throttled');

console.log('performance hotpaths regression passed');
