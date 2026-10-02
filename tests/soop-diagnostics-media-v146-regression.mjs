import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const uiUrl=new URL('../operator-soop-diagnostics.js',import.meta.url);
assert.equal(fs.existsSync(uiUrl),true,'operator should provide a dedicated SOOP diagnostic UI module');
const ui=await import(uiUrl);
const endpointUrl=new URL('../lib/operator-soop-diagnostics-api.js',import.meta.url);
assert.equal(fs.existsSync(endpointUrl),true,'operator should provide a bounded SOOP diagnostic handler module');
const endpoint=require('../lib/operator-soop-diagnostics-api.js');
const standaloneApiUrl=new URL('../api/operator-soop-diagnostics.js',import.meta.url);
assert.equal(fs.existsSync(standaloneApiUrl),false,'SOOP diagnostics must not consume an extra Vercel function');

const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const endpointSource=fs.readFileSync(endpointUrl,'utf8');
const contentApi=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const uiSource=fs.readFileSync(uiUrl,'utf8');
const redisWrapper=fs.readFileSync(new URL('../operator-redis-diagnostics.js',import.meta.url),'utf8');

assert.equal(typeof ui.soopDiagnosticViewRows,'function','operator should expose a pure per-post diagnostic view builder');
const requested=['111111111','222222222','333333333'];
const diagnostics=[
  {postId:'111111111',phase:'captured',candidateCount:7,acceptedCount:0,imageCount:0,rejectedByReason:{not_post_asset:6,decorative:1},capturedAt:'2026-10-03T01:02:00.000Z'},
  {postId:'222222222',phase:'captured',candidateCount:5,acceptedCount:0,imageCount:3,rejectedByReason:{not_post_asset:5},capturedAt:'2026-10-03T01:02:00.000Z'},
  {postId:'333333333',phase:'restricted',candidateCount:0,acceptedCount:0,imageCount:0,rejectedByReason:{},capturedAt:'2026-10-03T01:03:00.000Z'}
];
const view=ui.soopDiagnosticViewRows(requested,diagnostics);
assert.deepEqual(view.map(row=>[row.postId,row.status,row.imageCount,row.candidateCount]),[
  ['111111111','no-images',0,7],
  ['222222222','ok',3,5],
  ['333333333','restricted',0,0]
]);
assert.equal(view[0].rejectedByReason.not_post_asset,6);
assert.equal(ui.soopDiagnosticViewRows(['999999999'],[])[0].status,'pending','requested posts without a server diagnostic should stay pending');
assert.equal(ui.soopDiagnosticViewRows(['555555555'],[{postId:'555555555',phase:'body-empty',imageCount:0}])[0].status,'body-empty');

assert.equal(typeof endpoint._internals?.readDiagnosticRows,'function','handler should expose bounded diagnostic retrieval for regression coverage');
assert.match(endpointSource,/ZREVRANGE/,'diagnostic handler should read a bounded latest-post index');
assert.match(endpointSource,/0\s*,\s*39/,'diagnostic handler should cap reads to the latest 40 post IDs');
assert.match(endpointSource,/MGET/,'diagnostic handler should batch Redis reads instead of issuing per-post GET loops');
assert.match(endpointSource,/SOOP_DIAGNOSTIC_PREFIX/);
assert.match(endpointSource,/BROWSER_IMPORT_PREFIX/);
assert.doesNotMatch(endpointSource,/adminRows\(|browserImportInboxRows\(/,'diagnostic reads must not load the full archive or 250-row collector inbox');
for(const forbidden of ['body:','payload.body','document.cookie','localStorage','sessionStorage']) assert.equal(endpointSource.includes(forbidden),false,'endpoint must not expose private browser content: '+forbidden);
assert.match(contentApi,/operator-soop-diagnostics-api/,'existing content function should load the SOOP diagnostic handler');
assert.match(contentApi,/type==='operator-content-soop-diagnostics'/,'existing content function should multiplex the authenticated diagnostic route');

assert.match(uiSource,/data-soop-diagnostic-list/,'operator diagnostic module should render a dedicated list');
assert.match(uiSource,/renderSoopDiagnostics/,'operator diagnostic module should render status rows');
assert.match(uiSource,/soop-recapture/,'operator diagnostic module should recognize targeted recapture commands');
assert.match(uiSource,/sessionStorage/,'requested recapture IDs should survive an operator-page refresh without server storage');
assert.match(uiSource,/setTimeout/,'recapture should use bounded one-shot refreshes instead of continuous polling');
assert.doesNotMatch(uiSource,/setInterval/,'diagnostic UI must not add a recurring polling loop');
assert.match(uiSource,/\/api\/content\?type=operator-content-soop-diagnostics/,'operator UI should reuse the existing content Vercel function');
assert.match(redisWrapper,/operator-soop-diagnostics\.js/,'existing operator module entry should load the SOOP diagnostics UI without another HTML script tag');
assert.match(redisWrapper,/operator-redis-diagnostics-core\.js/,'existing Redis diagnostics runtime should remain loaded through the wrapper');

assert.match(collector,/@version\s+1\.4\.6/,'collector userscript should advance to v1.4.6');
assert.match(collector,/const VERSION='1\.4\.6'/,'collector runtime version must match userscript metadata');
assert.match(collector,/SOOP_MEDIA_COLLECTOR_VERSION=8/,'media generation should advance so previous zero-image captures are retried');
assert.match(collector,/isTrustedSoopMediaHost/,'rendered-media fallback must stay limited to SOOP/Afreeca hosts');
assert.match(collector,/isTrustedRenderedSoopMedia/,'rendered-media fallback needs a stricter filter than generic trusted host matching');
assert.match(collector,/querySelectorAll\(['"]iframe['"]\)/,'zero-image fallback should inspect accessible iframe documents');
assert.match(collector,/naturalWidth|naturalHeight/,'rendered fallback should require meaningful rendered dimensions');
assert.match(collector,/STATION|banner|profile/i,'rendered fallback should reject common station/profile/banner chrome');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=5\*60\*1000/,'normal SOOP watcher cadence must remain five minutes');
assert.doesNotMatch(collector,/111111111|222222222|333333333|555555555|999999999/,'collector implementation must remain generic');

console.log('SOOP diagnostic UI + media fallback v1.4.6 regression passed');
