import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('operator.html','utf8');
const js=fs.readFileSync('operator-contents.js','utf8');

assert.match(html,/data-collector-install(?!-)/,'collector install trigger should exist');
assert.doesNotMatch(html,/<a[^>]*data-collector-install[^>]*target=["']_blank["']/i,'install trigger must not remain a raw new-tab .user.js link');
assert.match(html,/data-collector-install-helper/,'install helper panel should exist');
assert.match(html,/data-collector-install-action/,'explicit install/update action should exist');
assert.match(html,/data-collector-script-source/,'raw source link should be separate from install action');
assert.match(js,/COLLECTOR_LATEST_VERSION\s*=\s*['"]1\.4\.7['"]/,'helper should know the latest collector version');
assert.match(js,/bindCollectorInstallHelper/,'helper binding should exist');
assert.match(js,/chunbong-content-collector\.user\.js\?install=/,'install action should use a cache-busted userscript URL');
assert.match(js,/location\.(?:assign|href)/,'install action should navigate in the current tab so Tampermonkey can intercept it');
assert.match(js,/Tampermonkey 5\.6/,'Chrome 152+ compatibility guidance should be visible');
assert.match(html,/15분/,'operator guidance should describe the 15-minute low-data watcher');
assert.doesNotMatch(html,/약 5분 간격/,'stale five-minute watcher guidance must be removed');

console.log('collector install helper regression: ok');
