import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync('chunbong-content-collector.user.js','utf8');
const runtime=fs.readFileSync('collector-runtime.js','utf8');
const manifest=JSON.parse(fs.readFileSync('collector-runtime-manifest.json','utf8'));
const helper=fs.readFileSync('operator-collector-install-helper.js','utf8');
const operator=fs.readFileSync('operator-contents.js','utf8');

assert.match(bootstrap,/@version\s+1\.5\.0/,'bootstrap must stay at 1.5.0; this is a runtime-only repair');
assert.equal(manifest.runtimeVersion,'1.0.2','collector control bridge repair must ship as runtime 1.0.2');
assert.match(runtime,/const VERSION='1\.0\.2'/,'runtime state must report 1.0.2 instead of the legacy 1.4.8 label');

assert.match(runtime,/new MutationObserver\(/,'runtime must observe the DOM command attribute as a third isolated-world-safe bridge');
assert.match(runtime,/attributeFilter\s*:\s*\[PAGE_COMMAND_ATTR\]/,'runtime mutation bridge must be limited to the collector command attribute');
assert.match(runtime,/handledCommandIds/,'multiple bridge channels must deduplicate the same command id');
assert.match(runtime,/command-result/,'runtime must acknowledge accepted operator commands instead of failing silently');

assert.match(helper,/data-collector-watch-start/,'install helper must provide delegated recovery for the watch start control');
assert.match(helper,/sendCollectorCommand/,'install helper must be able to issue collector commands even if the lazy contents binding was replaced');
assert.match(helper,/15[^\n]*30[^\n]*60[^\n]*120/,'operator guidance must describe the adaptive 15/30/60/120 minute policy');
assert.doesNotMatch(helper,/약 5분 간격/,'operator guidance must not advertise the removed five-minute watcher');
assert.doesNotMatch(helper,/동안 약 <b>15분<\/b> 간격/,'operator guidance must not describe the adaptive watcher as fixed 15 minutes');

assert.match(operator,/data-collector-watch-start/,'primary operator contents controls must remain present');
assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE=1/,'control repair must preserve serialized automatic collector tabs');

console.log('operator collector control bridge regression passed');
