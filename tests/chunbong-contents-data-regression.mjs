import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {normalizeArchiveItem,validateArchiveItem,formatArchiveDate,toPublicArchiveItem}=require('../lib/chunbong-content-archive-core.js');

const monthOnly=normalizeArchiveItem({
  id:'sample',title:'샘플',category:'minecraft',role:'주최',status:'ended',
  startDate:'2026-06',datePrecision:'month',summary:'샘플 설명',
  sources:[{id:'s1',kind:'official',url:'https://www.sooplive.com/station/chunbongtv'}],
  verification:{state:'official',conflicts:[]},published:true
});
assert.equal(formatArchiveDate(monthOnly.startDate,monthOnly.datePrecision),'2026년 6월');
assert.deepEqual(validateArchiveItem(monthOnly,{publishing:true}),[]);
assert.ok(validateArchiveItem({...monthOnly,id:'bad',sources:[]},{publishing:true}).includes('published_source_required'));

const duplicateUrl={...monthOnly,id:'dup',timeline:[
  {id:'a',type:'vod',title:'A',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'},
  {id:'b',type:'clip',title:'B',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'}
]};
assert.ok(validateArchiveItem(duplicateUrl,{publishing:true}).includes('duplicate_material_url'));

const conflicted={...monthOnly,id:'conflict',verification:{state:'needs_review',conflicts:[{field:'startDate'}]}};
assert.ok(validateArchiveItem(conflicted,{publishing:true}).includes('unresolved_conflict'));

const localArt=normalizeArchiveItem({
  ...monthOnly,
  id:'local-art',
  heroImage:{src:'/assets/chunbong-contents/leopel-cover.svg',alt:'레오펠 팬사이트 아카이브 커버',sourceId:'s1'}
});
assert.equal(localArt.heroImage?.src,'/assets/chunbong-contents/leopel-cover.svg','local archive artwork path should be preserved');

const seriesArt=normalizeArchiveItem({...monthOnly,id:'series-art',series:{id:'justserver',title:'그냥서버',subtitle:'마인크래프트 서버 시리즈',description:'시리즈 설명',order:10,cover:{src:'/assets/chunbong-contents/justserver-moneygame-cover.svg',alt:'그냥서버'}}});
assert.equal(seriesArt.series?.id,'justserver','series metadata should survive normalization');
assert.equal(seriesArt.series?.cover?.src,'/assets/chunbong-contents/justserver-moneygame-cover.svg','series cover path should survive normalization');

const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(seed.items));
assert.ok(seed.items.some(item=>item.published===true),'at least one verified archive item should ship publicly');
const leopel=seed.items.find(item=>item.id==='leopel');
assert.ok(leopel?.published,'verified Leopol record should be publicly seeded');
assert.ok((leopel?.sources||[]).length>=2,'Leopol should be cross-checked with multiple public sources');
assert.equal(leopel?.role,'주최 · 기획','Leopol role should match directly supported source wording');
for(const item of seed.items) assert.deepEqual(validateArchiveItem(normalizeArchiveItem(item),{publishing:true}),[]);


const diamondBackfill=seed.items.find(item=>item.id==='justserver-diamond');
assert.ok((diamondBackfill?.results||[]).some(row=>row.title==='전체 참가자'&&/189명/.test(row.value||'')),'그냥서버 1 전체 참가자 189명 기록이 필요합니다');
assert.ok((diamondBackfill?.results||[]).some(row=>row.title==='관측 기록'&&/183명/.test(row.value||'')),'그냥서버 1 방통실 관측 183명 기록이 필요합니다');
const diamondParticipantGroup=(diamondBackfill?.participantGroups||[]).find(row=>row.id==='diamond-soop-participants');
assert.equal(diamondParticipantGroup?.count,189,'그냥서버 1 전체 확인 명단은 189명이어야 합니다');
assert.equal(diamondParticipantGroup?.participants?.length,189,'그냥서버 1 참가자 배열도 189명이어야 합니다');
assert.equal(new Set(diamondParticipantGroup?.participants||[]).size,189,'그냥서버 1 참가자 명단에 중복이 없어야 합니다');
for(const name of ['BJ공파리파','냥냥두둥','모이사','쏭아야','춘봉_','하밍','히키모?!']) assert.ok(diamondParticipantGroup?.participants?.includes(name),`그냥서버 1 확인 참가자 누락: ${name}`);
assert.equal(diamondParticipantGroup?.sourceId,'source-diamond-bngts-streamers','전체 참가자 명단은 내부 검증 출처와 연결되어야 합니다');
assert.ok((diamondBackfill?.results||[]).some(row=>row.title==='명단 구조화'&&/189명 확인/.test(row.value||'')),'그냥서버 1 명단 구조화는 전체 189명 완료 상태여야 합니다');

console.log('chunbong contents data regression passed');

const archiveApi=require('../lib/chunbong-content-archive-api.js');
const rows=archiveApi._internals.publicRows([
  {...monthOnly,id:'visible',published:true},
  {...monthOnly,id:'draft',published:false}
]);
assert.deepEqual(rows.map(row=>row.id),['visible']);
assert.ok(!('verification' in rows[0]));
const mergedSeries=archiveApi._internals.mergeArchiveRows([{...monthOnly,id:'series-merge',series:{id:'justserver',title:'그냥서버'}}],[{...monthOnly,id:'series-merge'}]);
assert.equal(mergedSeries[0]?.series?.id,'justserver','stored rows without series metadata should inherit curated seed series metadata');
assert.ok(archiveApi._internals.curatedHiddenIds().includes('psy-emotion-song-contest-2026'),'curated hidden ids should include legacy psy record');


const impossibleDate=normalizeArchiveItem({...monthOnly,id:'impossible-date',startDate:'2026-02-31',datePrecision:'day'});
assert.ok(validateArchiveItem(impossibleDate,{publishing:false}).includes('invalid_start_date'),'impossible calendar dates must be rejected');

const badEndDate=normalizeArchiveItem({...monthOnly,id:'bad-end',startDate:'2026-06-05',endDate:'2026-02-31',datePrecision:'day'});
assert.ok(validateArchiveItem(badEndDate,{publishing:false}).includes('invalid_end_date'),'invalid end dates must be rejected');

const reversedRange=normalizeArchiveItem({...monthOnly,id:'reversed-range',startDate:'2026-06-05',endDate:'2026-06-04',datePrecision:'day'});
assert.ok(validateArchiveItem(reversedRange,{publishing:false}).includes('end_before_start'),'end date before start date must be rejected');

const invalidTimelineDate=normalizeArchiveItem({...monthOnly,id:'bad-material-date',timeline:[
  {id:'a',type:'article',title:'A',date:'2026-02-31',datePrecision:'day',url:'https://example.com/a',sourceId:'s1'}
]});
assert.ok(validateArchiveItem(invalidTimelineDate,{publishing:false}).includes('invalid_material_date'),'invalid timeline dates must be rejected');

const duplicateSourceId=normalizeArchiveItem({...monthOnly,id:'duplicate-source',sources:[
  {id:'same',kind:'official',url:'https://example.com/one'},
  {id:'same',kind:'article',url:'https://example.com/two'}
]});
assert.ok(validateArchiveItem(duplicateSourceId,{publishing:false}).includes('duplicate_source_id'),'duplicate source ids must be rejected');

const danglingSource=normalizeArchiveItem({...monthOnly,id:'dangling-source',timeline:[
  {id:'a',type:'article',title:'A',date:'2026-06',datePrecision:'month',url:'https://example.com/a',sourceId:'missing'}
]});
assert.ok(validateArchiveItem(danglingSource,{publishing:true}).includes('unknown_source_id'),'published materials must not reference missing sources');


const koreanId=normalizeArchiveItem({...monthOnly,id:'그냥서버'});
assert.equal(koreanId.id,'그냥서버','Korean archive ids created by the operator UI must survive server normalization');


const publishedIds=new Set(seed.items.filter(item=>item.published===true).map(item=>item.id));
for(const id of ['leopel','justserver-moneygame','psy-emotion-song-contest-1','psy-emotion-song-contest-2']){
  assert.ok(publishedIds.has(id),`verified archive seed missing ${id}`);
}
assert.ok(Array.isArray(seed.hiddenIds)&&seed.hiddenIds.includes('psy-emotion-song-contest-2026'),'legacy 싸이감성 단일 레코드는 공개에서 숨겨야 합니다');
const justserver=seed.items.find(item=>item.id==='justserver-moneygame');
assert.equal(justserver?.startDate,'2026-06-24');
assert.equal(justserver?.endDate,'2026-07-15');
assert.ok((justserver?.sources||[]).some(source=>/sooplive\.com/.test(source.url)),'JustServer should include a SOOP source');
assert.match(String(justserver?.heroImage?.src||''),/^\/assets\/chunbong-contents\//);

const psyContest1=seed.items.find(item=>item.id==='psy-emotion-song-contest-1');
const psyContest2=seed.items.find(item=>item.id==='psy-emotion-song-contest-2');
assert.ok(psyContest1?.published&&psyContest2?.published,'싸이감성 노래자랑 1·2회는 각각 공개 레코드여야 합니다');
assert.equal(psyContest1?.series?.id,'psy-emotion-song-contest');
assert.equal(psyContest2?.series?.id,'psy-emotion-song-contest');
assert.equal(psyContest1?.datePrecision,'unknown','1회 날짜는 원문 확인 전 임의 확정하지 않습니다');
assert.equal(psyContest2?.datePrecision,'day','2회 날짜는 교차 확인된 개최일 기준으로 일 단위여야 합니다');
assert.equal(psyContest2?.startDate,'2026-04-28','2회 개최일은 2026-04-28이어야 합니다');
assert.ok((psyContest1?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/chunbongtv/post/124321185'),'1회 SOOP 모집글이 필요합니다');
assert.ok((psyContest1?.media||[]).some(row=>row.url==='https://vod.sooplive.com/player/127480069'),'1회 SOOP VOD가 필요합니다');
assert.ok((psyContest1?.participants||[]).includes('시로코'),'제1회 참가가 교차 확인된 시로코 기록이 필요합니다');
assert.ok((psyContest1?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/gkzero/post/207829703'&&row.visibility==='internal'),'1회 참가 순서 보관본은 내부 SOOP 검증 자료로 유지해야 합니다');
assert.equal((psyContest1?.participantGroups||[]).find(row=>row.id==='psy1-confirmed-order')?.count,36,'1회 보존 원문 경연 순서는 36명이어야 합니다');
assert.equal(psyContest1?.participants?.length,37,'1회는 공지 순서 36명과 별도 교차확인 시로코 기록을 구분해 보존해야 합니다');
assert.ok((psyContest2?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/chunbongtv/post/192031471'),'2회 SOOP 모집글이 필요합니다');
assert.ok((psyContest2?.media||[]).some(row=>row.url==='https://vod.sooplive.com/player/194116989'),'2회 SOOP VOD가 필요합니다');
assert.ok((psyContest2?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/gkzero/post/207830229'&&row.visibility==='internal'),'2회 최종 공지 보관본은 내부 SOOP 검증 자료로 유지해야 합니다');
assert.equal((psyContest2?.participantGroups||[]).find(row=>row.id==='psy2-confirmed-order')?.count,22,'2회 경연 순서는 22명이어야 합니다');
assert.ok((psyContest2?.results||[]).some(row=>row.title==='심사위원'&&/춘봉/.test(row.value||'')&&/릴파/.test(row.value||'')),'2회 심사위원 정보가 필요합니다');
assert.ok((psyContest2?.results||[]).some(row=>row.title==='총상금'&&/100만 원/.test(row.value||'')&&/13,000개/.test(row.value||'')),'2회 상금 계획이 필요합니다');
assert.match(String(psyContest1?.heroImage?.src||''),/^\/assets\/chunbong-contents\//);
assert.match(String(psyContest2?.heroImage?.src||''),/^\/assets\/chunbong-contents\//);


const chuntacle=seed.items.find(item=>item.id==='chuntacle-2026');
assert.ok(chuntacle?.published,'춘타클 should be included in the public content archive');
assert.equal(chuntacle?.category,'class-event');
assert.match(String(chuntacle?.heroImage?.src||''),/^(?:\/assets\/chunbong-contents\/chuntacle-|https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/.*\/chunbong-fansite\/chuntacle\/session-5\.webp$)/,'춘타클 대표 이미지는 실제 제5회 포스터 또는 로컬 대체 자산이어야 합니다');
assert.ok((chuntacle?.timeline||[]).length>=5,'춘타클 should expose all five class sessions in its timeline');
assert.ok((chuntacle?.participants||[]).length>=19,'춘타클 should list students confirmed by the five archived posters');
assert.ok((chuntacle?.results||[]).length>=5,'춘타클 should summarize all five confirmed class sessions');
assert.equal((chuntacle?.gallery||[]).length,5,'춘타클 gallery should contain the five actual posters');

const chuntacleSessions=chuntacle?.seriesSessions||[];
assert.equal(chuntacleSessions.length,5,'춘타클 should expose sessions 1 through 5');
assert.deepEqual(chuntacleSessions.map(row=>row.number),[1,2,3,4,5],'춘타클 session order should stay chronological');
assert.deepEqual(chuntacleSessions.map(row=>row.date),['2026-07-12','2026-07-22','2026-08-02','2026-08-11','2026-09-14'],'춘타클 dates should match the actual attached posters');
assert.deepEqual(chuntacleSessions.map(row=>row.participantCount),[10,11,10,8,5],'춘타클 participant counts should match the actual attached posters');
assert.equal(chuntacleSessions.find(row=>row.number===1)?.time,'08:00');
assert.equal(chuntacleSessions.find(row=>row.number===2)?.time,'08:00');
assert.equal(chuntacleSessions.find(row=>row.number===3)?.time,'20:00');
assert.equal(chuntacleSessions.find(row=>row.number===4)?.time,'08:00');
assert.equal(chuntacleSessions.find(row=>row.number===5)?.time,'08:00');

const expectedStudents={
  1:['김잇딥','네아','마로','소하','슬윤','이투','도람지','문이유','체리몽','흠냥'],
  2:['모이사','다키','연주홍','문이유','슬윤','흠냥','클라비스','유리','멍보리','투미츠','소하'],
  3:['흠냥','문이유','김잇딥','클라비스','소하','멍보리','나밍','유리','모이사','도람지'],
  4:['소하','투미츠','연주홍','네아','김잇딥','클라비스','멍보리','나밍'],
  5:['김뽁분','김잇딥','문이유','연주홍','클라비스']
};
for(const session of chuntacleSessions){
  assert.deepEqual(session.participants,expectedStudents[session.number],`춘타클 ${session.number}회 수강생은 실제 포스터와 일치해야 합니다`);
  assert.equal(session.poster?.status,'verified',`춘타클 ${session.number}회 실제 포스터가 검증 상태여야 합니다`);
  assert.match(session.poster?.src||'',/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/chuntacle\/session-[1-5]\.webp$/,`춘타클 ${session.number}회 실제 포스터 영구 자산 URL이 필요합니다`);
}
assert.ok((chuntacle?.timeline||[]).some(row=>row.id==='session-5-final-poster'&&row.date==='2026-09-14'),'춘타클 5회 최종 포스터 기록이 필요합니다');
assert.ok(!(chuntacle?.timeline||[]).some(row=>row.date==='2026-09-14'&&/4회/.test(row.title||'')),'9월 14일 기록을 4회로 잘못 표기하면 안 됩니다');
for(const row of chuntacle?.gallery||[]) assert.match(row.src||'',/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/chuntacle\/session-[1-5]\.webp$/,'춘타클 갤러리는 실제 고해상도 포스터 자산만 사용해야 합니다');


for(const id of ['159705141','161715755','163281747','165257051']) assert.ok((leopel?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`),`레오펠 SOOP 게시글 누락: ${id}`);
for(const id of ['159715611','165343833','167705699']) assert.ok((leopel?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`레오펠 VOD 누락: ${id}`);
assert.ok((leopel?.sources||[]).some(row=>row.url==='https://namu.wiki/w/%EB%A0%88%EC%98%A4%ED%8E%A0'),'레오펠 나무위키 자료가 필요합니다');
assert.ok((leopel?.gallery||[]).some(row=>/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/leopel\/logo\.webp$/.test(row.src||'')),'레오펠 실제 로고 자산이 갤러리에 필요합니다');
assert.ok((leopel?.media||[]).some(row=>/159711687/.test(row.url)),'Leopel should link the verified SOOP presentation VOD');
assert.ok((leopel?.gallery||[]).length>=2,'Leopel detail should have visual archive material');
assert.ok((justserver?.media||[]).length>=2,'JustServer should include multiple verified SOOP Catch records');
assert.ok((justserver?.gallery||[]).length>=2,'JustServer detail should have visual archive material');
const survival=seed.items.find(item=>item.id==='justserver-survival');
assert.ok(survival,'적자생존 콘텐츠 항목이 필요합니다');
assert.equal(justserver?.series?.id,'justserver','머니게임은 그냥서버 시리즈에 속해야 합니다');
assert.equal(survival?.series?.id,'justserver','적자생존은 그냥서버 시리즈에 속해야 합니다');
assert.equal(justserver?.series?.title,'그냥서버','머니게임과 적자생존은 그냥서버 시리즈로 묶여야 합니다');
assert.equal(chuntacle?.series?.id,'chuntacle','춘타클은 독립 시리즈 메타데이터를 가져야 합니다');
assert.equal(leopel?.series?.id,'leopel','레오펠은 대표 시리즈 메타데이터를 가져야 합니다');
assert.equal(psyContest1?.series?.id,'psy-emotion-song-contest','싸이감성 노래자랑 제1회는 대표 시리즈 메타데이터를 가져야 합니다');
assert.equal(psyContest2?.series?.id,'psy-emotion-song-contest','싸이감성 노래자랑 제2회는 같은 대표 시리즈에 속해야 합니다');
assert.ok((survival?.media||[]).some(row=>row.url==='https://vod.sooplive.com/player/207560243'&&/적자생존 설명회/.test(row.title||'')),'적자생존 설명회 VOD가 필요합니다');
const moneyVodIds=['199701961','199731549','199911259','200010937','200150005','200191013','200238669','200257689','200295759','200393761','200401503','200477587','200609959','200775197','200812787','200857709','200893769','200917923','200956235','201043833','201146469','201223669','201329381','201384951','201524161','201595413'];
for(const id of moneyVodIds) assert.ok((justserver?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`머니게임 VOD 누락: ${id}`);
for(const id of moneyVodIds){
  const row=(justserver?.media||[]).find(item=>item.url===`https://vod.sooplive.com/player/${id}`);
  assert.ok(row?.date&&row.datePrecision==='day',`머니게임 VOD 날짜 메타 누락: ${id}`);
  assert.match(String(row?.thumbnail||''),/^https:\/\/videoimg\.sooplive\.com\//,`머니게임 VOD 썸네일 메타 누락: ${id}`);
  assert.ok(!/다시보기 \d{2}$/.test(String(row?.title||'')),`머니게임 VOD 임시 제목이 남아 있습니다: ${id}`);
}

for(const id of ['197785319','199568663','199830351']) assert.ok((justserver?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`),`머니게임 SOOP 게시글 누락: ${id}`);
for(const url of ['https://naver.me/5qLX1yQ1','https://naver.me/FbVX1U7z','https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d','https://buly.kr/2ffytJ1','https://bngts.com/contents/geunyangseobeo-meonigeim','https://bngts.com/contents/geunyangseobeo-meonigeim/streamers']) assert.ok((justserver?.sources||[]).some(row=>row.url===url),`머니게임 참고 자료 누락: ${url}`);
for(const url of ['https://naver.me/5qLX1yQ1','https://naver.me/FbVX1U7z','https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d']) assert.equal((justserver?.sources||[]).find(row=>row.url===url)?.visibility,'internal',`머니게임 내부 자료원은 공개 출처로 노출하면 안 됩니다: ${url}`);
const moneygamePublic=toPublicArchiveItem(normalizeArchiveItem(justserver));
assert.equal((moneygamePublic.sources||[]).some(row=>/naver\.me|app\.notion\.com/.test(String(row.url||''))),false,'머니게임 Naver/Notion 내부 자료원은 공개 API에서 제거되어야 합니다');
assert.deepEqual((justserver?.participantGroups||[]).map(row=>row.count),[50,49,50,49,45],'머니게임 입주 공지의 원문 표기 그룹 개수를 보존해야 합니다');
assert.equal((justserver?.participantGroups||[]).reduce((sum,row)=>sum+(row.participants||[]).length,0),243,'머니게임 입주 공지에서 분리 가능한 닉네임 표기는 243개여야 합니다');
assert.equal((justserver?.participants||[]).length,191,'머니게임 BNGTS 교차 참가자 명단은 191명이어야 합니다');
assert.equal(new Set(justserver?.participants||[]).size,191,'머니게임 BNGTS 참가자 명단은 중복이 없어야 합니다');
for(const name of ['#시나몬','강다래','김뽁분','냥냥두둥','도람지','뚜닝','래노♬']) assert.ok((justserver?.participants||[]).includes(name),`머니게임 BNGTS 참가자 누락: ${name}`);
assert.ok((justserver?.results||[]).some(row=>row.title==='방통실 등록 참가자'&&/191명/.test(row.value||'')),'머니게임 방통실 191명 교차 집계를 별도 표기해야 합니다');

assert.ok((justserver?.timeline||[]).some(row=>row.id==='money-entry-order'&&row.date==='2026-06-21'),'머니게임 입주 순서 공지 날짜를 보존해야 합니다');
assert.ok((justserver?.results||[]).some(row=>row.title==='주요 콘텐츠'&&/채광/.test(row.value||'')&&/갬블/.test(row.value||'')),'머니게임 Notion의 주요 콘텐츠 구조를 반영해야 합니다');
for(const id of ['203683207','204093563','204274449','206972857','207425471','207516943','207564927']) assert.ok((survival?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`&&row.visibility!=='internal'),`적자생존 공개 SOOP 게시글 누락: ${id}`);
const protectedSurvival=(survival?.timeline||[]).find(row=>row.id==='survival-soop-post-207564735');
assert.equal(protectedSurvival?.visibility,'internal','207564735는 애청자 공개글이므로 내부 검증 자료로 분리해야 합니다');
assert.equal((survival?.sources||[]).find(row=>row.id==='source-survival-post-207564735')?.visibility,'internal','207564735 출처도 공개 목록에서 숨겨야 합니다');
const secondEntry=(survival?.timeline||[]).find(row=>row.id==='survival-soop-post-207564927');
assert.equal(secondEntry?.title,'[모집] 그냥서버:적자생존 2차입주 모집공지');
assert.equal(secondEntry?.date,'2026-09-19');
assert.match(String(secondEntry?.thumbnail||''),/83091789821197973\.png$/,'2차 입주 모집 공지 이미지를 보존해야 합니다');
const survivalPublic=toPublicArchiveItem(normalizeArchiveItem(survival));
assert.equal((survivalPublic.timeline||[]).some(row=>/207564735/.test(String(row.url||''))||row.id==='survival-soop-post-207564735'),false,'애청자 공개글은 공개 타임라인에서 숨겨야 합니다');
assert.ok((survivalPublic.timeline||[]).some(row=>/207564927/.test(String(row.url||''))),'공개 2차 입주 모집글은 팬사이트에 표시해야 합니다');
assert.ok((survival?.sources||[]).some(row=>row.url==='https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975'),'적자생존 Notion 자료가 필요합니다');

assert.ok((psyContest1?.participants||[]).includes('시로코'),'제1회는 시로코 참가 교차 기록을 유지해야 합니다');
assert.ok((psyContest1?.gallery||[]).length>=1,'제1회 아카이브 커버가 필요합니다');
assert.ok((psyContest2?.gallery||[]).length>=1,'제2회 아카이브 커버가 필요합니다');

const justserverDiamond=seed.items.find(item=>item.id==='justserver-diamond');
assert.ok(justserverDiamond?.published,'그냥서버 1 아카이브가 공개되어야 합니다');
assert.equal(justserverDiamond?.startDate,'2026-04-09');
assert.equal(justserverDiamond?.endDate,'2026-04-16');
assert.equal(justserverDiamond?.series?.id,'justserver');
for(const id of ['192233707','192317079','192401771','192510763','192581897','192845469','192962357']) assert.ok((justserverDiamond?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`그냥서버 1 VOD 누락: ${id}`);
for(const url of ['https://www.sooplive.com/station/chunbongtv/post/192179233','https://sdmv.notion.site/what','https://bngts.com/contents/just','https://bngts.com/contents/just/streamers']) assert.ok((justserverDiamond?.sources||[]).some(row=>row.url===url),`그냥서버 1 출처 누락: ${url}`);
const diamondRecruit=(justserverDiamond?.timeline||[]).find(row=>row.id==='diamond-recruit-post');
assert.equal(diamondRecruit?.title,'그냥 서버 열었습니다..','그냥서버 1 SOOP 원문 제목을 사용해야 합니다');
assert.equal(diamondRecruit?.date,'2026-04-09','그냥서버 1 모집글 작성일을 반영해야 합니다');
assert.match(String(diamondRecruit?.thumbnail||''),/stimg\.sooplive\.com\/NORMAL_BBS\/3\/24883333\/276969d66b48e4b72\.png$/,'그냥서버 1 모집 홍보 이미지를 사용해야 합니다');
assert.ok((justserverDiamond?.results||[]).some(row=>row.title==='초기 모집 정원'&&/50명/.test(row.value||'')),'그냥서버 1 초기 모집 정원 50명을 구분해 기록해야 합니다');

assert.equal(survival?.status,'planned','적자생존은 예정 콘텐츠 상태여야 합니다');
assert.equal(survival?.startDate,'2026-09-30');
assert.equal(survival?.endDate,'2026-10-21');
assert.ok((survival?.timeline||[]).some(row=>row.url==='https://www.sooplive.com/station/chunbongtv/post/204274449'&&/UP 랭킹/.test(row.title||'')),'적자생존 신청/UP 랭킹 원문 역할이 표시되어야 합니다');

for(const id of ['201292605','202198589','203211299','204037695']) assert.ok((chuntacle?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`춘타클 VOD 누락: ${id}`);
for(const url of ['https://www.youtube.com/watch?v=b-jlKXqLakU','https://www.youtube.com/watch?v=gJKw13B7ydc','https://www.youtube.com/watch?v=8rnQKGwa1qw&t=4s']) assert.ok((chuntacle?.media||[]).some(row=>row.url===url),`춘타클 YouTube 누락: ${url}`);
assert.equal((chuntacle?.sources||[]).some(row=>/fmkorea\.com/i.test(String(row.url||''))),false,'춘타클은 FM코리아 자료를 사용하지 않아야 합니다');

assert.ok((leopel?.results||[]).some(row=>/671명/.test(row.value||'')),'레오펠 최종 참여자 671명 기록이 필요합니다');
assert.ok((leopel?.results||[]).some(row=>/1차 입주/.test(row.title||'')&&/140명/.test(row.value||'')),'레오펠 1차 입주 140명 기록이 필요합니다');
assert.ok((leopel?.results||[]).some(row=>/2차 입주/.test(row.title||'')&&/171명/.test(row.value||'')),'레오펠 2차 입주 171명 기록이 필요합니다');

const hiddenSourceItem=normalizeArchiveItem({
  id:'hidden-provenance',title:'숨김 출처 테스트',category:'other',role:'주최',status:'ended',startDate:'2026',endDate:'2026',datePrecision:'year',
  summary:'테스트',description:'테스트',heroImage:null,participants:[],results:[],seriesSessions:[],
  timeline:[{id:'internal-row',type:'reference',title:'내부 타임라인',date:'',datePrecision:'unknown',url:'https://bngts.com/internal-test',sourceId:'internal-source',visibility:'internal'}],
  media:[],gallery:[],
  sources:[
    {id:'public-source',kind:'official',label:'공개',url:'https://www.sooplive.com/station/chunbongtv',visibility:'public'},
    {id:'internal-source',kind:'reference',label:'내부',url:'https://bngts.com/internal-test',visibility:'internal'}
  ],
  verification:{state:'official',verifiedAt:'2026-09-22',conflicts:[]},published:true
});
const hiddenPublic=toPublicArchiveItem(hiddenSourceItem);
assert.equal(hiddenPublic.sources.length,1,'internal provenance sources must stay hidden from the public archive');
assert.equal(hiddenPublic.timeline.length,0,'internal-only reference timeline rows must stay hidden from the public archive');
assert.equal(hiddenPublic.sourceCount,1,'public source count must exclude internal provenance');

const mergeVisibility=archiveApi._internals.mergeArchiveRows(
  [{...hiddenSourceItem,id:'visibility-merge'}],
  [{...hiddenSourceItem,id:'visibility-merge',sources:hiddenSourceItem.sources.map(row=>({...row,visibility:'public'})),timeline:hiddenSourceItem.timeline.map(row=>({...row,visibility:'public'}))}]
);
assert.equal(mergeVisibility[0].sources.find(row=>row.id==='internal-source')?.visibility,'internal','curated internal source visibility must survive stored records');
assert.equal(mergeVisibility[0].timeline.find(row=>row.id==='internal-row')?.visibility,'internal','curated internal material visibility must survive stored records');

assert.ok(archiveApi._internals.allowedSourceMetaUrl('https://www.sooplive.com/station/chunbongtv/post/1'),'SOOP source metadata URL should be allowed');
assert.ok(archiveApi._internals.allowedSourceMetaUrl('https://example.notion.site/example'),'public Notion source metadata URL should be allowed');
assert.ok(archiveApi._internals.allowedSourceMetaUrl('https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d'),'public app.notion.com source metadata URL should be allowed');
assert.ok(archiveApi._internals.allowedSourceMetaUrl('https://naver.me/FbVX1U7z'),'Naver source metadata URL should be allowed');
assert.equal(archiveApi._internals.allowedSourceMetaUrl('https://www.fmkorea.com/7042989434'),null,'FM Korea must stay excluded from archive source ingestion');
assert.equal(archiveApi._internals.allowedSourceMetaUrl('http://127.0.0.1/private'),null,'local/non-HTTPS source metadata URL must be rejected');

for(const item of seed.items){
  assert.equal((item.sources||[]).some(source=>/fmkorea\.com/i.test(String(source.url||''))),false,`FM코리아 출처는 사용하지 않아야 합니다: ${item.id}`);
  for(const source of item.sources||[]){
    const internal=/bngts\.com|streamscharts\.com/.test(String(source.url||''));
    if(internal)assert.equal(source.visibility,'internal',`internal reference source should not be public: ${source.url}`);
  }
}

const leopelGroupsItem=seed.items.find(item=>item.id==='leopel');
assert.equal(leopelGroupsItem?.participantGroups?.length,3,'레오펠은 1차/2차 플랫폼별 참가자 그룹을 제공해야 합니다');
assert.deepEqual((leopelGroupsItem?.participantGroups||[]).map(group=>group.count),[140,127,44],'레오펠 참가자 그룹 인원수가 교차 자료와 일치해야 합니다');
assert.equal((leopelGroupsItem?.participantGroups||[]).reduce((sum,group)=>sum+(group.participants||[]).length,0),311,'레오펠 1·2차 확인 명단은 총 311명이어야 합니다');
assert.match(String(leopelGroupsItem?.heroImage?.src||''),/res\.cloudinary\.com\/lyppgyei\/.*\/leopel\/logo\.webp$/,'레오펠 대표 이미지는 실제 보존 로고를 사용해야 합니다');

const survivalEnriched=seed.items.find(item=>item.id==='justserver-survival');
for(const id of ['survival-prep-applicants','survival-prep-before-open','survival-prep-qa','survival-prep-briefing']){
  assert.ok((survivalEnriched?.timeline||[]).some(row=>row.id===id),`적자생존 준비 방송 타임라인 누락: ${id}`);
}
assert.ok((survivalEnriched?.sources||[]).some(row=>row.id==='source-survival-streams'&&row.visibility==='internal'),'적자생존 Streams Charts 근거는 내부 검증용이어야 합니다');

const groupMerge=archiveApi._internals.mergeArchiveRows(
  [{...leopelGroupsItem,id:'group-merge'}],
  [{...leopelGroupsItem,id:'group-merge',participantGroups:[]}]
);
assert.equal(groupMerge[0].participantGroups.length,3,'기존 저장 레코드가 비어 있어도 seed 참가자 그룹을 보존해야 합니다');

const diamondGroupMerge=archiveApi._internals.mergeArchiveRows(
  [diamondBackfill],
  [{...diamondBackfill,participantGroups:[{id:'old-partial',title:'부분 명단',platform:'SOOP',count:48,participants:(diamondParticipantGroup?.participants||[]).slice(0,48)}]}]
);
assert.equal(diamondGroupMerge[0]?.participantGroups?.[0]?.count,189,'더 완전한 seed 참가자 그룹이 예전 부분 저장 레코드보다 우선해야 합니다');
assert.equal(diamondGroupMerge[0]?.participantGroups?.[0]?.participants?.length,189,'189명 전체 명단이 저장 레코드 병합 뒤에도 보존되어야 합니다');
const chuntacleMerge=archiveApi._internals.mergeArchiveRows(
  [chuntacle],
  [{...chuntacle,timeline:(chuntacle.timeline||[]).slice(0,3),gallery:(chuntacle.gallery||[]).slice(0,3),seriesSessions:(chuntacle.seriesSessions||[]).slice(0,4)}]
);
assert.ok(chuntacleMerge[0].timeline.length>=5,'최신 seed 춘타클 타임라인이 오래된 저장본에 의해 누락되면 안 됩니다');
assert.equal(chuntacleMerge[0].gallery.length,5,'최신 seed 춘타클 포스터 5장이 오래된 저장본에 의해 누락되면 안 됩니다');
assert.equal(chuntacleMerge[0].seriesSessions.length,5,'최신 seed 춘타클 5회 구조가 오래된 저장본보다 우선해야 합니다');


const psy2Confirmed=seed.items.find(item=>item.id==='psy-emotion-song-contest-2');
assert.equal(psy2Confirmed?.startDate,'2026-04-28','싸이감성 2회 개최일은 2026-04-28로 교차 확인되어야 합니다');
assert.equal(psy2Confirmed?.endDate,'2026-04-28','싸이감성 2회 단일 개최일 종료일이 일치해야 합니다');
assert.ok((psy2Confirmed?.sources||[]).some(row=>row.id==='source-psy2-streams'&&row.visibility==='internal'),'싸이감성 2회 Streams Charts는 내부 검증용이어야 합니다');
assert.ok((psy2Confirmed?.timeline||[]).some(row=>row.id==='psy2-event-day'&&row.date==='2026-04-28'),'싸이감성 2회 개최일 타임라인이 필요합니다');

const archiveCss=fs.readFileSync(new URL('../chunbong-contents.css',import.meta.url),'utf8');
assert.match(archiveCss,/archive-card\{display:grid;grid-template-rows:auto 1fr;height:100%\}/,'archive cards should use a uniform height layout');
assert.match(archiveCss,/@media\(min-width:1280px\)\{\.archive-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}\}/,'desktop archive should use a consistent four-column card grid');
const vercelConfig=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
assert.ok(!Array.isArray(vercelConfig.crons)||vercelConfig.crons.length===0,'Hobby deployment must keep scheduled work in GitHub Actions, not Vercel cron');
const pushWorkflow=fs.readFileSync(new URL('../.github/workflows/push-dispatch.yml',import.meta.url),'utf8');
assert.match(pushWorkflow,/content-archive-auto-sync/,'scheduled GitHub OIDC workflow should refresh the official content archive');
