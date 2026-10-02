import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');
const operator=await import(new URL('../operator-contents.js',import.meta.url));
const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const archiveSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
const operatorHtml=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const operatorSource=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');

assert.equal(typeof operator.soopDiagnosticViewRows,'function','operator should expose a pure per-post diagnostic view builder');
const archiveRows=[{
  id:'sample',timeline:[
    {url:'https://www.sooplive.com/station/chunbongtv/post/111111111',visibility:'public'},
    {url:'https://www.sooplive.com/station/chunbongtv/post/222222222',visibility:'public'},
    {url:'https://www.sooplive.com/station/chunbongtv/post/333333333',visibility:'public'},
    {url:'https://www.sooplive.com/station/chunbongtv/post/444444444',visibility:'internal'}
  ],media:[],sources:[]
}];
const imports=[
  {url:'https://www.sooplive.com/station/chunbongtv/post/111111111',imageCount:0,storedAt:'2026-10-03T01:00:00.000Z'},
  {url:'https://www.sooplive.com/station/chunbongtv/post/222222222',imageCount:3,storedAt:'2026-10-03T01:01:00.000Z'}
];
const diagnostics=[
  {postId:'111111111',phase:'captured',candidateCount:7,acceptedCount:0,rejectedByReason:{not_post_asset:6,decorative:1},capturedAt:'2026-10-03T01:02:00.000Z'},
  {postId:'222222222',phase:'captured',candidateCount:5,acceptedCount:0,rejectedByReason:{not_post_asset:5},capturedAt:'2026-10-03T01:02:00.000Z'},
  {postId:'333333333',phase:'restricted',candidateCount:0,acceptedCount:0,rejectedByReason:{},capturedAt:'2026-10-03T01:03:00.000Z'}
];
const view=operator.soopDiagnosticViewRows(archiveRows,imports,diagnostics);
assert.deepEqual(view.map(row=>[row.postId,row.status,row.imageCount,row.candidateCount]),[
  ['111111111','no-images',0,7],
  ['222222222','ok',3,5],
  ['333333333','restricted',0,0]
]);
assert.equal(view.some(row=>row.postId==='444444444'),false,'internal archive rows must stay out of diagnostics');
assert.equal(view[0].rejectedByReason.not_post_asset,6);

assert.equal(typeof archive._internals.soopDiagnosticRows,'function','server should expose bounded diagnostic retrieval for regression coverage');
assert.match(archiveSource,/soopDiagnosticRows\(40\)/,'operator list should read only the latest 40 diagnostic post IDs');
assert.match(archiveSource,/soopDiagnostics/,'operator list response should include SOOP diagnostics');
assert.match(operatorHtml,/data-soop-diagnostic-list/,'operator center should expose a SOOP diagnostic result panel');
assert.match(operatorSource,/renderSoopDiagnostics/,'operator center should render the diagnostic result panel after loading archive data');

assert.match(collector,/@version\s+1\.4\.6/,'collector userscript should advance to v1.4.6');
assert.match(collector,/const VERSION='1\.4\.6'/,'collector runtime version must match userscript metadata');
assert.match(collector,/SOOP_MEDIA_COLLECTOR_VERSION=8/,'media generation should advance so previous zero-image captures are retried');
assert.match(collector,/isTrustedSoopMediaHost/,'rendered-media fallback must stay limited to SOOP/Afreeca hosts');
assert.match(collector,/isTrustedRenderedSoopMedia/,'rendered-media fallback needs a stricter filter than generic trusted host matching');
assert.match(collector,/querySelectorAll\(['"]iframe['"]\)/,'zero-image fallback should inspect accessible iframe documents');
assert.match(collector,/naturalWidth|naturalHeight/,'rendered fallback should require meaningful rendered dimensions');
assert.match(collector,/STATION|banner|profile/i,'rendered fallback should reject common station/profile/banner chrome');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=5\*60\*1000/,'normal SOOP watcher cadence must remain five minutes');
assert.doesNotMatch(collector,/111111111|222222222|333333333|444444444/,'collector implementation must remain generic');

console.log('SOOP diagnostic UI + media fallback v1.4.6 regression passed');
