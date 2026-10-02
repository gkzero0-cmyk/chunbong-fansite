'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const quality=require('../chunbong-contents-quality.js');

test('derives participant count from nested series sessions when top-level count is missing',()=>{
  const item=quality.normalizeArchiveItem({
    id:'class',participantCount:0,participants:[],participantGroups:[],
    seriesSessions:[
      {number:1,participants:['A','B'],participantCount:2},
      {number:2,participants:['B','C','D'],participantCount:3}
    ]
  });
  assert.equal(item.participantCount,4);
});

test('preserves an explicit authoritative participant count',()=>{
  const item=quality.normalizeArchiveItem({
    id:'moneygame',participantCount:658,participants:['A'],
    seriesSessions:[{participants:['A','B','C']}]
  });
  assert.equal(item.participantCount,658);
});

test('marks survival season ongoing and removes pre-open wording',()=>{
  const item=quality.normalizeArchiveItem({
    id:'justserver-survival',status:'planned',participantCount:0,
    summary:'2026년 9월 30일 오픈 예정으로 기록합니다.',
    description:'2026년 9월 30일 오픈 예정인 기록입니다. 모집 → 신청 → 합격자 안내 → 설명회 → 2차 입주 모집 → 서버 오픈 준비 흐름을 정리합니다.',
    results:[{title:'현재 단계',value:'오픈 준비'}]
  });
  assert.equal(item.status,'ongoing');
  assert.doesNotMatch(item.summary,/오픈 예정/);
  assert.doesNotMatch(item.description,/오픈 예정|서버 오픈 준비/);
  assert.equal(item.results.find(row=>row.title==='현재 단계').value,'서버 오픈 · 2차 입주 모집 및 운영');
});

test('keeps Leopel structured participant total separate from the final participant record',()=>{
  const item=quality.normalizeArchiveItem({
    id:'leopel',participantCount:593,
    description:'공개 입주 발표 자료를 기준으로 1차 225명, 2차 171명, 3차 164명까지 560명의 닉네임을 구조화했고, 추가 확인된 참가자 33명(SOOP 26명·치지직 7명)을 더해 현재 593명의 이름을 확인했습니다. 최종 참여자 집계 671명 중 남은 78명은 개별 닉네임·플랫폼·입주 차수를 확정할 수 없어 추가·미분류 인원으로 구분합니다.',
    results:[
      {title:'총 참여자',value:'671명 · 최종 집계'},
      {title:'확인된 입주 명단',value:'593명'},
      {title:'1차 입주',value:'225명'},
      {title:'2차 입주',value:'171명'},
      {title:'3차 입주',value:'164명'}
    ],
    participantGroups:[
      {stage:'1차 SOOP',platform:'SOOP',count:140,participants:['A']},
      {stage:'1차 치지직',platform:'치지직',count:68,participants:['X']},
      {stage:'2차 SOOP',platform:'SOOP',count:127,participants:['B']},
      {stage:'2차 치지직·YouTube',platform:'치지직 · YouTube',count:44,participants:['C']},
      {stage:'3차 SOOP',platform:'SOOP',count:104,participants:['Y']}
    ]
  });
  assert.equal(item.participantCount,311);
  assert.match(item.description,/구조화 명단.*311명/);
  assert.match(item.results.find(row=>row.title==='총 참여자').value,/671명/);
  assert.match(item.results.find(row=>row.title==='구조화 참가자').value,/311명/);
  assert.equal(item.participantGroups.length,3);
  assert.equal(item.participantGroups.reduce((sum,row)=>sum+row.count,0),311);
});

test('normalizes both list and detail archive payloads',()=>{
  const list=quality.normalizeArchivePayload({items:[{id:'x',participantCount:0,seriesSessions:[{participants:['A','B']}]}]});
  const detail=quality.normalizeArchivePayload({item:{id:'y',participantCount:0,participantGroups:[{count:3,participants:[]}]}});
  assert.equal(list.items[0].participantCount,2);
  assert.equal(detail.item.participantCount,3);
});
