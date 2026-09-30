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

test('normalizes both list and detail archive payloads',()=>{
  const list=quality.normalizeArchivePayload({items:[{id:'x',participantCount:0,seriesSessions:[{participants:['A','B']}]}]});
  const detail=quality.normalizeArchivePayload({item:{id:'y',participantCount:0,participantGroups:[{count:3,participants:[]}]}});
  assert.equal(list.items[0].participantCount,2);
  assert.equal(detail.item.participantCount,3);
});
