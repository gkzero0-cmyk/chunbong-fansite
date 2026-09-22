import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');
const autoIngest=require('../lib/chunbong-content-auto-ingest.js');
const content=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
assert.equal(typeof archive._internals.prepareForSave,'function','prepareForSave missing');
const base={id:'sample',title:'샘플',category:'minecraft',role:'주최',status:'ended',startDate:'2026-06',datePrecision:'month',summary:'설명',sources:[{id:'s1',kind:'official',url:'https://www.sooplive.com/station/chunbongtv'}],verification:{state:'official',conflicts:[]},published:false};
const draft=archive._internals.prepareForSave(base,{publish:false});
assert.equal(draft.item.published,false);
assert.throws(()=>archive._internals.prepareForSave({...base,sources:[]},{publish:true}),/published_source_required/);
assert.throws(()=>archive._internals.prepareForSave({...base,verification:{state:'needs_review',conflicts:[{field:'date'}]}},{publish:true}),/unresolved_conflict/);
for(const type of ['operator-content-archive','operator-content-archive-save','operator-content-archive-publish','operator-content-archive-delete','operator-content-auto-sync','operator-content-auto-candidate','content-archive-auto-sync']) assert.ok(content.includes(type),'missing '+type);
console.log('chunbong contents operator API regression passed');

const operatorHtml=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const operatorJs=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const operatorContents=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
assert.match(operatorHtml,/data-operator-tab="contents"/);
assert.match(operatorHtml,/data-operator-panel="contents"/);
assert.match(operatorHtml,/콘텐츠 아카이브/);
assert.match(operatorJs,/loadOperatorContents/);
for(const text of ['operator-content-archive','초안 저장','공개하기','정보 충돌','원문 URL']) assert.ok(operatorContents.includes(text),text);

assert.equal(typeof archive._internals.mergeArchiveRows,'function','seed/stored merge helper missing');
const seedPublished={...base,id:'leopel',title:'시드 레오펠',published:true};
const storedOther={...base,id:'other',title:'운영자 콘텐츠',published:true};
const storedOverride={...base,id:'leopel',title:'운영자 레오펠',published:true};
let merged=archive._internals.mergeArchiveRows([seedPublished],[storedOther]);
assert.deepEqual(merged.map(item=>item.id).sort(),['leopel','other'],'stored records must not hide verified seed records');
merged=archive._internals.mergeArchiveRows([seedPublished],[storedOverride]);
assert.equal(merged.find(item=>item.id==='leopel').title,'운영자 레오펠','stored published record should override the seed with the same id');
assert.match(String(archive._internals.DRAFT_PREFIX||''),/content-archive:draft:v1:/,'draft storage must be separate from public records');
assert.match(String(archive._internals.DRAFT_INDEX||''),/content-archive:draft-index:v1/,'draft index missing');

assert.match(String(archive._internals.HIDDEN_KEY||''),/content-archive:hidden:v1/,'hidden seed tombstone key missing');
assert.equal(typeof archive._internals.withoutHidden,'function','hidden seed filter helper missing');
assert.deepEqual(archive._internals.withoutHidden([seedPublished],['leopel']),[],'deleted seed content must stay hidden while storage is available');
const archiveSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
assert.match(archiveSource,/SADD['\",\s]+HIDDEN_KEY/,'delete must create a seed tombstone');
assert.match(archiveSource,/SREM['\",\s]+HIDDEN_KEY/,'publish must clear a seed tombstone');


for(const token of ['별칭','결과 · 회차 기록','data-result-row','data-move-row','공개 페이지 열기']) assert.ok(operatorContents.includes(token),token);
assert.match(operatorContents,/item\.aliases=/,'operator must collect aliases');
assert.match(operatorContents,/item\.results=/,'operator must collect results');


assert.equal(typeof archive._internals.extractNotionPageId,'function','Notion page id extractor missing');
assert.equal(
  archive._internals.extractNotionPageId('<script>__notion_html_async.push("requiredRedirectMetadata",{"pageId":"33de955a-d773-802f-9f64-f1d63fcff3a4","requiresRedirect":false})</script>','https://sdmv.notion.site/what'),
  '33de955a-d773-802f-9f64-f1d63fcff3a4',
  'Notion public page id should be recovered from boot metadata'
);
const notionRows=archive._internals.notionPageRows({block:{
  root:{value:{value:{id:'root',type:'page',properties:{title:[['루트']]},content:['child']}}},
  child:{value:{value:{id:'child',type:'sub_header',properties:{title:[['서버규칙']]},content:[]}}}
}},'root');
assert.deepEqual(notionRows.map(row=>[row.type,row.text]),[['page','루트'],['sub_header','서버규칙']],'Notion recordMap should become ordered readable rows');

const bngtsNames=archive._internals.extractBngtsStreamerNames(
  '<div class="streamer-name">BJ공파리파</div><div class="streamer-name">♡효구리♡</div><div class="streamer-name">BJ공파리파</div>'
);
assert.deepEqual(bngtsNames,['BJ공파리파','♡효구리♡'],'BNGTS streamer parser should dedupe SSR rows');

assert.match(archiveSource,/loadCachedPageChunk/,'Notion source extraction must use public page recordMap');
assert.match(archiveSource,/notion-record-map-recursive/,'Notion extraction should recurse into linked public subpages');
assert.match(archiveSource,/bngts-pagination/,'BNGTS source extraction must paginate streamer pages');
assert.match(archiveSource,/source_meta_client_render_required/,'client-render-only failures must be classified');
assert.match(operatorContents,/JavaScript로 본문을 불러오는 페이지/,'operator UI should explain client-render-only pages');
assert.match(operatorContents,/meta\.participants\.join/,'operator meta import should be able to populate participant names');


const soopRef=archive._internals.extractSoopPostRef('https://www.sooplive.com/station/chunbongtv/post/207425471');
assert.deepEqual({stationId:soopRef?.stationId,postId:soopRef?.postId},{stationId:'chunbongtv',postId:'207425471'},'SOOP station post URL should become station/post ids');
const soopMeta=archive._internals.parseSoopPostPayload({
  titleName:'🦁그냥서버:적자생존 1차 입주자 공지🐱',
  regDate:'2026-09-18 06:15:49',
  content:{textContent:'1차 입주자는 총 500명으로 진행할 예정입니다.'},
  photos:[{url:'https://stimg.sooplive.com/test.png'}]
},'https://www.sooplive.com/station/chunbongtv/post/207425471');
assert.equal(soopMeta.title,'🦁그냥서버:적자생존 1차 입주자 공지🐱');
assert.equal(soopMeta.date,'2026-09-18');
assert.match(soopMeta.description,/500명/);
assert.equal(soopMeta.image,'https://stimg.sooplive.com/test.png');
assert.match(archiveSource,/api-channel\.sooplive\.com\/v1\.1\/channel/,'SOOP post extraction should use the current channel API');
assert.match(archiveSource,/source_meta_auth_required/,'protected SOOP posts must be classified as auth-required');
assert.match(operatorContents,/SOOP 애청자 공개/,'operator UI should explain protected SOOP posts');

assert.ok(archive._internals.allowedSourceMetaUrl('https://naver.me/FbVX1U7z'),'Naver short links should be eligible for source metadata extraction');
assert.equal(archive._internals.allowedSourceMetaUrl('https://www.fmkorea.com/7042989434'),null,'FM Korea should no longer be accepted as an archive source');
assert.match(archiveSource,/AUTO_CANDIDATES_KEY/,'auto-ingest candidate storage should exist');
assert.match(operatorHtml,/data-archive-auto-sync/,'operator center should expose official-source sync');
assert.match(operatorContents,/SOOP · YouTube 공식 자료를 동기화/,'operator sync UI should explain official source refresh');
assert.match(operatorHtml,/data-archive-candidates/,'operator center should expose auto-ingest candidates');
assert.match(operatorHtml,/data-archive-admin-quality/,'operator center should filter incomplete archive records');
for(const token of ['renderCandidates','data-candidate-action','새 콘텐츠 초안','관련 없음','operator-content-auto-candidate']) assert.ok(operatorContents.includes(token)||content.includes(token),token);
assert.match(archiveSource,/status:'failed'/,'auto-sync failures should be persisted');
assert.match(archiveSource,/lastSuccessAt/,'auto-sync should preserve the last successful run time');
const workflow=fs.readFileSync(new URL('../.github/workflows/push-dispatch.yml',import.meta.url),'utf8');
const archiveCurl=workflow.split('ARCHIVE_SYNC_URL')[2]||'';
assert.ok(!/\|\| true/.test(archiveCurl),'archive sync failures must not be hidden by the workflow');


const autoRows=[
  {id:'diamond',title:'그냥서버 : 다이아',aliases:['그냥서버 다이아'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-04-09',endDate:'2026-04-16',timeline:[],media:[]},
  {id:'survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-09-30',endDate:'2026-10-21',timeline:[],media:[]}
];
const survivalMatch=autoIngest.matchArchiveItem({title:'7시 그냥서버:적자생존 설명회',date:'2026-09-19'},autoRows);
assert.equal(survivalMatch?.itemId,'survival','explicit content title should auto-match the correct archive record');
const diamondMatch=autoIngest.matchArchiveItem({title:'마크 그냥서버 열겠습니다.',date:'2026-04-09'},autoRows);
assert.equal(diamondMatch?.itemId,'diamond','generic JustServer title should use the content date window');
const applied=autoIngest.attachOfficialDiscoveries(autoRows,[autoIngest.materialFromVideo({id:'207560243',title:'7시 그냥서버:적자생존 설명회',date:'2026-09-19',thumb:'//videoimg.sooplive.com/a.jpg',link:'https://vod.sooplive.com/player/207560243'},'vod')]);
assert.equal(applied.rows.find(row=>row.id==='survival')?.media?.length,1,'matched official VOD should be attached automatically');
assert.equal(applied.candidates.length,0,'high-confidence official match should not remain a review candidate');
assert.equal(typeof autoIngest.fetchPagedSoopVideos,'function','full SOOP video pagination helper missing');
assert.equal(typeof autoIngest.fetchPagedSoopPosts,'function','full SOOP board pagination helper missing');
assert.equal(typeof autoIngest.fetchAllYoutubeOfficial,'function','full ChunbongTV history helper missing');
const autoSource=fs.readFileSync(new URL('../lib/chunbong-content-auto-ingest.js',import.meta.url),'utf8');
assert.match(autoSource,/vods\/\$\{path\}.*per_page=\$\{SOOP_VIDEO_PAGE_SIZE\}/s,'SOOP VOD/Catch/Clip discovery should paginate channel history');
assert.match(autoSource,/fetchAllChannelItems\('videos'/,'ChunbongTV videos should use full channel pagination');
assert.match(autoSource,/fetchAllChannelItems\('shorts'/,'ChunbongTV Shorts should use full channel pagination');
assert.match(autoSource,/user_id.*SOOP_ID/s,'SOOP board discovery should keep broadcaster-authored posts');
assert.match(autoSource,/full-channel-history/,'operator force sync should retain full-history coverage');
assert.match(autoSource,/recent-channel-pages/,'scheduled sync should use incremental recent-page coverage');

