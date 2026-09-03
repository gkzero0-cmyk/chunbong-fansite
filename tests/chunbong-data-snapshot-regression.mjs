import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(new URL('../scripts/update-chunbong-data.mjs', import.meta.url).pathname).href;
const snapshotApi = await import(moduleUrl);

const input = { version: 1, snapshots: [{ date: '2026-09-02', capturedAt: 'old' }] };
const first = snapshotApi.upsertSnapshot(input, { date: '2026-09-03', capturedAt: 'new' });
assert.equal(first.version, 1);
assert.equal(first.snapshots.length, 2);
assert.equal(first.snapshots.at(-1).date, '2026-09-03');

const second = snapshotApi.upsertSnapshot(first, { date: '2026-09-03', capturedAt: 'newer' });
assert.equal(second.snapshots.length, 2, 'same KST date must be replaced, not appended');
assert.equal(second.snapshots.at(-1).capturedAt, 'newer');

const many = { version: 1, snapshots: [] };
for (let index = 0; index < 405; index += 1) {
  const date = new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10);
  many.snapshots.push({ date, capturedAt: `${date}T00:00:00.000Z` });
}
const trimmed = snapshotApi.upsertSnapshot(many, { date: '2026-12-31', capturedAt: 'latest' }, 400);
assert.equal(trimmed.snapshots.length, 400);
assert.equal(trimmed.snapshots.at(-1).date, '2026-12-31');
assert.equal(new Set(trimmed.snapshots.map(item => item.date)).size, 400);

const built = snapshotApi.buildSnapshot({
  capturedAt: '2026-09-03T08:00:00.000Z',
  soop: {
    live: { live: false, followerCount: 1234, fanclubCount: 77 },
    overview: {
      measuredTotalMinutes: 480,
      monthAverageViewers: 44,
      monthMaxViewers: 72,
      totalAirtimeMinutes: 558965,
      subscriberCount: 17,
      supporterCount: 9,
      monthUniqueViewers: 9876,
      viewershipHours: 2592,
      cumulativeUsers: 222333,
      cumulativeUpCount: 55444
    },
    monthly: { vodCount: 3, vodMinutes: null, catchCount: 4, clipCount: 2 }
  },
  youtube: { channel: { subscriberCount: null, viewCount: null, videoCount: null }, monthly: { uploadCount: 2 } }
}, new Date('2026-09-03T08:00:00.000Z'));
assert.equal(built.date, '2026-09-03');
assert.equal(built.soop.monthlyVodCount, 3);
assert.equal(built.soop.monthlyVodMinutes, null);
assert.equal(built.soop.followerCount, 1234);
assert.equal(built.soop.fanclubCount, 77);
assert.equal(built.soop.measuredTotalMinutes, 480);
assert.equal(built.soop.monthAverageViewers, 44);
assert.equal(built.soop.monthMaxViewers, 72);
assert.equal(built.soop.totalAirtimeMinutes, 558965);
assert.equal(built.soop.subscriberCount, 17);
assert.equal(built.soop.supporterCount, 9);
assert.equal(built.soop.monthUniqueViewers, 9876);
assert.equal(built.soop.viewershipHours, 2592);
assert.equal(built.soop.cumulativeUsers, 222333);
assert.equal(built.soop.cumulativeUpCount, 55444);
assert.equal(built.youtube.recentUploadCount, 2);

console.log('Chunbong data snapshot regression test passed');
