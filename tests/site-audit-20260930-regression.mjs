import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const analytics = require('../lib/soop-analytics.js');
const schedule = require('../lib/content-api/schedule.js');
const archive = require('../lib/chunbong-content-archive-core.js');

const anomaly = analytics.buildSoopAnalytics([
  {
    id:'bad', date:'2026-09-06', startedAt:'2026-09-06T06:59:44.000Z', endedAt:'2026-09-20T23:43:40.613Z',
    durationMinutes:21164, averageViewers:62, maxViewers:171, viewerSampleCount:629, measurement:'fan-site-sampled-5m', categories:[]
  },
  {
    id:'good', date:'2026-09-07', startedAt:'2026-09-07T10:00:00.000Z', endedAt:'2026-09-07T12:00:00.000Z',
    durationMinutes:120, averageViewers:50, maxViewers:70, viewerSampleCount:24, measurement:'fan-site-sampled-5m', categories:[]
  }
], [], {}, new Date('2026-09-08T00:00:00.000Z'));
assert.equal(anomaly.overview.measuredTotalMinutes, 120, 'impossible multi-day sessions must not contaminate totals');
assert.equal(anomaly.daily.some(row => row.date === '2026-09-06'), false, 'invalid sessions must not create a daily row');

assert.equal(schedule.cleanupScheduleTitle('휴방 b', '2026-09-01'), '휴방');
assert.equal(schedule.cleanupScheduleTitle('춘봉 & 마룽의 앤더런 원정대 b', '2026-09-02'), '춘봉 & 마룽의 앤더런 원정대');
assert.equal(schedule.cleanupScheduleTitle('춘타클 4회', '2026-09-14'), '춘타클 5회');
assert.equal(schedule.cleanupScheduleTitle('싸이감성 노래자랑', '2026-04-28'), '싸이감성 노래자랑 2회');

const chuntacle1 = schedule.applyScheduleCorrections({title:'춘타클 1회',tags:['콘텐츠'],start:'2026-07-12T20:00:00+09:00',end:'',isDateTime:true});
assert.equal(chuntacle1.start, '2026-07-11T08:00:00+09:00');
assert.deepEqual(chuntacle1.tags, ['VRC']);
const chuntacle2 = schedule.applyScheduleCorrections({title:'춘타클 2회',tags:['콘텐츠'],start:'2026-07-22T20:00:00+09:00',end:'',isDateTime:true});
assert.equal(chuntacle2.start, '2026-07-21T08:00:00+09:00');
const chuntacle4 = schedule.applyScheduleCorrections({title:'춘타클 4회',tags:['콘텐츠'],start:'2026-08-11T20:00:00+09:00',end:'',isDateTime:true});
assert.equal(chuntacle4.start, '2026-08-11T08:00:00+09:00');
const chuntacle5 = schedule.applyScheduleCorrections({title:'춘타클 5회',tags:['콘텐츠'],start:'2026-09-14T20:00:00+09:00',end:'',isDateTime:true});
assert.equal(chuntacle5.start, '2026-09-14T08:00:00+09:00');
assert.deepEqual(schedule.applyScheduleCorrections({title:'싸이감성 노래자랑 2회',tags:['콘텐츠'],start:'2026-04-28',end:'',isDateTime:false}).tags, ['노래 콘텐츠']);
assert.deepEqual(schedule.applyScheduleCorrections({title:'김멘탈의 랜버워치',tags:['콘텐츠'],start:'2026-08-21',end:'2026-08-22',isDateTime:false}).tags, ['오버워치']);
assert.deepEqual(schedule.applyScheduleCorrections({title:'넥버워치 중계',tags:['콘텐츠'],start:'2026-09-09T18:00:00+09:00',end:'',isDateTime:true}).tags, ['오버워치']);

const participantItem = archive.normalizeArchiveItem({
  id:'count-test', title:'count', datePrecision:'day', startDate:'2026-01-01', participantCount:0,
  participants:['A','B','C'], status:'ended'
});
assert.equal(participantItem.participantCount, 3, 'zero participantCount must fall back to the participant list');

const survival = archive.toPublicArchiveItem({
  id:'justserver-survival', title:'그냥서버 : 적자생존', category:'minecraft', role:'주최', status:'planned',
  startDate:'2026-09-30', endDate:'2026-10-21', datePrecision:'day', participantCount:0, participants:['A','B'],
  summary:'춘봉의 그냥서버 세 번째 시즌 ‘적자생존’. 2026년 9월 30일 오픈 예정으로 모집·신청·설명회·UP 랭킹 관련 공식 자료를 준비 단계부터 기록합니다.',
  description:'2026년 9월 30일 오픈 예정인 그냥서버 : 적자생존 기록입니다. 애청자 공개 게시글은 공개 자료와 분리해 내부 검증용으로 보관합니다.',
  results:[{title:'현재 단계',value:'모집·신청·설명회 및 오픈 준비'}],
  timeline:[{id:'open',type:'result',title:'서버 오픈 예정',date:'2026-09-30',datePrecision:'day',note:'이전 대화에서 제공된 Notion 일정 기준 예정 시작일입니다.',visibility:'public'}],
  sources:[{id:'source',kind:'official',label:'공식',url:'https://example.com',visibility:'public'}], published:true
});
assert.equal(survival.status, 'ongoing');
assert.match(survival.summary, /오픈(?:한|해)/);
assert.doesNotMatch(JSON.stringify(survival), /이전 대화|사용자가|내부 검증용/);
assert.equal(survival.timeline[0].title, '서버 오픈');
assert.equal(survival.participantCount, 2);
assert.equal(survival.results.find(row=>row.title==='현재 단계')?.value, '서버 오픈 · 진행 중');

console.log('site audit 2026-09-30 regression passed');