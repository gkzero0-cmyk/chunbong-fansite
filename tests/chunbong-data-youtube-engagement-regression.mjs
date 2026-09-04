import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { fetchChunbongData } = require('../lib/chunbong-data.js');

const cacheFixture = {
  version: 1,
  capturedAt: '2026-09-05T00:00:00.000Z',
  source: 'test-cache',
  itemCount: 7,
  items: [
    { id: 'sep-view', kind: 'videos', title: 'Sep View', publishedAt: '2026-09-04T00:00:00Z', viewCount: 9000, commentCount: 10, link: 'sep-view' },
    { id: 'sep-comment', kind: 'shorts', title: 'Sep Comment', publishedAt: '2026-09-01T00:00:00Z', viewCount: 1000, commentCount: 99, link: 'sep-comment' },
    { id: 'aug', kind: 'videos', title: 'Aug', publishedAt: '2026-08-10T00:00:00Z', viewCount: 8000, commentCount: 80, link: 'aug' },
    { id: 'jul', kind: 'videos', title: 'Jul', publishedAt: '2026-07-10T00:00:00Z', viewCount: 7000, commentCount: 70, link: 'jul' },
    { id: 'jun', kind: 'videos', title: 'Jun', publishedAt: '2026-06-10T00:00:00Z', viewCount: 12000, commentCount: 120, link: 'jun' },
    { id: 'old', kind: 'videos', title: 'Old', publishedAt: '2025-01-01T00:00:00Z', viewCount: 20000, commentCount: 5, link: 'old' },
    { id: 'no-comments', kind: 'videos', title: 'No Comments', publishedAt: '2026-09-03T00:00:00Z', viewCount: 15000, commentCount: null, link: 'no-comments' }
  ]
};

const payload = await fetchChunbongData({
  fetchVod: async () => [],
  fetchClips: async () => ({ catch: [], clip: [], items: [] }),
  fetchYoutube: async () => ({ videos: [], shorts: [], items: [] }),
  fetchLive: async () => ({ live: false, title: '', startedAt: '', viewerCount: null, categoryId: '', categoryName: '', followerCount: null, fanclubCount: null, source: 'test-live' }),
  fetchSoopProfile: async () => ({ categoryId: '', categoryName: '', followerCount: null, fanclubCount: null, source: 'test-profile' }),
  fetchYoutubeChannel: async () => ({ subscriberCount: 1, viewCount: 2, videoCount: 3, source: 'test-channel' }),
  readSnapshots: () => ({ version: 1, snapshots: [] }),
  readSessions: () => ({ version: 1, sessions: [] }),
  readExternalHistory: () => ({ version: 1, cutoffKst: '', sessions: [], sourceSummary: null, categoryReference: null }),
  readYoutubeEngagementCache: () => cacheFixture,
  now: new Date('2026-09-05T12:00:00.000Z')
});

assert.ok(payload.youtube.engagement, 'youtube engagement summary should be exposed');
assert.equal(payload.youtube.engagement.capturedAt, cacheFixture.capturedAt);
assert.equal(payload.youtube.engagement.itemCount, 7);
assert.equal(payload.youtube.engagement.source, 'test-cache');
assert.equal(Object.hasOwn(payload.youtube.engagement, 'items'), false, 'raw complete-channel cache must not be sent to the browser');

const rankings = payload.youtube.engagement.rankings;
assert.deepEqual(rankings.allTime.views.map(item => item.id), ['old', 'no-comments', 'jun', 'sep-view', 'aug']);
assert.deepEqual(rankings.allTime.comments.map(item => item.id), ['jun', 'sep-comment', 'aug', 'jul', 'sep-view']);
assert.deepEqual(rankings.currentMonth.views.map(item => item.id), ['no-comments', 'sep-view', 'sep-comment']);
assert.deepEqual(rankings.currentMonth.comments.map(item => item.id), ['sep-comment', 'sep-view']);
assert.deepEqual(rankings.recentThreeMonths.views.map(item => item.id), ['no-comments', 'sep-view', 'aug', 'jul', 'sep-comment']);
assert.deepEqual(rankings.recentThreeMonths.comments.map(item => item.id), ['sep-comment', 'aug', 'jul', 'sep-view']);
for (const range of Object.values(rankings)) {
  assert.ok(range.views.length <= 5);
  assert.ok(range.comments.length <= 5);
}

console.log('Chunbong data YouTube engagement regression test passed');