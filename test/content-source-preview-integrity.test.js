'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  looksLikeContaminatedSoopCapture,
  mergeSourcePreviews
}=require('../lib/chunbong-content-browser-import-manage')._internals;

test('SOOP 확장프로그램 설정 화면이 캡처된 본문은 게시글 본문으로 사용하지 않는다',()=>{
  const contaminated=[
    '설정 메뉴',
    '방송 목록',
    '사이드바',
    'LIVE 플레이어',
    'VOD 플레이어',
    '프로그램 설정',
    '성능 안내 × 신규 최근 추가 기능'
  ].join('\n');
  assert.equal(typeof looksLikeContaminatedSoopCapture,'function');
  assert.equal(looksLikeContaminatedSoopCapture(contaminated),true);
  assert.equal(looksLikeContaminatedSoopCapture('그냥서버 시작 전 설명회 및 질의응답 시간 가지도록 하겠습니다.'),false);
});

test('공개 SOOP 상세 본문과 브라우저 캡처가 모두 있으면 공식 상세 본문을 우선한다',()=>{
  const merged=mergeSourcePreviews(
    {title:'SOOP 로그인 제한 글 · 208495651',body:'설정 메뉴\n방송 목록\n사이드바\nLIVE 플레이어',images:[],date:'2026-09-30'},
    {title:'그냥서버:적자생존 오픈 전 설명회 하겠습니다.',body:'그냥서버 시작 전 설명회 및 질의응답 시간 가지도록 하겠습니다.',images:[],date:'2026-09-30'},
    {title:'SOOP 로그인 제한 글 · 208495651',type:'post'},
    'https://www.sooplive.com/station/chunbongtv/post/208495651'
  );
  assert.equal(merged.title,'그냥서버:적자생존 오픈 전 설명회 하겠습니다.');
  assert.equal(merged.body,'그냥서버 시작 전 설명회 및 질의응답 시간 가지도록 하겠습니다.');
  assert.match(merged.source,/soop-public/);
});