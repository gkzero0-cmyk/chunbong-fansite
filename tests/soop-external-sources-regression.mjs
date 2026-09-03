import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dataApi = require('../lib/chunbong-data.js');

const auro = dataApi.extractExternalSoopStatsFromHtml(`
  <main>
    <h1>춘봉_</h1>
    <div>LIVE 48명</div>
    <div>팔로워 수 1,345 명</div>
    <div>평균 시청자 수 52명</div>
    <div>최고 시청자 수 408명</div>
    <div>최소 시청자 수 17명</div>
    <div>방송 시간 13h 15m</div>
  </main>
`, 'auro');
assert.equal(auro.currentViewerCount, 48);
assert.equal(auro.followerCount, 1345);
assert.equal(auro.averageViewers, 52);
assert.equal(auro.maxViewers, 408);
assert.equal(auro.minViewers, 17);
assert.equal(auro.airtimeMinutes, 795);
assert.equal(auro.source, 'auro');

const softc = dataApi.extractExternalSoopStatsFromHtml(`
  Average Viewers 61 Peak Viewers 512 Airtime 8h 40m Followers 1,402
`, 'softc');
assert.equal(softc.averageViewers, 61);
assert.equal(softc.maxViewers, 512);
assert.equal(softc.airtimeMinutes, 520);
assert.equal(softc.followerCount, 1402);

const measured = [
  { id: 'm1', date: '2026-09-03', startedAt: '2026-09-03T10:00:00Z', durationMinutes: 100, measurement: 'fan-site-sampled-5m' }
];
const external = [
  { id: 'e1', date: '2026-09-01', startedAt: '2026-09-01T10:00:00Z', durationMinutes: 200, measurement: 'external-public-record' },
  { id: 'e2', date: '2026-09-03', startedAt: '2026-09-03T05:00:00Z', durationMinutes: 300, measurement: 'external-public-record' }
];
const merged = dataApi.mergeExternalSessions(measured, external, '2026-09-03');
assert.deepEqual(merged.map(item => item.id), ['e1', 'm1'], 'external history must stop before measurement cutoff');

const chosen = dataApi.mergeSoopMetricSources(
  { followerCount: null, fanclubCount: null, viewerCount: null },
  { followerCount: null, fanclubCount: 9 },
  { followerCount: 1402, currentViewerCount: 48, averageViewers: 61, maxViewers: 512, source: 'softc' }
);
assert.equal(chosen.followerCount, 1402);
assert.equal(chosen.fanclubCount, 9);
assert.equal(chosen.viewerCount, 48);
assert.equal(chosen.fieldSources.followerCount, 'softc');
assert.equal(chosen.fieldSources.fanclubCount, 'soop');

console.log('SOOP external sources regression test passed');
