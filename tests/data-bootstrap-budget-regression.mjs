import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const data = read('data.js');
const recent = read('data-recent-session-metrics.js');
const home = read('home-overview.js');

assert.match(data, /__CHUNBONG_DATA_BOOT_MANAGED__\s*=\s*true/, 'data bootstrap must mark managed startup');
assert.match(data, /Promise\.all\(/, 'data bootstrap should discover independent helper runtimes in parallel');
assert.ok(data.indexOf("data-recent-session-metrics.js") < data.indexOf("data-core.js"), 'recent-session fetch tap must be installed before data-core starts the fresh request');
assert.ok(data.indexOf("data-soop-periods-v3.js") < data.indexOf("data-core.js"), 'period fetch tap must be installed before data-core starts the fresh request');
assert.match(recent, /if\s*\(!window\.__CHUNBONG_DATA_BOOT_MANAGED__\)\s*prime\(\)/, 'managed bootstrap must suppress the duplicate recent-session prime request');
assert.match(home, /IntersectionObserver/, 'home lower sections must keep viewport-based deferred loading');
assert.match(home, /whenVisible\(statsRoot/, 'home data stats must remain deferred');
assert.match(home, /whenVisible\(archiveRoot/, 'home archive preview must remain deferred');

console.log('data bootstrap request budget regression OK');
