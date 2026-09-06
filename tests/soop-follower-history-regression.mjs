import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const history = require('../lib/soop-follower-history.js');
const updater = fs.readFileSync(new URL('../scripts/update-soop-follower-history.mjs', import.meta.url), 'utf8');

const points = history.extractTrackifyFollowerPoints({
  history: [
    { date: '2026-08-31', fanCount: 29720, fanclubCount: 7498 },
    { day: '2026-09-01', followerCount: 29731, fanclubCnt: 7500 },
    { statDate: '2026-09-02', favoriteCount: null, fanclubCount: 7501 },
    { fanCount: 99999, fanclubCount: 9999 }
  ]
}, '2026-09-06T00:00:00.000Z');

assert.deepEqual(points.map(item => [item.date, item.followerCount ?? null, item.fanclubCount ?? null]), [
  ['2026-08-31', 29720, 7498],
  ['2026-09-01', 29731, 7500],
  ['2026-09-02', null, 7501]
]);
assert.ok(points.every(item => item.source === 'trackify' && item.confidence === 1));

const trendPoints = history.extractTrackifyFollowerPoints({
  favorite: {
    type: 'favorite_day',
    points: [
      { ts: '2026-09-05T00:00:00', value: 29766 },
      { ts: '2026-09-04T00:00:00', value: 29784 },
      { ts: '2026-09-03T00:00:00', value: null }
    ]
  },
  fanclub: {
    type: 'fanclub_day',
    points: [
      { ts: '2026-09-05T00:00:00', value: 7606 },
      { ts: '2026-09-04T00:00:00', value: 7599 },
      { ts: '2026-09-03T00:00:00', value: null }
    ]
  }
}, '2026-09-06T00:00:00.000Z');
assert.deepEqual(trendPoints.map(item => [item.date, item.followerCount ?? null, item.fanclubCount ?? null]), [
  ['2026-09-04', 29784, 7599],
  ['2026-09-05', 29766, 7606]
], 'Trackify streamer trend favorite and fanclub points must be accepted as exact dated observations');

const directSnapshots = history.snapshotsToFollowerPoints({ snapshots: [
  { date: '2026-09-01', capturedAt: '2026-09-01T23:00:00Z', soop: { followerCount: 29735, fanclubCount: 7502 } },
  { date: '2026-09-02', capturedAt: '2026-09-02T23:00:00Z', soop: { followerCount: null, fanclubCount: 7503 } }
] });
assert.equal(directSnapshots.length, 2, 'metric-only direct snapshots must be retained');
assert.ok(directSnapshots.every(item => item.confidence === 2));

const merged = history.mergeFollowerHistory(points, directSnapshots);
assert.equal(merged.find(item => item.date === '2026-09-01').followerCount, 29735, 'same-day direct follower snapshot must beat internet backfill');
assert.equal(merged.find(item => item.date === '2026-09-01').fanclubCount, 7502, 'same-day direct fanclub snapshot must beat internet backfill');
assert.equal(merged.find(item => item.date === '2026-09-02').fanclubCount, 7503, 'exact fanclub-only direct snapshots must be retained');

const snapshotRows = history.followerHistoryToSnapshots({ version: 1, points: merged });
assert.deepEqual(snapshotRows.map(item => [item.date, item.soop.followerCount ?? null, item.soop.fanclubCount ?? null]), [
  ['2026-08-31', 29720, 7498],
  ['2026-09-01', 29735, 7502],
  ['2026-09-02', null, 7503]
]);

assert.ok(updater.includes("url.searchParams.set('metrics', 'favorite,fanclub')"), 'history updater must fetch exact Trackify favorite and fanclub trends together');

console.log('SOOP follower + fanclub history regression test passed');
