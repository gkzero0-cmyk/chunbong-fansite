import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('operator.html','utf8');
const js=fs.readFileSync('operator-collector-install-helper.js','utf8');

assert.match(html,/data-collector-install(?!-)/,'collector install trigger should exist');
assert.doesNotMatch(html,/<a[^>]*data-collector-install[^>]*target=["']_blank["']/i,'install trigger must not remain a raw new-tab .user.js link');
assert.match(js,/data-collector-install-helper/,'install helper panel should exist');
assert.match(js,/<a[^>]+data-collector-install-action[^>]*>/s,'explicit install/update action should be a native userscript link');
assert.match(js,/data-collector-script-source/,'raw source link should be separate from install action');
assert.match(js,/data-collector-stable-download/,'stable Tampermonkey fallback download should exist');
assert.match(js,/COLLECTOR_LATEST_VERSION\s*=\s*['"]1\.5\.0['"]/,'helper should know the bootstrap release version');
assert.match(js,/data-collector-runtime-summary/,'helper should expose runtime status separately from bootstrap status');
assert.match(js,/runtime-only 업데이트/,'helper should explain that routine runtime updates do not require reinstall');
assert.match(js,/bindCollectorInstallHelper/,'helper binding should exist');
assert.match(js,/COLLECTOR_SCRIPT_PATH\s*=\s*['"]\/chunbong-content-collector\.user\.js['"]/,'helper should use the canonical userscript path');
assert.match(js,/['"]\?install=1&v=['"]/,'install action should add an install/version query');
assert.doesNotMatch(js,/location\.assign\(installUrl\(\)\)/,'install action must not force scripted navigation on Chrome 152+');
assert.match(js,/Tampermonkey 5\.5\.x/,'stable Tampermonkey guidance should be visible');
assert.match(js,/15분/,'helper should describe the 15-minute low-data watcher');

console.log('collector install helper regression: ok');
