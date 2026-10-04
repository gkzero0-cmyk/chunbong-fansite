'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const archive=require('../lib/chunbong-content-archive-api');

const {mergeArchiveRows,publicRows}=archive._internals;
const thumbnail='https://stimg.sooplive.com/NORMAL_BBS/3/24883333/72271790804311879.png';

function survivalRow(){
  return {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',role:'주최',status:'ongoing',
    startDate:'2026-09-30',endDate:'2026-10-21',datePrecision:'day',summary:'적자생존',description:'적자생존',heroImage:null,
    participantCount:0,participants:[],participantGroups:[],participantProfiles:[],results:[],seriesSessions:[],
    timeline:[
      {id:'soop-auth-post-208562045',type:'post',title:'그냥서버 적자생존 추가 입주 모집 공지',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562045',thumbnail:'',sourceId:'source-soop-auth-208562045',note:'',visibility:'public'},
      {id:'auto-soop-post-208562077',type:'post',title:'🦁 그냥서버: 적자생존 추가입주 모집 공지',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562077',thumbnail,sourceId:'',note:'자동 발견 기록',visibility:'public'}
    ],
    media:[],gallery:[],notionSections:[],referenceSections:[],knowledgeSections:[],
    sources:[{id:'source-soop-auth-208562045',kind:'official',label:'SOOP 게시글',url:'https://www.sooplive.com/station/chunbongtv/post/208562045',visibility:'public'}],
    verification:{state:'official',verifiedAt:'2026-10-01T00:00:00+09:00',conflicts:[]},published:true,updatedAt:'2026-10-04T00:00:00Z'
  };
}

test('mergeArchiveRows -> publicRows preserves duplicate-based thumbnail recovery',()=>{
  const stored=survivalRow();
  const merged=mergeArchiveRows([], [stored]);
  const [publicItem]=publicRows(merged);
  assert.ok(publicItem,'published survival item should survive public validation');
  const target=publicItem.timeline.find(row=>row.id==='soop-auth-post-208562045');
  const duplicate=publicItem.timeline.find(row=>row.id==='auto-soop-post-208562077');
  assert.equal(duplicate?.thumbnail,thumbnail,'duplicate capture should retain its thumbnail');
  assert.equal(target?.thumbnail,thumbnail,'public pipeline should recover the authenticated row thumbnail');
  assert.equal(stored.timeline[0].thumbnail,'','public pipeline must not mutate stored Redis-shaped input');
});
