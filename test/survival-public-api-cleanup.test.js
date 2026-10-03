const test=require('node:test');
const assert=require('node:assert/strict');
const {toPublicArchiveItem}=require('../lib/chunbong-content-archive-core');

function material(id,title,{type='post'}={}){
  const digits=id.replace(/\D/g,'')||'1';
  const url=type==='post'?`https://www.sooplive.com/station/chunbongtv/post/${digits}`:`https://vod.sooplive.com/player/${digits}/`;
  return {id,type,title,date:'2026-10-03',datePrecision:'day',url,thumbnail:'',sourceId:'',note:'자동 발견 기록',visibility:'public'};
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

const weakMedia=[
  material('auto-soop-vod-208754459','그냥서버 섭주 api 많은 관심 부탁드립니다',{type:'vod'}),
  material('auto-soop-clip-208747667','[클립]그냥서버 섭주 api 많은 관심 부탁드립니다',{type:'clip'}),
  material('auto-soop-clip-208746965','[클립][그냥서버] 땜밍님한테 방송적 조언 해주는 춘봉님',{type:'clip'}),
  material('auto-soop-clip-208813217','[클립]황원태도 업구걸글 쓰는 그냥서버 섭주 대춘봉',{type:'clip'})
];
const strongMedia=[
  material('auto-soop-vod-208666979','그냥서버 2차입주 모집중입니다.',{type:'vod'}),
  material('auto-soop-vod-208518269','그냥서버:적자생존 오픈합니다.',{type:'vod'}),
  material('auto-soop-catch-207592851','[캐치]그냥서버:적자생존 출석체크시스템 설명',{type:'catch'}),
  material('auto-soop-clip-208730477','[클립]우왁굳 그냥 서버 입주소식 들은 춘봉님 반응',{type:'clip'}),
  material('auto-soop-catch-208812525','[캐치] 그냥서버 싼마이 공연단 / 춘봉 반응',{type:'catch'}),
  material('auto-soop-clip-208763225','[클립]춘봉 반응 / 상득 - Billie Jean 빌리진 (마이클 잭슨) | 그냥서버 낚시터',{type:'clip'}),
  material('auto-soop-catch-208787801','[캐치]그냥서버 야생 불법 농사로 인한 퇴출자',{type:'catch'}),
  material('auto-soop-catch-208788105','[캐치]그냥서버 섭주의 강화 스포',{type:'catch'})
];
const curatedMedia=material('survival-presentation-vod-207560243','7시 그냥서버:적자생존 설명회',{type:'vod'});

function sourceItem(){
  return {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',series:{id:'justserver',title:'그냥서버'},role:'주최',status:'ongoing',
    startDate:'2026-09-30',endDate:'2026-10-21',datePrecision:'day',summary:'적자생존',description:'적자생존',heroImage:null,
    participantCount:0,participants:[],participantGroups:[],participantProfiles:[],results:[],seriesSessions:[],timeline:[...weak,...strong,curated],media:[...weakMedia,...strongMedia,curatedMedia],gallery:[],notionSections:[],referenceSections:[],knowledgeSections:[],sources:[],verification:{state:'official',verifiedAt:'',conflicts:[]},published:true,updatedAt:'2026-10-04'
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

test('public survival API removes low-signal auto media but keeps server-related reactions and performances',()=>{
  const original=sourceItem();
  const publicItem=toPublicArchiveItem(original);
  const titles=publicItem.media.map(row=>row.title);
  for(const row of weakMedia)assert.ok(!titles.includes(row.title),`low-signal auto media should be filtered: ${row.title}`);
  for(const row of strongMedia)assert.ok(titles.includes(row.title),`server-related media should stay: ${row.title}`);
  assert.ok(titles.includes(curatedMedia.title),'curated media must never be removed by auto-media cleanup');
  assert.equal(original.media.length,weakMedia.length+strongMedia.length+1,'public media cleanup must not mutate stored input');
});

test('public cleanup is scoped to the survival season only',()=>{
  const other={...sourceItem(),id:'other-content',series:null,timeline:[weak[0]],media:[weakMedia[0]]};
  const publicItem=toPublicArchiveItem(other);
  assert.equal(publicItem.timeline.length,1);
  assert.equal(publicItem.media.length,1);
});

test('public survival API reuses the known duplicate recruitment thumbnail without mutating stored rows',()=>{
  const thumbnail='https://stimg.sooplive.com/NORMAL_BBS/3/24883333/72271790804311879.png';
  const target={...material('soop-auth-post-208562045','그냥서버 적자생존 추가 입주 모집 공지'),date:'2026-10-01'};
  const duplicate={...material('auto-soop-post-208562077','🦁 그냥서버: 적자생존 추가입주 모집 공지'),date:'2026-10-01',thumbnail};
  const original={...sourceItem(),timeline:[target,duplicate]};
  const publicItem=toPublicArchiveItem(original);
  const recovered=publicItem.timeline.find(row=>row.id==='soop-auth-post-208562045');
  assert.equal(recovered?.thumbnail,thumbnail,'authenticated copy should reuse the already captured duplicate image');
  assert.equal(original.timeline[0].thumbnail,'','public correction must not mutate the stored authenticated row');
  assert.equal(original.timeline[1].thumbnail,thumbnail,'public correction must not mutate the duplicate source row');
});
