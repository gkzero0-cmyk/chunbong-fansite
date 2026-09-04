import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const trackifyCacheFixture = require('../data/trackify-soop-cache.json');
trackifyCacheFixture.stats = null;
trackifyCacheFixture.sessions = [];
const dataApi = require('../lib/chunbong-data.js');
const contentApi = require('../api/content.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const enhancementsJs = fs.readFileSync(path.join(root, 'data-enhancements.js'), 'utf8');
const clientJs = `${enhancementsJs}\n${dataJs}`;

const externalSessions = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1);
  return {
    id: `trackify-${id}`,
    broadcastId: id,
    date: '2026-09-04',
    startedAt: `2026-09-04T${String(index % 20).padStart(2, '0')}:00:00+09:00`,
    endedAt: `2026-09-04T${String((index + 1) % 20).padStart(2, '0')}:00:00+09:00`,
    durationMinutes: 60,
    averageViewers: 42,
    maxViewers: 60,
    viewerSampleCount: 12,
    followerDelta: index % 2,
    fanclubDelta: index % 3 === 0 ? 1 : 0,
    title: `춘봉 방송 ${id}`,
    categories: [{ name: 'Virtual', minutes: 60, averageViewers: 42, maxViewers: 60, sampleCount: 12 }],
    measurement: 'trackify-public-api',
    source: `https://www.trackify.kr/soop/broadcast/${id}`
  };
});

const rawPayload = await dataApi.fetchChunbongData({
  fetchVod: async () => [],
  fetchClips: async () => ({ catch: [], clip: [], items: [] }),
  fetchYoutube: async () => ({ videos: [], shorts: [], items: [] }),
  fetchLive: async () => ({ live: false, title: '', startedAt: '', viewerCount: null, categoryName: '', source: 'test-live' }),
  fetchSoopProfile: async () => ({ followerCount: 100, fanclubCount: 10, source: 'test-profile' }),
  fetchExternalSoop: async () => ({
    source: 'trackify',
    fieldSources: { averageViewers: 'trackify' },
    sources: [{ source: 'trackify', url: 'https://www.trackify.kr/soop/chunbongtv' }],
    sessions: externalSessions,
    averageViewers: 42,
    maxViewers: 60,
    airtimeMinutes: 60
  }),
  fetchYoutubeChannel: async () => ({ subscriberCount: 1, viewCount: 2, videoCount: 3, source: 'test-youtube' }),
  readSnapshots: () => ({ version: 1, snapshots: [] }),
  readSessions: () => ({ version: 1, sessions: [] }),
  readExternalHistory: () => ({ version: 1, cutoffKst: '', sessions: externalSessions, sourceSummary: null, categoryReference: null }),
  now: new Date('2026-09-04T03:00:00Z')
});

const payload = contentApi.compactDataPayload(rawPayload);
const currentFallback = payload?.soop?.externalHistory?.currentFallback || {};
assert.ok(Array.isArray(currentFallback.sessions), 'public payload should keep a small compatibility sample for production smoke checks');
assert.ok(currentFallback.sessions.length <= 12, 'public dashboard payload must not duplicate the full Trackify session history');
assert.equal(currentFallback.trackifySessionCount, 20, 'public payload should retain the full Trackify history count without sending every raw session');
assert.deepEqual(Object.keys(currentFallback.sessions[0] || {}).sort(), ['id', 'measurement'], 'Trackify compatibility samples should contain only smoke-test identity fields');

assert.ok(payload.soop.daily.length >= 1, 'aggregated daily history must remain available');
assert.equal(Object.prototype.hasOwnProperty.call(payload.soop.daily[0], 'sessions'), false, 'daily chart rows must not duplicate raw session records');
assert.equal(Object.prototype.hasOwnProperty.call(payload.soop.daily[0], 'categories'), false, 'daily chart rows must not duplicate category details');

assert.ok(payload.soop.calendar.length >= 1, 'aggregated calendar history must remain available');
assert.equal(Object.prototype.hasOwnProperty.call(payload.soop.calendar[0], 'categories'), false, 'calendar rows should omit unused category aggregates');
assert.deepEqual(
  Object.keys(payload.soop.calendar[0]?.sessions?.[0] || {}).sort(),
  ['averageViewers', 'durationMinutes', 'maxViewers', 'title'],
  'calendar session detail should contain only fields rendered by the calendar UI'
);

assert.ok(payload.soop.recentSessions.length >= 1, 'recent session cards must remain available');
assert.deepEqual(
  Object.keys(payload.soop.recentSessions[0] || {}).sort(),
  ['averageViewers', 'date', 'durationMinutes', 'fanclubDelta', 'followerDelta', 'maxViewers', 'measurement', 'title'],
  'recent session cards should contain only fields rendered by the UI'
);

for (const marker of [
  "const CACHE_KEY = 'chunbong-data-dashboard-v1'",
  'localStorage.getItem(CACHE_KEY)',
  'localStorage.setItem(CACHE_KEY',
  'pendingFreshPayload',
  'initialCacheServed',
  'function cacheablePayload(payload)',
  'payload.fallback !== true'
]) {
  assert.ok(clientJs.includes(marker), `dashboard client should include instant-load cache marker: ${marker}`);
}

console.log('Data dashboard instant-load regression test passed');
