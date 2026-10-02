import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const guardUrl=new URL('../operator-soop-recapture-guard.js',import.meta.url);
const guardSource=fs.readFileSync(guardUrl,'utf8');
const guard=await import(guardUrl);
const diagnosticsApiUrl=new URL('../lib/operator-soop-diagnostics-api.js',import.meta.url);
const diagnosticsApiSource=fs.readFileSync(diagnosticsApiUrl,'utf8');
const diagnosticsApi=require('../lib/operator-soop-diagnostics-api.js');
const contentApi=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const wrapper=fs.readFileSync(new URL('../operator-redis-diagnostics.js',import.meta.url),'utf8');

assert.match(collector,/@version\s+1\.4\.7\b/,'userscript metadata should be v1.4.7');
assert.match(collector,/const VERSION='1\.4\.7'/,'runtime version should be v1.4.7');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=15\*60\*1000/,'automatic SOOP checks should be every 15 minutes');
assert.match(collector,/SOOP_MEDIA_COLLECTOR_VERSION=8/,'watcher-only change must not force a media backfill generation');
assert.match(collector,/chunbong-soop-watch-once/,'watcher should use a one-shot SOOP board marker');
assert.doesNotMatch(collector,/const SOOP_WATCH_HASH='chunbong-soop-watch';/,'permanent legacy watcher marker must be removed');
assert.doesNotMatch(collector,/location\.reload\(\)/,'one-shot watcher must not reload the SOOP page forever');
assert.match(collector,/cb-soop-watch-lease-v1/,'operator scheduler should coordinate multiple tabs with GM storage');
assert.match(collector,/cb-soop-watch-next-at-v1/,'operator scheduler should persist only the next due time in browser storage');
assert.match(collector,/SOOP_WATCH_LEASE_MS=2\*60\*1000/,'watch lease should expire quickly');
assert.match(collector,/scheduleSoopWatch/,'operator-page userscript should own scheduling');
assert.match(collector,/runSoopWatchOnce/,'SOOP board page should scan once and close');
assert.match(collector,/result\.discovered\*900\+900/,'one-shot board must stay alive until delayed new-post tab launches are scheduled');
assert.match(collector,/window\.close\(\)/,'one-shot watcher should close its temporary page after scanning');
assert.doesNotMatch(collector,/208562045|204274449/,'production collector must remain generic');

assert.equal(typeof diagnosticsApi._internals?.normalizeRequestedPostIds,'function','backend should expose bounded post-ID normalization');
assert.deepEqual(diagnosticsApi._internals.normalizeRequestedPostIds(['1','2','2','abc','3']),['1','2','3']);
assert.equal(diagnosticsApi._internals.normalizeRequestedPostIds(Array.from({length:100},(_,i)=>String(i+1))).length,80,'exact status lookup must cap request size at 80 IDs');
assert.equal(typeof diagnosticsApi._internals?.readRecaptureStatus,'function','backend should expose exact per-post status retrieval');
const exactReader=String(diagnosticsApi._internals.readRecaptureStatus);
assert.match(exactReader,/MGET/,'exact status reader should batch requested Redis keys');
assert.doesNotMatch(exactReader,/ZREVRANGE|browserImportInboxRows|adminRows/,'exact status reader must not walk indexes or full archive/inbox data');
assert.match(diagnosticsApiSource,/mode'\)===['"]recapture-status['"]/,'existing owner-only SOOP diagnostics handler should expose an exact-status mode');
assert.match(contentApi,/type==='operator-content-soop-diagnostics'/,'exact status should reuse the existing SOOP diagnostics multiplex route');
assert.equal(fs.existsSync(new URL('../api/operator-soop-recapture-status.js',import.meta.url)),false,'exact recapture status must not consume another Vercel function');

assert.equal(typeof guard.buildSoopRecapturePlan,'function','recapture planner should expose a pure exact-status plan builder');
const archive={items:[
  {id:'a',sources:[{url:'https://www.sooplive.com/station/chunbongtv/post/101'}]},
  {id:'b',media:[{url:'https://www.sooplive.com/station/chunbongtv/post/102'}]},
  {id:'c',timeline:[{url:'https://www.sooplive.com/station/chunbongtv/post/103',visibility:'internal'}]}
]};
const exactRows=[
  {postId:'101',hasImport:true,imageCount:0},
  {postId:'102',hasImport:true,imageCount:3}
];
const exactPlan=guard.buildSoopRecapturePlan(archive,exactRows,true);
assert.deepEqual(exactPlan.targets.map(row=>row.postId),['101'],'zero-image public source should recapture while image-positive source is excluded');
assert.deepEqual(exactPlan.summary,{recapture:1,imageReady:1,internal:1,lookupFailed:0});
assert.equal(exactPlan.rows.find(row=>row.postId==='101')?.reason,'image-missing');
assert.equal(exactPlan.rows.find(row=>row.postId==='102')?.reason,'image-ready');
assert.equal(exactPlan.rows.find(row=>row.postId==='103')?.reason,'internal');
const failedLookupPlan=guard.buildSoopRecapturePlan(archive,[],false);
assert.deepEqual(failedLookupPlan.targets.map(row=>row.postId).sort(),['101','102'],'failed exact lookup must fail open for public recapture rather than silently exclude posts');
assert.equal(failedLookupPlan.summary.lookupFailed,2);
assert.doesNotMatch(guardSource,/imports\.get\(url\).*importImageCount/s,'latest-250 browserImports map must no longer be the final recapture decision');
assert.match(guardSource,/operator-content-soop-diagnostics&mode=recapture-status/,'planner should query exact status through the existing authenticated SOOP route');
assert.doesNotMatch(guardSource,/208562045|204274449/,'production planner must not special-case validation post IDs');

assert.match(wrapper,/operator-soop-recapture-guard\.js\?v=3/,'operator should bust the old recapture planner module cache');
assert.match(wrapper,/operator-soop-diagnostics\.js\?v=3/,'operator should bust the old SOOP diagnostic module cache');

console.log('SOOP low-data watcher + exact recapture v1.4.7 regression passed');
