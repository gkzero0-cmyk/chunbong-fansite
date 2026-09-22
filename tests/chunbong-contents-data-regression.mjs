import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {normalizeArchiveItem,validateArchiveItem,formatArchiveDate,toPublicArchiveItem}=require('../lib/chunbong-content-archive-core.js');
const autoIngest=require('../lib/chunbong-content-auto-ingest.js');

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

assert.equal(autoIngest.genericTitle('춘타클 관련 YouTube 영상 1'),true,'numbered Chuntacle YouTube placeholders should be treated as generic');
assert.equal(autoIngest.genericTitle('그냥서버 : 머니게임 공식 게시글 1'),true,'numbered official post placeholders should be treated as generic');
assert.equal(autoIngest.genericTitle('레오펠 공식 게시글 · 159705141'),true,'ID-based official post placeholders should be treated as generic');
assert.equal(autoIngest.canonicalMaterialUrl({type:'youtube',url:'https://www.youtube.com/watch?v=8rnQKGwa1qw&t=4s'}),'youtube:8rnQKGwa1qw','YouTube timestamp parameters should not prevent metadata merging');
assert.equal(autoIngest.canonicalMaterialUrl({type:'youtube',url:'https://youtu.be/8rnQKGwa1qw?si=test'}),'youtube:8rnQKGwa1qw','youtu.be URLs should share the same archive identity');

const youtubePlaceholderMerge=autoIngest.attachOfficialDiscoveries([
  {id:'chuntacle-placeholder-test',timeline:[],media:[{id:'seed-youtube',type:'youtube',title:'춘타클 관련 YouTube 영상 3',date:'',datePrecision:'unknown',url:'https://www.youtube.com/watch?v=8rnQKGwa1qw&t=4s',thumbnail:''}]}
],[
  {id:'auto-youtube-youtube-8rnQKGwa1qw',type:'youtube',title:'춘타클 실제 영상 제목',date:'2026-08-11',datePrecision:'day',url:'https://www.youtube.com/watch?v=8rnQKGwa1qw',thumbnail:'https://i.ytimg.com/vi/8rnQKGwa1qw/hq720.jpg'}
]);
assert.equal(youtubePlaceholderMerge.rows[0].media.length,1,'same YouTube video with a timestamp URL should merge instead of duplicating');
assert.equal(youtubePlaceholderMerge.rows[0].media[0].title,'춘타클 실제 영상 제목','official YouTube metadata should replace a generic curated title');
assert.equal(youtubePlaceholderMerge.rows[0].media[0].date,'2026-08-11','official YouTube metadata should fill a missing date');
assert.match(youtubePlaceholderMerge.rows[0].media[0].thumbnail,/i\.ytimg\.com/,'official YouTube metadata should fill a missing thumbnail');

const postPlaceholderMerge=autoIngest.attachOfficialDiscoveries([
  {id:'leopel-placeholder-test',timeline:[{id:'seed-post',type:'post',title:'레오펠 공식 게시글 · 159705141',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/159705141',thumbnail:''}],media:[]}
],[
  {id:'auto-soop-post-159705141',type:'post',title:'레오펠 모험가 모집 공지',date:'2025-05-11',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/159705141',thumbnail:'https://stimg.sooplive.com/example.png'}
]);
assert.equal(postPlaceholderMerge.rows[0].timeline.length,1,'same SOOP post should merge instead of duplicating');
assert.equal(postPlaceholderMerge.rows[0].timeline[0].title,'레오펠 모험가 모집 공지','official SOOP metadata should replace an ID placeholder title');
assert.equal(postPlaceholderMerge.rows[0].timeline[0].date,'2025-05-11','official SOOP metadata should fill a missing post date');


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
assert.match(String(diamondBackfill?.heroImage?.src||''),/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fill,g_auto,h_900,w_1600\/f_webp\/q_auto:best\/v\d+\/chunbong-fansite\/justserver\/diamond-material-source\.webp$/,'그냥서버 다이아는 자료 이미지 원본을 기반으로 만든 16:9 대표 이미지를 사용해야 합니다');
for(const row of diamondBackfill?.media||[]){
  if(!/vod\.sooplive\.com\/player\/(192233707|192317079|192401771|192510763|192581897|192845469|192962357)/.test(row.url||''))continue;
  assert.match(String(row.thumbnail||''),/^https:\/\/videoimg\.sooplive\.com\//,'다이아 VOD는 실제 SOOP 썸네일을 사용해야 합니다');
  assert.ok(!/다시보기 \d{2}$/.test(String(row.title||'')),'다이아 VOD 임시 제목이 남으면 안 됩니다');
}

assert.ok((diamondBackfill?.results||[]).some(row=>row.title==='명단 구조화'&&/189명 확인/.test(row.value||'')),'그냥서버 1 명단 구조화는 전체 189명 완료 상태여야 합니다');

console.log('chunbong contents data regression passed');

const archiveApi=require('../lib/chunbong-content-archive-api.js');
assert.equal(archiveApi._internals.shouldForcePublicAutoSync({githubOidc:true,migrationMarker:''}),true,'the first authenticated GitHub archive sync after this migration should run a full rescan');
assert.equal(archiveApi._internals.shouldForcePublicAutoSync({githubOidc:true,migrationMarker:'done'}),false,'completed migration should return to incremental archive sync');
assert.equal(archiveApi._internals.shouldForcePublicAutoSync({githubOidc:false,migrationMarker:''}),false,'same-site/browser sync must never trigger the expensive migration full scan');
assert.match(archiveApi._internals.AUTO_FULL_MIGRATION_KEY,/placeholder-identity/,'full rescan migration should have an explicit versioned key');
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
assert.match(String(justserver?.heroImage?.src||''),/^https:\/\//,'머니게임 대표 이미지는 실제 공식/방송 이미지여야 합니다');
assert.match(String(justserver?.heroImage?.src||''),/justserver\/moneygame-selected-vod-200917923\.jpg$/,'머니게임은 사용자가 지정한 다시보기 이미지를 대표로 사용해야 합니다');
assert.match(String(justserver?.series?.cover?.src||''),/justserver\/moneygame-selected-vod-200917923\.jpg$/,'그냥서버 시리즈 대표 이미지도 사용자 지정 머니게임 다시보기여야 합니다');

const psyContest1=seed.items.find(item=>item.id==='psy-emotion-song-contest-1');
const psyContest2=seed.items.find(item=>item.id==='psy-emotion-song-contest-2');
assert.ok(psyContest1?.published&&psyContest2?.published,'싸이감성 노래자랑 1·2회는 각각 공개 레코드여야 합니다');
assert.equal(psyContest1?.series?.id,'psy-emotion-song-contest');
assert.equal(psyContest2?.series?.id,'psy-emotion-song-contest');
assert.match(String(psyContest1?.series?.cover?.src||''),/psy\/series-selected-source\.jpg$/,'싸이감성 시리즈 대표 이미지는 사용자가 지정한 제1회 실제 VOD 이미지를 사용해야 합니다');
assert.equal(psyContest2?.series?.cover?.src,psyContest1?.series?.cover?.src,'싸이감성 제1·2회는 같은 실제 자료 기반 시리즈 커버를 사용해야 합니다');
assert.equal(psyContest1?.datePrecision,'unknown','1회 날짜는 원문 확인 전 임의 확정하지 않습니다');
assert.equal(psyContest2?.datePrecision,'day','2회 날짜는 교차 확인된 개최일 기준으로 일 단위여야 합니다');
assert.equal(psyContest2?.startDate,'2026-04-28','2회 개최일은 2026-04-28이어야 합니다');
assert.ok((psyContest1?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/chunbongtv/post/124321185'),'1회 SOOP 모집글이 필요합니다');
assert.ok((psyContest1?.gallery||[]).some(row=>row.id==='psy1-official-poster'&&/psy\/session-1-official-poster\.webp$/.test(String(row.src||''))&&row.sourceId==='source-psy1-recruit'),'1회 자료 이미지에는 SOOP 게시글 124321185의 공식 포스터가 포함되어야 합니다');
assert.ok((psyContest1?.media||[]).some(row=>row.url==='https://vod.sooplive.com/player/127480069'),'1회 SOOP VOD가 필요합니다');
assert.ok((psyContest1?.participants||[]).includes('시네_'),'제1회 원문 참가명 시네_가 필요합니다');
assert.equal((psyContest1?.participants||[]).includes('시로코'),false,'시네_와 동일 인물인 시로코를 별도 인원으로 중복 계산하면 안 됩니다');
assert.ok((psyContest1?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/gkzero/post/207829703'&&row.visibility==='internal'),'1회 참가 순서 보관본은 내부 SOOP 검증 자료로 유지해야 합니다');
assert.equal((psyContest1?.participantGroups||[]).find(row=>row.id==='psy1-confirmed-order')?.count,36,'1회 보존 원문 경연 순서는 36명이어야 합니다');
assert.equal(psyContest1?.participants?.length,36,'1회 참가자는 시네_=시로코 동일인 처리 후 36명이어야 합니다');
assert.ok((psyContest1?.results||[]).some(row=>row.title==='확인된 참가자'&&/시네_.*시로코|시로코.*시네_/.test(row.value||'')),'시네_와 시로코 동일 인물 메모를 유지해야 합니다');
assert.ok((psyContest2?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/chunbongtv/post/192031471'),'2회 SOOP 모집글이 필요합니다');
assert.ok((psyContest2?.media||[]).some(row=>row.url==='https://vod.sooplive.com/player/194116989'),'2회 SOOP VOD가 필요합니다');
assert.ok((psyContest2?.sources||[]).some(row=>row.url==='https://www.sooplive.com/station/gkzero/post/207830229'&&row.visibility==='internal'),'2회 최종 공지 보관본은 내부 SOOP 검증 자료로 유지해야 합니다');
assert.equal((psyContest2?.participantGroups||[]).find(row=>row.id==='psy2-confirmed-order')?.count,22,'2회 경연 순서는 22명이어야 합니다');
assert.ok((psyContest2?.results||[]).some(row=>row.title==='심사위원'&&/춘봉/.test(row.value||'')&&/릴파/.test(row.value||'')),'2회 심사위원 정보가 필요합니다');
assert.ok((psyContest2?.results||[]).some(row=>row.title==='총상금'&&/100만 원/.test(row.value||'')&&/13,000개/.test(row.value||'')),'2회 상금 계획이 필요합니다');
assert.match(String(psyContest1?.heroImage?.src||''),/^https:\/\//,'싸이감성 1회 대표 이미지는 실제 SOOP VOD 이미지여야 합니다');
assert.match(String(psyContest2?.heroImage?.src||''),/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/psy\/session-2-selected-first-material\.png$/,'싸이감성 2회 대표 이미지는 자료 이미지 첫 번째 공식 이미지를 사용해야 합니다');


const chuntacle=seed.items.find(item=>item.id==='chuntacle-2026');
assert.ok(chuntacle?.published,'춘타클 should be included in the public content archive');
assert.equal(chuntacle?.category,'class-event');
assert.match(String(chuntacle?.heroImage?.src||''),/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/chuntacle\/series-cover-16x9\.webp$/,'춘타클 대표 이미지는 공식 로고 기반 16:9 영구 자산이어야 합니다');
assert.equal(chuntacle?.series?.cover?.src,chuntacle?.heroImage?.src,'춘타클 시리즈 카드와 상세 대표 이미지는 같은 공식 16:9 자산을 사용해야 합니다');
assert.ok((chuntacle?.timeline||[]).length>=5,'춘타클 should expose all five class sessions in its timeline');
assert.ok((chuntacle?.participants||[]).length>=19,'춘타클 should list students confirmed by the five archived posters');
assert.ok((chuntacle?.results||[]).length>=5,'춘타클 should summarize all five confirmed class sessions');
assert.equal((chuntacle?.gallery||[]).length,5,'춘타클 gallery should contain the five actual posters');
for(const id of ['201292605','202198589','203211299','204037695']){
  const row=(chuntacle?.media||[]).find(item=>String(item.url||'').includes(id));
  assert.ok(row,'춘타클 VOD 누락: '+id);
  assert.match(String(row.thumbnail||''),/^https:\/\/videoimg\.sooplive\.com\//,'춘타클 VOD 실제 썸네일 누락: '+id);
}


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
  assert.match(session.poster?.src||'',/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fill,g_center,h_900,w_1600\/f_webp\/q_auto:best\/v\d+\/chunbong-fansite\/chuntacle\/session-[1-5]\.webp$/,`춘타클 ${session.number}회 포스터는 동일한 1600×900 표시 자산을 사용해야 합니다`);
}
assert.ok((chuntacle?.timeline||[]).some(row=>row.id==='session-5-final-poster'&&row.date==='2026-09-14'),'춘타클 5회 최종 포스터 기록이 필요합니다');
assert.ok(!(chuntacle?.timeline||[]).some(row=>row.date==='2026-09-14'&&/4회/.test(row.title||'')),'9월 14일 기록을 4회로 잘못 표기하면 안 됩니다');
for(const row of chuntacle?.gallery||[]) assert.match(row.src||'',/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fill,g_center,h_900,w_1600\/f_webp\/q_auto:best\/v\d+\/chunbong-fansite\/chuntacle\/session-[1-5]\.webp$/,'춘타클 갤러리는 동일한 1600×900 실제 포스터 자산을 사용해야 합니다');


for(const id of ['159705141','161715755','163281747','165257051']) assert.ok((leopel?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`),`레오펠 SOOP 게시글 누락: ${id}`);
for(const id of ['159715611','165343833','167705699']) assert.ok((leopel?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`레오펠 VOD 누락: ${id}`);
assert.ok((leopel?.sources||[]).some(row=>row.url==='https://namu.wiki/w/%EB%A0%88%EC%98%A4%ED%8E%A0'),'레오펠 나무위키 자료가 필요합니다');
assert.ok((leopel?.gallery||[]).some(row=>/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/leopel\/logo\.webp$/.test(row.src||'')),'레오펠 실제 로고 자산이 갤러리에 필요합니다');
assert.ok((leopel?.media||[]).some(row=>/159711687/.test(row.url)),'Leopel should link the verified SOOP presentation VOD');
for(const id of ['159711687','159715611','165343833','167705699']){
  const row=(leopel?.media||[]).find(item=>String(item.url||'').includes(id));
  assert.ok(row,'레오펠 VOD 누락: '+id);
  assert.match(String(row.thumbnail||''),/^https:\/\//,'레오펠 VOD 실제 썸네일 누락: '+id);
  assert.ok(!/^레오펠 SOOP VOD/.test(String(row.title||'')),'레오펠 VOD 번호형 임시 제목이 남으면 안 됩니다');
}

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
assert.match(String(survival?.heroImage?.src||''),/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/c_fill,g_auto,h_900,w_1600\/f_webp\/q_auto:best\/v\d+\/chunbong-fansite\/justserver\/survival-source\.webp$/,'적자생존 대표 이미지는 공식 SOOP 첨부 이미지 기반 16:9 자산이어야 합니다');
assert.deepEqual((survival?.participantGroups||[]).map(row=>row.count),[100,100,100,100,100],'적자생존 1차 입주자는 100명씩 5개조여야 합니다');
assert.equal((survival?.participantGroups||[]).reduce((sum,row)=>sum+(row.participants||[]).length,0),500,'적자생존 1차 입주자 500명 전체 명단을 구조화해야 합니다');
assert.equal((survival?.participants||[]).length,500,'적자생존 검색용 참가자 명단도 500명이어야 합니다');
for(const name of ['미도。','돗챠','김잇딥','냥냥두둥','비재','연주홍','하밍','채윤아']) assert.ok((survival?.participants||[]).includes(name),`적자생존 1차 입주자 누락: ${name}`);
assert.ok((survival?.results||[]).some(row=>row.title==='1차 입주자'&&/500명/.test(row.value||'')),'적자생존 500명 1차 입주 기록이 필요합니다');
assert.ok((survival?.results||[]).some(row=>row.title==='1차 입장 시간'&&/18:00/.test(row.value||'')&&/20:00/.test(row.value||'')),'적자생존 5개조 입장 시간이 필요합니다');
const survivalVod=(survival?.media||[]).find(row=>row.url==='https://vod.sooplive.com/player/207560243');
assert.equal(survivalVod?.title,'7시 그냥서버:적자생존 설명회');
assert.match(String(survivalVod?.thumbnail||''),/^https:\/\/videoimg\.sooplive\.com\//,'적자생존 설명회 실제 VOD 썸네일이 필요합니다');

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

assert.ok((psyContest1?.results||[]).some(row=>/시네_/.test(String(row.value||''))&&/시로코/.test(String(row.value||''))),'제1회 시네_와 시로코 동일인 교차 기록을 유지해야 합니다');
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
assert.match(String(leopelGroupsItem?.heroImage?.src||''),/^https:\/\/res\.cloudinary\.com\/lyppgyei\/image\/upload\/v\d+\/chunbong-fansite\/leopel\/presentation-source\.jpg$/,'레오펠 대표 이미지는 실제 SOOP 발표회 기반 16:9 자산을 사용해야 합니다');

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
const staleChuntaclePoster=(chuntacle.seriesSessions||[]).find(row=>row.number===5)?.poster?.src||'';
const chuntacleMerge=archiveApi._internals.mergeArchiveRows(
  [chuntacle],
  [{...chuntacle,
    heroImage:{src:staleChuntaclePoster,alt:'예전 제5회 포스터'},
    series:{...chuntacle.series,cover:{src:staleChuntaclePoster,alt:'예전 제5회 포스터'}},
    timeline:(chuntacle.timeline||[]).slice(0,3),
    gallery:(chuntacle.gallery||[]).slice(0,3),
    seriesSessions:(chuntacle.seriesSessions||[]).slice(0,4)
  }]
);
assert.ok(chuntacleMerge[0].timeline.length>=5,'최신 seed 춘타클 타임라인이 오래된 저장본에 의해 누락되면 안 됩니다');
assert.equal(chuntacleMerge[0].gallery.length,5,'최신 seed 춘타클 포스터 5장이 오래된 저장본에 의해 누락되면 안 됩니다');
assert.equal(chuntacleMerge[0].seriesSessions.length,5,'최신 seed 춘타클 5회 구조가 오래된 저장본보다 우선해야 합니다');
const staleSameLengthChuntacle={...chuntacle,seriesSessions:(chuntacle.seriesSessions||[]).map(row=>({...row,poster:{...(row.poster||{}),src:'https://example.com/stale-'+row.number+'.webp'}}))};
const sameLengthChuntacleMerge=archiveApi._internals.mergeArchiveRows([chuntacle],[staleSameLengthChuntacle]);
assert.equal(sameLengthChuntacleMerge[0].seriesSessions.length,5,'same-length stored Chuntacle sessions should keep all five curated sessions');
assert.equal(sameLengthChuntacleMerge[0].seriesSessions[0]?.poster?.src,chuntacle.seriesSessions[0]?.poster?.src,'curated 16:9 poster refresh must override stale same-length stored Chuntacle sessions');
const staleSameIdGallery={...chuntacle,gallery:(chuntacle.gallery||[]).map(row=>({...row,src:String(row.src||'').replace('/c_fill,g_center,h_900,w_1600/f_webp/q_auto:best','')}))};
const sameIdGalleryMerge=archiveApi._internals.mergeArchiveRows([chuntacle],[staleSameIdGallery]);
assert.equal(sameIdGalleryMerge[0].gallery.length,chuntacle.gallery.length,'same-id stale Chuntacle gallery rows must not duplicate curated 16:9 refreshes');
assert.equal(sameIdGalleryMerge[0].gallery[0]?.src,chuntacle.gallery[0]?.src,'curated 16:9 Chuntacle gallery asset must override stale same-id stored gallery source');
assert.equal(chuntacleMerge[0].heroImage?.src,chuntacle.heroImage?.src,'오래된 저장 hero가 최신 공식 로고 기반 16:9 대표 이미지를 덮어쓰면 안 됩니다');
assert.equal(chuntacleMerge[0].series?.cover?.src,chuntacle.series?.cover?.src,'오래된 저장 series cover가 최신 공식 16:9 시리즈 커버를 덮어쓰면 안 됩니다');


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
