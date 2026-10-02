'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const analytics = require('../lib/soop-analytics.js');

test('buildSoopAnalytics keeps long legitimate history while removing gross anomalies', () => {
  const result = analytics.buildSoopAnalytics([
    { id: 'good', title: '장시간 방송', date: '2026-08-01', durationMinutes: 2577, startedAt: '2026-08-01T00:00:00Z', endedAt: '2026-08-02T18:57:00Z' },
    { id: 'bad-a', title: '비정상 기록 A', date: '2026-06-24', durationMinutes: 5324 },
    { id: 'bad-b', title: '비정상 기록 B', date: '2026-06-29', durationMinutes: 5690 },
    { id: 'bad-c', title: '비정상 기록 C', date: '2026-07-03', durationMinutes: 7310 },
    { id: 'bad-d', title: '비정상 기록 D', date: '2026-09-06', durationMinutes: 21164 }
  ], [], {}, new Date('2026-09-10T00:00:00Z'));
  assert.equal(result.overview.measuredTotalMinutes, 2577);
  assert.equal(result.recentSessions.length, 1);
  assert.equal(result.recentSessions[0].id, 'good');
});

test('buildSoopAnalytics does not double count overlapping provider sessions', () => {
  const result = analytics.buildSoopAnalytics([
    { id: 'fan', broadcastId: 'fan-1', title: '그냥서버:적자생존 오픈합니다.', date: '2026-09-30', startedAt: '2026-09-30T09:00:00Z', endedAt: '2026-09-30T11:51:00Z', durationMinutes: 171, viewerSampleCount: 20, measurement: 'fan-site-sampled-5m' },
    { id: 'track', broadcastId: 'track-1', title: '그냥서버:적자생존 오픈합니다.', date: '2026-09-30', startedAt: '2026-09-30T09:02:00Z', endedAt: '2026-09-30T13:12:00Z', durationMinutes: 250, measurement: 'trackify-session' }
  ], [], {}, new Date('2026-09-30T14:00:00Z'));
  const row = result.daily.find(item => item.date === '2026-09-30');
  assert.equal(row.streamCount, 1);
  assert.equal(row.durationMinutes, 252);
  assert.equal(result.overview.measuredTotalMinutes, 252);
});

test('buildSoopAnalytics counts only the current KST-day slice after midnight', () => {
  const result = analytics.buildSoopAnalytics([], [], {
    live: true,
    broadcastId: 'live-1',
    startedAt: '2026-09-30T14:00:00Z',
    title: '자정 넘김 방송',
    categoryName: 'Minecraft',
    viewerCount: 100
  }, new Date('2026-09-30T16:30:00Z'));
  const sep30 = result.daily.find(item => item.date === '2026-09-30');
  const oct1 = result.daily.find(item => item.date === '2026-10-01');
  assert.equal(sep30.durationMinutes, 60);
  assert.equal(oct1.durationMinutes, 90);
  assert.equal(result.overview.todayDurationMinutes, 90);
  assert.equal(result.overview.monthDurationMinutes, 90);
  assert.equal(result.overview.measuredTotalMinutes, 0);
  assert.equal(result.overview.live, true);
});

test('monthly airtime cannot be overwritten by a stale external value below the current-day total', () => {
  const result = analytics.buildSoopAnalytics([], [], {
    live: true,
    broadcastId: 'live-2',
    startedAt: '2026-09-30T14:00:00Z',
    title: '자정 넘김 방송',
    categoryName: 'Minecraft',
    viewerCount: 100
  }, new Date('2026-09-30T16:30:00Z'));
  result.overview.monthDurationMinutes = 30;
  result.overview.monthDurationSource = 'trackify';
  assert.equal(result.overview.monthDurationMinutes, 90);
  assert.notEqual(result.overview.monthDurationSource, 'trackify');

  result.overview.monthDurationMinutes = 120;
  result.overview.monthDurationSource = 'trackify';
  assert.equal(result.overview.monthDurationMinutes, 120);
  assert.equal(result.overview.monthDurationSource, 'trackify');
});
