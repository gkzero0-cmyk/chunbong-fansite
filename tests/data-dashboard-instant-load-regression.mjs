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
    categories: [],
    measurement: 'trackify-public-api',
    source: `https://www.trackify.kr/soop/broadcast/${id}`
  };
});

const payload = await dataApi.fetchChunbongData({
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

const currentFallback = payload?.soop?.externalHistory?.currentFallback || {};
assert.ok(Array.isArray(currentFallback.sessions), 'public payload should keep a small compatibility sample for production smoke checks');
assert.ok(currentFallback.sessions.length <= 12, 'public dashboard payload must not duplicate the full Trackify session history');
assert.equal(currentFallback.trackifySessionCount, 20, 'public payload should retain the full Trackify history count without sending every raw session');
assert.ok(payload.soop.daily.length >= 1, 'aggregated daily history must remain available after raw sessions are trimmed');
assert.ok(payload.soop.calendar.length >= 1, 'aggregated calendar history must remain available after raw sessions are trimmed');
assert.ok(payload.soop.recentSessions.length >= 1, 'recent session cards must remain available after raw sessions are trimmed');

for (const marker of [
  "const CACHE_KEY = 'chunbong-data-dashboard-v1'",
  'localStorage.getItem(CACHE_KEY)',
  'localStorage.setItem(CACHE_KEY',
  'pendingFreshPayload',
  'initialCacheServed'
]) {
  assert.ok(clientJs.includes(marker), `dashboard client should include instant-load cache marker: ${marker}`);
}

console.log('Data dashboard instant-load regression test passed');
