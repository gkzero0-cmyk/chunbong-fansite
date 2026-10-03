import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ingest=require('../lib/chunbong-content-auto-ingest.js');

const rows=[
  {id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-09-30',endDate:'2026-10-21'},
  {id:'justserver-moneygame',title:'그냥서버 : 머니게임',aliases:['머니게임'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-06-24',endDate:'2026-07-15'},
  {id:'other-ma4',title:'마병대4',aliases:['마병대'],series:{id:'other'},startDate:'2026-09-01',endDate:'2026-09-25'}
];

for(const material of [
  {title:'휴방공지',searchText:'오늘은 그냥서버 세팅중 준비중이라 휴방합니다',date:'2026-10-01'},
  {title:'마병대4 1차합격 감사합니다.',searchText:'그냥서버 준비중 이야기도 잠깐 했습니다',date:'2026-10-02'},
  {title:'오늘 방송 공지',searchText:'서버 준비중 세팅중',date:'2026-10-03'}
]) assert.equal(ingest.matchArchiveItem(material,rows),null,'generic JustServer/window words must never qualify an unrelated material');

assert.equal(ingest.matchArchiveItem({title:'그냥서버 적자생존 2차입주 모집공지',searchText:'적자생존 2차 입주 모집',date:'2026-10-01'},rows)?.itemId,'justserver-survival');
assert.equal(ingest.matchArchiveItem({title:'머니게임 참가 공지',searchText:'머니게임 입주 안내',date:'2026-07-01'},rows)?.itemId,'justserver-moneygame');

console.log('content auto-ingest relevance regression passed');
