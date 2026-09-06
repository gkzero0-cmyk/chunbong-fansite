import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contentApi = require('../api/content.js');
const productionSmoke = fs.readFileSync(new URL('../.github/workflows/soop-dashboard-production-smoke.yml', import.meta.url), 'utf8');

const payload = {
  capturedAt: '2026-09-06T00:00:00.000Z',
  soop: {
    overview: { fanclubCount: null, fanclubDelta: null },
    daily: [{
      date: '2026-09-05', streamCount: 1, durationMinutes: 950, cumulativeMinutes: 234122,
      averageViewers: 59, maxViewers: 87, followerDelta: -1, fanclubCount: null, fanclubDelta: null
    }],
    monthlyStats: [{
      month: '2026-09', activeDays: 5, streamCount: 6, durationMinutes: 2450, cumulativeMinutes: 234122,
      averageStreamMinutes: 408, averageViewers: 50, maxViewers: 87,
      followerDelta: 4, fanclubCount: null, fanclubDelta: null, categories: []
    }],
    calendar: [], categories: [], categoryPeriods: { recentThreeMonths: [] }, recentSessions: []
  },
  youtube: {}
};

const compacted = contentApi.compactDataPayload(payload, {
  now: new Date('2026-09-06T00:00:00.000Z'),
  youtubeEngagementCache: { capturedAt: '', source: '', itemCount: 0, items: [] },
  soopMetricHistory: { points: [
    { date: '2026-09-03', fanclubCount: 7590, source: 'trackify', confidence: 1 },
    { date: '2026-09-04', fanclubCount: 7599, source: 'trackify', confidence: 1 },
    { date: '2026-09-05', fanclubCount: 7606, source: 'trackify', confidence: 1 }
  ] }
});

assert.equal(compacted.soop.daily[0].fanclubCount, 7606, 'daily fanclub absolute count must be enriched from exact public history');
assert.equal(compacted.soop.daily[0].fanclubDelta, 7, 'daily fanclub delta must use consecutive exact public observations');
assert.equal(compacted.soop.daily[0].cumulativeMinutes, 234122, 'daily cumulative airtime must survive API compaction');
assert.equal(compacted.soop.monthlyStats[0].fanclubCount, 7606, 'monthly fanclub count must use latest exact value in the month');
assert.equal(compacted.soop.monthlyStats[0].fanclubDelta, 16, 'monthly fanclub delta must use first/last exact monthly values');
assert.equal(compacted.soop.monthlyStats[0].cumulativeMinutes, 234122, 'monthly cumulative airtime must survive API compaction');
assert.equal(compacted.soop.overview.fanclubCount, 7606, 'overview fanclub count should align with latest exact public history');
assert.equal(compacted.soop.overview.fanclubDelta, 16, 'overview monthly fanclub delta should align with exact monthly history');
assert.ok(productionSmoke.includes("- 'api/content.js'"), 'API compaction changes must trigger the production SOOP smoke workflow');

console.log('SOOP content compaction regression test passed');
