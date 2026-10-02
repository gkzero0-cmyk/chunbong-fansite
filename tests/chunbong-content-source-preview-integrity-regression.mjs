import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const meta=require('../lib/chunbong-content-browser-meta');
const preview=require('../lib/chunbong-content-browser-import-manage')._internals;

const repaired=meta.repairPublicArchiveItem({
  id:'justserver-survival',
  timeline:[
    {title:'춘봉_의 방송국',url:'https://www.sooplive.com/station/chunbongtv/post/208454475',sourceId:'source-a',visibility:'public'},
    {title:'SOOP 로그인 제한 글 · 208495651',url:'https://www.sooplive.com/station/chunbongtv/post/208495651',sourceId:'source-b',visibility:'public'},
    {title:'춘봉_의 방송국',url:'https://www.sooplive.com/station/chunbongtv/post/208464961',sourceId:'source-c',visibility:'public'}
  ],
  sources:[
    {id:'source-a',label:'SOOP 게시글 · 208454475',url:'https://www.sooplive.com/station/chunbongtv/post/208454475',visibility:'public'},
    {id:'source-b',label:'SOOP 로그인 제한 게시글 · 208495651',url:'https://www.sooplive.com/station/chunbongtv/post/208495651',visibility:'public'},
    {id:'source-c',label:'SOOP 게시글 · 208464961',url:'https://www.sooplive.com/station/chunbongtv/post/208464961',visibility:'public'}
  ]
});

assert.deepEqual(repaired.timeline.map(row=>row.title),[
  '🦁 그냥서버:적자생존 오늘부터 시작됩니다.',
  '그냥서버:적자생존 오픈 전 설명회 하겠습니다.',
  '🦁 그냥서버:적자생존 관련 중요 공지'
]);

assert.equal(typeof preview.looksLikeContaminatedSoopCapture,'function');
assert.equal(preview.looksLikeContaminatedSoopCapture([
  '설정 메뉴','방송 목록','사이드바','LIVE 플레이어','VOD 플레이어','프로그램 설정'
].join('\n')),true);
assert.equal(preview.looksLikeContaminatedSoopCapture('그냥서버 시작 전 설명회 및 질의응답 시간 가지도록 하겠습니다.'),false);

assert.equal(typeof preview.extractOfficialSoopImages,'function');
const officialHtml=[
  '<img src="https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/21941786118032145.png" alt="Uploaded">',
  '<p>본문</p>',
  '<img src="https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/48321786118471069.png" alt="Uploaded">'
].join('');
assert.deepEqual(preview.extractOfficialSoopImages(officialHtml),[
  'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/21941786118032145.png',
  'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/48321786118471069.png'
]);

const merged=preview.mergeSourcePreviews(
  {
    title:'그냥서버:적자생존 공지',
    body:'저장 캡처 본문',
    images:[
      'https://stimg.sooplive.com/STATION/3/24883333/15571786283884897.png',
      'https://stimg.sooplive.com/NORMAL_BBS/3/24883333/captured-extra.png'
    ],
    date:'2026-08-08'
  },
  {
    title:'그냥서버:적자생존 공지',
    body:'공식 본문',
    html:officialHtml,
    images:[
      'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/21941786118032145.png',
      'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/48321786118471069.png'
    ],
    date:'2026-08-08'
  },
  {title:'그냥서버:적자생존 공지',type:'post'},
  'https://www.sooplive.com/station/chunbongtv/post/203683207'
);
assert.equal(merged.title,'그냥서버:적자생존 공지');
assert.equal(merged.body,'공식 본문');
assert.equal(merged.html,officialHtml);
assert.deepEqual(merged.images,[
  'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/21941786118032145.png',
  'https://stimg.sooplive.co.kr/NORMAL_BBS/3/24883333/48321786118471069.png'
]);
assert.equal(merged.source,'soop-public');

console.log('chunbong content source preview integrity regression: ok');
