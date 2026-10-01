'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  isGenericSoopImage,
  isGenericSoopTitle,
  sanitizeSoopImages,
  inferSoopTitleFromBody,
  mergeSoopBrowserMetadata,
  repairPublicArchiveItem
}=require('../lib/chunbong-content-browser-meta');

test('SOOP 기본 프로필/로딩 이미지는 대표 이미지 후보에서 제외한다',()=>{
  assert.equal(isGenericSoopImage('https://res.sooplive.com/images/svg/thumb_profile.svg'),true);
  assert.equal(isGenericSoopImage('https://res.sooplive.com/images/channel/ko_KR/ImageLoadingLight.gif'),true);
  assert.deepEqual(sanitizeSoopImages([
    'https://res.sooplive.com/images/svg/thumb_profile.svg',
    'https://res.sooplive.com/images/channel/ko_KR/ImageLoadingLight.gif',
    'https://stimg.sooplive.com/NORMAL_BBS/3/24883333/example.png'
  ]),['https://stimg.sooplive.com/NORMAL_BBS/3/24883333/example.png']);
});

test('방송국/로그인 제한 임시 제목은 실제 제목으로 취급하지 않는다',()=>{
  assert.equal(isGenericSoopTitle('춘봉_의 방송국','208562045'),true);
  assert.equal(isGenericSoopTitle('SOOP 로그인 제한 글 · 208562045','208562045'),true);
  assert.equal(isGenericSoopTitle('그냥서버 적자생존 추가 입주 모집 공지','208562045'),false);
});

test('본문 첫 유효 행에서 제목을 복구한다',()=>{
  const body='춘봉_의 방송국\n그냥서버 적자생존 추가 입주 모집 공지\n안녕하세요. 추가 입주 모집 안내입니다.';
  assert.equal(inferSoopTitleFromBody(body,'208562045'),'그냥서버 적자생존 추가 입주 모집 공지');
});

test('서버 메타와 브라우저 메타를 합칠 때 실제 제목/날짜/이미지를 우선하고 기본 이미지는 버린다',()=>{
  const merged=mergeSoopBrowserMetadata({
    postId:'208562045',
    title:'SOOP 로그인 제한 글 · 208562045',
    date:'2026-10-01',
    body:'춘봉_의 방송국\n그냥서버 적자생존 추가 입주 모집 공지\n본문',
    images:['https://res.sooplive.com/images/svg/thumb_profile.svg']
  },{
    title:'춘봉_의 방송국',
    publishedDate:'2026-10-01',
    image:'https://stimg.sooplive.com/NORMAL_BBS/3/24883333/recruit.png'
  });
  assert.equal(merged.title,'그냥서버 적자생존 추가 입주 모집 공지');
  assert.equal(merged.date,'2026-10-01');
  assert.deepEqual(merged.images,['https://stimg.sooplive.com/NORMAL_BBS/3/24883333/recruit.png']);
});

test('이미 공개된 208562045도 공개 응답에서 제목과 잘못된 기본 썸네일을 보정한다',()=>{
  const repaired=repairPublicArchiveItem({
    id:'justserver-survival',
    timeline:[{
      id:'soop-auth-post-208562045',
      type:'post',
      title:'SOOP 로그인 제한 글 · 208562045',
      url:'https://www.sooplive.com/station/chunbongtv/post/208562045',
      thumbnail:'https://res.sooplive.com/images/svg/thumb_profile.svg',
      sourceId:'source-soop-auth-208562045',
      visibility:'public'
    }],
    sources:[{
      id:'source-soop-auth-208562045',
      label:'SOOP 로그인 제한 게시글 · 208562045',
      url:'https://www.sooplive.com/station/chunbongtv/post/208562045',
      visibility:'public'
    }]
  });
  assert.equal(repaired.timeline[0].title,'그냥서버 적자생존 추가 입주 모집 공지');
  assert.equal(repaired.timeline[0].thumbnail,'');
  assert.equal(repaired.sources[0].label,'SOOP 로그인 제한 게시글 · 그냥서버 적자생존 추가 입주 모집 공지');
});
