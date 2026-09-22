import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('chunbong-contents.html');
const css=read('chunbong-contents.css');
assert.match(html,/data-page="contents"/);
for(const hook of ['data-archive-search','data-archive-category','data-archive-status','data-archive-year','data-archive-media-kind','data-archive-sort','data-archive-list','data-archive-detail','data-archive-lightbox','data-archive-series-home','data-archive-series-list','data-archive-series-landing']) assert.ok(html.includes(hook),hook);
assert.match(html,/춘봉 콘텐츠/);
assert.match(css,/grid-template-columns/);
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/object-fit:cover/);
assert.match(css,/\[data-theme="light"\]/);
console.log('chunbong contents page regression passed');

const js=read('chunbong-contents.js');
for(const text of ['/api/content?type=chunbong-contents','/api/content?type=chunbong-content&id=','URLSearchParams','history.replaceState','loading="lazy"','decoding="async"','showModal','Escape']) assert.ok(js.includes(text),text);
const archive=require('../chunbong-contents.js');
assert.equal(archive.formatDate('2026-06','month'),'2026년 6월');
assert.equal(archive.filterItems([{title:'레오펠',aliases:[],participants:['춘봉'],participantGroups:[],timeline:[],media:[],results:[],seriesSessions:[],category:'minecraft',status:'ended',startDate:'2025-06'}],{q:'춘봉',category:'all',status:'all',year:'all'}).length,1);
assert.equal(archive.filterItems([{title:'그냥서버',aliases:[],participants:[],participantGroups:[{participants:['냥냥두둥']}],timeline:[],media:[],results:[],seriesSessions:[],category:'minecraft',status:'ended',startDate:'2026-04'}],{q:'냥냥두둥',category:'all',status:'all',year:'all'}).length,1,'participantGroups should be searchable');
assert.equal(archive.filterItems([{title:'적자생존',aliases:[],participants:[],participantGroups:[],timeline:[],media:[{title:'7시 그냥서버 적자생존 설명회',type:'vod'}],results:[],seriesSessions:[],category:'minecraft',status:'planned',startDate:'2026-09'}],{q:'설명회',category:'all',status:'planned',year:'all',mediaKind:'vod'}).length,1,'media titles, status and media availability should be searchable/filterable');
assert.equal(archive.itemPeopleCount({participants:Array.from({length:191},(_,i)=>'참가'+i),participantGroups:[{count:50},{count:49},{count:50},{count:49},{count:45}],seriesSessions:[]}),243,'overlapping cross-check participant lists must not inflate the primary entry count');


const shell=read('site-shell.js');
const home=read('index.html');
const sw=read('service-worker.js');
assert.match(shell,/items:\['contents','history','data'\]/);
assert.match(home,/href="chunbong-contents\.html"/);
for(const asset of ['/chunbong-contents.html','/chunbong-contents.css','/chunbong-contents.js']) assert.ok(sw.includes(asset),asset);


for(const token of ['archive-overview-highlight-grid','archive-people-chips','archive-record-strip','archive-media-visual']) assert.ok(css.includes(token),token);
for(const token of ['주요 기록','기록 하이라이트','영상 · 방송','자료 이미지']) assert.ok(js.includes(token),token);
assert.match(js,/renderOverviewHighlights/);
assert.match(js,/renderRecordStrip/);

for(const token of ['renderSeriesArchive','data-archive-series','data-archive-session',"p.get('session')","p.set('session'"]) assert.ok(js.includes(token),token);
for(const token of ['archive-series','archive-series-nav','archive-series-focus','overflow-x:auto']) assert.ok(css.includes(token),token);


for(const token of ['buildSeriesGroups','renderSeriesNavigation','renderSiblingSeriesNav',"p.get('series')","p.set('series'",'sourceKindLabel']) assert.ok(js.includes(token),token);
for(const token of ['archive-series-home-grid','archive-series-card','archive-series-landing','archive-sibling-series','archive-source-kind']) assert.ok(css.includes(token),token);

for(const token of ['archive-hero-actions','archive-series-skeleton','grid-template-columns:repeat(4','overflow-x:auto']) assert.ok(css.includes(token),token);
assert.ok(html.includes('대표 시리즈 바로 보기 ↓'),'compact archive hero should link directly to real series content');

for(const token of ['class="archive-hero-copy reveal"','class="archive-series-home reveal"','class="archive-toolbar reveal"']) {
  assert.ok(!html.includes(token),'critical archive sections must not depend on reveal: '+token);
}

const serviceWorker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
assert.ok(serviceWorker.includes("chunbong-pwa-20260922-v31"),'service worker cache namespace should remain compatible');
assert.ok(serviceWorker.includes("event.respondWith(networkFirst(request, event));"),'documents/scripts/styles should prefer network to avoid stale markup/style mismatches');
assert.ok(serviceWorker.includes("await self.skipWaiting();"),'new service worker should activate immediately after install');
assert.ok(css.includes('Archive stale-markup compatibility'),'archive CSS should explicitly recover stale reveal markup');

for(const token of ['archive-series-statuses','archive-media-filter','archive-participant-search','archive-related-grid','position:sticky']) assert.ok(css.includes(token),token);
for(const token of ['seriesStatusMarkup','mediaCardMarkup','data-media-filter','data-participant-search','renderRelated','searchableText','allPeople']) assert.ok(js.includes(token),token);

const operatorContents=read('operator-contents.js');
const operatorCss=read('operator.css');
const contentApi=read('api/content.js');
for(const token of ['자료 반영 상태','참가자 미수집','Notion 본문 미구조화','실제 대표 이미지 확인','data-source-fetch-meta','내부 검증용 · 숨김']) assert.ok(operatorContents.includes(token),token);
for(const token of ['operator-archive-audit','operator-source-meta-actions']) assert.ok(operatorCss.includes(token),token);
assert.ok(contentApi.includes("operator-content-source-meta"),'source metadata operator API route missing');

for(const token of ['archive-participant-groups','archive-participant-group']) assert.ok(css.includes(token),token);
for(const token of ['renderParticipantGroups','participantGroups']) assert.ok(js.includes(token),token);

assert.match(css,/archive-series-card-visual:not\(\.is-multi\).*object-fit:cover/s,'single series cards should use cover for consistent image framing');
assert.match(css,/\.archive-tabs\{position:sticky/,'detail tabs should stay accessible while scrolling');

for(const token of ['data-archive-history','CONTENT HISTORY']) assert.ok(html.includes(token)||js.includes(token),token);
assert.match(css,/archive-history-years/,'content history styling missing');
