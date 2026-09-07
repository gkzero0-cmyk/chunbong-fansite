import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const analytics = require('../lib/soop-analytics.js');
const followerHistory = require('../data/soop-follower-history.json');
const trackifyCache = require('../data/trackify-soop-cache.json');

const sessions = Array.isArray(trackifyCache?.sessions) ? trackifyCache.sessions : [];
const points = Array.isArray(followerHistory?.points) ? followerHistory.points : [];
assert.ok(sessions.length > 100, 'Trackify broadcast history should remain populated');
assert.ok(points.length > 100, 'favorite/fanclub history should remain populated');

const ids = sessions.map(row => String(row?.broadcastId || row?.id || '')).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'broadcast history must not contain duplicate broadcast ids');
assert.ok(sessions.every(row => Number.isFinite(row?.durationMinutes) && row.durationMinutes >= 0), 'broadcast durations must be finite and non-negative');

const latestPoint = points.at(-1);
assert.equal(latestPoint?.date, '2026-09-07');
assert.equal(latestPoint?.fanclubCount, 7615);
assert.equal(trackifyCache?.stats?.fanclubCount, 7615);
assert.equal(trackifyCache?.stats?.followerCount, 29811);

const now = new Date(trackifyCache.capturedAt || '2026-09-07T06:31:01.865Z');
const result = analytics.buildSoopAnalytics(
  sessions,
  [],
  {
    live: false,
    followerCount: trackifyCache?.stats?.followerCount,
    fanclubCount: trackifyCache?.stats?.fanclubCount
  },
  now,
  { followerHistory: points }
);

const september = result.monthly.find(row => row.month === '2026-09');
assert.ok(september, 'September 2026 monthly aggregate must exist');
assert.equal(september.followerCount, 29811, 'current favorite count must use the freshest public Trackify value');
assert.equal(september.followerDelta, 18, 'September favorite delta must compare with 2026-08-31');
assert.equal(september.fanclubCount, 7615);
assert.equal(september.fanclubDelta, 24, 'September fanclub delta must compare 7615 with the 7591 month-end baseline');

const sep1 = result.daily.find(row => row.date === '2026-09-01');
assert.equal(sep1?.followerCount, 29769);
assert.equal(sep1?.followerDelta, -24);
assert.equal(sep1?.fanclubCount, 7595);
assert.equal(sep1?.fanclubDelta, 4);

const sep6 = result.calendar.find(row => row.date === '2026-09-06');
assert.equal(sep6?.followerCount, 29810);
assert.equal(sep6?.fanclubCount, 7612);
assert.equal(sep6?.fanclubDelta, 6);

assert.ok(!result.daily.some(row => row.averageViewers === 0 && row.maxViewers === 0), 'legacy Trackify 0/0 viewer placeholders must not survive into dashboard aggregates');
assert.ok(result.daily.every((row, index, rows) => index === 0 || row.date >= rows[index - 1].date), 'daily dashboard rows must be chronological');
assert.ok(result.monthly.every((row, index, rows) => index === 0 || row.month >= rows[index - 1].month), 'monthly dashboard rows must be chronological');

console.log('Current Chunbong data audit regression test passed');
