import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../scripts/collect-soop-telemetry.mjs',import.meta.url),'utf8');

assert.match(source,/const collectExtended = live\.live === true \|\| profileDue/);
assert.match(source,/60 \* 60 \* 1000/,'offline profile/external collection should be hourly');
assert.match(source,/fetchSoopLive\(\)/,'live state must still be checked every telemetry tick');
assert.match(source,/if \(collectExtended\)/,'profile and external stats must be conditional');
assert.match(source,/fetchSoopChannelProfile\(\), fetchExternalSoopStats\(\)/);
assert.match(source,/collectPublicSample\(new Date\(\), previous\)/);

console.log('SOOP adaptive telemetry budget regression passed');
