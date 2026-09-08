import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const scheduleHtml = fs.readFileSync(new URL('../schedule.html', import.meta.url), 'utf8');
const liveFixes = fs.readFileSync(new URL('../live-fixes.js', import.meta.url), 'utf8');

assert.match(scheduleHtml, /id="schedule-view-upcoming"/, 'schedule page must expose the default upcoming view');
assert.match(scheduleHtml, /id="schedule-view-previous"/, 'schedule page must expose a previous-week view');
assert.match(scheduleHtml, /id="schedule-view-calendar"/, 'schedule page must expose a full calendar view');
assert.match(scheduleHtml, /id="schedule-calendar"/, 'schedule page must contain the monthly calendar surface');
assert.match(scheduleHtml, /id="schedule-previous-older"/, 'previous schedule view must support moving to an older week');
assert.match(scheduleHtml, /id="schedule-previous-newer"/, 'previous schedule view must support moving back toward the latest previous week');

const context = {
  window: {},
  document: {
    body: { dataset: { page: 'test' } },
    readyState: 'complete',
    querySelector: () => null,
    addEventListener: () => {}
  },
  fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  Intl,
  Date,
  console
};
vm.runInNewContext(liveFixes, context, { filename: 'live-fixes.js' });
const helpers = context.window.__CHUNBONG_SCHEDULE_HELPERS__;
assert.ok(helpers, 'schedule runtime must expose pure schedule view helpers for regression coverage');

const sampleItems = [
  { title: 'older', start: '2026-09-01', end: '' },
  { title: 'last-week', start: '2026-09-03', end: '' },
  { title: 'yesterday', start: '2026-09-08', end: '' },
  { title: 'today', start: '2026-09-09', end: '' },
  { title: 'future', start: '2026-09-10', end: '' }
];
const titles = items => Array.from(items, item => item.title);
assert.deepEqual(
  titles(helpers.upcomingItems(sampleItems, '2026-09-09')),
  ['today', 'future'],
  'default schedule view must start at today and contain only today/future items'
);
assert.deepEqual(
  titles(helpers.previousWeekItems(sampleItems, '2026-09-09', 1)),
  ['last-week', 'yesterday'],
  'previous schedule view must show the immediately preceding seven days'
);
assert.deepEqual(
  titles(helpers.previousWeekItems(sampleItems, '2026-09-09', 2)),
  ['older'],
  'older previous-week navigation must move backward by another seven-day window'
);

const { buildSoopAnalytics } = require('../lib/soop-analytics.js');
const sessions = [{
  id: 'session-1',
  date: '2026-09-09',
  startedAt: '2026-09-08T16:00:00.000Z',
  endedAt: '2026-09-08T17:00:00.000Z',
  durationMinutes: 60,
  averageViewers: 55,
  maxViewers: 106,
  viewerSampleCount: 12,
  followerDelta: null,
  fanclubDelta: null,
  title: '최근 방송',
  categories: [],
  measurement: 'fan-site-sampled-5m'
}];
const snapshots = [
  { date: '2026-09-08', capturedAt: '2026-09-08T14:00:00.000Z', soop: { followerCount: 29778, fanclubCount: 7615 } },
  { date: '2026-09-09', capturedAt: '2026-09-09T14:00:00.000Z', soop: { followerCount: 29790, fanclubCount: 7621 } }
];
const analytics = buildSoopAnalytics(sessions, snapshots, {}, new Date('2026-09-09T18:00:00.000Z'), { followerHistory: [] });
const recent = analytics.recentSessions[0];
assert.equal(recent.followerCount, 29790, 'recent session must inherit the follower count for its broadcast date');
assert.equal(recent.followerDelta, 12, 'recent session must inherit the follower delta for its broadcast date');
assert.equal(recent.fanclubCount, 7621, 'recent session must inherit the fanclub count for its broadcast date');
assert.equal(recent.fanclubDelta, 6, 'recent session must inherit the fanclub delta for its broadcast date');

console.log('schedule navigation and recent session metrics regression test passed');
