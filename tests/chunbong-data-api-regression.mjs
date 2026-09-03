import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dataApi = require('../api/chunbong-data.js');

assert.equal(dataApi.parseDurationMinutes('01:30:00'), 90);
assert.ok(Math.abs(dataApi.parseDurationMinutes('45:10') - (45 + 10 / 60)) < 0.001);
assert.equal(dataApi.parseDurationMinutes(3600), 60);
assert.equal(dataApi.parseDurationMinutes(''), null);

assert.equal(dataApi.parseMetricNumber('조회수 1.2만회'), 12000);
assert.equal(dataApi.parseMetricNumber('조회수 3,456회'), 3456);
assert.equal(dataApi.parseMetricNumber('1.5K views'), 1500);
assert.equal(dataApi.parseMetricNumber(''), null);

const monthly = dataApi.buildMonthlyActivity(
  [
    { date: '2026-09-02', durationMinutes: 120 },
    { date: '2026-09-03', durationMinutes: 90 },
    { date: '2026-08-30', durationMinutes: 60 }
  ],
  { catch: [{ date: '2026-09-03' }], clip: [{ date: '2026-09-03' }] },
  [{ dateIso: '2026-09-01T03:00:00Z' }],
  new Date('2026-09-03T08:00:00Z')
);
assert.equal(monthly.soop.vodCount, 2);
assert.equal(monthly.soop.vodMinutes, 210);
assert.equal(monthly.soop.catchCount, 1);
assert.equal(monthly.soop.clipCount, 1);
assert.equal(monthly.youtube.uploadCount, 1);

const top = dataApi.buildTopContent(
  [{ id: 'v1', title: 'A', meta: '조회수 100', viewCount: 100 }, { id: 'v2', title: 'B', meta: '조회수 500', viewCount: 500 }],
  [{ id: 'y1', title: 'Y', meta: '조회수 1.2만회' }]
);
assert.equal(top.soop[0].id, 'v2');
assert.equal(top.youtube[0].id, 'y1');

const partial = await dataApi.fetchChunbongData({
  fetchVod: async () => [{ id: 'v1', date: '2026-09-03', title: '방송', durationMinutes: 60, viewCount: 10 }],
  fetchClips: async () => ({ catch: [], clip: [], items: [] }),
  fetchYoutube: async () => { throw new Error('youtube down'); },
  fetchLive: async () => ({ live: false, title: '', startedAt: '', viewerCount: null, source: 'test' }),
  readSnapshots: () => ({ version: 1, snapshots: [] }),
  now: new Date('2026-09-03T08:00:00Z')
});
assert.equal(partial.soop.recentVod.length, 1);
assert.equal(partial.youtube.recentVideos.length, 0);
assert.ok(partial.errors.some(item => item.platform === 'youtube'));
assert.equal(partial.fallback, false);

console.log('Chunbong data API regression test passed');
