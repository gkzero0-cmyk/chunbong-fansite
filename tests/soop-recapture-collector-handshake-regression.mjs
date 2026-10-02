import assert from 'node:assert/strict';
import fs from 'node:fs';

const guardUrl=new URL('../operator-soop-recapture-guard.js',import.meta.url);
assert.equal(fs.existsSync(guardUrl),true,'SOOP selective recapture should have a collector handshake guard');
const guardSource=fs.readFileSync(guardUrl,'utf8');
const guard=await import(guardUrl);
const entry=fs.readFileSync(new URL('../operator-redis-diagnostics.js',import.meta.url),'utf8');
const contents=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');

assert.equal(typeof guard.versionAtLeast,'function','guard should expose version comparison for regression coverage');
assert.equal(guard.versionAtLeast('1.4.7','1.4.7'),true);
assert.equal(guard.versionAtLeast('1.4.8','1.4.7'),true);
assert.equal(guard.versionAtLeast('1.4.6','1.4.7'),false);
assert.equal(guard.versionAtLeast('','1.4.7'),false);

assert.match(entry,/operator-soop-recapture-guard\.js/,'existing operator entry should load the recapture handshake guard');
assert.match(guardSource,/data-collector-recapture-soop/,'guard should intercept the existing selective SOOP recapture button');
assert.match(guardSource,/data-chunbong-collector-ready/,'guard should refuse false success when the browser collector bridge is absent');
assert.match(guardSource,/data-chunbong-collector-version/,'guard should validate the installed collector version');
assert.match(guardSource,/MIN_COLLECTOR_VERSION\s*=\s*['"]1\.4\.7['"]/,'low-data/exact-recapture bridge v1.4.7 is the minimum supported handshake version');
assert.match(guardSource,/stopImmediatePropagation/,'unavailable or outdated collectors must block the original success handler');
assert.match(guardSource,/type\s*:\s*['"]ping['"]/,'guard should send a post-command liveness probe');
assert.match(guardSource,/type\s*!==\s*['"]state['"]|type\s*===\s*['"]state['"]/,'guard should wait for a collector state response');
assert.match(guardSource,/setTimeout/,'handshake should use a bounded timeout');
assert.doesNotMatch(guardSource,/setInterval/,'handshake must not add recurring polling');
assert.match(guardSource,/연결되지|연결을 확인|업데이트/,'operator should show a clear actionable collector connection/version message');
assert.match(guardSource,/전달 확인|응답/,'operator should distinguish delivered commands from missing acknowledgements');

assert.match(contents,/kind:'soop-recapture'/,'existing button/command surface should remain available');
assert.match(guardSource,/buildSoopRecapturePlan/,'the v1.4.7 guard should own exact per-post target selection');
assert.match(guardSource,/operator-content-soop-diagnostics&mode=recapture-status/,'target selection should use exact authenticated status instead of the latest-250 inbox');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=15\*60\*1000/,'normal SOOP watcher cadence must use the approved fifteen-minute interval');
assert.match(collector,/@version\s+1\.4\.7/,'handshake should require the v1.4.7 low-data watcher userscript');

console.log('SOOP recapture collector handshake regression passed');
