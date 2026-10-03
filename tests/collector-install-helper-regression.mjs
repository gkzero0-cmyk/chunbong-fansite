import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('operator.html','utf8');
const loader=fs.readFileSync('operator-redis-diagnostics.js','utf8');
const helper=fs.readFileSync('operator-collector-install-helper.js','utf8');

assert.match(html,/data-collector-install(?!-)/,'collector install trigger should exist');
assert.match(loader,/operator-collector-install-helper\.js\?v=1/,'operator diagnostics loader should load the install helper');
assert.match(helper,/COLLECTOR_LATEST_VERSION\s*=\s*['"]1\.4\.7['"]/,'helper should know the latest collector version');
assert.match(helper,/COLLECTOR_SCRIPT_PATH\s*=\s*['"]\/chunbong-content-collector\.user\.js['"]/,'helper should target the hosted userscript');
assert.match(helper,/\[data-collector-install\]/,'helper should bind the existing install trigger');
assert.match(helper,/preventDefault\(\)/,'helper should prevent the raw .user.js navigation');
assert.match(helper,/removeAttribute\(['"]target['"]\)/,'helper should remove the raw new-tab behavior');
assert.match(helper,/data-collector-install-helper/,'helper panel should be created');
assert.match(helper,/data-collector-install-action/,'explicit install/update action should exist');
assert.match(helper,/data-collector-script-source/,'raw source link should be separate from install action');
assert.match(helper,/\?install=1&v=/,'install action should add an explicit install marker and version cache key');
assert.match(helper,/location\.assign\(/,'install action should navigate in the current tab so Tampermonkey can intercept it');
assert.match(helper,/Tampermonkey 5\.6/,'Chrome 152+ compatibility guidance should be visible');
assert.match(helper,/https:\/\/www\.tampermonkey\.net\//,'helper should link to the official Tampermonkey site');
assert.match(helper,/15분/,'operator guidance should describe the 15-minute low-data watcher');
assert.match(helper,/약 5분 간격/,'helper should actively replace the stale five-minute guidance at runtime');

console.log('collector install helper regression: ok');
