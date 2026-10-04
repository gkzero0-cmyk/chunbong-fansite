import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync('chunbong-content-collector.user.js','utf8');
const runtime=fs.readFileSync('collector-runtime.js','utf8');
const manifest=JSON.parse(fs.readFileSync('collector-runtime-manifest.json','utf8'));
const helper=fs.readFileSync('operator-collector-install-helper.js','utf8');
const operator=fs.readFileSync('operator-contents.js','utf8');

assert.match(bootstrap,/@version\s+1\.5\.0/,'bootstrap must stay at 1.5.0; runtime-only repairs must not require reinstall');
assert.equal(manifest.runtimeVersion,'1.0.2','operator controls must remain compatible with the current serialized collector runtime');
assert.match(runtime,/SOOP_WATCH_ACTIVE_MS=15\*60\*1000/);
assert.match(runtime,/SOOP_WATCH_NORMAL_MS=30\*60\*1000/);
assert.match(runtime,/SOOP_WATCH_IDLE_MS=60\*60\*1000/);
assert.match(runtime,/SOOP_WATCH_ERROR_MAX_MS=120\*60\*1000/);

assert.match(helper,/function sendCollectorCommand\(/,'install helper must provide a page-to-userscript command fallback');
assert.match(helper,/data-chunbong-collector-command/,'fallback must use the existing DOM command bridge');
assert.match(helper,/chunbong-content-collector-page-command/,'fallback must emit the existing collector command event');
assert.match(helper,/data-collector-watch-start/,'delegated recovery must cover watch start');
assert.match(helper,/data-collector-watch-stop/,'delegated recovery must cover watch stop');
assert.match(helper,/data-collector-self-test/,'delegated recovery must cover the self-test');
assert.match(helper,/data-collector-backfill-soop/,'delegated recovery must cover the one-time SOOP backfill');
assert.match(helper,/data-collector-open-soop/,'delegated recovery must cover incremental SOOP check');
assert.match(helper,/data-collector-open-fmk/,'delegated recovery must cover FMK check');
assert.match(helper,/stopImmediatePropagation\(\)/,'fallback must prevent duplicate execution by stale direct listeners');
assert.match(helper,/15[^\n]*30[^\n]*60[^\n]*120/,'operator guidance must describe the adaptive 15/30/60/120 minute policy');
assert.doesNotMatch(helper,/약 5분 간격/,'operator guidance must not advertise the removed five-minute watcher');
assert.doesNotMatch(helper,/동안 약 <b>15분<\/b> 간격/,'operator guidance must not describe the adaptive watcher as fixed 15 minutes');

assert.match(operator,/data-collector-watch-start/,'primary operator contents controls must remain present');
assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE=1/,'control repair must preserve serialized automatic collector tabs');

console.log('operator collector delegated control bridge regression passed');
