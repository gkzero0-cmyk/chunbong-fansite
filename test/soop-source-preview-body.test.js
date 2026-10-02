'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { _internals }=require('../lib/chunbong-content-browser-import-manage');

const {sanitizeCapturedSoopBody}= _internals;

test('captured SOOP preview removes page header metadata and interaction footer',()=>{
  assert.equal(typeof sanitizeCapturedSoopBody,'function');
  const raw='🎬 컨텐츠 🦁 그냥서버 : 적자생존 추가입주 모집 공지 춘봉_ 2026-10-01 06:36:59 2,323  1차 입주 500명 완료하였음에도 서버가 쾌적하여 2차 입주를 모집하겠습니다. 🦁이 글에 댓글 새로 달아주세요🦁 서버기간 : 2026. 9. 30 ~ 2026. 10. 21 많은 관심 적은 기대 부탁드립니다 시청자 댓글 시 블랙 52 공유';
  const clean=sanitizeCapturedSoopBody(raw,{date:'2026-10-01'});
  assert.match(clean,/^1차 입주 500명 완료하였음에도/);
  assert.match(clean,/서버기간 : 2026\. 9\. 30 ~ 2026\. 10\. 21/);
  assert.match(clean,/많은 관심 적은 기대 부탁드립니다$/);
  assert.doesNotMatch(clean,/컨텐츠|콘텐츠|춘봉_|06:36:59|2,323/);
  assert.doesNotMatch(clean,/시청자 댓글 시 블랙|52 공유/);
});

test('captured SOOP preview also sanitizes multiline browser chrome',()=>{
  const raw=['콘텐츠','그냥서버 적자생존 공지','춘봉_','2026-09-30 20:01:03 1,204','실제 첫 문장입니다.','둘째 문장입니다.','시청자 댓글 시 블랙 17 공유'].join('\n');
  assert.equal(sanitizeCapturedSoopBody(raw,{date:'2026-09-30'}),'실제 첫 문장입니다.\n둘째 문장입니다.');
});

test('normal article text is preserved when browser chrome signature is absent',()=>{
  const raw='서버기간 : 2026. 9. 30 ~ 2026. 10. 21\n조회수와 상관없이 신청할 수 있습니다.\n댓글로 신청해주세요.';
  assert.equal(sanitizeCapturedSoopBody(raw,{date:'2026-10-01'}),raw);
});
