import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');

const favorite=archive._internals.normalizeBrowserImportPayload({
  source:'soop-authenticated-browser',
  url:'https://www.sooplive.com/station/chunbongtv/post/207999001',
  title:'춘타클 애청자 공지',
  date:'2026-09-24',
  body:'애청자 공개 테스트 본문',
  images:['https://stimg.sooplive.com/favorite.png'],
  access:'favorite',
  capturedAt:'2026-09-24T20:00:00+09:00'
});
assert.equal(favorite?.access,'favorite','favorite access must survive normalization');
assert.equal(archive._internals.browserImportPublicEligible(favorite),true,'SOOP favorite posts must be public eligible');
assert.equal(archive._internals.browserImportNeedsReview(favorite),false,'SOOP favorite posts must not require operator review');

const base={
  id:'favorite-policy-test',title:'춘타클',aliases:[],category:'other',role:'주최',status:'ended',
  startDate:'2026-09-24',endDate:'2026-09-24',datePrecision:'day',summary:'',description:'',
  participants:[],participantGroups:[],results:[],seriesSessions:[],timeline:[],media:[],gallery:[],sources:[],
  verification:{state:'verified',verifiedAt:'2026-09-24T00:00:00.000Z',conflicts:[]},published:true,updatedAt:''
};
const favoriteApplied=archive._internals.applyBrowserImportToItem(base,favorite);
assert.equal(favoriteApplied.sources[0]?.visibility,'public','favorite source must be public without operator override');
assert.equal(favoriteApplied.timeline[0]?.visibility,'public','favorite timeline material must be public');
assert.equal(favoriteApplied.timeline[0]?.url,favorite.url,'favorite timeline should keep the official SOOP URL');
assert.match(favoriteApplied.timeline[0]?.note||'',/애청자 공개/,'favorite public note should explain the access class');

const subscriber=archive._internals.normalizeBrowserImportPayload({
  source:'soop-authenticated-browser',
  url:'https://www.sooplive.com/station/chunbongtv/post/207999002',
  title:'구독자 전용 테스트',
  date:'2026-09-24',
  body:'구독자 전용 본문',
  access:'subscriber'
});
assert.equal(subscriber?.access,'subscriber');
assert.equal(archive._internals.browserImportPublicEligible(subscriber),false,'subscriber posts must stay review-gated');
assert.equal(archive._internals.browserImportNeedsReview(subscriber),true,'subscriber posts must require review');
const subscriberApplied=archive._internals.applyBrowserImportToItem({...base,id:'subscriber-policy-test'},subscriber);
assert.equal(subscriberApplied.sources[0]?.visibility,'internal');
assert.equal(subscriberApplied.timeline[0]?.visibility,'internal');
assert.equal(subscriberApplied.timeline[0]?.url,'','review-gated SOOP URLs must not leak into public timeline data');

const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const operator=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../operator.css',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');

assert.match(collector,/@version\s+1\.3\.0/,'collector userscript version should be bumped');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=5\*60\*1000/,'SOOP watcher should run on a five-minute cadence');
assert.match(collector,/SOOP_WATCH_HASH='chunbong-soop-watch'/,'persistent SOOP watcher mode missing');
assert.match(collector,/SOOP_SELFTEST_HASH='chunbong-soop-selftest'/,'collector self-test mode missing');
assert.match(collector,/lastWatcherHeartbeatAt/,'collector must emit a heartbeat timestamp');
assert.match(collector,/lastServerOkAt/,'collector must record successful server delivery');
assert.match(collector,/requestOperatorFlush\(\)/,'captured SOOP data should trigger background delivery');
assert.match(collector,/operator-content-browser-import/,'background operator tab should deliver queued imports through the authenticated API');
assert.match(collector,/access==='favorite'/,'collector must classify favorite posts');
assert.match(collector,/access==='subscriber'/,'collector must retain subscriber-only posts as a distinct access class');
assert.match(api,/access==='favorite'/,'archive API must treat favorite posts explicitly');
assert.match(api,/managedAction:autoVisibility==='public'\?'auto-public':'auto-internal'/,'automatic imports should persist their automatic visibility decision');

for(const token of ['data-collector-watch-start','data-collector-watch-stop','data-collector-self-test','애청자 글은 운영자 확인 없이 바로 공개'])assert.ok(operator.includes(token)||html.includes(token),token);
assert.match(html,/data-unified-collector open/,'collector health panel should be expanded by default');
assert.match(html,/애청자 글은 자동 수집 → 자동 매칭 → 자동 공개/,'operator help must document favorite auto-publish');
assert.match(operator,/마지막 생존 신호/,'collector health UI should expose the latest heartbeat');
assert.match(operator,/마지막 SOOP 확인/,'collector health UI should expose the latest scan');
assert.match(operator,/마지막 서버 반영/,'collector health UI should expose delivery status');
assert.match(operator,/최근 오류/,'collector health UI should expose recent failures');
assert.match(css,/operator-collector-health-grid/,'collector health dashboard styling missing');

console.log('soop-favorite-collector-regression: ok');
