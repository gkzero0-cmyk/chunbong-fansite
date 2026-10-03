const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {matchArchiveItem}=require('../lib/chunbong-content-auto-ingest');

const survival={
  id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],
  series:{id:'justserver',title:'그냥서버'},startDate:'2026-09-30',endDate:'2026-10-21'
};
const match=(title,searchText='')=>matchArchiveItem({title,searchText,date:'2026-10-02'},[survival]);

test('weak JustServer broadcast chatter does not auto-attach to survival',()=>{
  assert.equal(match('그냥서버 불침번 운영자 방송 좌표'),null);
  assert.equal(match('오늘의 그냥서버 운영자 불침번 = 민가연'),null);
  assert.equal(match('10. 2 그냥서버 섭주 방송 On'),null);
  assert.equal(match('그냥서버 휴방 공지'),null);
});

test('high-signal JustServer archive posts still attach',()=>{
  assert.equal(match('그냥서버 추가 입주 모집 공지')?.itemId,'justserver-survival');
  assert.equal(match('그냥서버 입주 신청 합격자 안내')?.itemId,'justserver-survival');
  assert.equal(match('그냥서버 적자생존 설명회')?.itemId,'justserver-survival');
  assert.equal(match('그냥서버 서버 오픈 일정 및 위키 안내')?.itemId,'justserver-survival');
  assert.equal(match('마크 그냥서버 열겠습니다.')?.itemId,'justserver-survival');
});

test('explicit season-name matches remain valid unless they are broadcast noise',()=>{
  const money={id:'money',title:'그냥서버 : 머니게임',aliases:['머니게임'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-06-24',endDate:'2026-07-15'};
  assert.equal(matchArchiveItem({title:'그냥서버 : 머니게임 공식 공지',date:'2026-06-24'},[money])?.itemId,'money');
  assert.equal(match('적자생존 운영자 불침번'),null);
});

test('client relevance gate mirrors the same noise and core-event policy',()=>{
  const runtime=fs.readFileSync('content-source-card-unifier.js','utf8');
  assert.match(runtime,/불침번/);
  assert.match(runtime,/방송\\s\*좌표|방송\s*\\s\*좌표/);
  assert.match(runtime,/섭주\\s\*방송|섭주\s*\\s\*방송/);
  assert.match(runtime,/입주\|신청\|모집\|합격/);
  assert.match(runtime,/설명회/);
  assert.match(runtime,/열겠/);
  assert.match(runtime,/위키/);
});
