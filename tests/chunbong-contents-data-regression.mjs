import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {normalizeArchiveItem,validateArchiveItem,formatArchiveDate}=require('../lib/chunbong-content-archive-core.js');

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

const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(seed.items));
assert.ok(seed.items.some(item=>item.published===true),'at least one verified archive item should ship publicly');
const leopel=seed.items.find(item=>item.id==='leopel');
assert.ok(leopel?.published,'verified Leopol record should be publicly seeded');
assert.ok((leopel?.sources||[]).length>=2,'Leopol should be cross-checked with multiple public sources');
assert.equal(leopel?.role,'주최 · 기획','Leopol role should match directly supported source wording');
for(const item of seed.items) assert.deepEqual(validateArchiveItem(normalizeArchiveItem(item),{publishing:true}),[]);

console.log('chunbong contents data regression passed');

const archiveApi=require('../lib/chunbong-content-archive-api.js');
const rows=archiveApi._internals.publicRows([
  {...monthOnly,id:'visible',published:true},
  {...monthOnly,id:'draft',published:false}
]);
assert.deepEqual(rows.map(row=>row.id),['visible']);
assert.ok(!('verification' in rows[0]));


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
for(const id of ['leopel','justserver-moneygame','psy-emotion-song-contest-2026']){
  assert.ok(publishedIds.has(id),`verified archive seed missing ${id}`);
}
const justserver=seed.items.find(item=>item.id==='justserver-moneygame');
assert.equal(justserver?.startDate,'2026-06-24');
assert.equal(justserver?.endDate,'2026-07-15');
assert.ok((justserver?.sources||[]).some(source=>/sooplive\.com/.test(source.url)),'JustServer should include a SOOP source');
assert.match(String(justserver?.heroImage?.src||''),/^\/assets\/chunbong-contents\//);

const psyContest=seed.items.find(item=>item.id==='psy-emotion-song-contest-2026');
assert.equal(psyContest?.startDate,'2026-04-28');
assert.ok((psyContest?.sources||[]).length>=2,'song contest should be cross-checked');
assert.match(String(psyContest?.heroImage?.src||''),/^\/assets\/chunbong-contents\//);


const chuntacle=seed.items.find(item=>item.id==='chuntacle-2026');
assert.ok(chuntacle?.published,'춘타클 should be included in the public content archive');
assert.equal(chuntacle?.category,'class-event');
assert.match(String(chuntacle?.heroImage?.src||''),/^\/assets\/chunbong-contents\/chuntacle-/);
assert.ok((chuntacle?.timeline||[]).length>=3,'춘타클 should expose multiple class sessions in its timeline');
assert.ok((chuntacle?.participants||[]).length>=10,'춘타클 should list confirmed students from archived class records');
assert.ok((chuntacle?.results||[]).length>=2,'춘타클 should summarize confirmed class sessions');
assert.ok((chuntacle?.gallery||[]).length>=2,'춘타클 should include visual archive material');

const chuntacleSessions=chuntacle?.seriesSessions||[];
assert.equal(chuntacleSessions.length,5,'춘타클 should expose sessions 1 through 5');
assert.deepEqual(chuntacleSessions.map(row=>row.number),[1,2,3,4,5],'춘타클 session order should stay chronological');
assert.deepEqual(chuntacleSessions.map(row=>row.date),['2026-07-11','2026-07-21','2026-08-02','2026-08-11','2026-09-14'],'춘타클 session dates should stay corrected');
assert.equal(chuntacleSessions.find(row=>row.number===2)?.time,'08:00');
assert.equal(chuntacleSessions.find(row=>row.number===3)?.time,'20:00');
assert.equal(chuntacleSessions.find(row=>row.number===4)?.time,'08:00');
const chuntacleSession5=chuntacleSessions.find(row=>row.number===5);
assert.equal(chuntacleSession5?.time,'08:00');
assert.equal(chuntacleSession5?.participantCount,5);
for(const name of ['김뽁분','김잇딥','문이유','연주홍','클라비스']) assert.ok((chuntacleSession5?.participants||[]).includes(name),`춘타클 5회 수강생 누락: ${name}`);
assert.equal(chuntacleSession5?.poster?.status,'verified');
assert.equal(chuntacleSession5?.poster?.src,'/assets/chunbong-contents/chuntacle-session-5.svg');
assert.ok((chuntacle?.timeline||[]).some(row=>row.id==='session-5-final-poster'&&row.date==='2026-09-14'),'춘타클 5회 최종 포스터 기록이 필요합니다');
assert.ok(!(chuntacle?.timeline||[]).some(row=>row.date==='2026-09-14'&&/4회/.test(row.title||'')),'9월 14일 기록을 4회로 잘못 표기하면 안 됩니다');
const chuntaclePosterSvg=fs.readFileSync(new URL('../assets/chunbong-contents/chuntacle-session-5.svg',import.meta.url),'utf8');
assert.match(chuntaclePosterSvg,/data:image\/webp;base64,UklG/,'춘타클 5회 실제 포스터 이미지가 내부 자산에 포함되어야 합니다');
assert.ok(chuntaclePosterSvg.length>14000,'춘타클 5회 포스터 자산이 비정상적으로 잘리면 안 됩니다');
assert.equal(fs.existsSync(new URL('../assets/chunbong-contents/chuntacle-session-4.svg',import.meta.url)),false,'9월 14일을 4회로 잘못 표기한 구 자산은 남기면 안 됩니다');


assert.ok((leopel?.media||[]).some(row=>/159711687/.test(row.url)),'Leopel should link the verified SOOP presentation VOD');
assert.ok((leopel?.gallery||[]).length>=2,'Leopel detail should have visual archive material');
assert.ok((justserver?.media||[]).length>=2,'JustServer should include multiple verified SOOP Catch records');
assert.ok((justserver?.gallery||[]).length>=2,'JustServer detail should have visual archive material');
const survival=seed.items.find(item=>item.id==='justserver-survival');
assert.ok(survival,'적자생존 콘텐츠 항목이 필요합니다');
const moneyVodIds=['199701961','199731549','199911259','200010937','200150005','200191013','200238669','200257689','200295759','200393761','200401503','200477587','200609959','200775197','200812787','200857709','200893769','200917923','200956235','201043833','201146469','201223669','201329381','201384951','201524161','201595413'];
for(const id of moneyVodIds) assert.ok((justserver?.media||[]).some(row=>row.url===`https://vod.sooplive.com/player/${id}`),`머니게임 VOD 누락: ${id}`);
for(const id of ['197785319','199568663','199830351']) assert.ok((justserver?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`),`머니게임 SOOP 게시글 누락: ${id}`);
for(const url of ['https://naver.me/5qLX1yQ1','https://buly.kr/2ffytJ1','https://bngts.com/contents/geunyangseobeo-meonigeim','https://bngts.com/contents/geunyangseobeo-meonigeim/streamers']) assert.ok((justserver?.sources||[]).some(row=>row.url===url),`머니게임 참고 자료 누락: ${url}`);
for(const id of ['203683207','204093563','204274449','206972857','207425471','207516943','207564735']) assert.ok((survival?.timeline||[]).some(row=>row.url===`https://www.sooplive.com/station/chunbongtv/post/${id}`),`적자생존 SOOP 게시글 누락: ${id}`);
assert.ok((survival?.sources||[]).some(row=>row.url==='https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975'),'적자생존 Notion 자료가 필요합니다');

assert.ok((psyContest?.participants||[]).includes('시로코'),'song contest should include confirmed participant evidence');
assert.ok((psyContest?.gallery||[]).length>=2,'song contest detail should have visual archive material');
