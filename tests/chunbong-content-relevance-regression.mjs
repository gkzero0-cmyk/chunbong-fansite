import assert from 'node:assert/strict';
import autoIngest from '../lib/chunbong-content-auto-ingest.js';

const rows=[
  {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존','그냥서버 적자생존'],
    series:{id:'justserver',title:'그냥서버'},startDate:'2026-09-30',endDate:'2026-10-21'
  },
  {
    id:'justserver-moneygame',title:'그냥서버 : 머니게임',aliases:['머니게임','그냥서버 머니게임'],
    series:{id:'justserver',title:'그냥서버'},startDate:'2026-06-24',endDate:'2026-07-15'
  }
];

const genericSetup={type:'post',title:'휴방공지',searchText:'오늘은 그냥서버 세팅중 준비중이라 휴방합니다',date:'2026-10-01'};
assert.equal(autoIngest.matchArchiveItem(genericSetup,rows),null,'generic justserver/setup wording must not auto-attach a post');

const unrelatedThanks={type:'post',title:'마병대4 1차합격 감사합니다.',searchText:'그냥서버 준비중이라 방송 세팅 후 다시 오겠습니다',date:'2026-10-01'};
assert.equal(autoIngest.matchArchiveItem(unrelatedThanks,rows),null,'unrelated thank-you posts must not attach from generic server wording');

const negativeTitleBodyMention={type:'post',title:'휴방공지',searchText:'적자생존 서버 세팅중 준비중',date:'2026-10-01'};
assert.equal(autoIngest.matchArchiveItem(negativeTitleBodyMention,rows),null,'negative operational titles must not attach from a body-only content mention');

const specificRecruit={type:'post',title:'[모집] 그냥서버:적자생존 2차입주 모집공지',searchText:'추가 입주 안내',date:'2026-10-01'};
const matched=autoIngest.matchArchiveItem(specificRecruit,rows);
assert.equal(matched?.itemId,'justserver-survival','specific content title should still auto-attach');
assert.ok(Number(matched?.score||0)>=7,'specific title match should retain a strong score');

console.log('chunbong content relevance regression passed');
