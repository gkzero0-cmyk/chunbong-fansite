import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/soop-dashboard-production-smoke.yml', import.meta.url), 'utf8');
const v3 = fs.readFileSync(new URL('../data-soop-periods-v3.js', import.meta.url), 'utf8');

assert.ok(workflow.includes("- 'data-soop-periods-v3.js'"), 'production dashboard smoke must trigger on the active v3 renderer');
assert.ok(workflow.includes('$BASE/data-soop-periods-v3.js'), 'production dashboard smoke must fetch the active v3 renderer');
assert.ok(workflow.includes("load('data-soop-periods-v3.js')"), 'production dashboard smoke must verify the v3 loader contract');
assert.ok(!workflow.includes('requiredV2='), 'production dashboard smoke must not validate the retired v2 renderer contract');
for (const marker of ['dailyFollowerCount','monthlyFollowerCount','calendarFollowerCount','calendarFanclubCount']) {
  assert.ok(workflow.includes(marker), `production dashboard smoke must verify ${marker}`);
}
for (const marker of ["countKey:'followerCount'", "countKey:'fanclubCount'", "deltaKey:'fanclubDelta'", "key:'cumulativeMinutes'"]) {
  assert.ok(v3.includes(marker), `active V3 renderer must contain ${marker}`);
  assert.ok(workflow.includes(marker), `production dashboard smoke must validate the real V3 token ${marker}`);
}

console.log('SOOP dashboard v3 production smoke regression test passed');
