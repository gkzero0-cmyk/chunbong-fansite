import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractExternalSoopStatsFromHtml, mergeSoopMetricSources } = require('../lib/soop-external.js');

const html = `
<html><body>
춘봉 ID chunbongtv · 가입 2019년 05월 · 즐겨찾기 29,783 · 구독 37
9월 방송 요약
9월 별풍선 12,345 이번달 별풍선 12,345 개
시급 (별/시간) 610
방송 시간 20시간 20분
최고 시청자 96
평균 시청자 45
누적 유저 1,234
뷰어십 (평균×시간) 915시간
후원자 31 이번달 후원자 31
채팅 수 8,765
강퇴 2건
채금 3건
히스토리 요약 (누적) · 기간 무관
방송국 개설일 2019년 5월
최근 방송일 2026년 9월 4일
즐겨찾기 29,783
구독자 37
누적 유저 456,789
누적 UP수 88,765
누적 방송 시간 1년 42일 3시간 20분
팬클럽 2,345
서포터 67
카테고리 순위
버추얼 121위 ▲3
애청자 증가수 511위 ▲12
UP 수 777위 ▼4
카테고리 분포
총 방송시간 20시간 20분
버추얼 75%
종합게임 25%
후원자 상위 50 · 9월 별풍선 기준
1 테스트후원자 donor123 999999
</body></html>`;

const stats = extractExternalSoopStatsFromHtml(html, 'trackify');
assert.equal(stats.followerCount, 29783);
assert.equal(stats.subscriberCount, 37);
assert.equal(stats.airtimeMinutes, 1220);
assert.equal(stats.maxViewers, 96);
assert.equal(stats.averageViewers, 45);
assert.equal(stats.monthUniqueViewers, 1234);
assert.equal(stats.viewershipHours, 915);
assert.equal(stats.monthlyStarCount, 12345);
assert.equal(stats.starsPerHour, 610);
assert.equal(stats.monthlySupporterCount, 31);
assert.equal(stats.monthlyChatCount, 8765);
assert.equal(stats.monthlyKickCount, 2);
assert.equal(stats.monthlyMuteCount, 3);
assert.equal(stats.stationOpenedAt, '2019년 5월');
assert.equal(stats.latestBroadcastDate, '2026년 9월 4일');
assert.equal(stats.cumulativeUsers, 456789);
assert.equal(stats.cumulativeUpCount, 88765);
assert.equal(stats.totalAirtimeMinutes, 586280);
assert.equal(stats.fanclubCount, 2345);
assert.equal(stats.supporterCount, 67);
assert.deepEqual(stats.categories, [
  { name: '버추얼', sharePercent: 75 },
  { name: '종합게임', sharePercent: 25 }
]);
assert.deepEqual(stats.categoryRankings, [
  { name: '버추얼', rank: 121, change: 3 },
  { name: '애청자 증가수', rank: 511, change: 12 },
  { name: 'UP 수', rank: 777, change: -4 }
]);
assert.equal(Object.prototype.hasOwnProperty.call(stats, 'donorRanking'), false, 'donor ranking must stay excluded');

const merged = mergeSoopMetricSources(
  { viewerCount: 50, followerCount: 30000, fanclubCount: null },
  { followerCount: 29990, fanclubCount: null },
  { ...stats, fieldSources: Object.fromEntries(Object.keys(stats).map(key => [key, 'trackify'])) }
);
assert.equal(merged.followerCount, 30000, 'SOOP official follower count wins over Trackify');
assert.equal(merged.subscriberCount, 37);
assert.equal(merged.monthlyStarCount, 12345);
assert.equal(merged.monthlyChatCount, 8765);
assert.equal(merged.fieldSources.monthlyStarCount, 'trackify');

console.log('Trackify summary regression test passed');
