import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  monthKeyKst,
  threeMonthStartKey,
  normalizeEngagementItem,
  buildEngagementRankings,
  mergeEngagementCache
} = require('../lib/youtube-engagement');

const now = new Date('2026-09-05T12:00:00.000Z');
assert.equal(monthKeyKst(now), '2026-09');
assert.equal(threeMonthStartKey(now), '2026-07-01');

const fixtures = [
  { id: 'sept-a', kind: 'videos', title: 'September A', publishedAt: '2026-09-04T10:00:00Z', viewCount: 900, commentCount: 9 },
  { id: 'sept-b', kind: 'shorts', title: 'September B', publishedAt: '2026-09-01T10:00:00Z', viewCount: 1500, commentCount: 3 },
  { id: 'aug-a', kind: 'videos', title: 'August A', publishedAt: '2026-08-15T10:00:00Z', viewCount: 3000, commentCount: 22 },
  { id: 'jul-a', kind: 'videos', title: 'July A', publishedAt: '2026-07-01T00:00:00Z', viewCount: 5000, commentCount: 1 },
  { id: 'jun-a', kind: 'videos', title: 'June A', publishedAt: '2026-06-30T23:59:59Z', viewCount: 7000, commentCount: 70 },
  { id: 'old-a', kind: 'videos', title: 'Old A', publishedAt: '2025-01-01T00:00:00Z', viewCount: 10000, commentCount: 5 },
  { id: 'no-comments', kind: 'videos', title: 'No Comments', publishedAt: '2026-09-03T00:00:00Z', viewCount: 8000, commentCount: null },
  { id: 'dup', kind: 'videos', title: 'Duplicate old', publishedAt: '2026-08-01T00:00:00Z', viewCount: 10, commentCount: 1 },
  { id: 'dup', kind: 'shorts', title: 'Duplicate fresh', publishedAt: '2026-08-02T00:00:00Z', viewCount: 4000, commentCount: 40 }
];

const normalized = normalizeEngagementItem({
  id: 'abc123',
  kind: 'shorts',
  title: 'Example',
  publishedAt: '2026-09-05T00:00:00Z',
  viewCount: '1,234',
  commentCount: '56',
  link: 'https://www.youtube.com/shorts/abc123'
});
assert.equal(normalized.viewCount, 1234);
assert.equal(normalized.commentCount, 56);
assert.equal(normalized.kind, 'shorts');

const rankings = buildEngagementRankings(fixtures, now);
assert.deepEqual(rankings.allTime.views.map(item => item.id), ['old-a', 'no-comments', 'jun-a', 'jul-a', 'dup']);
assert.deepEqual(rankings.allTime.comments.map(item => item.id), ['jun-a', 'dup', 'aug-a', 'sept-a', 'old-a']);
assert.deepEqual(rankings.currentMonth.views.map(item => item.id), ['no-comments', 'sept-b', 'sept-a']);
assert.deepEqual(rankings.currentMonth.comments.map(item => item.id), ['sept-a', 'sept-b']);
assert.deepEqual(rankings.recentThreeMonths.views.map(item => item.id), ['no-comments', 'jul-a', 'dup', 'aug-a', 'sept-b']);
assert.deepEqual(rankings.recentThreeMonths.comments.map(item => item.id), ['dup', 'aug-a', 'sept-a', 'sept-b', 'jul-a']);
assert.ok(rankings.allTime.views.every(item => !Object.hasOwn(item, 'raw')));
assert.equal(rankings.allTime.views.filter(item => item.id === 'dup').length, 1, 'duplicate video ids should collapse to one item');

const merged = mergeEngagementCache(
  {
    version: 1,
    capturedAt: '2026-09-04T00:00:00Z',
    items: [
      { id: 'keep', kind: 'videos', title: 'Old title', publishedAt: '2026-08-20T00:00:00Z', viewCount: 100, commentCount: 12, link: 'old-link' },
      { id: 'previous-only', kind: 'videos', title: 'Previous', publishedAt: '2026-07-20T00:00:00Z', viewCount: 55, commentCount: 4, link: 'previous-link' }
    ]
  },
  {
    capturedAt: '2026-09-05T00:00:00Z',
    items: [
      { id: 'keep', kind: 'videos', title: 'New title', publishedAt: '2026-08-20T00:00:00Z', viewCount: 140, commentCount: null, link: 'new-link' },
      { id: 'new-only', kind: 'shorts', title: 'New', publishedAt: '2026-09-05T00:00:00Z', viewCount: 80, commentCount: 8, link: 'new-only-link' }
    ]
  }
);
const keep = merged.items.find(item => item.id === 'keep');
assert.equal(keep.viewCount, 140, 'fresh finite view count should win');
assert.equal(keep.commentCount, 12, 'previous finite comment count should survive a temporary missing fresh value');
assert.equal(keep.title, 'New title');
assert.ok(merged.items.some(item => item.id === 'previous-only'), 'last-known items should remain when a refresh misses them');
assert.ok(merged.items.some(item => item.id === 'new-only'));
assert.equal(merged.itemCount, merged.items.length);

console.log('YouTube engagement ranking regression test passed');