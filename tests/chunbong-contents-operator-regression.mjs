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
assert.equal(archive._internals.normalizePublishedDate('2026-09-22T10:30:00+09:00'),'2026-09-22','ISO publication date should normalize to a day');
assert.equal(archive._internals.normalizePublishedDate('2026-02-31'),'','impossible publication dates must be rejected');
assert.equal(archive._internals.readPublishedDate('<meta property="article:published_time" content="2026-04-28T19:00:00+09:00">'),'2026-04-28','article publication metadata should be detected');
assert.equal(archive._internals.readPublishedDate('<script type="application/ld+json">{"@type":"VideoObject","uploadDate":"2026-06-24T18:00:00+09:00"}</script>'),'2026-06-24','JSON-LD upload dates should be detected');
assert.equal(archive._internals.readPublishedDate('<time datetime="2025-06-05T20:00:00+09:00">오픈</time>'),'2025-06-05','time datetime should be used as a fallback');
for(const type of ['operator-content-archive','operator-content-archive-save','operator-content-archive-publish','operator-content-archive-delete','operator-content-auto-sync','operator-content-auto-candidate','operator-content-browser-import','content-archive-auto-sync']) assert.ok(content.includes(type),'missing '+type);
console.log('chunbong contents operator API regression passed');

const operatorHtml=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const operatorJs=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const operatorContents=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
assert.match(operatorHtml,/data-operator-tab="contents"/);
assert.match(operatorHtml,/data-operator-panel="contents"/);
assert.match(operatorHtml,/콘텐츠 아카이브/);
assert.match(operatorJs,/loadOperatorContents/);
for(const text of ['operator-content-archive','임시 저장','팬사이트에 반영','정보 충돌','원문 URL']) assert.ok(operatorContents.includes(text),text);

assert.equal(typeof archive._internals.mergeArchiveRows,'function','seed/stored merge helper missing');
const seedPublished={...base,id:'leopel',title:'시드 레오펠',published:true};
const storedOther={...base,id:'other',title:'운영자 콘텐츠',published:true};
const storedOverride={...base,id:'leopel',title:'운영자 레오펠',published:true};
let merged=archive._internals.mergeArchiveRows([seedPublished],[storedOther]);
assert.deepEqual(merged.map(item=>item.id).sort(),['leopel','other'],'stored records must not hide verified seed records');
merged=archive._internals.mergeArchiveRows([seedPublished],[storedOverride]);
assert.equal(merged.find(item=>item.id==='leopel').title,'운영자 레오펠','stored published record should override the seed with the same id');
const curatedMerge=archive._internals.mergeArchiveRows([
  {...base,id:'curated-merge',published:true,timeline:[
    {id:'seed-a',type:'post',title:'공식 글 A',date:'2026-06-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/1',sourceId:'s1',visibility:'public'},
    {id:'seed-b',type:'post',title:'공식 글 B',date:'2026-06-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/2',sourceId:'s1',visibility:'public'}
  ],gallery:[{id:'g1',src:'https://stimg.sooplive.com/a.png',alt:'A'}],results:[{title:'참가자',value:'100명'}]},
],[
  {...base,id:'curated-merge',published:true,timeline:[
    {id:'old-a',type:'post',title:'공식 게시글 1',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/1',sourceId:'s1',visibility:'public'},
    {id:'auto-c',type:'post',title:'자동 발견 C',date:'2026-06-03',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/3',sourceId:'',visibility:'public'}
  ],gallery:[],results:[]}
]);
assert.equal(curatedMerge[0].timeline.length,3,'curated seed rows and stored auto rows should both survive merging');
assert.equal(curatedMerge[0].timeline.find(row=>/post\/1/.test(row.url||''))?.title,'공식 글 A','curated exact metadata should replace stale generic stored metadata');
assert.equal(curatedMerge[0].gallery.length,1,'new curated gallery rows must survive stale stored records');
assert.equal(curatedMerge[0].results.find(row=>row.title==='참가자')?.value,'100명','new curated result rows must survive stale stored records');
const visualMerge=archive._internals.mergeArchiveRows([
  {...base,id:'visual-merge',published:true,
    heroImage:{src:'https://stimg.sooplive.com/official-hero.png',alt:'공식 대표',sourceId:'s1'},
    gallery:[{id:'official-gallery',src:'https://stimg.sooplive.com/official-gallery.png',alt:'공식 이미지',sourceId:'s1'}],
    sources:[{id:'s1',kind:'official',label:'SOOP 공식글',url:'https://www.sooplive.com/station/chunbongtv/post/10',visibility:'public'}]
  }
],[
  {...base,id:'visual-merge',published:true,
    heroImage:{src:'/assets/chunbong-contents/old-cover.svg',alt:'옛 커버'},
    gallery:[
      {id:'old-cover',src:'/assets/chunbong-contents/old-cover.svg',alt:'옛 자체제작 이미지'},
      {id:'old-catch',src:'/assets/chunbong-contents/old-catch.svg',alt:'옛 자체제작 이미지'}
    ],
    sources:[{id:'s1',kind:'official',label:'SOOP 공식글',url:'https://www.sooplive.com/station/chunbongtv/post/10',visibility:'public'}]
  }
]);
assert.equal(visualMerge[0].heroImage?.src,'https://stimg.sooplive.com/official-hero.png','새 공식 대표 이미지는 오래된 자체 제작 hero보다 우선해야 합니다');
assert.deepEqual(visualMerge[0].gallery.map(row=>row.src),['https://stimg.sooplive.com/official-gallery.png'],'seed에서 제거된 오래된 자체 제작 갤러리가 Redis 저장본 때문에 다시 나타나면 안 됩니다');


assert.match(String(archive._internals.DRAFT_PREFIX||''),/content-archive:draft:v1:/,'draft storage must be separate from public records');
assert.match(String(archive._internals.DRAFT_INDEX||''),/content-archive:draft-index:v1/,'draft index missing');

assert.match(String(archive._internals.HIDDEN_KEY||''),/content-archive:hidden:v1/,'hidden seed tombstone key missing');
assert.equal(typeof archive._internals.withoutHidden,'function','hidden seed filter helper missing');
assert.deepEqual(archive._internals.withoutHidden([seedPublished],['leopel']),[],'deleted seed content must stay hidden while storage is available');
const promotedHero=archive._internals.promoteOfficialHero({
  ...base,id:'hero-promote',published:true,
  heroImage:{src:'/assets/chunbong-contents/temp.svg',alt:'임시'},
  gallery:[{id:'official',src:'https://stimg.sooplive.com/official.png',alt:'공식 포스터',sourceId:'s1'}],
  sources:[{id:'s1',kind:'official',label:'SOOP 공식글',url:'https://www.sooplive.com/station/chunbongtv/post/1',visibility:'public'}]
});
assert.equal(promotedHero.heroImage?.src,'https://stimg.sooplive.com/official.png','실제 공식 이미지가 있으면 자체 제작 SVG 대표 이미지를 자동 교체해야 합니다');
const protectedHero=archive._internals.promoteOfficialHero({
  ...base,id:'hero-protected',published:true,
  heroImage:{src:'/assets/chunbong-contents/temp.svg',alt:'임시'},
  gallery:[{id:'protected',src:'https://stimg.sooplive.com/protected.png',alt:'보호 이미지',sourceId:'secret'}],
  media:[{id:'vod',type:'vod',title:'공식 VOD',url:'https://vod.sooplive.com/player/1',thumbnail:'https://videoimg.sooplive.com/public.jpg',visibility:'public'}],
  sources:[{id:'secret',kind:'official',label:'애청자 글',url:'https://www.sooplive.com/station/chunbongtv/post/2',visibility:'internal'}]
});
assert.equal(protectedHero.heroImage?.src,'https://videoimg.sooplive.com/public.jpg','내부 전용 이미지 대신 공개 VOD 이미지를 대표로 사용해야 합니다');

const archiveSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
assert.match(archiveSource,/SADD['\",\s]+HIDDEN_KEY/,'delete must create a seed tombstone');
assert.match(archiveSource,/SREM['\",\s]+HIDDEN_KEY/,'publish must clear a seed tombstone');


for(const token of ['별칭','결과 · 회차 기록','data-result-row','data-move-row','공개 페이지 열기','data-material-fetch-meta','원문 메타 가져오기','방통실 참가자 명단 미수집','FM코리아 참가자 명단 미수집','Notion 본문 미구조화','SOOP 게시글 메타데이터 확인']) assert.ok(operatorContents.includes(token),token);
assert.match(operatorContents,/item\.aliases=/,'operator must collect aliases');
assert.match(operatorContents,/item\.results=/,'operator must collect results');

assert.match(operatorContents,/meta\.publishedDate/,'material source metadata should populate publication dates');
assert.match(operatorContents,/meta\.image/,'material source metadata should populate original thumbnails');
assert.match(operatorContents,/function bindMaterialMeta\(\)\{\$\$\('\[data-material-fetch-meta\]'/,'material metadata controls must bind as a node list');
assert.match(operatorContents,/bindSourceMeta\(\);bindMaterialMeta\(\);\$\$\('\[data-add-row\]'/,'archive add-row controls must remain a node list');


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
const notionSections=archive._internals.notionStructuredSections([{id:'root',depth:0,rows:[
  {id:'root',type:'page',text:'루트',depth:0},
  {id:'h1',type:'header',text:'서버규칙',depth:1},
  {id:'t1',type:'text',text:'X-ray 사용 금지',depth:2},
  {id:'h2',type:'sub_header',text:'API',depth:1},
  {id:'t2',type:'text',text:'100개 보급상자',depth:2}
]}]);
assert.equal(notionSections.length,1,'Notion pages should become structured sections');
assert.deepEqual(notionSections[0].headings,['루트','서버규칙','API'],'Notion headings should preserve ordered page structure');
assert.match(notionSections[0].blocks.find(row=>row.title==='서버규칙')?.text||'',/X-ray/,'Notion section body should remain readable');


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
assert.match(operatorHtml,/data-soop-helper/,'operator should expose the authenticated SOOP browser collector');
for(const token of ['soopCollectorBookmarklet','readSoopImportHash','operator-content-browser-import','data-soop-import-connect','data-soop-import-draft']) assert.ok(operatorContents.includes(token)||operatorHtml.includes(token)||content.includes(token),token);
assert.ok(!/document\.cookie/.test(operatorContents),'SOOP browser collector must never read cookies');
assert.ok(!/localStorage/.test(operatorContents),'SOOP browser collector must not read localStorage');
assert.ok(!/sessionStorage/.test(operatorContents),'SOOP browser collector must not read sessionStorage');
assert.match(operatorContents,/history\.replaceState/,'browser import fragment should be removed from the address immediately');
assert.match(operatorContents,/\$\$\('\[data-candidate-action\]'/,'candidate actions must bind through the multi-element selector');

const browserPayload=archive._internals.normalizeBrowserImportPayload({
  source:'soop-authenticated-browser',
  url:'https://www.sooplive.com/station/chunbongtv/post/192179233',
  title:'그냥 서버 열었습니다..',date:'2026.04.09',
  body:'애청자 공개 본문 테스트',images:['https://stimg.sooplive.com/test.png'],
  capturedAt:'2026-09-23T00:00:00+09:00'
});
assert.equal(browserPayload?.postId,'192179233','protected SOOP post id should be recovered from browser handoff');
assert.equal(browserPayload?.date,'2026-04-09','browser handoff date should normalize to ISO day');
assert.equal(archive._internals.normalizeBrowserImportPayload({...browserPayload,url:'https://www.sooplive.com/station/other/post/1'}),null,'browser handoff must be restricted to Chunbong SOOP posts');
const browserApplied=archive._internals.applyBrowserImportToItem({...base,id:'browser-import',timeline:[],sources:[]},browserPayload);
assert.equal(browserApplied.sources[0]?.visibility,'internal','authenticated source URL must remain internal');
assert.equal(browserApplied.timeline[0]?.visibility,'public','confirmed title/date may become a public factual timeline record');
assert.equal(browserApplied.timeline[0]?.url,'','protected post URL must not be copied into the public timeline material');
assert.match(String(archive._internals.BROWSER_IMPORT_PREFIX||''),/browser-import:v1/,'browser import raw storage must be isolated from public archive records');
assert.match(archiveSource,/\['auto','connect','draft'\]/,'browser import API should support automatic matching');
assert.match(archiveSource,/autoIngest\.matchArchiveItem/,'protected SOOP browser imports should reuse archive matching rules');
assert.match(operatorContents,/autoRouteSoopImport/,'operator should automatically route imported protected posts when the match is confident');
assert.match(operatorContents,/action:'auto'/,'operator browser import should request automatic matching first');



assert.ok(archive._internals.allowedSourceMetaUrl('https://naver.me/FbVX1U7z'),'Naver short links should be eligible for source metadata extraction');
assert.ok(archive._internals.allowedSourceMetaUrl('https://www.fmkorea.com/7042989434'),'FM Korea should be accepted by the internal automatic collector');
const fmkPayload=archive._internals.normalizeBrowserImportPayload({source:'fmkorea-public-browser',url:'https://www.fmkorea.com/7042989434',postId:'7042989434',access:'anonymous-verified',title:'참고 글',body:'자동 수집 테스트',capturedAt:'2026-09-24T12:00:00+09:00'});
assert.ok(fmkPayload,'FM Korea browser collector payload should normalize');
assert.equal(archive._internals.browserImportPublicEligible(fmkPayload),false,'FM Korea collector records must not be eligible for public provenance');
const fmkApplied=archive._internals.applyBrowserImportToItem({...base,id:'fmk-browser-import',timeline:[],sources:[]},fmkPayload);
assert.equal(fmkApplied.sources[0]?.visibility,'internal','FM Korea source must be stored as internal provenance');
assert.equal(fmkApplied.timeline[0]?.visibility,'internal','FM Korea collected timeline material must remain internal');
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
const protectedMoneyMatch=autoIngest.matchArchiveItem({title:'그냥서버 : 머니게임 공식 공지',date:'2026-06-24'},[
  {id:'money',title:'그냥서버 : 머니게임',aliases:['머니게임'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-06-24',endDate:'2026-07-15'},
  {id:'diamond',title:'그냥서버 : 다이아',aliases:['다이아'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-04-09',endDate:'2026-04-16'}
]);
assert.equal(protectedMoneyMatch?.itemId,'money','애청자 글도 제목·날짜가 명확하면 해당 춘봉 콘텐츠로 자동 매칭해야 합니다');

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

