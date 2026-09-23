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

assert.doesNotMatch(fanartApi,/Promise\.all\([\s\S]*map\(enrich\)/,'fanart list must not block on per-post detail enrichment');
assert.match(fanartApi,/needsDetailImage/,'fanart list should mark posts that can lazy-load detail images');
assert.match(fanartPage,/DETAIL_CONCURRENCY=2/,'fanart thumbnail hydration must have bounded concurrency');
assert.match(fanartPage,/IntersectionObserver/,'fanart detail images should load near the viewport');
assert.match(fanartPage,/ChunbongFanartDetailCache/,'fanart card and modal should share detail fetches');
assert.match(gallery,/ChunbongFanartDetailCache/,'fanart modal should reuse already-started detail requests');

assert.match(api,/Vercel-CDN-Cache-Control/,'content API must configure explicit edge caching');
assert.match(api,/fanart:\{browser:60,edge:300,stale:3600\}/,'fanart list should keep a short browser cache and longer edge cache');

assert.match(sw,/\['script','style'\][\s\S]*staleWhileRevalidate\(request, event\)/,'repeat navigation should serve JS and CSS from cache while revalidating');
assert.doesNotMatch(sw,/\/personal-hub\.js/,'initial PWA shell should not precache personal hub');
assert.match(shell,/runIdle\(\(\)=>loadScript\('site-improvements\.js'\)\)/,'non-critical improvements runtime should be deferred');
assert.doesNotMatch(shell,/personalPriorityPages='[^']*fanart/,'fanart should not synchronously load personal hub');
assert.doesNotMatch(shell,/personalPriorityPages='[^']*minigames/,'minigames should not synchronously load personal hub');

const jsCache=(vercel.headers||[]).find(row=>row.source==='/(.*).js');
const cssCache=(vercel.headers||[]).find(row=>row.source==='/(.*).css');
assert.ok(jsCache?.headers?.some(h=>h.key==='Cache-Control'&&/max-age=3600/.test(h.value)),'JS static cache policy missing');
assert.ok(cssCache?.headers?.some(h=>h.key==='Cache-Control'&&/max-age=3600/.test(h.value)),'CSS static cache policy missing');

assert.match(chunbakCore,/res\.cloudinary\.com\/lyppgyei\/image\/upload\/f_auto,q_auto:good,c_limit,w_320/,'Chunbak stage art should use resized optimized CDN delivery');
assert.match(chunbak,/const initialStages=\[currentStage,nextStage\]/,'Chunbak should only block on immediately required stage art');
assert.match(chunbak,/function stopLoop\(\)/,'Chunbak must be able to suspend its animation loop');
assert.match(chunbak,/if\(autoStart\)startLoop\(\);else\{stopLoop\(\);render\(\);\}/,'start screen should not run a continuous canvas loop');

assert.match(multiplayer,/refreshInFlight/,'multiplayer polling must prevent overlapping refresh requests');
assert.match(multiplayer,/progressInFlight/,'multiplayer progress updates must prevent overlap');
assert.match(multiplayer,/setInterval\(refresh,1100\)/,'multiplayer room polling should be throttled');
assert.match(multiplayer,/setInterval\(sync,1000\)/,'multiplayer progress updates should be throttled');

console.log('performance hotpaths regression passed');
