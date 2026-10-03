const test=require('node:test');
const assert=require('node:assert/strict');
const {toPublicArchiveItem}=require('../lib/chunbong-content-archive-core');

function material(id,title){
  return {id,type:'post',title,date:'2026-10-03',datePrecision:'day',url:`https://www.sooplive.com/station/chunbongtv/post/${id.replace(/\D/g,'')||'1'}`,thumbnail:'',sourceId:'',note:'자동 발견 기록',visibility:'public'};
}

const weak=[
  material('auto-soop-post-208679167','10. 2 그냥서버 섭주 방송 On'),
  material('auto-soop-post-208666715','오늘 그냥서버 불침번 = 김지둥'),
  material('auto-soop-post-208843191','그냥서버 불침번 운영자 방송 좌표'),
  material('auto-soop-post-207618327','휴방공지'),
  material('auto-soop-post-208583587','9월 리캡 부탁드립니다'),
  material('auto-soop-post-207445925','9/18 방송공지'),
  material('auto-soop-post-207280439','9/16 사자컴퍼니 첫 방송 회의'),
  material('auto-soop-post-207673339','마병대4 1차합격 감사합니다.')
];
const strong=[
  material('auto-soop-post-207724607','🦁 그냥서버:적자생존 위키'),
  material('auto-soop-post-207448063','🦁 그냥서버 입주자 및 입주희망자분들께 드리는 말씀'),
  material('auto-soop-post-207257733','그냥서버 신청자분들 전부 다 봤네요 (일정 공지)'),
  material('auto-soop-post-207225535','🦁 그냥서버 합격자 관련 공지'),
  material('auto-soop-post-208562077','🦁 그냥서버: 적자생존 추가입주 모집 공지'),
  material('auto-soop-post-208495651','그냥서버:적자생존 오픈 전 설명회 하겠습니다.')
];
const curated=material('survival-soop-post-999','적자생존 운영 기록');

function sourceItem(){
  return {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',series:{id:'justserver',title:'그냥서버'},role:'주최',status:'ongoing',
    startDate:'2026-09-30',endDate:'2026-10-21',datePrecision:'day',summary:'적자생존',description:'적자생존',heroImage:null,
    participantCount:0,participants:[],participantGroups:[],participantProfiles:[],results:[],seriesSessions:[],timeline:[...weak,...strong,curated],media:[],gallery:[],notionSections:[],referenceSections:[],knowledgeSections:[],sources:[],verification:{state:'official',verifiedAt:'',conflicts:[]},published:true,updatedAt:'2026-10-04'
  };
}

test('public survival API filters stale weak auto SOOP posts without mutating curated records',()=>{
  const original=sourceItem();
  const publicItem=toPublicArchiveItem(original);
  const titles=publicItem.timeline.map(row=>row.title);
  for(const row of weak)assert.ok(!titles.includes(row.title),`weak auto post should be filtered: ${row.title}`);
  for(const row of strong)assert.ok(titles.includes(row.title),`high-signal archive post should stay: ${row.title}`);
  assert.ok(titles.includes(curated.title),'non-auto curated timeline records must not be removed');
  assert.equal(original.timeline.length,weak.length+strong.length+1,'public cleanup must not mutate stored input');
});

test('public cleanup is scoped to the survival season only',()=>{
  const other={...sourceItem(),id:'other-content',series:null,timeline:[weak[0]]};
  assert.equal(toPublicArchiveItem(other).timeline.length,1);
});
