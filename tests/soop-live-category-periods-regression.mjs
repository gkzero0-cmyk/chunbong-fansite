import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const analytics = require('../lib/soop-analytics.js');

const now = new Date('2026-09-06T07:00:00+09:00');
const projected = analytics.projectLiveSession({
  live: true,
  broadcastId: 'live-1',
  startedAt: '2026-09-06T05:00:00+09:00',
  categoryId: 'game',
  categoryName: '종합게임',
  title: '현재 방송',
  viewerCount: 61
}, now);
assert.ok(projected);
assert.equal(projected.durationMinutes, 120);
assert.equal(projected.measurement, 'live-projection');
assert.equal(projected.broadcastId, 'live-1');
assert.equal(projected.categories[0].minutes, 120);
assert.equal(projected.averageViewers, null, 'single current viewer value must not become a completed average');

assert.equal(analytics.recentThreeMonthStart(now), '2026-07-01');

const sessions = [
  {
    id:'jul', broadcastId:'jul', date:'2026-07-10', startedAt:'2026-07-10T12:00:00+09:00', endedAt:'2026-07-10T13:00:00+09:00',
    durationMinutes:60, averageViewers:40, maxViewers:55, viewerSampleCount:12,
    categories:[{id:'talk',name:'소통',minutes:60,sampleCount:12,averageViewers:40,maxViewers:55}]
  },
  {
    id:'sep', broadcastId:'sep', date:'2026-09-05', startedAt:'2026-09-05T12:00:00+09:00', endedAt:'2026-09-05T14:00:00+09:00',
    durationMinutes:120, averageViewers:50, maxViewers:70, viewerSampleCount:24,
    categories:[{id:'game',name:'종합게임',minutes:120,sampleCount:24,averageViewers:50,maxViewers:70}]
  }
];

const result = analytics.buildSoopAnalytics(sessions, [], {
  live:true, broadcastId:'live-1', startedAt:'2026-09-06T05:00:00+09:00', categoryId:'game', categoryName:'종합게임', title:'현재 방송', viewerCount:61
}, now, {
  followerHistory: [
    {date:'2026-09-04', followerCount:1000},
    {date:'2026-09-05', followerCount:1003},
    {date:'2026-09-06', followerCount:1010}
  ]
});
const today = result.daily.find(row => row.date === '2026-09-06');
assert.equal(today.durationMinutes, 120, 'active stream must appear in current day before finalization');
assert.equal(today.followerDelta, 7);
assert.equal(result.overview.live, true);
assert.ok(Array.isArray(result.categoryPeriods.recentThreeMonths));
const game = result.categoryPeriods.recentThreeMonths.find(row => row.name === '종합게임');
assert.equal(game.streamCount, 2);
assert.equal(game.minutes, 240);
assert.ok(game.sharePercent > 0);

const duplicate = analytics.buildSoopAnalytics([
  ...sessions,
  {
    id:'live-finished', broadcastId:'live-1', date:'2026-09-06', startedAt:'2026-09-06T05:00:00+09:00', endedAt:'2026-09-06T07:00:00+09:00',
    durationMinutes:120, averageViewers:58, maxViewers:75, viewerSampleCount:24,
    categories:[{id:'game',name:'종합게임',minutes:120,sampleCount:24,averageViewers:58,maxViewers:75}]
  }
], [], {
  live:true, broadcastId:'live-1', startedAt:'2026-09-06T05:00:00+09:00', categoryId:'game', categoryName:'종합게임', viewerCount:61
}, now);
assert.equal(duplicate.daily.find(row => row.date === '2026-09-06').durationMinutes, 120, 'matching completed broadcast must prevent projection double count');

console.log('SOOP live projection and category-period regression test passed');
