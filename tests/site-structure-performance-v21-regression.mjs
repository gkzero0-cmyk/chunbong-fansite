import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const pages=[
  'index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html',
  'tarot.html','minigames.html','history.html','data.html','changelog.html','myhub.html','chunbong-contents.html'
];

const quality=read('site-quality.css');
const mobileLoader=read('mobile-runtime-loader.js');
const mobileRuntime=read('mobile-site.js');
const sw=read('service-worker.js');
const page=read('page.js');
const contentsUi=read('chunbong-contents.js');

assert.doesNotMatch(quality,/@import url\("site-design-system\.css"\)/,'design-system CSS must not be serially imported');
for(const name of pages){
  const html=read(name);
  assert.match(html,/href="site-design-system\.css"/,name+' must discover the design system in parallel');
  assert.match(html,/href="mobile-site\.css\?v=3" media="\(max-width:1024px\), \(display-mode: standalone\)"/,name+' must gate mobile CSS by media');
  assert.match(html,/src="mobile-runtime-loader\.js\?v=1"/,name+' must use the small mobile loader');
  assert.doesNotMatch(html,/src="mobile-site\.js"/,name+' must not parse the heavy mobile runtime on desktop');
}
assert.ok(mobileLoader.length<1800,'mobile runtime loader must remain tiny');
assert.match(mobileLoader,/matchMedia\('\(max-width:760px\)'\)/);
assert.match(mobileLoader,/mobile-site\.js\?v=3/);
assert.doesNotThrow(()=>new Function(mobileLoader));
assert.doesNotThrow(()=>new Function(mobileRuntime));

assert.match(sw,/const CACHE_PREFIX = 'chunbong-pwa-'/);
assert.match(sw,/const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/);
assert.match(sw,/new URL\(self\.location\.href\)\.searchParams\.get\('v'\)/);
assert.match(page,/fetch\('\/api\/version'/);
assert.match(page,/serviceWorker\.register\('\/service-worker\.js\?v='\+encodeURIComponent\(version\)/);
assert.doesNotThrow(()=>new Function(sw));
assert.doesNotThrow(()=>new Function(page));

const require=createRequire(import.meta.url);
const core=require('../lib/chunbong-content-archive-core.js');
const seed=JSON.parse(read('data/chunbong-contents-seed.json'));
const leopel=seed.items.find(item=>item.id==='leopel');
const normalized=core.normalizeArchiveItem(leopel);
assert.equal(normalized.participantCount,671);
assert.equal(normalized.participantProfiles.length,593);
assert.equal(new Set(normalized.participantProfiles.map(row=>row.canonicalName)).size,593);
assert.equal(normalized.participantProfiles.find(row=>row.canonicalName==='카코_')?.rpName,'투명인간');
assert.equal(normalized.participantProfiles.find(row=>row.canonicalName==='건망고')?.platform,'치지직');
assert.ok(normalized.participantProfiles.find(row=>row.canonicalName==='와앙이')?.aliases.includes('와앙이♪'));
assert.match(contentsUi,/p\.rpName/,'archive search must index RP names');
assert.match(contentsUi,/p\.aliases/,'archive search must index participant aliases');

console.log('site structure/performance v21 regression passed');
