import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync('chunbong-content-collector.user.js','utf8');
const runtime=fs.readFileSync('collector-runtime.js','utf8');
const manifest=JSON.parse(fs.readFileSync('collector-runtime-manifest.json','utf8'));

assert.match(bootstrap,/@version\s+1\.5\.0/,'bootstrap must remain 1.5.0; this is a runtime-only repair');
assert.equal(manifest.runtimeVersion,'1.0.2','remaining tab serialization must ship as runtime 1.0.2');
assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE=1/,'automatic collector tabs must remain globally serialized');
assert.match(runtime,/runSoopBackfill[\s\S]*await openAutoUrls\(batch\.map\(row=>row\.url\)\)/,'SOOP backfill must use the shared serialized opener');
assert.match(runtime,/data\.type===['"]open-urls['"][\s\S]*void openAutoUrls\(urls\)/,'open-urls commands must use the shared serialized opener');
assert.match(runtime,/data\.type===['"]open-fmk-board['"][\s\S]*DISCOVER_HASH/,'operator FMKorea board checks must carry the explicit discovery marker');
assert.doesNotMatch(runtime,/await sleep\(1400\);await scanSoopBoard\(['"]visit['"]\)/,'ordinary SOOP browsing must not trigger automatic discovery');
assert.match(runtime,/location\.hash\.includes\(DISCOVER_HASH\)[\s\S]*scanSoopBoard\(['"]discover['"]\)/,'SOOP discovery must require an explicit discovery marker');
assert.doesNotMatch(runtime,/await sleep\(1400\);await discoverFmkPosts\(\);\s*if\(location\.hash\.includes\(DISCOVER_HASH\)\)/,'ordinary FMKorea browsing must not trigger discovery before checking the marker');
assert.match(runtime,/location\.hash\.includes\(DISCOVER_HASH\)[\s\S]*discoverFmkPosts\(\)/,'FMKorea discovery must require an explicit discovery marker');

console.log('collector runtime remaining tab serialization regression passed');
