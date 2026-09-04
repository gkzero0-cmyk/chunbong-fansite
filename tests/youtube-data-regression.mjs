import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fetchYoutube = require('../api/youtube.js');
const dataApi = require('../lib/chunbong-data.js');

assert.equal(typeof fetchYoutube.mergeRecentItems, 'function', 'YouTube adapter should expose deterministic recent-item merge helper');
assert.equal(typeof fetchYoutube.normalizeShort, 'function', 'YouTube adapter should expose Shorts normalizer for regression coverage');

const short = fetchYoutube.normalizeShort({
  videoId: 'SHORT000001',
  title: { simpleText: '새 쇼츠' },
  publishedTimeText: { simpleText: '1일 전' },
  viewCountText: { simpleText: '조회수 321회' }
});
assert.equal(short.kind, 'shorts');
assert.equal(short.date, '1일 전');

const merged = fetchYoutube.mergeRecentItems([
  { id: 'VIDEO000001', kind: 'videos', title: '일반 영상', date: '4일 전', dateIso: '2026-09-01T00:00:00Z' },
  { id: 'DUPLICATE01', kind: 'videos', title: '중복 영상', date: '3일 전', dateIso: '2026-09-02T00:00:00Z' }
], [
  { id: 'SHORT000001', kind: 'shorts', title: '새 쇼츠', date: '1일 전', dateIso: '2026-09-04T00:00:00Z' },
  { id: 'DUPLICATE01', kind: 'shorts', title: '중복 쇼츠', date: '3일 전', dateIso: '2026-09-02T00:00:00Z' }
], 12, new Date('2026-09-05T00:00:00Z'));

assert.deepEqual(merged.map(item => item.id), ['SHORT000001', 'DUPLICATE01', 'VIDEO000001']);
assert.equal(merged.filter(item => item.id === 'DUPLICATE01').length, 1, 'duplicate video IDs should be removed');

const monthly = dataApi.buildMonthlyActivity([], { catch: [], clip: [] }, merged, new Date('2026-09-05T00:00:00Z'));
assert.equal(monthly.youtube.uploadCount, 3, 'monthly uploads should include Shorts and deduplicated videos');

assert.equal(typeof dataApi.extractYoutubeChannelStatsFromHtml, 'function', 'data adapter should expose resilient channel stat parser');
const channelStats = dataApi.extractYoutubeChannelStatsFromHtml(`
  <html><head><meta itemprop="interactionCount" content="6755605"></head><body>
  <script>var ytInitialData = {"header":{"metadataRows":[{"metadataParts":[{"text":{"content":"구독자 2.68천명"}},{"text":{"content":"동영상 203개"}}]}]},"about":{"viewCountText":"조회수 6,755,605회"}};</script>
  </body></html>
`);
assert.equal(channelStats.subscriberCount, 2680);
assert.equal(channelStats.viewCount, 6755605);
assert.equal(channelStats.videoCount, 203);

console.log('YouTube data regression test passed');
