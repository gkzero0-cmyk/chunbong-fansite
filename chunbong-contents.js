(function(global){
'use strict';
const CATEGORY_LABELS={minecraft:'마인크래프트',song:'노래대회',broadcast:'방송 기획','class-event':'클래스 · 이벤트',other:'기타'};
const STATUS_LABELS={planned:'예정',recruiting:'모집 중',ongoing:'진행 중',ended:'종료'};
const SOURCE_KIND_LABELS={official:'공식 자료',article:'기사 · 편집 자료',reference:'교차 확인'};
const TYPE_LABELS={notice:'공지',post:'게시글',vod:'다시보기',catch:'Catch',clip:'클립',youtube:'YouTube',shorts:'Shorts',article:'기사',result:'결과',image:'이미지',reference:'참고 자료'};
const API_LIST='/api/content?type=chunbong-contents',API_DETAIL='/api/content?type=chunbong-content&id=';
function normalize(v){return String(v||'').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim()}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function safeUrl(v){try{const u=new URL(String(v||''),global.location?.href||'https://chunbong-fansite.vercel.app/');return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
function formatDate(v,p='unknown'){if(p==='unknown'||!v)return'날짜 확인 중';if(p==='year')return String(v).slice(0,4)+'년';if(p==='month')return String(v).slice(0,4)+'년 '+Number(String(v).slice(5,7))+'월';const [y,m,d]=String(v).split('-').map(Number);return y&&m&&d?`${y}년 ${m}월 ${d}일`:'날짜 확인 중'}
function formatRange(item={}){const s=formatDate(item.startDate,item.datePrecision);if(!item.endDate)return s;const p=item.endDate.length===10?'day':item.endDate.length===7?'month':item.endDate.length===4?'year':'unknown',e=formatDate(item.endDate,p);return s===e?s:s+' ~ '+e}
function itemSeriesId(item){return String(item?.series?.id||item?.id||'')}
function allPeople(item={}){
  const names=[...(item.participants||[])];
  for(const group of item.participantGroups||[])names.push(...(group.participants||[]));
  for(const session of item.seriesSessions||[])names.push(...(session.participants||[]));
  return [...new Set(names.map(v=>String(v||'').trim()).filter(Boolean))];
}
function itemPeopleCount(item={}){
  const verified=Number(item.participantCount||0);
  const direct=(item.participants||[]).length;
  const grouped=(item.participantGroups||[]).reduce((sum,row)=>sum+Number(row.count||row.participants?.length||0),0);
  if(verified>0)return verified;
  if(direct||grouped)return Math.max(direct,grouped);
  return allPeople(item).length;
}
function searchableText(item={}){
  const values=[
    item.title,item.summary,item.description,item.role,item.series?.title,item.series?.subtitle,
    ...(item.aliases||[]),...allPeople(item),
    ...(item.participantGroups||[]).flatMap(g=>[g.stage,g.title,g.platform,g.note,...(g.participants||[])]),
    ...(item.seriesSessions||[]).flatMap(s=>[s.title,s.note,...(s.participants||[])]),
    ...(item.timeline||[]).flatMap(r=>[r.title,r.note]),
    ...(item.media||[]).flatMap(r=>[r.title,r.note]),
    ...(item.results||[]).flatMap(r=>[r.title,r.label,r.value,r.name]),
    ...(item.notionSections||[]).flatMap(r=>[r.pageTitle,r.title,r.text])
  ];
  return normalize(values.filter(Boolean).join(' '));
}
function filterItems(items,{q='',category='all',status='all',year='all',mediaKind='all',series=''}={}){
  const n=normalize(q);
  return(Array.isArray(items)?items:[]).filter(item=>{
    if(series&&itemSeriesId(item)!==series)return false;
    if(category!=='all'&&item.category!==category)return false;
    if(status!=='all'&&item.status!==status)return false;
    if(year!=='all'&&!String(item.startDate||'').startsWith(year))return false;
    if(mediaKind!=='all'&&!(item.media||[]).some(row=>row.type===mediaKind))return false;
    return !n||searchableText(item).includes(n);
  });
}
function sortItems(items,sort='newest'){const d=sort==='oldest'?1:-1;return[...(Array.isArray(items)?items:[])].sort((a,b)=>d*String(a.startDate||'').localeCompare(String(b.startDate||''))||String(a.title||'').localeCompare(String(b.title||''),'ko'))}
function materialTypeLabel(t){return TYPE_LABELS[t]||'자료'} function categoryLabel(c){return CATEGORY_LABELS[c]||'기타'} function statusLabel(s){return STATUS_LABELS[s]||'종료'}
const api={formatDate,formatRange,filterItems,sortItems,materialTypeLabel,categoryLabel,statusLabel,allPeople,itemPeopleCount,searchableText};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(!global.document){global.ChunbongContents=api;return}global.ChunbongContents=api;
const d=global.document,$=s=>d.querySelector(s),els={browser:$('[data-archive-browser]'),list:$('[data-archive-list]'),detail:$('[data-archive-detail]'),search:$('[data-archive-search]'),category:$('[data-archive-category]'),status:$('[data-archive-status]'),year:$('[data-archive-year]'),mediaKind:$('[data-archive-media-kind]'),sort:$('[data-archive-sort]'),count:$('[data-archive-count]'),empty:$('[data-archive-empty]'),lightbox:$('[data-archive-lightbox]'),seriesHome:$('[data-archive-series-home]'),seriesList:$('[data-archive-series-list]'),seriesLanding:$('[data-archive-series-landing]'),seriesCount:$('[data-archive-series-count]'),listHeading:$('[data-archive-list-heading]'),listCopy:$('[data-archive-list-copy]'),history:$('[data-archive-history]')};let allItems=[];
async function fetchJson(url){if(global.ChunbongCache?.fetchJson)return global.ChunbongCache.fetchJson('content:'+url,url,{ttl:300000});const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;throw e}return r.json()}
function queryState(){const p=new URLSearchParams(global.location.search);return{id:p.get('id')||'',session:p.get('session')||'',series:p.get('series')||'',q:p.get('q')||'',category:p.get('category')||'all',status:p.get('status')||'all',year:p.get('year')||'all',mediaKind:p.get('media')||'all',sort:p.get('sort')==='oldest'?'oldest':'newest'}}
function writeState(next,{push=false}={}){const p=new URLSearchParams();if(next.series)p.set('series',next.series);if(next.id)p.set('id',next.id);if(next.id&&next.session)p.set('session',next.session);if(next.q)p.set('q',next.q);if(next.category&&next.category!=='all')p.set('category',next.category);if(next.status&&next.status!=='all')p.set('status',next.status);if(next.year&&next.year!=='all')p.set('year',next.year);if(next.mediaKind&&next.mediaKind!=='all')p.set('media',next.mediaKind);if(next.sort==='oldest')p.set('sort','oldest');const url=global.location.pathname+(p.size?'?'+p.toString():'');(push?history.pushState:history.replaceState).call(history,null,'',url)}
function syncControls(s){if(els.search)els.search.value=s.q;if(els.category)els.category.value=s.category;if(els.status)els.status.value=s.status;if(els.year&&[...els.year.options].some(o=>o.value===s.year))els.year.value=s.year;if(els.mediaKind)els.mediaKind.value=s.mediaKind;if(els.sort)els.sort.value=s.sort}
function populateYears(items){if(!els.year)return;const cur=queryState().year,years=[...new Set(items.map(i=>String(i.startDate||'').slice(0,4)).filter(y=>/^20\d{2}$/.test(y)))].sort((a,b)=>b.localeCompare(a));els.year.innerHTML='<option value="all">전체 연도</option>'+years.map(y=>`<option value="${y}">${y}년</option>`).join('');if(years.includes(cur))els.year.value=cur}
function imageMarkup(image,alt='',priority=false){const src=safeUrl(image?.src||image?.thumbnail||image);if(!src)return'<div class="archive-card-media is-fallback"></div>';return`<img src="${escapeHtml(src)}" alt="${escapeHtml(image?.alt||alt)}" loading="${priority?'eager':'lazy'}" decoding="async"${priority?' fetchpriority="high"':''}>`}
function normalizedImageMarkup(image,alt='',priority=false){const src=safeUrl(image?.src||image?.thumbnail||image);if(!src)return imageMarkup(image,alt,priority);return`<span class="archive-normalized-media" data-archive-normalized-src="${escapeHtml(src)}">${imageMarkup(image,alt,priority)}</span>`}
function hydrateNormalizedMedia(root=d){root.querySelectorAll('[data-archive-normalized-src]').forEach(node=>{const src=safeUrl(node.dataset.archiveNormalizedSrc||'');if(!src)return;node.style.setProperty('--archive-media-image',`url("${src.replace(/"/g,'%22')}")`)})}
function buildSeriesGroups(items=allItems){
  const map=new Map();
  for(const item of Array.isArray(items)?items:[]){
    const id=itemSeriesId(item);if(!id)continue;
    const meta=item.series||{id,title:item.title,subtitle:categoryLabel(item.category),description:item.summary,order:999,cover:item.heroImage};
    if(!map.has(id))map.set(id,{id,meta,items:[],latest:''});
    const group=map.get(id);group.items.push(item);if(String(item.startDate||'')>group.latest)group.latest=String(item.startDate||'');
    if(!group.meta?.title&&meta?.title)group.meta=meta;
  }
  return [...map.values()].sort((a,b)=>Number(a.meta?.order||999)-Number(b.meta?.order||999)||String(b.latest).localeCompare(String(a.latest))||String(a.meta?.title||'').localeCompare(String(b.meta?.title||''),'ko'));
}
function seriesGroupLabel(group){const sessions=group.items.length===1?(group.items[0].seriesSessions||[]).length:0;return group.items.length>1?group.items.length+'개 시즌':sessions?sessions+'회차':'1개 기록'}
function seriesGroupVisual(group){
  const candidates=[];
  for(const item of group.items){if(item.heroImage?.src)candidates.push({src:item.heroImage.src,alt:item.heroImage.alt||item.title})}
  if(group.meta?.cover?.src)candidates.unshift({src:group.meta.cover.src,alt:group.meta.cover.alt||group.meta.title});
  const seen=new Set(),rows=candidates.filter(row=>{const src=safeUrl(row.src);if(!src||seen.has(src))return false;seen.add(src);return true}).slice(0,group.items.length>1?2:1);
  if(!rows.length)return'<div class="archive-series-card-visual is-fallback"></div>';
  return '<div class="archive-series-card-visual '+(rows.length>1?'is-multi':'')+'">'+rows.map((row,i)=>'<div class="archive-series-card-image">'+normalizedImageMarkup(row,row.alt,i===0)+'</div>').join('')+'</div>';
}
function seriesItemShortTitle(item){
  const raw=String(item?.title||'').replace(/^그냥서버\s*[:：]?\s*/,'').replace(/^춘타클\s*[·:：]?\s*/,'').trim();
  return raw||item?.title||'기록';
}
function seriesStatusMarkup(group){
  if(group.items.length<2)return'';
  const rows=[...group.items].sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));
  return `<div class="archive-series-statuses">${rows.map(item=>`<span data-status="${escapeHtml(item.status||'ended')}"><b>${escapeHtml(seriesItemShortTitle(item))}</b><small>${escapeHtml(statusLabel(item.status))}</small></span>`).join('')}</div>`;
}
function seriesCardMarkup(group){const title=group.meta?.title||group.items[0]?.title||'콘텐츠 시리즈',subtitle=group.meta?.subtitle||'',description=group.meta?.description||group.items[0]?.summary||'';return `<button type="button" class="archive-series-card" data-archive-series-open="${escapeHtml(group.id)}">${seriesGroupVisual(group)}<div class="archive-series-card-copy"><span>${escapeHtml(seriesGroupLabel(group))}</span><h3>${escapeHtml(title)}</h3>${subtitle?`<strong>${escapeHtml(subtitle)}</strong>`:''}${seriesStatusMarkup(group)}<p>${escapeHtml(description)}</p><b>기록 보기 →</b></div></button>`}
function renderSeriesNavigation(state=queryState()){
  const groups=buildSeriesGroups();
  if(els.seriesCount)els.seriesCount.textContent=groups.length+'개 시리즈';
  const selected=groups.find(group=>group.id===state.series);
  if(selected){
    if(els.seriesHome)els.seriesHome.hidden=true;
    if(els.seriesLanding){els.seriesLanding.hidden=false;els.seriesLanding.innerHTML=`<button type="button" class="archive-series-back" data-archive-series-back>← 대표 시리즈</button><div class="archive-series-landing-main">${seriesGroupVisual(selected)}<div class="archive-series-landing-copy"><small>SERIES ARCHIVE</small><h2>${escapeHtml(selected.meta?.title||selected.items[0]?.title||'시리즈')}</h2>${selected.meta?.subtitle?`<strong>${escapeHtml(selected.meta.subtitle)}</strong>`:''}<p>${escapeHtml(selected.meta?.description||selected.items[0]?.summary||'')}</p><div class="archive-series-landing-meta"><span>${escapeHtml(seriesGroupLabel(selected))}</span><span>공식·교차 자료 기반</span></div><div class="archive-series-child-links">${selected.items.map(item=>`<button type="button" data-archive-open="${escapeHtml(item.id)}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(formatRange(item))}</small></button>`).join('')}</div></div></div>`}
    if(els.listHeading)els.listHeading.textContent=(selected.meta?.title||'시리즈')+' 기록';
    if(els.listCopy)els.listCopy.textContent='같은 시리즈의 시즌·콘텐츠를 이어서 확인할 수 있습니다.';
  }else{
    if(els.seriesLanding){els.seriesLanding.hidden=true;els.seriesLanding.innerHTML=''}
    if(els.seriesHome){els.seriesHome.hidden=false;if(els.seriesList)els.seriesList.innerHTML=groups.map(seriesCardMarkup).join('')}
    if(els.listHeading)els.listHeading.textContent='전체 콘텐츠 기록';
    if(els.listCopy)els.listCopy.textContent='콘텐츠명·참가자·카테고리·연도로 원하는 기록을 찾을 수 있습니다.';
  }
  els.seriesList?.querySelectorAll('[data-archive-series-open]').forEach(button=>button.addEventListener('click',()=>{
    const group=groups.find(row=>row.id===button.dataset.archiveSeriesOpen);if(!group)return;
    if(group.items.length===1){writeState({...queryState(),series:group.id,id:group.items[0].id,session:''},{push:true});void renderRoute();return}
    writeState({...queryState(),series:group.id,id:'',session:''},{push:true});renderList();els.seriesLanding?.scrollIntoView?.({block:'start'});
  }));
  els.seriesLanding?.querySelector('[data-archive-series-back]')?.addEventListener('click',()=>{writeState({...queryState(),series:'',id:'',session:''},{push:true});renderList();els.seriesHome?.scrollIntoView?.({block:'start'})});
  els.seriesLanding?.querySelectorAll('[data-archive-open]').forEach(button=>button.addEventListener('click',()=>{writeState({...queryState(),id:button.dataset.archiveOpen||'',session:''},{push:true});void renderRoute()}));
}
function renderHistory(){
  if(!els.history)return;
  const rows=[...allItems].filter(item=>/^20\d{2}/.test(String(item.startDate||''))).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)));
  if(!rows.length){els.history.hidden=true;return}
  const years=new Map();
  for(const item of rows){const year=String(item.startDate).slice(0,4);if(!years.has(year))years.set(year,[]);years.get(year).push(item)}
  els.history.hidden=false;
  els.history.innerHTML=`<div class="archive-history-head"><div><small>CONTENT HISTORY</small><h2>춘봉 콘텐츠 연혁</h2><p>주최·기획 콘텐츠의 흐름을 연도별로 빠르게 확인할 수 있습니다.</p></div></div><div class="archive-history-years">${[...years.entries()].map(([year,items])=>`<section><strong>${escapeHtml(year)}</strong><div>${items.map(item=>`<button type="button" data-history-open="${escapeHtml(item.id)}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(formatDate(item.startDate,item.datePrecision))}</small></button>`).join('')}</div></section>`).join('')}</div>`;
  els.history.querySelectorAll('[data-history-open]').forEach(button=>button.addEventListener('click',()=>{writeState({...queryState(),id:button.dataset.historyOpen||'',session:''},{push:true});void renderRoute()}));
}
function siblingSeriesItems(item){const id=itemSeriesId(item);return allItems.filter(row=>itemSeriesId(row)===id).sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')))}
function renderSiblingSeriesNav(item){const rows=siblingSeriesItems(item);if(rows.length<2)return'';return `<section class="archive-sibling-series"><div><small>SERIES CONTENTS</small><strong>${escapeHtml(item.series?.title||'연결된 시리즈')}</strong></div><div class="archive-sibling-series-nav">${rows.map(row=>`<button type="button" data-archive-sibling="${escapeHtml(row.id)}" aria-current="${String(row.id===item.id)}"><span>${escapeHtml(row.title)}</span><small>${escapeHtml(formatRange(row))}</small></button>`).join('')}</div></section>`}
function sourceKindLabel(kind){return SOURCE_KIND_LABELS[kind]||'참고 자료'}
function cardMarkup(item){
  const people=itemPeopleCount(item),media=(item.media||[]).length;
  return`<a class="archive-card" href="?id=${encodeURIComponent(item.id)}" data-archive-open="${escapeHtml(item.id)}"><div class="archive-card-media">${normalizedImageMarkup(item.heroImage,item.title)}<div class="archive-card-badges"><span class="archive-chip">${escapeHtml(categoryLabel(item.category))}</span><span class="archive-chip">${escapeHtml(statusLabel(item.status))}</span></div></div><div class="archive-card-copy">${item.series?.title?`<small class="archive-card-series">${escapeHtml(item.series.title)}</small>`:''}<h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||'공식 자료를 기반으로 기록을 정리하고 있습니다.')}</p><div class="archive-card-meta"><span>${escapeHtml(formatRange(item))}</span><span>${people?'참가 '+people+'명':escapeHtml(item.role||'주최')}</span><span>${media?'영상 '+media+'개':'출처 '+Number(item.sourceCount||item.sources?.length||0)+'개'}</span></div></div></a>`;
}
function bindBrokenImages(root=d){hydrateNormalizedMedia(root);root.querySelectorAll('img').forEach(img=>{if(img.dataset.archiveErrorBound)return;img.dataset.archiveErrorBound='1';img.addEventListener('error',()=>{const w=img.parentElement;if(w){img.remove();w.classList.add('is-fallback')}},{once:true})})}
function renderList(){const s=queryState();syncControls(s);renderSeriesNavigation(s);renderHistory();const rows=sortItems(filterItems(allItems,s),s.sort);els.list.innerHTML=rows.map(cardMarkup).join('');bindBrokenImages(els.list);els.empty.hidden=rows.length>0;els.count.textContent=allItems.length?`전체 ${allItems.length}개 · 현재 ${rows.length}개`:'검증된 콘텐츠 기록을 준비하고 있습니다.';els.list.querySelectorAll('[data-archive-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();writeState({...s,id:a.dataset.archiveOpen},{push:true});void renderRoute()}))}
function resetFilters(){writeState({id:'',session:'',series:'',q:'',category:'all',status:'all',year:'all',mediaKind:'all',sort:'newest'});syncControls(queryState());renderList()}
function bindToolbar(){const update=()=>{const s=queryState();writeState({...s,id:'',q:els.search?.value||'',category:els.category?.value||'all',status:els.status?.value||'all',year:els.year?.value||'all',mediaKind:els.mediaKind?.value||'all',sort:els.sort?.value||'newest'});renderList()};els.search?.addEventListener('input',update);els.category?.addEventListener('change',update);els.status?.addEventListener('change',update);els.year?.addEventListener('change',update);els.mediaKind?.addEventListener('change',update);els.sort?.addEventListener('change',update);d.querySelectorAll('[data-archive-reset]').forEach(b=>b.addEventListener('click',resetFilters))}
function sourceMap(item){return new Map((item.sources||[]).map(s=>[s.id,s]))}
function detailEmpty(message,title='기록을 찾을 수 없습니다'){els.detail.innerHTML=`<div class="archive-empty"><span aria-hidden="true">✦</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p><button type="button" data-archive-back>목록으로 돌아가기</button></div>`;els.detail.querySelector('[data-archive-back]')?.addEventListener('click',()=>{writeState({...queryState(),id:''},{push:true});void renderRoute()})}
function renderRecordStrip(item){
  const verified=String(item.verifiedAt||'').slice(0,10);
  const peopleLabel=item.category==='class-event'?'수강생':'참가자';
  const rows=[
    ['타임라인',(item.timeline||[]).length+'건'],
    ['영상 · 방송',(item.media||[]).length+'건'],
    ['자료 이미지',(item.gallery||[]).length+'장'],
    ['Notion 가이드',(item.notionSections||[]).length?item.notionSections.length+'개':'없음'],
    [peopleLabel,itemPeopleCount(item)?itemPeopleCount(item)+'명':'확인 중'],
    ['최종 확인',verified?formatDate(verified,'day'):'확인 중']
  ];
  return `<div class="archive-record-strip" aria-label="주요 기록">${rows.map(([label,value])=>`<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
}
function renderOverviewHighlights(item){
  const rows=[...(item.timeline||[]),...(item.media||[])].filter(row=>row&&row.title)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
  if(!rows.length)return'';
  return `<section class="archive-overview-highlights"><div class="archive-section-heading"><div><small>ARCHIVE HIGHLIGHTS</small><h3>기록 하이라이트</h3></div><span>${rows.length}개</span></div><div class="archive-overview-highlight-grid">${rows.map(row=>{
    const media=row.thumbnail?imageMarkup({src:row.thumbnail,alt:row.title},row.title):`<div class="archive-media-visual is-fallback"><span>${escapeHtml(materialTypeLabel(row.type))}</span></div>`;
    const body=`<div class="archive-overview-highlight-copy"><span class="archive-chip">${escapeHtml(materialTypeLabel(row.type))}</span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(formatDate(row.date,row.datePrecision))}</small>${row.note?`<p>${escapeHtml(row.note)}</p>`:''}</div>`;
    return row.url?`<a class="archive-overview-highlight" href="${escapeHtml(safeUrl(row.url))}" target="_blank" rel="noreferrer"><div class="archive-media-visual">${media}</div>${body}</a>`:`<article class="archive-overview-highlight"><div class="archive-media-visual">${media}</div>${body}</article>`;
  }).join('')}</div></section>`;
}
function personButton(name){return `<button type="button" class="archive-person-chip" data-archive-person="${escapeHtml(name)}">${escapeHtml(name)}</button>`}
function notionGuideRows(item){return (item.notionSections||[]).filter(row=>row&&(row.title||row.text))}
function notionTextMarkup(value=''){return escapeHtml(String(value||'')).replace(/\n/g,'<br>')}
function resultRows(item){return (item.results||[]).filter(row=>row&&(row.title||row.label||row.value||row.name))}
function resultValue(item,patterns=[]){
  const rows=resultRows(item);
  for(const pattern of patterns){const row=rows.find(x=>pattern.test(String(x.title||x.label||'')));if(row)return String(row.value||row.name||'').trim()}
  return'';
}
function splitGuideValue(value=''){
  return [...new Set(String(value||'').split(/\s*[·•|]\s*|\n+/).map(v=>v.trim()).filter(v=>v.length>1))];
}
function isJustserver(item){return item?.series?.id==='justserver'||/^그냥서버/.test(String(item?.title||''))}
function detailTitleClass(item={}){
  const title=String(item.title||''),length=[...title.replace(/\s+/g,'')].length;
  if(isJustserver(item))return'is-justserver';
  if(length>=14)return'is-title-xlong';
  if(length>=10)return'is-title-long';
  return'';
}
function resultCardClass(row={}){
  const title=String(row.title||row.label||''),value=String(row.value||row.name||'');
  return title.length>=18||value.length>=52?' is-wide':'';
}
function guideSourceRows(item){
  const notion=notionGuideRows(item).map(row=>({title:row.title||row.pageTitle||'가이드',text:row.text||'',pageTitle:row.pageTitle||'Notion',kind:'notion'}));
  const records=resultRows(item).map(row=>({title:row.title||row.label||'기록',text:String(row.value||row.name||''),pageTitle:'구조화 기록',kind:'record'}));
  const seen=new Set(),rows=[];
  for(const row of [...notion,...records]){
    const key=(row.title+'\n'+row.text).replace(/\s+/g,' ').toLowerCase();if(!key||seen.has(key))continue;seen.add(key);rows.push(row);
  }
  return rows;
}
function guideBuckets(item){
  const buckets={systems:[],rules:[],economy:[],progression:[],other:[]};
  for(const row of guideSourceRows(item)){
    const hay=(row.title+' '+row.text).toLowerCase();
    if(/규칙|금지|제한|허용|주의|룰/.test(hay))buckets.rules.push(row);
    else if(/api|후원|경제|재화|골드|빚|상환|가격|상점|구매|수리권|세금/.test(hay))buckets.economy.push(row);
    else if(/진행|흐름|목표|졸업|탈출|입장|단계|루트|오픈 준비/.test(hay))buckets.progression.push(row);
    else if(/시스템|콘텐츠|컨텐츠|채광|광물|요리|낚시|도감|강화|램프|보물|갬블|미니게임|점프맵|농사|전투/.test(hay))buckets.systems.push(row);
    else buckets.other.push(row);
  }
  return buckets;
}
function overviewFacts(item){
  const candidates=[
    ['핵심 목표',resultValue(item,[/핵심 목표/,/현재 단계/])],
    ['콘셉트',resultValue(item,[/서버 컨셉/,/시리즈 위치/,/모집 방식/])],
    ['진행 기간',resultValue(item,[/서버 기간/,/진행 기간/,/예정 기간/])||formatRange(item)],
    ['입주 · 모집',resultValue(item,[/1차 입주자/,/초기 모집 정원/,/입주 명단 표기/,/입주 순서/])]
  ].filter(([,value])=>value);
  return candidates.slice(0,4);
}
function systemTokens(item){
  const titles=[/주요 콘텐츠/,/주요 시스템/,/가이드 핵심/,/서버 컨셉/],tokens=[];
  for(const pattern of titles){
    const value=resultValue(item,[pattern]);if(!value)continue;
    tokens.push(...splitGuideValue(value));
  }
  return [...new Set(tokens)].slice(0,12);
}
function renderGuideCardRows(rows=[],limit=6){
  return rows.slice(0,limit).map(row=>`<article class="archive-knowledge-card"><small>${escapeHtml(row.pageTitle||'GUIDE')}</small><strong>${escapeHtml(row.title||'가이드')}</strong><p>${escapeHtml(String(row.text||'').replace(/\s+/g,' ').slice(0,240))}${String(row.text||'').length>240?'…':''}</p></article>`).join('');
}
function renderJustserverKnowledge(item,{compact=false}={}){
  if(!isJustserver(item))return'';
  const facts=overviewFacts(item),buckets=guideBuckets(item),tokens=systemTokens(item);
  const rules=buckets.rules.slice(0,compact?2:6);
  const economy=buckets.economy.slice(0,compact?2:6);
  const progression=buckets.progression.slice(0,compact?2:6);
  const systems=buckets.systems.slice(0,compact?3:8);
  const systemMarkup=tokens.length
    ?`<div class="archive-system-chip-grid">${tokens.map((token,i)=>`<span><b>${String(i+1).padStart(2,'0')}</b>${escapeHtml(token)}</span>`).join('')}</div>`
    :systems.length?`<div class="archive-knowledge-grid">${renderGuideCardRows(systems,compact?3:8)}</div>`:'';
  const flowSource=resultValue(item,[/가이드 핵심/,/핵심 목표/]);
  const flow=splitGuideValue(flowSource).slice(0,6);
  return `<section class="archive-knowledge-system ${compact?'is-compact':''}">
    <div class="archive-section-heading"><div><small>CONTENT BLUEPRINT</small><h3>콘텐츠 한눈에 보기</h3><p>공식 자료와 Notion 기획 문서를 같은 정보 구조로 정리합니다.</p></div><span>${escapeHtml(item.series?.title||'그냥서버')}</span></div>
    ${facts.length?`<div class="archive-fact-grid">${facts.map(([label,value])=>`<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`:''}
    ${systemMarkup?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>GAME SYSTEMS</small><h3>게임 시스템</h3></div>${systemMarkup}</div>`:''}
    ${!compact&&rules.length?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>SERVER RULES</small><h3>서버 규칙</h3></div><div class="archive-knowledge-grid">${renderGuideCardRows(rules,6)}</div></div>`:''}
    ${!compact&&economy.length?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>ECONOMY & API</small><h3>경제 · 후원 API</h3></div><div class="archive-knowledge-grid">${renderGuideCardRows(economy,6)}</div></div>`:''}
    ${!compact&&(progression.length||flow.length)?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>PLAY FLOW</small><h3>플레이 흐름</h3></div>${flow.length?`<div class="archive-flow">${flow.map((step,i)=>`<span><b>${i+1}</b><em>${escapeHtml(step)}</em></span>`).join('')}</div>`:`<div class="archive-knowledge-grid">${renderGuideCardRows(progression,6)}</div>`}</div>`:''}
  </section>`;
}
function renderNotionPreview(item){
  const rows=notionGuideRows(item).slice(0,6);
  if(!rows.length&&isJustserver(item))return renderJustserverKnowledge(item,{compact:true});
  if(!rows.length)return'';
  return `<section class="archive-notion-preview"><div class="archive-section-heading"><div><small>NOTION GUIDE</small><h3>기획 · 시스템 가이드</h3><p>연결된 공개 Notion의 본문을 자동 수집해 핵심 섹션을 정리합니다.</p></div><span>${notionGuideRows(item).length}개</span></div>${renderJustserverKnowledge(item,{compact:true})}<div class="archive-notion-preview-grid">${rows.map(row=>`<article><small>${escapeHtml(row.pageTitle||'Notion')}</small><strong>${escapeHtml(row.title||'가이드')}</strong><p>${escapeHtml(String(row.text||'').replace(/\s+/g,' ').slice(0,180))}${String(row.text||'').length>180?'…':''}</p></article>`).join('')}</div></section>`;
}
function renderNotionGuide(item){
  const rows=notionGuideRows(item);
  const groups=new Map();
  for(const row of rows){const key=row.pageTitle||'Notion 가이드';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  const synced=item.notionSyncedAt?String(item.notionSyncedAt).slice(0,10):'';
  const details=rows.length?`<div class="archive-notion-groups">${[...groups.entries()].map(([pageTitle,sections],groupIndex)=>`<details class="archive-notion-group" ${groupIndex===0?'open':''}><summary><span><small>NOTION PAGE</small><strong>${escapeHtml(pageTitle)}</strong></span><b>${sections.length}개 섹션</b></summary><div class="archive-notion-sections">${sections.map(section=>`<article><small>${escapeHtml(section.pageTitle||'Notion')}</small><h3>${escapeHtml(section.title||'본문')}</h3>${section.text?`<p>${notionTextMarkup(section.text)}</p>`:''}</article>`).join('')}</div></details>`).join('')}</div>`:'<p class="archive-notion-wait">연결된 Notion 자료는 다음 자동 동기화에서 세부 섹션이 추가됩니다. 현재 확인된 구조화 기록은 먼저 표시합니다.</p>';
  return `<div class="archive-panel archive-notion-panel"><div class="archive-section-heading"><div><small>NOTION ARCHIVE</small><h2>기획 · 시스템 가이드</h2><p>머니게임을 기준 레이아웃으로 삼아 다이아·적자생존에도 같은 디자인 시스템을 적용합니다.</p></div><span>${rows.length?rows.length+'개'+(synced?' · '+escapeHtml(formatDate(synced,'day')):''):'자동 수집'}</span></div>${renderJustserverKnowledge(item,{compact:false})}${details}</div>`;
}
function resultValue(item,title){
  const row=(item.results||[]).find(row=>String(row.title||row.label||'').trim()===title);
  return String(row?.value||row?.name||'').trim();
}
function splitResultValues(value=''){return String(value||'').split(/\s*[·•]\s*|\s*\/\s*/).map(v=>v.trim()).filter(Boolean)}
function justserverKnowledgeModel(item){
  const id=String(item?.id||'');
  if(!['justserver-moneygame','justserver-diamond','justserver-survival'].includes(id))return null;
  const model={eyebrow:'JUSTSERVER GUIDE',overview:[],systems:[],flow:[],details:[]};
  if(id==='justserver-moneygame'){
    model.title='머니게임 한눈에 보기';model.copy='빚 청산이라는 목표와 경제·생활·후원 시스템을 한 화면에서 파악할 수 있도록 정리했습니다.';
    model.overview=[['핵심 목표',resultValue(item,'핵심 목표')],['진행 기간',resultValue(item,'서버 기간')],['입주 방식',resultValue(item,'입주 순서')],['주요 콘텐츠',resultValue(item,'주요 콘텐츠')]];
    model.systems=[...splitResultValues(resultValue(item,'주요 콘텐츠')).map(v=>['CONTENT',v]),...splitResultValues(resultValue(item,'주요 시스템')).map(v=>['SYSTEM',v])];
    model.flow=['난파 · 사자마을','생활 콘텐츠로 재화 획득','장비·땅·강화 시스템 이용','빚 상환','탈출 · 졸업'];
    model.details=[['서버 규칙',resultValue(item,'서버 규칙')],['플레이어 API',resultValue(item,'플레이어 API')],['가이드 핵심',resultValue(item,'가이드 핵심')]];
  }else if(id==='justserver-diamond'){
    model.title='다이아 한눈에 보기';model.copy='첫 시즌의 힐링형 채광·도감 콘셉트와 모집 조건, 후원 연동 요소를 같은 디자인 체계로 정리했습니다.';
    model.overview=[['서버 콘셉트',resultValue(item,'서버 컨셉')],['진행 기간',resultValue(item,'진행 기간')],['모집 정원',resultValue(item,'초기 모집 정원')],['모집 방식',resultValue(item,'모집 방식')]];
    model.systems=[['CORE','다이아'],['CORE','도감'],['MOOD','힐링 티키타카'],...splitResultValues(resultValue(item,'API 예시')).slice(0,6).map(v=>['API',v])];
    model.flow=['댓글 신청','서버 입주','다이아 채광','도감 진행','후원 API 이벤트'];
    model.details=[['시리즈 위치',resultValue(item,'시리즈 위치')],['API 예시',resultValue(item,'API 예시')]];
  }else{
    model.title='적자생존 한눈에 보기';model.copy='모집부터 설명회, 입주, 오픈 준비까지 현재까지 확인된 운영 흐름을 동일한 아카이브 디자인으로 정리했습니다.';
    model.overview=[['예정 기간',resultValue(item,'예정 기간')],['현재 단계',resultValue(item,'현재 단계')],['1차 입주자',resultValue(item,'1차 입주자')],['입장 시간',resultValue(item,'1차 입장 시간')]];
    model.systems=[['PROCESS','모집'],['PROCESS','신청'],['PROCESS','합격자 안내'],['PROCESS','설명회'],['PROCESS','2차 입주 모집'],['PROCESS','오픈 준비']];
    model.flow=['모집 공지','신청자 확인','합격자 안내','설명회','입주','서버 오픈'];
    model.details=[['준비 방송 기록',resultValue(item,'준비 방송 기록')],['2차 입주 모집',resultValue(item,'2차 입주 모집')],['UP 랭킹 원문',resultValue(item,'UP 랭킹 원문')]];
  }
  model.overview=model.overview.filter(([,v])=>v);model.systems=model.systems.filter(([,v])=>v);model.details=model.details.filter(([,v])=>v);return model;
}
function renderJustserverKnowledge(item){
  const model=justserverKnowledgeModel(item);if(!model)return'';
  const notionCount=(item.notionSections||[]).length;
  return `<section class="archive-knowledge"><div class="archive-knowledge-head"><div><small>${escapeHtml(model.eyebrow)}</small><h3>${escapeHtml(model.title)}</h3><p>${escapeHtml(model.copy)}</p></div><span>${notionCount?'Notion '+notionCount+'개 섹션':'공식 자료 기반'}</span></div><div class="archive-knowledge-overview">${model.overview.map(([label,value])=>`<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>${model.systems.length?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>SYSTEM MAP</small><h3>핵심 콘텐츠 · 시스템</h3></div><div class="archive-system-chips">${model.systems.map(([kind,value])=>`<span><small>${escapeHtml(kind)}</small><b>${escapeHtml(value)}</b></span>`).join('')}</div></div>`:''}${model.flow.length?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>PLAY FLOW</small><h3>진행 흐름</h3></div><ol class="archive-flow">${model.flow.map((value,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><b>${escapeHtml(value)}</b></li>`).join('')}</ol></div>`:''}${model.details.length?`<div class="archive-knowledge-block"><div class="archive-subheading"><small>DETAILS</small><h3>핵심 상세 정보</h3></div><div class="archive-knowledge-details">${model.details.map(([label,value])=>`<article><small>${escapeHtml(label)}</small><p>${escapeHtml(value)}</p></article>`).join('')}</div></div>`:''}</section>`;
}

function renderOverview(item){
  const people=allPeople(item).slice(0,16);
  const peopleTitle=item.category==='class-event'?'확인된 수강생':'확인된 참가자';
  return `<div class="archive-panel archive-overview-panel"><div class="archive-section-heading"><div><small>ABOUT THIS CONTENT</small><h2>콘텐츠 소개</h2></div></div><p class="archive-description">${escapeHtml(item.description||item.summary||'공식 자료를 기반으로 내용을 정리하고 있습니다.')}</p>${renderJustserverKnowledge(item)}<div class="archive-subheading"><small>SUMMARY</small><h3>주요 기록</h3></div>${renderRecordStrip(item)}${renderNotionPreview(item)}${people.length?`<section class="archive-overview-people"><div class="archive-subheading"><small>PEOPLE</small><h3>${escapeHtml(peopleTitle)}</h3></div><div class="archive-people-chips">${people.map(personButton).join('')}</div></section>`:''}${renderOverviewHighlights(item)}</div>`;
}
function renderTimeline(item){const sources=sourceMap(item),rows=[...(item.timeline||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));if(!rows.length)return'<div class="archive-panel"><h2>타임라인</h2><p>확인된 타임라인 자료를 준비하고 있습니다.</p></div>';return`<div class="archive-panel"><h2>타임라인</h2><div class="archive-timeline">${rows.map(row=>{const source=sources.get(row.sourceId),thumb=row.thumbnail?`<div class="archive-timeline-thumb">${imageMarkup({src:row.thumbnail,alt:row.title},row.title)}</div>`:'<div class="archive-timeline-thumb is-fallback"></div>';return`<article class="archive-timeline-item"><time class="archive-timeline-date">${escapeHtml(formatDate(row.date,row.datePrecision))}</time>${thumb}<div class="archive-timeline-body"><span class="archive-chip">${escapeHtml(materialTypeLabel(row.type))}</span><strong>${escapeHtml(row.title)}</strong>${row.note?`<p>${escapeHtml(row.note)}</p>`:''}${row.url?`<a class="archive-source-link" href="${escapeHtml(safeUrl(row.url))}" target="_blank" rel="noreferrer">${escapeHtml(source?.label||'원문')} 보기 ↗</a>`:''}</div></article>`}).join('')}</div></div>`}
function mediaCardMarkup(row){return `<a class="archive-media-card" href="${escapeHtml(safeUrl(row.url))}" target="_blank" rel="noreferrer"><div class="archive-media-visual">${row.thumbnail?imageMarkup({src:row.thumbnail,alt:row.title},row.title):`<span class="archive-media-fallback-label">${escapeHtml(materialTypeLabel(row.type))}</span>`}</div><div class="archive-media-copy"><span class="archive-chip">${escapeHtml(materialTypeLabel(row.type))}</span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(formatDate(row.date,row.datePrecision))}</small>${row.note?`<p>${escapeHtml(row.note)}</p>`:''}<b>원문 보기 ↗</b></div></a>`}
function renderMedia(item){
  const rows=item.media||[];if(!rows.length)return'<div class="archive-panel"><h2>영상 · 방송</h2><p>확인된 다시보기·클립·방송 기록을 준비하고 있습니다.</p></div>';
  const order=['vod','catch','clip','youtube','shorts'];
  const counts=Object.fromEntries(order.map(type=>[type,rows.filter(row=>row.type===type).length]));
  return `<div class="archive-panel"><div class="archive-section-heading"><div><small>MEDIA ARCHIVE</small><h2>영상 · 방송</h2><p>VOD·Catch·Clip·YouTube를 바로 골라볼 수 있습니다.</p></div><span>${rows.length}개</span></div><div class="archive-media-filter" role="group" aria-label="영상 종류 필터"><button type="button" data-media-filter="all" aria-pressed="true">전체 <b>${rows.length}</b></button>${order.filter(type=>counts[type]).map(type=>`<button type="button" data-media-filter="${type}" aria-pressed="false">${escapeHtml(materialTypeLabel(type))} <b>${counts[type]}</b></button>`).join('')}</div><div class="archive-media-grid" data-media-grid>${rows.map(row=>`<div data-media-type="${escapeHtml(row.type||'other')}">${mediaCardMarkup(row)}</div>`).join('')}</div><p class="archive-filter-empty" data-media-empty hidden>선택한 종류의 영상이 없습니다.</p></div>`;
}
function bindMediaFilter(panel){
  const buttons=[...panel.querySelectorAll('[data-media-filter]')],cards=[...panel.querySelectorAll('[data-media-type]')],empty=panel.querySelector('[data-media-empty]');
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const type=button.dataset.mediaFilter||'all';let visible=0;
    buttons.forEach(row=>row.setAttribute('aria-pressed',String(row===button)));
    cards.forEach(card=>{const show=type==='all'||card.dataset.mediaType===type;card.hidden=!show;if(show)visible++});
    if(empty)empty.hidden=visible>0;
  }));
}
function renderPosts(item){const rows=[...(item.timeline||[]),...(item.media||[])].filter(r=>['notice','post','article','reference'].includes(r.type));if(!rows.length)return'<div class="archive-panel"><h2>게시글</h2><p>확인된 공지와 관련 게시글을 준비하고 있습니다.</p></div>';return`<div class="archive-panel"><h2>게시글</h2><div class="archive-source-list">${rows.map(r=>`<a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noreferrer"><span><strong>${escapeHtml(r.title)}</strong><small>${escapeHtml(materialTypeLabel(r.type))} · ${escapeHtml(formatDate(r.date,r.datePrecision))}</small></span><b>↗</b></a>`).join('')}</div></div>`}
function renderParticipantGroups(item){
  const groups=item.participantGroups||[];if(!groups.length)return'';
  const groupMarkup=group=>{const count=Number(group.count||group.participants?.length||0),hasNames=(group.participants||[]).length>0,emptyCopy=count>0?'개별 닉네임은 아직 확인되지 않았습니다.':'확인된 명단을 정리하고 있습니다.';return `<details class="archive-participant-group"><summary><span><b>${escapeHtml(group.title||group.platform||'참가자 그룹')}</b>${group.platform?`<small>${escapeHtml(group.platform)}</small>`:''}</span><strong>${count}명</strong></summary>${group.note?`<p>${escapeHtml(group.note)}</p>`:''}${hasNames?`<div class="archive-people-chips">${group.participants.map(name=>`<span data-person-row="${escapeHtml(normalize(name))}">${personButton(name)}</span>`).join('')}</div>`:`<p>${emptyCopy}</p>`}</details>`};
  const stages=[],stageMap=new Map(),ungrouped=[];
  for(const group of groups){
    const stage=String(group.stage||'').trim();
    if(!stage){ungrouped.push(group);continue}
    if(!stageMap.has(stage)){const row={title:stage,groups:[]};stageMap.set(stage,row);stages.push(row)}
    stageMap.get(stage).groups.push(group);
  }
  const stagedMarkup=stages.map(stage=>{
    const count=stage.groups.reduce((sum,row)=>sum+Number(row.count||row.participants?.length||0),0);
    return `<section class="archive-participant-stage"><div class="archive-participant-stage-heading"><span><small>ENTRY STAGE</small><strong>${escapeHtml(stage.title)}</strong></span><b>${count}명</b></div><div class="archive-participant-stage-groups">${stage.groups.map(groupMarkup).join('')}</div></section>`;
  }).join('');
  return `<div class="archive-participant-groups">${stagedMarkup}${ungrouped.map(groupMarkup).join('')}</div>`;
}
function renderPeople(item){
  const p=allPeople(item),g=item.participantGroups||[],r=item.results||[],isClass=item.category==='class-event',count=itemPeopleCount(item);
  const partial=count>p.length&&p.length>0?`<p class="archive-participant-count-note">전체 참가자 <strong>${count}명</strong> · 현재 구조화된 명단 <strong>${p.length}명</strong></p>`:'';
  const search=p.length?`<label class="archive-participant-search"><span>이름 검색</span><input type="search" data-participant-search placeholder="참가자 이름 검색" autocomplete="off"></label><p class="archive-filter-empty" data-participant-empty hidden>검색 결과가 없습니다.</p>`:'';
  const master=p.length&&!g.length?`<div class="archive-people-chips archive-people-master">${p.map(name=>`<span data-person-row="${escapeHtml(normalize(name))}">${personButton(name)}</span>`).join('')}</div>`:'';
  const empty=!p.length&&!g.length?`<p>${isClass?'확인된 수강생 명단을 정리하고 있습니다.':'공식 자료에서 확인된 참가자 명단을 정리하고 있습니다.'}</p>`:'';
  return `<div class="archive-panel"><div class="archive-section-heading"><div><small>${isClass?'CLASS RECORD':'PEOPLE & RESULT'}</small><h2>${isClass?'수강생 · 회차 기록':'참가자 · 결과'}</h2></div><span>${count?count+'명':'확인 중'}</span></div>${partial}${search}${master}${empty}${renderParticipantGroups(item)}${r.length?`<div class="archive-results-grid">${r.map(x=>`<article class="archive-result-card${resultCardClass(x)}"><small>${isClass?'SESSION':'RESULT'}</small><strong>${escapeHtml(x.title||x.label||'결과')}</strong><p>${escapeHtml(x.value||x.name||'')}</p></article>`).join('')}</div>`:''}</div>`;
}
function bindPeoplePanel(panel){
  const input=panel.querySelector('[data-participant-search]'),rows=[...panel.querySelectorAll('[data-person-row]')],empty=panel.querySelector('[data-participant-empty]');
  input?.addEventListener('input',()=>{const q=normalize(input.value);let visible=0;rows.forEach(row=>{const show=!q||String(row.dataset.personRow||'').includes(q);row.hidden=!show;if(show)visible++});if(empty)empty.hidden=visible>0});
}
function renderGallery(item){const rows=item.gallery||[];if(!rows.length)return'<div class="archive-panel"><h2>자료 이미지</h2><p>포스터와 관련 이미지를 준비하고 있습니다.</p></div>';return`<div class="archive-panel"><div class="archive-section-heading"><div><small>VISUAL ARCHIVE</small><h2>자료 이미지</h2></div><span>${rows.length}장</span></div><div class="archive-gallery">${rows.map((r,i)=>`<button type="button" data-archive-gallery="${i}"><figure><img src="${escapeHtml(safeUrl(r.src||r.url))}" alt="${escapeHtml(r.alt||r.caption||item.title+' 관련 이미지')}" loading="lazy" decoding="async"><figcaption>${escapeHtml(r.caption||'관련 이미지')}</figcaption></figure></button>`).join('')}</div></div>`}
function sourcePriority(row={}){const url=String(row.url||'');if(/sooplive\.com/i.test(url))return 0;if(/youtube\.com|youtu\.be/i.test(url))return 1;if(/notion\.(?:site|so)|app\.notion\.com/i.test(url))return 2;if(/namu\.wiki/i.test(url))return 3;if(row.kind==='official')return 4;return 5}
function renderSources(item){const rows=[...(item.sources||[])].filter(r=>!/bngts\.com/i.test(String(r.url||''))).map(r=>({...r,label:String(r.label||'원문 자료').replace(/나무위키 계열|나무미러/g,'나무위키')})).sort((a,b)=>sourcePriority(a)-sourcePriority(b)||String(a.label||'').localeCompare(String(b.label||''),'ko'));return`<div class="archive-panel"><div class="archive-section-heading"><div><small>SOURCE ARCHIVE</small><h2>출처</h2></div><span>${rows.length}개</span></div><p class="archive-source-guide">춘봉 SOOP 방송국을 최우선으로, 춘봉TV YouTube·공개 Notion·나무위키 등 확인 가능한 원문 자료를 표시합니다. 방통실과 내부 검증용 자료는 공개 출처에 사용하지 않습니다.</p><div class="archive-source-list">${rows.map(r=>`<a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noreferrer"><span><strong>${escapeHtml(r.label||'원문 자료')}</strong><small class="archive-source-kind is-${escapeHtml(r.kind||'reference')}">${escapeHtml(sourceKindLabel(r.kind))}</small></span><b>↗</b></a>`).join('')}</div></div>`}

function seriesSessions(item){return [...(item.seriesSessions||[])].filter(row=>row&&Number(row.number)>0).sort((a,b)=>Number(a.number)-Number(b.number))}
function selectedSeriesSession(item){
  const rows=seriesSessions(item);if(!rows.length)return null;
  const requested=Number(queryState().session);
  return rows.find(row=>Number(row.number)===requested)||rows[rows.length-1];
}
function renderSeriesArchive(item){
  const rows=seriesSessions(item);if(!rows.length)return'';
  const selected=selectedSeriesSession(item);if(!selected)return'';
  const seriesTitle=item.series?.title||item.title||'시리즈';
  const isClass=item.category==='class-event';
  const attendeeLabel=isClass?'수강생':'참가자';
  const posterSrc=safeUrl(selected.poster?.src);
  const dateLabel=formatDate(selected.date,selected.datePrecision||'day');
  const attendance=Number(selected.participantCount)>0?Number(selected.participantCount)+'명':'확인 중';
  const posterAlt=selected.poster?.alt||selected.title||seriesTitle+' 회차 포스터';
  const poster=posterSrc
    ?`<button type="button" class="archive-series-poster is-ready" data-archive-series-poster aria-label="${escapeHtml(selected.title||'회차')} 포스터 크게 보기">${normalizedImageMarkup({src:posterSrc,alt:posterAlt},posterAlt,true)}<span>포스터 크게 보기</span></button>`
    :`<div class="archive-series-poster is-pending"><div><b>POSTER</b><strong>원본 포스터 확인 중</strong><p>확인된 원본만 영구 자산으로 연결합니다.</p></div></div>`;
  const people=(selected.participants||[]);
  const fallbackTitle=`${seriesTitle} 제${selected.number}회`;
  return `<section class="archive-series" data-archive-series><div class="archive-series-heading"><div><small>SERIES ARCHIVE</small><h2>${escapeHtml(seriesTitle)} 회차 기록</h2><p>총 ${rows.length}회차의 날짜·시간·${attendeeLabel}·포스터를 같은 규격으로 분리해 확인할 수 있습니다.</p></div><span>${rows.length}회차</span></div><div class="archive-series-nav" role="tablist" aria-label="${escapeHtml(seriesTitle)} 회차 선택">${rows.map(row=>`<button type="button" role="tab" data-archive-session="${Number(row.number)}" aria-selected="${String(Number(row.number)===Number(selected.number))}"><b>제${Number(row.number)}회</b><small>${escapeHtml(formatDate(row.date,row.datePrecision||'day').replace(/^2026년 /,''))}</small></button>`).join('')}</div><div class="archive-series-focus">${poster}<div class="archive-series-copy"><p class="kicker">SESSION ${String(selected.number).padStart(2,'0')}</p><h3>${escapeHtml(selected.title||fallbackTitle)}</h3><div class="archive-series-meta"><span>${escapeHtml(dateLabel)}</span>${selected.time?`<span>${escapeHtml(selected.time)}</span>`:''}${selected.venue?`<span>${escapeHtml(selected.venue)}</span>`:''}<span>${attendeeLabel} ${escapeHtml(attendance)}</span></div>${selected.note?`<p class="archive-series-note">${escapeHtml(selected.note)}</p>`:''}${people.length?`<div class="archive-series-people"><small>확인된 ${attendeeLabel}</small><div class="archive-people-chips">${people.map(name=>`<span>${escapeHtml(name)}</span>`).join('')}</div></div>`:`<p class="archive-series-unconfirmed">${attendeeLabel} 명단은 확인되는 항목만 추가합니다.</p>`}</div></div></section>`;
}
function bindSeriesArchive(item){
  const selected=selectedSeriesSession(item);
  els.detail.querySelectorAll('[data-archive-session]').forEach(button=>button.addEventListener('click',()=>{
    const session=button.dataset.archiveSession||'';
    writeState({...queryState(),session},{push:true});
    renderDetail(item);
    els.detail.querySelector('[data-archive-series]')?.scrollIntoView?.({block:'nearest'});
  }));
  const posterButton=els.detail.querySelector('[data-archive-series-poster]');
  if(posterButton&&selected?.poster?.src)posterButton.addEventListener('click',()=>openLightbox(selected.poster.src,selected.poster.alt||selected.title,'',selected.title));
}
function openLightbox(src,alt,sourceUrl='',caption=''){const dialog=els.lightbox;if(!dialog)return;const image=dialog.querySelector('img'),source=dialog.querySelector('[data-archive-lightbox-source]'),cap=dialog.querySelector('[data-archive-lightbox-caption]');image.src=safeUrl(src);image.alt=alt||'콘텐츠 이미지';cap.textContent=caption||alt||'';source.hidden=!safeUrl(sourceUrl);source.href=safeUrl(sourceUrl)||'#';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}
function bindLightbox(item){els.detail.querySelectorAll('[data-archive-gallery]').forEach(b=>b.addEventListener('click',()=>{const row=(item.gallery||[])[Number(b.dataset.archiveGallery)];if(!row)return;const source=sourceMap(item).get(row.sourceId);openLightbox(row.src||row.url,row.alt,source?.url||row.url,row.caption)}))}
function bindPersonLinks(root=els.detail){
  root.querySelectorAll('[data-archive-person]').forEach(button=>button.addEventListener('click',()=>{
    const person=button.dataset.archivePerson||'';writeState({id:'',session:'',series:'',q:person,category:'all',status:'all',year:'all',mediaKind:'all',sort:'newest'},{push:true});void renderRoute();global.scrollTo?.({top:0,behavior:'smooth'});
  }));
}
function activateTab(name,item){els.detail.querySelectorAll('[data-archive-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.archiveTab===name)));const panel=els.detail.querySelector('[data-archive-panel]'),renderers={overview:renderOverview,guide:renderNotionGuide,timeline:renderTimeline,media:renderMedia,posts:renderPosts,people:renderPeople,gallery:renderGallery,sources:renderSources};panel.innerHTML=(renderers[name]||renderOverview)(item);bindBrokenImages(panel);bindPersonLinks(panel);if(name==='media')bindMediaFilter(panel);if(name==='people')bindPeoplePanel(panel);if(name==='gallery')bindLightbox(item)}
function relatedItems(item){
  const people=new Set(allPeople(item));const sid=itemSeriesId(item);
  return allItems.filter(row=>row.id!==item.id).map(row=>{
    let score=0;if(itemSeriesId(row)===sid)score+=8;if(row.category===item.category)score+=2;
    const shared=allPeople(row).filter(name=>people.has(name)).length;score+=Math.min(shared,4);
    return{row,score,shared};
  }).filter(x=>x.score>1).sort((a,b)=>b.score-a.score||String(b.row.startDate||'').localeCompare(String(a.row.startDate||''))).slice(0,4);
}
function renderRelated(item){
  const rows=relatedItems(item);if(!rows.length)return'';
  return `<section class="archive-related"><div class="archive-section-heading"><div><small>RELATED ARCHIVE</small><h2>관련 콘텐츠</h2></div><span>${rows.length}개</span></div><div class="archive-related-grid">${rows.map(({row,shared})=>`<button type="button" data-archive-related="${escapeHtml(row.id)}"><span>${escapeHtml(row.series?.title||categoryLabel(row.category))}</span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(formatRange(row))}${shared?' · 공통 참가자 '+shared+'명':''}</small></button>`).join('')}</div></section>`;
}
function bindRelated(){
  els.detail.querySelectorAll('[data-archive-related]').forEach(button=>button.addEventListener('click',()=>{writeState({...queryState(),id:button.dataset.archiveRelated||'',session:''},{push:true});void renderRoute();els.detail?.scrollIntoView?.({block:'start'})}));
}
function renderDetail(item){
  const hero=item.heroImage?.src?`<div class="archive-detail-media">${normalizedImageMarkup(item.heroImage,item.title,true)}</div>`:'<div class="archive-detail-media is-fallback"></div>';
  const titleClass=detailTitleClass(item);
  const isClass=item.category==='class-event',peopleLabel=isClass?'수강생':'참가자',peopleTab=isClass?'수강생 · 회차':'참가자 · 결과',seriesBack=queryState().series&&item.series?.title?item.series.title+' 시리즈':'콘텐츠 목록',peopleCount=itemPeopleCount(item);
  const recordState=item.verifiedAt&&((item.timeline||[]).length+(item.media||[]).length+(item.gallery||[]).length)>=3?'공식 자료 확인':'기록 보강 중';
  els.detail.innerHTML=`<button type="button" class="archive-reset" data-archive-back>← ${escapeHtml(seriesBack)}</button>${renderSiblingSeriesNav(item)}<div class="archive-detail-hero">${hero}<div class="archive-detail-copy${titleClass?' '+titleClass:''}"><p class="kicker">${escapeHtml(categoryLabel(item.category))}</p><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.summary||'공식 자료를 기반으로 콘텐츠 기록을 정리했습니다.')}</p><div class="archive-detail-meta"><span class="archive-chip">${escapeHtml(statusLabel(item.status))}</span><span class="archive-chip">${escapeHtml(item.role||'주최')}</span><span class="archive-chip">${escapeHtml(formatRange(item))}</span><span class="archive-chip is-record-state">${escapeHtml(recordState)}</span></div></div></div>${renderSeriesArchive(item)}<div class="archive-summary-grid"><div><small>진행 기간</small><strong>${escapeHtml(formatRange(item))}</strong></div><div><small>${peopleLabel}</small><strong>${peopleCount?peopleCount+'명':'확인 중'}</strong></div><div><small>타임라인</small><strong>${(item.timeline||[]).length}건</strong></div><div><small>영상 · 방송</small><strong>${(item.media||[]).length}개</strong></div><div><small>자료 이미지</small><strong>${(item.gallery||[]).length}장</strong></div><div><small>출처</small><strong>${item.sourceCount||item.sources?.length||0}개</strong></div></div><div class="archive-tabs" role="tablist" aria-label="콘텐츠 기록 섹션"><button type="button" role="tab" data-archive-tab="overview" aria-selected="true">소개</button>${((item.notionSections||[]).length||isJustserver(item))?'<button type="button" role="tab" data-archive-tab="guide" aria-selected="false">가이드</button>':''}<button type="button" role="tab" data-archive-tab="timeline" aria-selected="false">기록</button><button type="button" role="tab" data-archive-tab="media" aria-selected="false">영상</button><button type="button" role="tab" data-archive-tab="posts" aria-selected="false">게시글</button><button type="button" role="tab" data-archive-tab="people" aria-selected="false">${peopleTab}</button><button type="button" role="tab" data-archive-tab="gallery" aria-selected="false">이미지</button><button type="button" role="tab" data-archive-tab="sources" aria-selected="false">자료</button></div><div data-archive-panel>${renderOverview(item)}</div>${renderRelated(item)}`;
  els.detail.querySelector('[data-archive-back]')?.addEventListener('click',()=>{writeState({...queryState(),id:'',session:''},{push:true});void renderRoute()});
  els.detail.querySelectorAll('[data-archive-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.archiveTab,item)));
  els.detail.querySelectorAll('[data-archive-sibling]').forEach(b=>b.addEventListener('click',()=>{writeState({...queryState(),series:itemSeriesId(item),id:b.dataset.archiveSibling||'',session:''},{push:true});void renderRoute()}));
  bindSeriesArchive(item);bindBrokenImages(els.detail);bindPersonLinks(els.detail);bindRelated();
}
async function showDetail(id){els.browser.hidden=true;els.detail.hidden=false;els.detail.innerHTML='<div class="archive-empty"><span aria-hidden="true">✦</span><strong>기록을 불러오는 중입니다.</strong><p>공식 자료와 연결하고 있습니다.</p></div>';try{const p=await fetchJson(API_DETAIL+encodeURIComponent(id));if(!p.item)return detailEmpty('목록에서 다른 콘텐츠를 선택해 주세요.');renderDetail(p.item)}catch(e){detailEmpty(e?.status===404?'해당 콘텐츠가 없거나 아직 공개되지 않았습니다.':'자료를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.')}}
async function renderRoute(){const s=queryState();if(s.id)return showDetail(s.id);els.detail.hidden=true;els.browser.hidden=false;renderList()}
async function refreshAfterAutoSync(){
  try{
    const response=await fetch('/api/content?type=content-archive-auto-sync',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:'{}'});
    if(!response.ok)return;
    const result=await response.json();
    if(result.skipped||!Number(result.changedItemCount||0))return;
    const fresh=await fetch(API_LIST+'&_sync='+Date.now(),{headers:{accept:'application/json'},cache:'no-store'}).then(r=>r.ok?r.json():null);
    if(!fresh?.items)return;
    allItems=fresh.items;populateYears(allItems);await renderRoute();
  }catch{}
}
async function boot(){bindToolbar();try{const p=await fetchJson(API_LIST);allItems=Array.isArray(p.items)?p.items:[]}catch{allItems=[]}populateYears(allItems);await renderRoute();void refreshAfterAutoSync()}
d.querySelector('[data-archive-lightbox-close]')?.addEventListener('click',()=>els.lightbox?.close());els.lightbox?.addEventListener('click',e=>{if(e.target===els.lightbox)els.lightbox.close()});d.addEventListener('keydown',e=>{if(e.key==='Escape'&&els.lightbox?.open)els.lightbox.close()});global.addEventListener('popstate',()=>void renderRoute());if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();
})(typeof window!=='undefined'?window:globalThis);
