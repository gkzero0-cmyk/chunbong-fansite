import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const history = require('../lib/soop-follower-history.js');

const points = history.extractTrackifyFollowerPoints({
  history: [
    { date: '2026-08-31', fanCount: 29720 },
    { day: '2026-09-01', followerCount: 29731 },
    { statDate: '2026-09-02', favoriteCount: null },
    { fanCount: 99999 }
  ]
}, '2026-09-06T00:00:00.000Z');

assert.deepEqual(points.map(item => [item.date, item.followerCount]), [
  ['2026-08-31', 29720],
  ['2026-09-01', 29731]
]);
assert.ok(points.every(item => item.source === 'trackify' && item.confidence === 1));

const directSnapshots = history.snapshotsToFollowerPoints({ snapshots: [
  { date: '2026-09-01', capturedAt: '2026-09-01T23:00:00Z', soop: { followerCount: 29735 } },
  { date: '2026-09-02', capturedAt: '2026-09-02T23:00:00Z', soop: { followerCount: null } }
] });
assert.equal(directSnapshots.length, 1);
assert.equal(directSnapshots[0].confidence, 2);

const merged = history.mergeFollowerHistory(points, directSnapshots);
assert.equal(merged.find(item => item.date === '2026-09-01').followerCount, 29735, 'same-day direct snapshot must beat later internet backfill');
assert.equal(merged.some(item => item.date === '2026-09-02'), false, 'unknown dates must not be interpolated');

const snapshotRows = history.followerHistoryToSnapshots({ version: 1, points: merged });
assert.deepEqual(snapshotRows.map(item => [item.date, item.soop.followerCount]), [
  ['2026-08-31', 29720],
  ['2026-09-01', 29735]
]);

console.log('SOOP follower history regression test passed');
