import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const external = require('../lib/soop-external.js');
const analytics = require('../lib/soop-analytics.js');

const profileHtml = `
  <a href="/soop/broadcast/296564693">방송 기록 1</a>
  <a href="https://www.trackify.kr/soop/broadcast/296337213">방송 기록 2</a>
  <a href="/soop/chunbongtv?tab=broadcasts&page=2">다음</a>
`;

assert.deepEqual(
  external.extractTrackifyBroadcastLinks(profileHtml),
  [
    'https://www.trackify.kr/soop/broadcast/296564693',
    'https://www.trackify.kr/soop/broadcast/296337213'
  ],
  'Trackify profile links must resolve to unique broadcast detail URLs'
);

const detailHtml = `
  <main>
    <div>춘봉_ chunbongtv</div>
    <div>방송번호 296564693</div>
    <h1>테스트 방송</h1>
    <div>2026-08-23 00:18:51~2026-08-23 10:07:28 · 9시간 48분</div>
    <div>최고 동접 14</div>
    <div>평균 시청자 11</div>
    <div>고유 시청자 15명</div>
    <div>정산 별풍선 133 개</div>
    <div>후원자 2명</div>
    <div>채팅 349건</div>
    <h2>카테고리 타임라인</h2>
    <div>PUBG: 배틀그라운드 00:49 1시간 14분</div>
    <div>종합게임 02:03 7시간 17분</div>
    <div>버추얼 09:20 47분</div>
    <h2>방송 추이 (5분 단위)</h2>
  </main>
`;

const session = external.extractTrackifyBroadcastSession(detailHtml, 'https://www.trackify.kr/soop/broadcast/296564693');
assert.equal(session.id, 'trackify-296564693');
assert.equal(session.date, '2026-08-23');
assert.equal(session.startedAt, '2026-08-23T00:18:51+09:00');
assert.equal(session.endedAt, '2026-08-23T10:07:28+09:00');
assert.equal(session.durationMinutes, 588);
assert.equal(session.averageViewers, 11);
assert.equal(session.maxViewers, 14);
assert.equal(session.uniqueViewers, 15);
assert.equal(session.starCount, 133);
assert.equal(session.supporterCount, 2);
assert.equal(session.chatCount, 349);
assert.equal(session.measurement, 'trackify-public-record');
assert.deepEqual(
  session.categories.map(item => [item.name, item.minutes]),
  [
    ['PUBG: 배틀그라운드', 74],
    ['종합게임', 437],
    ['버추얼', 47]
  ]
);

const second = external.extractTrackifyBroadcastSession(`
  <div>방송번호 296337213</div>
  <div>2026-08-13 22:42:12~2026-08-14 04:04:37 · 5시간 22분</div>
  <div>최고 동접 35</div><div>평균 시청자 31</div><div>고유 시청자 41명</div>
  <div>정산 별풍선 233 개</div><div>후원자 3명</div><div>채팅 1,376건</div>
`, 'https://www.trackify.kr/soop/broadcast/296337213');

const daily = analytics.aggregateDaily([second, session], []);
assert.equal(daily.length, 2, 'Trackify sessions must populate daily history');
assert.equal(daily.find(row => row.date === '2026-08-23')?.durationMinutes, 588);
assert.equal(daily.find(row => row.date === '2026-08-23')?.averageViewers, 11);
assert.equal(daily.find(row => row.date === '2026-08-23')?.maxViewers, 14);

const monthly = analytics.aggregateMonthly([second, session], []);
assert.equal(monthly.length, 1, 'Trackify sessions in the same month must populate monthly history');
assert.equal(monthly[0].month, '2026-08');
assert.equal(monthly[0].streamCount, 2);
assert.equal(monthly[0].durationMinutes, 910);
assert.equal(monthly[0].maxViewers, 35);

console.log('Trackify history regression test passed');
