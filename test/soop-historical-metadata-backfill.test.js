const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {toPublicArchiveItem}=require('../lib/chunbong-content-archive-core');

function survivalItem(timeline=[]){
  return {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',series:{id:'justserver',title:'그냥서버'},role:'주최',status:'ongoing',
    startDate:'2026-09-30',endDate:'2026-10-21',datePrecision:'day',summary:'적자생존',description:'적자생존',heroImage:null,
    participantCount:0,participants:[],participantGroups:[],participantProfiles:[],results:[],seriesSessions:[],timeline,media:[],gallery:[],notionSections:[],referenceSections:[],knowledgeSections:[],sources:[],verification:{state:'official',verifiedAt:'',conflicts:[]},published:true,updatedAt:'2026-10-04'
  };
}

test('public survival API backfills the verified UP ranking post date without mutating stored data',()=>{
  const target={id:'survival-soop-post-204274449',type:'post',title:'적자생존 참가 신청 · UP 랭킹 원문',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/204274449',thumbnail:'',sourceId:'source-survival-post-204274449',note:'모집·신청 원문',visibility:'public'};
  const original=survivalItem([target]);
  const publicItem=toPublicArchiveItem(original);
  const recovered=publicItem.timeline.find(row=>row.id===target.id);
  assert.equal(recovered?.date,'2026-08-14');
  assert.equal(recovered?.datePrecision,'day');
  assert.equal(original.timeline[0].date,'','public metadata correction must not mutate Redis/stored input');
  assert.equal(original.timeline[0].datePrecision,'unknown');
});

test('content serverless entry directly tracks and exposes the archive-core correction version',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','content.js'),'utf8');
  assert.match(source,/chunbong-content-archive-core/,'api/content.js must directly depend on archive core so Vercel rebuilds the public function when corrections change');
  assert.match(source,/PUBLIC_CORRECTION_VERSION/,'api/content.js must consume the correction version marker');
  assert.match(source,/X-Content-Archive-Core-Version/,'the running function must expose its correction version for production verification');
});
