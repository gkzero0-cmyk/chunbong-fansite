import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const analytics = require('../lib/soop-analytics.js');

const liveState = {
  version: 1,
  session: {
    active: true,
    sessionId: '2026-09-03T10:00:00.000Z',
    startedAt: '2026-09-03T10:00:00.000Z',
    title: '테스트 방송',
    samples: [
      { capturedAt: '2026-09-03T10:00:00.000Z', viewerCount: 40, categoryId: 'v', categoryName: '버추얼', followerCount: 1000, fanclubCount: 50 },
      { capturedAt: '2026-09-03T10:05:00.000Z', viewerCount: 50, categoryId: 'v', categoryName: '버추얼', followerCount: 1002, fanclubCount: 50 },
      { capturedAt: '2026-09-03T10:15:00.000Z', viewerCount: 70, categoryId: 'g', categoryName: '종합게임', followerCount: 1007, fanclubCount: 52 }
    ]
  }
};

const finalized = analytics.finalizeSession(liveState, '2026-09-03T10:25:00.000Z');
assert.equal(finalized.id, '2026-09-03T10:00:00.000Z');
assert.equal(finalized.durationMinutes, 25);
assert.equal(finalized.averageViewers, 53);
assert.equal(finalized.maxViewers, 70);
assert.equal(finalized.viewerSampleCount, 3);
assert.equal(finalized.followerStart, 1000);
assert.equal(finalized.followerEnd, 1007);
assert.equal(finalized.followerDelta, 7);
assert.equal(finalized.fanclubStart, 50);
assert.equal(finalized.fanclubEnd, 52);
assert.equal(finalized.fanclubDelta, 2);
assert.equal(finalized.measurement, 'fan-site-sampled-5m');
assert.deepEqual(finalized.categories.map(item => [item.name, item.minutes, item.averageViewers, item.maxViewers]), [
  ['버추얼', 15, 45, 50],
  ['종합게임', 10, 70, 70]
]);

const inserted = analytics.upsertSession({ version: 1, sessions: [] }, finalized);
assert.equal(inserted.sessions.length, 1);
const replaced = analytics.upsertSession(inserted, { ...finalized, maxViewers: 72 });
assert.equal(replaced.sessions.length, 1, 'same session id should not duplicate');
assert.equal(replaced.sessions[0].maxViewers, 72);

const sessions = [
  {
    id: 's1', startedAt: '2026-08-31T12:00:00.000Z', endedAt: '2026-08-31T13:00:00.000Z', date: '2026-08-31',
    durationMinutes: 60, averageViewers: 20, maxViewers: 30, viewerSampleCount: 12,
    followerDelta: 1, fanclubDelta: 0,
    categories: [{ name: '버추얼', minutes: 60, sampleCount: 12, averageViewers: 20, maxViewers: 30 }]
  },
  {
    id: 's2', startedAt: '2026-09-02T10:00:00.000Z', endedAt: '2026-09-02T12:00:00.000Z', date: '2026-09-02',
    durationMinutes: 120, averageViewers: 30, maxViewers: 45, viewerSampleCount: 24,
    followerDelta: 2, fanclubDelta: 1,
    categories: [{ name: '버추얼', minutes: 120, sampleCount: 24, averageViewers: 30, maxViewers: 45 }]
  },
  {
    id: 's3', startedAt: '2026-09-03T10:00:00.000Z', endedAt: '2026-09-03T14:00:00.000Z', date: '2026-09-03',
    durationMinutes: 240, averageViewers: 50, maxViewers: 80, viewerSampleCount: 48,
    followerDelta: 5, fanclubDelta: 2,
    categories: [
      { name: '버추얼', minutes: 180, sampleCount: 36, averageViewers: 48, maxViewers: 75 },
      { name: '종합게임', minutes: 60, sampleCount: 12, averageViewers: 56, maxViewers: 80 }
    ]
  }
];

const snapshots = [
  { date: '2026-09-02', soop: { followerCount: 1000, fanclubCount: 50 } },
  { date: '2026-09-03', soop: { followerCount: 1005, fanclubCount: 51 } }
];

const result = analytics.buildSoopAnalytics(
  sessions,
  snapshots,
  { live: true, viewerCount: 61, title: '현재 방송', categoryName: '버추얼', followerCount: 1005, fanclubCount: 51 },
  new Date('2026-09-03T15:00:00.000Z')
);

assert.equal(result.overview.measuredTotalMinutes, 420);
assert.equal(result.overview.currentViewerCount, 61);
assert.equal(result.overview.followerCount, 1005);
assert.equal(result.overview.fanclubCount, 51);
assert.equal(result.overview.monthDurationMinutes, 360);
assert.equal(result.overview.monthAverageViewers, 43);
assert.equal(result.overview.monthMaxViewers, 80);

assert.equal(result.daily.length, 3);
const sep3 = result.daily.find(item => item.date === '2026-09-03');
assert.equal(sep3.streamCount, 1);
assert.equal(sep3.durationMinutes, 240);
assert.equal(sep3.averageViewers, 50);
assert.equal(sep3.maxViewers, 80);
assert.equal(sep3.followerDelta, 5);
assert.equal(sep3.fanclubDelta, 1);
assert.equal(sep3.cumulativeMinutes, 420);
assert.equal(sep3.categories[0].name, '버추얼');

const september = result.monthly.find(item => item.month === '2026-09');
assert.equal(september.activeDays, 2);
assert.equal(september.streamCount, 2);
assert.equal(september.durationMinutes, 360);
assert.equal(september.averageStreamMinutes, 180);
assert.equal(september.averageViewers, 43);
assert.equal(september.maxViewers, 80);
assert.equal(september.followerDelta, 5);
assert.equal(september.fanclubDelta, 1);

assert.equal(result.calendar.find(item => item.date === '2026-09-03').durationMinutes, 240);
assert.deepEqual(result.categories.map(item => [item.name, item.minutes]), [['버추얼', 360], ['종합게임', 60]]);
assert.equal(result.categories[0].sharePercent, 86);
assert.equal(result.measurement.viewer, 'fan-site-sampled-5m');
assert.equal(result.measurement.follower, 'public-snapshot');
assert.equal(result.measurement.fanclub, 'public-snapshot-or-unavailable');

console.log('SOOP analytics regression test passed');
