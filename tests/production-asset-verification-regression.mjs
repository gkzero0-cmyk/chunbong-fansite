import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/pwa-production-smoke.yml',import.meta.url),'utf8');

assert.match(workflow,/daily-fortune\.js/,'production smoke must run when fortune runtime changes');
assert.match(workflow,/daily-fortune\.css/,'production smoke must run when fortune styles change');
assert.match(workflow,/sha256sum service-worker\.js/,'production smoke must hash the expected service worker');
assert.match(workflow,/sha256sum daily-fortune\.js/,'production smoke must hash the expected fortune runtime');
assert.match(workflow,/sha256sum daily-fortune\.css/,'production smoke must hash the expected fortune styles');
assert.match(workflow,/ACTUAL_SW/,'production smoke must hash the served service worker');
assert.match(workflow,/ACTUAL_FORTUNE_JS/,'production smoke must hash the served fortune runtime');
assert.match(workflow,/ACTUAL_FORTUNE_CSS/,'production smoke must hash the served fortune styles');
assert.match(workflow,/\[ "\$ACTUAL_SW" = "\$EXPECTED_SW" \]/,'served service worker must exactly match main');
assert.match(workflow,/\[ "\$ACTUAL_FORTUNE_JS" = "\$EXPECTED_FORTUNE_JS" \]/,'served fortune runtime must exactly match main');
assert.match(workflow,/\[ "\$ACTUAL_FORTUNE_CSS" = "\$EXPECTED_FORTUNE_CSS" \]/,'served fortune styles must exactly match main');
assert.doesNotMatch(workflow,/grep -q 'CHUNBONG_PWA' \/tmp\/service-worker\.js/,'generic marker-only service worker verification must not return');

console.log('production exact asset verification regression passed');
