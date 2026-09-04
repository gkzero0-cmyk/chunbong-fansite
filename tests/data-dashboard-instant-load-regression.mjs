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

const externalSession = {
  id: 'trackify-1',
  broadcastId: '1',
  date: '2026-09-04',
  startedAt: '2026-09-04T10:00:00+09:00',
  endedAt: '2026-09-04T11:00:00+09:00',
  durationMinutes: 60,
  averageViewers: 42,
  maxViewers: 60,
  viewerSampleCount: 12,
  categories: [],
  measurement: 'trackify-public-api',
  source: 'https://www.trackify.kr/soop/broadcast/1'
};

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
    sessions: [externalSession],
    averageViewers: 42,
    maxViewers: 60,
    airtimeMinutes: 60
  }),
  fetchYoutubeChannel: async () => ({ subscriberCount: 1, viewCount: 2, videoCount: 3, source: 'test-youtube' }),
  readSnapshots: () => ({ version: 1, snapshots: [] }),
  readSessions: () => ({ version: 1, sessions: [] }),
  readExternalHistory: () => ({ version: 1, cutoffKst: '', sessions: [externalSession], sourceSummary: null, categoryReference: null }),
  now: new Date('2026-09-04T03:00:00Z')
});

const currentFallback = payload?.soop?.externalHistory?.currentFallback || {};
assert.equal(Object.prototype.hasOwnProperty.call(currentFallback, 'sessions'), false, 'public dashboard payload must not duplicate raw Trackify session history');
assert.equal(currentFallback.trackifySessionCount, 1, 'public payload should retain the Trackify history count without raw sessions');
assert.equal(payload.soop.daily.length, 1, 'aggregated daily history must remain available after raw sessions are trimmed');
assert.equal(payload.soop.calendar.length, 1, 'aggregated calendar history must remain available after raw sessions are trimmed');
assert.equal(payload.soop.recentSessions.length, 1, 'recent session cards must remain available after raw sessions are trimmed');

for (const marker of [
  "const CACHE_KEY = 'chunbong-data-dashboard-v1'",
  'function restoreCachedPayload()',
  'localStorage.getItem(CACHE_KEY)',
  'localStorage.setItem(CACHE_KEY',
  'restoreCachedPayload();'
]) {
  assert.ok(dataJs.includes(marker), `data.js should include instant-load cache marker: ${marker}`);
}
assert.ok(dataJs.indexOf('restoreCachedPayload();') < dataJs.lastIndexOf('refresh();'), 'cached dashboard data must render before the network refresh starts');

console.log('Data dashboard instant-load regression test passed');
