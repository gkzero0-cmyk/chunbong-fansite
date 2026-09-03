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

const trackify = dataApi.extractExternalSoopStatsFromHtml(`
  춘봉 ID chunbongtv · 즐겨찾기 1,456 · 구독 17
  9월 방송 요약 방송 시간 42시간 30분 최고 시청자 188 평균 시청자 61 누적 유저 9,876 뷰어십 2,592시간
  히스토리 요약 최근 방송일 2026년 9월 3일 즐겨찾기 1,456 구독자 17 누적 유저 222,333 누적 UP수 55,444 누적 방송 시간 1년 23일 4시간 5분 팬클럽 1,234 서포터 9
  카테고리 분포 총 방송시간 42시간 30분 Virtual 50% Minecraft 30% PUBG: 배틀그라운드 20% 후원자 상위 50
`, 'trackify');
assert.equal(trackify.followerCount, 1456);
assert.equal(trackify.subscriberCount, 17);
assert.equal(trackify.averageViewers, 61);
assert.equal(trackify.maxViewers, 188);
assert.equal(trackify.airtimeMinutes, 2550);
assert.equal(trackify.monthUniqueViewers, 9876);
assert.equal(trackify.viewershipHours, 2592);
assert.equal(trackify.cumulativeUsers, 222333);
assert.equal(trackify.cumulativeUpCount, 55444);
assert.equal(trackify.totalAirtimeMinutes, 558965);
assert.equal(trackify.fanclubCount, 1234);
assert.equal(trackify.supporterCount, 9);
assert.deepEqual(trackify.categories.map(item => [item.name, item.sharePercent]), [['Virtual', 50], ['Minecraft', 30], ['PUBG: 배틀그라운드', 20]]);

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
  { followerCount: null, fanclubCount: null },
  { followerCount: 1402, fanclubCount: 9, currentViewerCount: 48, averageViewers: 61, maxViewers: 512, subscriberCount: 17, cumulativeUpCount: 55444, source: 'trackify' }
);
assert.equal(chosen.followerCount, 1402);
assert.equal(chosen.fanclubCount, 9);
assert.equal(chosen.viewerCount, 48);
assert.equal(chosen.subscriberCount, 17);
assert.equal(chosen.cumulativeUpCount, 55444);
assert.equal(chosen.fieldSources.followerCount, 'trackify');
assert.equal(chosen.fieldSources.fanclubCount, 'trackify');

console.log('SOOP external sources regression test passed');
