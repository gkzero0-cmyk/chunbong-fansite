import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('operator.html','utf8');
const js=fs.readFileSync('operator-collector-install-helper.js','utf8');

assert.match(html,/data-collector-install(?!-)/,'collector install trigger should exist');
assert.doesNotMatch(html,/<a[^>]*data-collector-install[^>]*target=["']_blank["']/i,'install trigger must not remain a raw new-tab .user.js link');
assert.match(js,/data-collector-install-helper/,'install helper panel should exist');
assert.match(js,/data-collector-install-action/,'explicit install/update action should exist');
assert.match(js,/data-collector-script-source/,'raw source link should be separate from install action');
assert.match(js,/COLLECTOR_LATEST_VERSION\s*=\s*['"]1\.4\.9['"]/,'helper should know the latest collector version');
assert.match(js,/bindCollectorInstallHelper/,'helper binding should exist');
assert.match(js,/COLLECTOR_SCRIPT_PATH\s*=\s*['"]\/chunbong-content-collector\.user\.js['"]/,'helper should use the canonical userscript path');
assert.match(js,/['"]\?install=1&v=['"]/,'install action should add an install/version query');
assert.match(js,/location\.(?:assign|href)/,'install action should navigate in the current tab so Tampermonkey can intercept it');
assert.match(js,/Tampermonkey 5\.6/,'Chrome 152+ compatibility guidance should be visible');
assert.match(js,/15분/,'helper should describe the 15-minute low-data watcher');

console.log('collector install helper regression: ok');