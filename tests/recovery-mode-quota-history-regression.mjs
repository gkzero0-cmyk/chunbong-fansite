import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const route=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const snapshot=fs.readFileSync(new URL('../scripts/update-last-known-good.mjs',import.meta.url),'utf8');

assert.match(api,/RECOVERY_MODE_KEY='operator:recovery-mode:v1'/);
assert.match(api,/QUOTA_DAILY_PREFIX='operator:quota-day:v1:'/);
assert.match(api,/recoverySnapshotAvailable/);
assert.match(api,/handleOperatorRecoveryMode/);
assert.match(api,/quotaDailyHistory\(30\)/);
assert.match(route,/operator-recovery-mode/);
assert.match(route,/recoveryStaticData/);
assert.match(route,/payload\.recoveryMode='last-known-good'/);
assert.match(ui,/operator-recovery-toggle/);
assert.match(ui,/system-quota-history/);
assert.match(html,/last-known-good 사용/);
assert.match(snapshot,/sha256/);
assert.match(snapshot,/older than 90 days/);
assert.match(snapshot,/version:2/);

console.log('recovery mode and quota history regression passed');
