import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');

assert.doesNotMatch(source,/scanSoopBoard\(['"]visit['"]\)/,'ordinary SOOP browsing must not trigger automatic discovery');
assert.match(source,/location\.hash\.includes\(DISCOVER_HASH\)[\s\S]*discoverFmkPosts/,'FMKorea discovery must require an explicit discovery marker');
assert.match(source,/open-fmk-board[\s\S]*DISCOVER_HASH/,'operator FMKorea board command must add the explicit discovery marker');
assert.match(source,/data\.type===['"]open-urls['"][\s\S]*openAutoUrls\(/,'selective/open-url commands must use the shared serialized opener');
assert.match(source,/runSoopBackfill[\s\S]*openAutoUrls\(/,'SOOP backfill must use the shared serialized opener');
assert.doesNotMatch(source,/batch\.urls\.forEach\([\s\S]{0,180}openBackground\([^\n]*AUTO_HASH/,'SOOP backfill must not fan out AUTO_HASH tabs');
assert.doesNotMatch(source,/urls\.forEach\([\s\S]{0,180}openBackground\([^\n]*AUTO_HASH/,'open-url commands must not fan out AUTO_HASH tabs');

console.log('collector auto tab gating regression passed');
