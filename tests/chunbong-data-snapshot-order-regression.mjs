import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/chunbong-data-snapshot.yml', import.meta.url), 'utf8');
const captureIndex = workflow.indexOf('name: Capture production snapshot');
const followerIndex = workflow.indexOf('name: Refresh SOOP favorite history');

assert.ok(captureIndex >= 0, 'snapshot workflow must capture production data');
assert.ok(followerIndex >= 0, 'snapshot workflow must refresh SOOP follower/fanclub history');
assert.ok(
  captureIndex < followerIndex,
  'production snapshot must be captured before follower/fanclub history is rebuilt so same-day fanclub values use the newest snapshot'
);

console.log('Chunbong data snapshot ordering regression test passed');
