import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const analytics = require('../lib/soop-analytics.js');
const root = new URL('../', import.meta.url);
const core = fs.readFileSync(new URL('data-core.js', root), 'utf8');
const periods = fs.readFileSync(new URL('data-soop-periods-v2.js', root), 'utf8');
const enhancements = fs.readFileSync(new URL('data-enhancements.js', root), 'utf8');

const sessions = [
  {
    id: 'aug-stream', date: '2026-08-31', startedAt: '2026-08-31T10:00:00+09:00', endedAt: '2026-08-31T11:00:00+09:00',
    durationMinutes: 60, averageViewers: 40, maxViewers: 60, viewerSampleCount: 12,
    measurement: 'trackify-public-api', categories: []
  },
  {
    id: 'sep-stream', date: '2026-09-01', startedAt: '2026-09-01T10:00:00+09:00', endedAt: '2026-09-01T11:00:00+09:00',
    durationMinutes: 60, averageViewers: 45, maxViewers: 59, viewerSampleCount: 12,
    measurement: 'trackify-public-api', categories: []
  },
  {
    id: 'unknown-viewers', date: '2026-09-02', startedAt: '2026-09-02T10:00:00+09:00', endedAt: '2026-09-02T11:00:00+09:00',
    durationMinutes: 60, averageViewers: 0, maxViewers: 0, viewerSampleCount: 12,
    measurement: 'trackify-public-api', categories: []
  }
];

const snapshots = [
  { date: '2026-08-31', capturedAt: '2026-08-31T15:00:00.000Z', soop: { followerCount: 29793, fanclubCount: 7591 } },
  { date: '2026-09-01', capturedAt: '2026-09-01T15:00:00.000Z', soop: { followerCount: 29769, fanclubCount: 7595 } },
  { date: '2026-09-02', capturedAt: '2026-09-02T15:00:00.000Z', soop: { followerCount: 29775, fanclubCount: 7596 } },
  { date: '2026-09-07', capturedAt: '2026-09-07T06:31:02.478Z', soop: { followerCount: 29794, fanclubCount: 7615 } }
];

const result = analytics.buildSoopAnalytics(
  sessions,
  snapshots,
  { live: false, followerCount: 29811, fanclubCount: 7615 },
  new Date('2026-09-07T07:00:00.000Z')
);

const sep1 = result.daily.find(row => row.date === '2026-09-01');
assert.equal(sep1?.followerCount, 29769, 'daily rows must expose the exact favorite count, not only its delta');
assert.equal(sep1?.followerDelta, -24, 'daily favorite delta must compare with the previous public snapshot');
assert.equal(sep1?.fanclubCount, 7595);
assert.equal(sep1?.fanclubDelta, 4);

const september = result.monthly.find(row => row.month === '2026-09');
assert.equal(september?.followerCount, 29811, 'current month favorite count should use the freshest same-day public metric');
assert.equal(september?.followerDelta, 18, 'monthly favorite delta must compare the latest month value with the previous month boundary');
assert.equal(september?.fanclubCount, 7615);
assert.equal(september?.fanclubDelta, 24, 'monthly fanclub delta must compare against the previous month-end count');

const sep2 = result.daily.find(row => row.date === '2026-09-02');
assert.equal(sep2?.averageViewers, null, 'Trackify 0/0 legacy viewer placeholders must be treated as unavailable');
assert.equal(sep2?.maxViewers, null, 'Trackify 0/0 legacy viewer placeholders must not draw a false zero line');

assert.ok(!core.includes("kpi('이번 달 후원자'"), 'the unsupported monthly supporter KPI must be removed');
assert.ok(core.includes('countDeltaText(row.followerCount,row.followerDelta)'), 'calendar favorite value must render count and delta together');
assert.ok(core.includes('countDeltaText(row.fanclubCount,row.fanclubDelta)'), 'calendar fanclub value must render count and delta together');
assert.ok(core.includes('chunbong-data:render'), 'core renderer must hand fresh payloads to the period renderer instead of racing it');

for (const marker of ['monthlyMonth', 'data-month-month-select', 'followerCombinedChart', 'chunbong-data:render']) {
  assert.ok(periods.includes(marker), `period renderer must include ${marker}`);
}
assert.ok(periods.includes("value=\"all\""), 'monthly period selector must include an all-months option');
assert.ok(periods.includes('countDeltaText(row.followerCount,row.followerDelta)'), 'detail favorite values must show count plus delta');
assert.ok(!enhancements.includes("'이번 달 후원자'"), 'presentation filters must not carry the removed monthly supporter KPI');

console.log('Chunbong data consistency fix regression test passed');
