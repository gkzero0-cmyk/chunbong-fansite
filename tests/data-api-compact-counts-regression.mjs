import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compactDataPayload } = require('../api/content.js');

const payload = {
  capturedAt: '2026-09-07T10:00:00.000Z',
  soop: {
    overview: {
      followerCount: 29811,
      followerDelta: 18,
      fanclubCount: 7615,
      fanclubDelta: 24
    },
    daily: [{
      date: '2026-09-07',
      streamCount: 1,
      durationMinutes: 120,
      cumulativeMinutes: 235000,
      averageViewers: 50,
      maxViewers: 80,
      followerCount: 29811,
      followerDelta: 1,
      fanclubCount: 7615,
      fanclubDelta: 3
    }],
    monthlyStats: [{
      month: '2026-09',
      activeDays: 7,
      streamCount: 8,
      durationMinutes: 3900,
      cumulativeMinutes: 235000,
      averageStreamMinutes: 487,
      averageViewers: 51,
      maxViewers: 87,
      followerCount: 29811,
      followerDelta: 18,
      fanclubCount: 7615,
      fanclubDelta: 24,
      categories: []
    }],
    calendar: [{
      date: '2026-09-07',
      streamCount: 1,
      durationMinutes: 120,
      averageViewers: 50,
      maxViewers: 80,
      followerCount: 29811,
      followerDelta: 1,
      fanclubCount: 7615,
      fanclubDelta: 3,
      sessions: []
    }],
    categories: [],
    categoryPeriods: { recentThreeMonths: [] },
    recentSessions: []
  },
  youtube: {}
};

const metricHistory = {
  version: 1,
  points: [
    { date: '2026-08-31', followerCount: 29793, fanclubCount: 7591 },
    { date: '2026-09-01', followerCount: 29769, fanclubCount: 7595 },
    { date: '2026-09-06', followerCount: 29810, fanclubCount: 7612 },
    { date: '2026-09-07', followerCount: 29811, fanclubCount: 7615 }
  ]
};

const compacted = compactDataPayload(payload, {
  soopMetricHistory: metricHistory,
  youtubeEngagementCache: { items: [] },
  now: new Date('2026-09-07T10:00:00.000Z')
});

assert.equal(compacted.soop.daily[0].followerCount, 29811, 'daily API rows must preserve absolute favorite count');
assert.equal(compacted.soop.monthlyStats[0].followerCount, 29811, 'monthly API rows must preserve absolute favorite count');
assert.equal(compacted.soop.calendar[0].followerCount, 29811, 'calendar API rows must preserve absolute favorite count');
assert.equal(compacted.soop.calendar[0].fanclubCount, 7615, 'calendar API rows must preserve absolute fanclub count');
assert.equal(compacted.soop.monthlyStats[0].fanclubDelta, 24, 'monthly fanclub delta must compare against the previous month-end value');
assert.equal(compacted.soop.overview.fanclubDelta, 24, 'overview fanclub delta must use the same previous month-end baseline');

console.log('SOOP compact data count contract regression test passed');
