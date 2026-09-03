import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dataApi = require('../lib/chunbong-data.js');

assert.equal(dataApi.parseDurationMinutes('01:30:00'), 90);
assert.ok(Math.abs(dataApi.parseDurationMinutes('45:10') - (45 + 10 / 60)) < 0.001);
assert.equal(dataApi.parseDurationMinutes(3600), 60);
assert.equal(dataApi.parseDurationMinutes(''), null);

assert.equal(dataApi.parseMetricNumber('조회수 1.2만회'), 12000);
assert.equal(dataApi.parseMetricNumber('조회수 3,456회'), 3456);
assert.equal(dataApi.parseMetricNumber('1.5K views'), 1500);
assert.equal(dataApi.parseMetricNumber(''), null);

const publicMetrics = dataApi.extractSoopPublicMetrics({
  nested: {
    cate_no: '00040000',
    cate_name: '버추얼',
    follower_count: '1,234',
    fanclub_count: 77
  }
});
assert.equal(publicMetrics.categoryId, '00040000');
assert.equal(publicMetrics.categoryName, '버추얼');
assert.equal(publicMetrics.followerCount, 1234);
assert.equal(publicMetrics.fanclubCount, 77);

const missingMetrics = dataApi.extractSoopPublicMetrics({ nested: { category_name: '종합게임' } });
assert.equal(missingMetrics.categoryName, '종합게임');
assert.equal(missingMetrics.followerCount, null);
assert.equal(missingMetrics.fanclubCount, null);

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

const sessionFixture = {
  version: 1,
  sessions: [
    {
      id: 's1', startedAt: '2026-09-02T10:00:00.000Z', endedAt: '2026-09-02T12:00:00.000Z', date: '2026-09-02', title: '버추얼 방송',
      durationMinutes: 120, averageViewers: 30, maxViewers: 45, viewerSampleCount: 24,
      followerDelta: 2, fanclubDelta: 1,
      categories: [{ name: '버추얼', minutes: 120, sampleCount: 24, averageViewers: 30, maxViewers: 45 }]
    },
    {
      id: 's2', startedAt: '2026-09-03T10:00:00.000Z', endedAt: '2026-09-03T14:00:00.000Z', date: '2026-09-03', title: '게임 방송',
      durationMinutes: 240, averageViewers: 50, maxViewers: 80, viewerSampleCount: 48,
      followerDelta: 5, fanclubDelta: 2,
      categories: [{ name: '종합게임', minutes: 240, sampleCount: 48, averageViewers: 50, maxViewers: 80 }]
    }
  ]
};

const partial = await dataApi.fetchChunbongData({
  fetchVod: async () => [{ id: 'v1', date: '2026-09-03', title: '방송', durationMinutes: 60, viewCount: 10 }],
  fetchClips: async () => ({ catch: [], clip: [], items: [] }),
  fetchYoutube: async () => { throw new Error('youtube down'); },
  fetchLive: async () => ({ live: false, title: '', startedAt: '', viewerCount: null, categoryName: '', source: 'test' }),
  fetchSoopProfile: async () => ({ followerCount: 1005, fanclubCount: 51, source: 'test-profile' }),
  fetchYoutubeChannel: async () => ({ subscriberCount: null, viewCount: null, videoCount: null, source: 'test-youtube' }),
  readSnapshots: () => ({
    version: 1,
    snapshots: [
      { date: '2026-09-02', soop: { followerCount: 1000, fanclubCount: 50 } },
      { date: '2026-09-03', soop: { followerCount: 1005, fanclubCount: 51 } }
    ]
  }),
  readSessions: () => sessionFixture,
  now: new Date('2026-09-03T08:00:00Z')
});

assert.equal(partial.soop.recentVod.length, 1);
assert.equal(partial.youtube.recentVideos.length, 0);
assert.ok(partial.errors.some(item => item.platform === 'youtube'));
assert.equal(partial.fallback, false);

assert.equal(partial.soop.live.followerCount, 1005);
assert.equal(partial.soop.live.fanclubCount, 51);
assert.equal(partial.soop.overview.measuredTotalMinutes, 360);
assert.equal(partial.soop.overview.monthDurationMinutes, 360);
assert.equal(partial.soop.overview.monthAverageViewers, 43);
assert.equal(partial.soop.overview.monthMaxViewers, 80);
assert.equal(partial.soop.overview.followerCount, 1005);
assert.equal(partial.soop.overview.fanclubCount, 51);
assert.equal(partial.soop.daily.length, 2);
assert.equal(partial.soop.monthlyStats.length, 1);
assert.equal(partial.soop.calendar.length, 2);
assert.equal(partial.soop.categories.length, 2);
assert.equal(partial.soop.recentSessions.length, 2);
assert.equal(partial.soop.measurement.viewer, 'fan-site-sampled-5m');
assert.equal(partial.soop.measurement.follower, 'public-snapshot');
assert.equal(partial.soop.measurement.fanclub, 'public-snapshot-or-unavailable');
assert.equal(partial.soop.monthly.vodCount, 1, 'legacy monthly VOD activity contract should remain available');

console.log('Chunbong data API regression test passed');
