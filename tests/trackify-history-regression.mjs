import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const external = require('../lib/soop-external.js');
const analytics = require('../lib/soop-analytics.js');

assert.equal(typeof external.extractTrackifyApiStats, 'function', 'Trackify JSON overview parser should be exported');
assert.equal(typeof external.normalizeTrackifyBroadcast, 'function', 'Trackify JSON broadcast normalizer should be exported');

const overview = {
  userId: 'chunbongtv',
  fanCount: 29784,
  totalSubs: 44,
  totalBroadTimeSec: 37000815,
  broadStartAt: '2026-09-04T16:52:52',
  totalViewCount: 4075615,
  totalOkCount: 79507,
  monthBroadTimeSec: 122220,
  monthViewershipSec: 5579151,
  monthBalloon: 12768,
  monthDonors: 51,
  monthAvgViewer: 46,
  monthPeakViewer: 75,
  fanclubCnt: 7598,
  supporterCnt: 23,
  stationOpenDate: '2022-09-29T14:58:14',
  lastBroadDate: '2026-09-04T16:52:52',
  monthChatCount: 10040,
  monthUniqueChatters: 116,
  muteCount: 4
};
const categoryPayload = {
  totalSec: 1378650,
  items: [
    { category: '버추얼', totalSec: 430237, broadcastCount: 15, share: 0.3120712291 },
    { category: '마인크래프트', totalSec: 401293, broadcastCount: 13, share: 0.291076778 }
  ]
};

const stats = external.extractTrackifyApiStats(overview, categoryPayload);
assert.equal(stats.source, 'trackify');
assert.equal(stats.followerCount, 29784);
assert.equal(stats.subscriberCount, 44);
assert.equal(stats.fanclubCount, 7598);
assert.equal(stats.supporterCount, 23);
assert.equal(stats.averageViewers, 46);
assert.equal(stats.maxViewers, 75);
assert.equal(stats.airtimeMinutes, 2037);
assert.equal(stats.totalAirtimeMinutes, 616680);
assert.equal(stats.viewershipHours, 1550);
assert.equal(stats.cumulativeUpCount, 79507);
assert.equal(stats.monthlyStarCount, 12768);
assert.equal(stats.monthlySupporterCount, 51);
assert.equal(stats.monthlyChatCount, 10040);
assert.equal(stats.monthlyMuteCount, 4);
assert.equal(stats.monthUniqueViewers, null, 'unique chatters must not be mislabeled as unique viewers');
assert.equal(stats.cumulativeUsers, null, 'total view count must not be mislabeled as unique users');
assert.equal(stats.stationOpenedAt, '2022-09-29T14:58:14');
assert.equal(stats.latestBroadcastDate, '2026-09-04T16:52:52');
assert.deepEqual(
  stats.categories.map(item => [item.name, item.minutes, item.streamCount, item.sharePercent]),
  [
    ['버추얼', 7171, 15, 31.2],
    ['마인크래프트', 6688, 13, 29.1]
  ]
);

const rawBroadcast = {
  broadNo: '296818075',
  title: '못해도 된다 잘한다고 한 적 없다',
  startAt: '2026-09-02T12:56:39',
  endAt: '2026-09-03T02:09:19',
  elapsedSec: 47560,
  peakViewer: 65,
  avgViewer: 43,
  broadDone: true,
  balloonTotal: 1931,
  settledBalloon: 1931,
  chatCount: 2851,
  donorsTotal: 8,
  cateNo: '00810000',
  category: '버추얼'
};

const session = external.normalizeTrackifyBroadcast(rawBroadcast);
assert.equal(session.id, 'trackify-296818075');
assert.equal(session.broadcastId, '296818075');
assert.equal(session.date, '2026-09-02');
assert.equal(session.startedAt, '2026-09-02T12:56:39+09:00');
assert.equal(session.endedAt, '2026-09-03T02:09:19+09:00');
assert.equal(session.durationMinutes, 793);
assert.equal(session.averageViewers, 43);
assert.equal(session.maxViewers, 65);
assert.equal(session.viewerSampleCount, 159);
assert.equal(session.starCount, 1931);
assert.equal(session.supporterCount, 8);
assert.equal(session.chatCount, 2851);
assert.equal(session.title, rawBroadcast.title);
assert.equal(session.measurement, 'trackify-public-api');
assert.deepEqual(session.categories.map(item => [item.name, item.minutes]), [['버추얼', 793]]);
assert.equal(
  external.normalizeTrackifyBroadcast({ broadNo: 'live', startAt: '2026-09-04T16:52:52', broadDone: false }),
  null,
  'unfinished Trackify broadcasts must not pollute historical aggregates'
);

const secondRaw = {
  broadNo: '296801259',
  title: '성장하는 괴물 고점의 추',
  startAt: '2026-09-01T18:56:33',
  endAt: '2026-09-02T01:54:34',
  elapsedSec: 25081,
  peakViewer: 59,
  avgViewer: 45,
  broadDone: true,
  settledBalloon: 1354,
  chatCount: 3905,
  donorsTotal: 15,
  cateNo: '00810000',
  category: '버추얼'
};
const second = external.normalizeTrackifyBroadcast(secondRaw);

const daily = analytics.aggregateDaily([second, session], []);
assert.equal(daily.length, 2, 'Trackify sessions must populate daily history');
assert.equal(daily.find(row => row.date === '2026-09-02')?.durationMinutes, 793);
assert.equal(daily.find(row => row.date === '2026-09-02')?.averageViewers, 43);
assert.equal(daily.find(row => row.date === '2026-09-02')?.maxViewers, 65);

const monthly = analytics.aggregateMonthly([second, session], []);
assert.equal(monthly.length, 1, 'Trackify sessions in the same month must populate monthly history');
assert.equal(monthly[0].month, '2026-09');
assert.equal(monthly[0].streamCount, 2);
assert.equal(monthly[0].durationMinutes, 1211);
assert.equal(monthly[0].maxViewers, 65);

const apiCalls = [];
const fakeFetchJson = async url => {
  const parsed = new URL(url);
  apiCalls.push(parsed);
  if (parsed.pathname.endsWith('/streamer/chunbongtv')) return overview;
  if (parsed.pathname.endsWith('/category-distribution')) return categoryPayload;
  if (parsed.pathname.endsWith('/broadcasts')) {
    if (!parsed.searchParams.has('lastSeenBroadNo')) {
      return { data: [{ broadNo: 'live', startAt: '2026-09-04T16:52:52', broadDone: false }, rawBroadcast], more: true };
    }
    assert.equal(parsed.searchParams.get('lastSeenBroadNo'), rawBroadcast.broadNo);
    assert.equal(parsed.searchParams.get('lastSeenBroadStart'), rawBroadcast.startAt);
    return { data: [secondRaw], more: false };
  }
  throw new Error(`unexpected Trackify URL: ${url}`);
};

const history = await external.fetchTrackifySoopHistory({
  fetchJson: fakeFetchJson,
  from: '2026-08-01',
  to: '2026-09-06',
  maxPages: 3,
  maxBroadcasts: 10,
  pageSize: 2
});
assert.equal(history.stats.followerCount, 29784);
assert.deepEqual(history.sessions.map(item => item.id), ['trackify-296801259', 'trackify-296818075']);
assert.equal(history.errors.length, 0);
assert.equal(apiCalls.filter(url => url.pathname.endsWith('/broadcasts')).length, 2, 'Trackify history must follow cursor pagination');

console.log('Trackify history regression test passed');
