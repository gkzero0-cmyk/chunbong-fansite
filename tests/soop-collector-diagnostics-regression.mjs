import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const archive=require('../lib/chunbong-content-archive-api.js');
const api=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

assert.match(collector,/@version\s+1\.4\.8/,'diagnostic collector release should advance for serialized auto-discovery recovery');
assert.match(collector,/SOOP_MEDIA_COLLECTOR_VERSION=8/,'diagnostic generation must revisit previous zero-image and restricted rows');
assert.match(collector,/SOOP_DIAGNOSTIC_QUEUE_KEY/,'collector needs a separate diagnostic queue');
assert.match(collector,/queueSoopDiagnostic/,'collector should queue diagnostics independently of archive imports');
assert.match(collector,/candidateCount/,'diagnostics should report discovered media candidate counts');
assert.match(collector,/acceptedCount/,'diagnostics should report accepted media counts');
assert.match(collector,/rejectedByReason/,'diagnostics should explain why candidates were filtered');
assert.match(collector,/bodyLength/,'diagnostics should record captured body length');
assert.match(collector,/pageTextLength/,'diagnostics should record page text length');
assert.match(collector,/phase:'restricted'/,'restricted captures must emit diagnostics');
assert.match(collector,/phase:'captured'/,'successful or zero-image captures must emit diagnostics');
assert.match(collector,/operator-content-browser-diagnostic/,'operator bridge must upload queued diagnostics through an authenticated fansite request');
assert.doesNotMatch(collector,/document\.cookie|localStorage|sessionStorage/,'collector diagnostics must not capture browser credentials or storage');

assert.equal(typeof archive._internals.normalizeSoopCollectorDiagnostic,'function','server must expose diagnostic normalization for regression coverage');
const diagnostic=archive._internals.normalizeSoopCollectorDiagnostic({
  postId:'208562045',url:'https://www.sooplive.com/station/chunbongtv/post/208562045?token=secret#x',
  phase:'captured',access:'favorite',collectorVersion:8,bodyLength:321,pageTextLength:999,
  candidateCount:4,acceptedCount:0,rejectedByReason:{not_post_asset:3,decorative:1},
  samples:['https://stimg.sooplive.com/NORMAL_BBS/3/a.png?signature=secret','https://cdn.example.com/path/b.png?x=1']
});
assert.equal(diagnostic.postId,'208562045');
assert.equal(diagnostic.url,'https://www.sooplive.com/station/chunbongtv/post/208562045');
assert.deepEqual(diagnostic.samples,['stimg.sooplive.com/NORMAL_BBS/3/a.png','cdn.example.com/path/b.png']);
assert.equal(diagnostic.rejectedByReason.not_post_asset,3);
assert.ok(!JSON.stringify(diagnostic).includes('secret'),'diagnostics must strip query secrets');
assert.match(api,/operator-content-browser-diagnostic/,'content API must route authenticated diagnostic uploads');

// Diagnostics intentionally persist only counts, phases, access class, and query-free host/path samples.
console.log('soop collector diagnostics regression: ok');
