(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.ChunbongPostsRuntime=api;
if(!root?.document)return;
api.install(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const POST_TYPES=new Set(['notice','post','article','reference']);
const TYPE_LABELS={notice:'공지',post:'게시글',article:'기사',reference:'참고 자료'};
const SESSION_PREFIX='chunbong:source-preview:v7:';
const previewCache=new Map();

function clean(value=''){return String(value??'').normalize('NFKC').trim()}
function safeUrl(value=''){
  const raw=clean(value);if(!raw)return'';
  try{const url=new URL(raw,'https://chunbong-fansite.vercel.app/');return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}
}
function soopPostId(value=''){
  try{const url=new URL(clean(value),'https://chunbong-fansite.vercel.app/');const match=url.pathname.match(/\/station\/chunbongtv\/post\/(\d+)/i);return match?.[1]||''}catch{return''}
}
function canonicalUrl(value=''){
  const raw=safeUrl(value);if(!raw)return'';
  const id=soopPostId(raw);if(id)return`https://www.sooplive.com/station/chunbongtv/post/${id}`;
  try{
    const url=new URL(raw);url.hash='';
    for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||/^(?:fbclid|gclid|ref|from)$/i.test(key))url.searchParams.delete(key);
    const params=[...url.searchParams.entries()].sort(([ak,av],[bk,bv])=>ak.localeCompare(bk)||av.localeCompare(bv));
    url.search='';for(const [key,val] of params)url.searchParams.append(key,val);
    url.pathname=url.pathname.replace(/\/+$/,'')||'/';return url.href;
  }catch{return raw}
}
function postCanonicalKey(row={}){
  const url=clean(row.url||row.href||'');const soop=soopPostId(url);if(soop)return`soop:${soop}`;
  const canonical=canonicalUrl(url);if(canonical)return`url:${canonical}`;
  const id=clean(row.id||row.sourceId||'');if(id)return`row:${id}`;
  const title=clean(row.title||row.label||'').toLocaleLowerCase('ko-KR');
  const date=clean(row.date||'');const type=clean(row.type||'post');const note=clean(row.note||'').slice(0,80);
  return`fallback:${type}|${date}|${title}|${note}`;
}
function dateRank(row={}){
  const value=clean(row.date||'');const precision=clean(row.datePrecision||'unknown');
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&precision==='day')return 3;
  if(/^\d{4}-\d{2}$/.test(value)&&precision==='month')return 2;
  if(/^\d{4}$/.test(value)&&precision==='year')return 1;
  return 0;
}
function placeholderTitle(value=''){
  const title=clean(value);
  if(!title)return true;
  if(/^\d+$/.test(title))return true;
  if(/공식\s*(?:게시글|공지)\s*[·:#-]?\s*\d+\s*$/i.test(title))return true;
  if(/^(?:공식\s*)?(?:게시글|공지)(?:\s*[·:#-]?\s*\d+)?$/i.test(title))return true;
  if(/^(?:SOOP\s*)?(?:게시글|공지)$/i.test(title))return true;
  return false;
}
function titleRank(value=''){
  const title=clean(value);if(!title)return 0;
  return (placeholderTitle(title)?1:3)+Math.min([...title].length,60)/100;
}
function rowRank(row={}){return dateRank(row)*10+titleRank(row.title||row.label||'')+(safeUrl(row.url||'')?1:0)}
function mergePostRows(primary={},candidate={}){
  const a={...primary},b={...candidate};const merged={...a};
  if(titleRank(b.title||b.label)>titleRank(a.title||a.label))merged.title=b.title||b.label;
  if(dateRank(b)>dateRank(a)){merged.date=b.date;merged.datePrecision=b.datePrecision}
  else if(!merged.date&&b.date){merged.date=b.date;merged.datePrecision=b.datePrecision}
  if(rowRank(b)>rowRank(a)&&safeUrl(b.url))merged.url=b.url;
  else if(!safeUrl(merged.url)&&safeUrl(b.url))merged.url=b.url;
  for(const field of ['note','thumbnail','sourceId','visibility'])if(!clean(merged[field]||'')&&clean(b[field]||''))merged[field]=b[field];
  if(!clean(merged.type||''))merged.type=b.type||'post';
  return merged;
}
function sortDateValue(row={}){const rank=dateRank(row);if(!rank)return'';const raw=clean(row.date);return rank===3?raw:rank===2?raw+'-00':raw+'-00-00'}
function normalizePostRows(item={}){
  const input=[...(Array.isArray(item.timeline)?item.timeline:[]),...(Array.isArray(item.media)?item.media:[])].filter(row=>row&&POST_TYPES.has(clean(row.type||'post')));
  const map=new Map();
  for(const row of input){const normalized={...row,title:clean(row.title||row.label||'게시글'),type:clean(row.type||'post')||'post'};const key=postCanonicalKey(normalized);map.set(key,map.has(key)?mergePostRows(map.get(key),normalized):normalized)}
  return [...map.entries()].map(([key,row])=>({...row,__postKey:key})).sort((a,b)=>{const ad=sortDateValue(a),bd=sortDateValue(b);if(Boolean(ad)!==Boolean(bd))return ad?-1:1;if(ad!==bd)return bd.localeCompare(ad);const ai=Number(soopPostId(a.url)||0),bi=Number(soopPostId(b.url)||0);if(ai!==bi)return bi-ai;return String(a.__postKey).localeCompare(String(b.__postKey),'ko')});
}
function escapeHtml(value=''){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function parseRenderedDate(text=''){
  const iso=String(text).match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);if(iso)return{date:`${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`,datePrecision:'day'};
  const day=String(text).match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);if(day)return{date:`${day[1]}-${String(day[2]).padStart(2,'0')}-${String(day[3]).padStart(2,'0')}`,datePrecision:'day'};
  const month=String(text).match(/(\d{4})년\s*(\d{1,2})월/);if(month)return{date:`${month[1]}-${String(month[2]).padStart(2,'0')}`,datePrecision:'month'};
  const year=String(text).match(/(\d{4})년/);if(year)return{date:year[1],datePrecision:'year'};
  return{date:'',datePrecision:'unknown'};
}
function inferType(text=''){if(/공지|notice/i.test(text))return'notice';if(/기사|article/i.test(text))return'article';if(/참고|reference/i.test(text))return'reference';return'post'}
function collectRenderedRows(list){return [...list.querySelectorAll(':scope > a[href]')].map((anchor,index)=>{const meta=anchor.querySelector('small')?.textContent||anchor.textContent||'',date=parseRenderedDate(meta);return{id:`dom-${index}-${soopPostId(anchor.href)||''}`,type:inferType(meta),title:anchor.querySelector('strong')?.textContent?.trim()||anchor.textContent.trim()||'게시글',url:anchor.href,...date}})}
function sourceEligible(url=''){
  try{const parsed=new URL(url,root.location?.href||'https://chunbong-fansite.vercel.app/');if(/(^|\.)sooplive\.com$/i.test(parsed.hostname)&&/\/station\/chunbongtv\/post\/\d+/i.test(parsed.pathname))return true;if(/(^|\.)fmkorea\.com$/i.test(parsed.hostname)&&/\/(?:best\/)?\d+\/?$/i.test(parsed.pathname))return true}catch{}return false
}
function contentId(){const match=root.location?.pathname?.match(/^\/contents\/([^/?#]+)/);if(match)try{return decodeURIComponent(match[1])}catch{return match[1]};return new URLSearchParams(root.location?.search||'').get('id')||''}
function sessionKey(url=''){return`${contentId()}|${url}`}
function readSession(key){try{const row=JSON.parse(root.sessionStorage?.getItem(SESSION_PREFIX+key)||'null');if(row?.at&&Date.now()-row.at<30*60*1000)return row.value}catch{}return null}
function writeSession(key,value){try{root.sessionStorage?.setItem(SESSION_PREFIX+key,JSON.stringify({at:Date.now(),value}))}catch{}return value}
async function fetchPreview(url){
  const id=contentId();if(!id)return null;const key=sessionKey(url),stored=readSession(key);if(stored)return stored;if(previewCache.has(key))return previewCache.get(key);
  const request=root.fetch(`/api/content?type=chunbong-content&id=${encodeURIComponent(id)}&sourcePreview=1&previewVersion=5&url=${encodeURIComponent(url)}`,{headers:{accept:'application/json'},cache:'default'}).then(async response=>{if(!response.ok)throw new Error(`source_preview_${response.status}`);const payload=await response.json();return writeSession(key,payload?.preview||null)}).catch(()=>null);previewCache.set(key,request);return request;
}
function previewImageAllowed(value=''){const src=clean(value);return Boolean(src)&&!/(?:thumb_?profile|\/images\/svg\/|(?:image)?loading(?:light|dark)?\.(?:gif|png|webp))/i.test(src)}
function bodyMarkup(body=''){const value=clean(body);if(!value)return'';return`<div class="archive-source-notice-copy">${value.split(/\n{2,}/).map(block=>`<p>${escapeHtml(block).replace(/\n/g,'<br>')}</p>`).join('')}</div>`}
function imagesMarkup(images=[],title=''){const rows=[...new Set((Array.isArray(images)?images:[]).filter(previewImageAllowed))].slice(0,12);if(!rows.length)return'';return`<div class="archive-source-notice-gallery">${rows.map((src,index)=>`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(title)}${rows.length>1?` ${index+1}`:''}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`).join('')}</div>`}
function sourceLinkLabel(url=''){try{return /(^|\.)sooplive\.com$/i.test(new URL(url).hostname)?'SOOP 원문 보기 ↗':'원문 보기 ↗'}catch{return'원문 보기 ↗'}}
function previewDate(preview={}){return parseRenderedDate(preview?.date||preview?.dateIso||'')}
function previewKind(preview={},fallback='post'){const value=clean(preview?.kind||preview?.type||fallback).toLowerCase();return TYPE_LABELS[value]?value:fallback}
function metaText(type='post',date='',precision='unknown'){const label=TYPE_LABELS[type]||'게시글';return`${label} · ${precision==='unknown'||!date?'날짜 확인 중':date}`}
function renderPreview(card,preview,url,fallbackTitle){
  const detail=card.querySelector('[data-source-notice-detail]');if(!detail)return;
  const title=preview?.title||fallbackTitle,officialHtml=preview?.source==='soop-public'&&preview?.html?`<div class="archive-source-notice-html">${preview.html}</div>`:'',content=officialHtml||bodyMarkup(preview?.body||''),images=officialHtml?'':imagesMarkup(preview?.images,title);
  const titleNode=card.querySelector('[data-post-title]');if(titleNode&&preview?.title)titleNode.textContent=preview.title;
  const date=previewDate(preview),meta=card.querySelector('[data-post-meta]');
  if(meta&&date.date)meta.textContent=metaText(previewKind(preview,card.dataset.postType||'post'),date.date,date.datePrecision);
  detail.innerHTML=`<div class="notice-content">${content||'<div class="archive-source-notice-empty">이 자료는 팬사이트에 본문이 저장되어 있지 않아 확인 가능한 정보만 표시합니다.</div>'}${images}</div><a class="inline-link archive-source-notice-source" data-source-external-link="true" href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${sourceLinkLabel(url)}</a>`;
}
function cardMarkup(row,index,context='posts'){
  const url=safeUrl(row.url),previewable=url&&sourceEligible(url),date=row.datePrecision==='unknown'||!row.date?'날짜 확인 중':row.date,type=TYPE_LABELS[row.type]||'게시글';
  return`<article class="archive-post-card is-${escapeHtml(context)}" data-archive-post-card data-source-url="${escapeHtml(url)}" data-post-type="${escapeHtml(row.type||'post')}"><div class="archive-post-card-head"><span class="archive-post-index">${String(index+1).padStart(2,'0')}</span>${previewable?`<button class="archive-post-title-toggle" type="button" data-source-preview-toggle data-post-title-toggle aria-expanded="false"><span class="archive-post-main"><strong data-post-title>${escapeHtml(row.title||'게시글')}</strong><small data-post-meta>${escapeHtml(type)} · ${escapeHtml(date)}</small></span><span class="archive-post-chevron" aria-hidden="true">⌄</span></button>`:`<div class="archive-post-main"><strong data-post-title>${escapeHtml(row.title||'게시글')}</strong><small data-post-meta>${escapeHtml(type)} · ${escapeHtml(date)}</small></div>`}<div class="archive-post-actions">${url?`<a data-source-external-link="true" data-post-source-link href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">원문 보기 ↗</a>`:''}</div></div>${previewable?'<div class="archive-post-detail" data-source-notice-detail hidden></div>':''}</article>`;
}
function hydrateCachedPreviews(container){
  container?.querySelectorAll?.('[data-archive-post-card][data-source-url]').forEach(card=>{const url=card.dataset.sourceUrl||'';if(!url||card.dataset.previewLoaded)return;const stored=readSession(sessionKey(url));if(!stored)return;renderPreview(card,stored,url,card.querySelector('[data-post-title]')?.textContent||'게시글');card.dataset.previewLoaded='true'});
}
function normalizePanel(panel){
  if(!panel)return false;const heading=[...panel.querySelectorAll('h2')].find(node=>node.textContent.trim()==='게시글');const list=panel.querySelector('.archive-source-list');if(!heading||!list)return false;if(list.dataset.postsNormalized==='true')return false;
  const rows=normalizePostRows({timeline:collectRenderedRows(list),media:[]});list.classList.add('archive-post-list');list.innerHTML=rows.map((row,index)=>cardMarkup(row,index,'posts')).join('');list.dataset.archivePostCount=String(rows.length);list.dataset.postsNormalized='true';hydrateCachedPreviews(list);return true;
}
function directChildWithin(node,container){let current=node;while(current&&current.parentElement&&current.parentElement!==container)current=current.parentElement;return current?.parentElement===container?current:null}
function timelineRowFromNode(node,index=0){
  const anchor=[...node.querySelectorAll('a[href]')].find(link=>sourceEligible(link.href));if(!anchor)return null;
  const dateNode=node.querySelector('.archive-timeline-date,[data-timeline-date],time');const date=parseRenderedDate(dateNode?.textContent||node.textContent||'');
  const titleNode=node.querySelector('.archive-timeline-body strong,.archive-timeline-copy strong,strong');const chip=node.querySelector('.archive-chip,[data-timeline-type]');
  const note=node.querySelector('.archive-timeline-body p,.archive-timeline-copy p,p')?.textContent?.trim()||'';
  return{id:`timeline-${index}-${soopPostId(anchor.href)||''}`,type:inferType(chip?.textContent||anchor.textContent||''),title:titleNode?.textContent?.trim()||anchor.textContent.trim()||'게시글',url:anchor.href,note,...date};
}
function normalizeTimelinePanel(panel){
  if(!panel)return false;const heading=[...panel.querySelectorAll('h2')].find(node=>node.textContent.trim()==='타임라인');const timeline=panel.querySelector('.archive-timeline');if(!heading||!timeline||timeline.dataset.postsNormalized==='true')return false;
  const seen=new Set();let index=0,changed=false;
  const anchors=[...timeline.querySelectorAll('a[href]')].filter(anchor=>sourceEligible(anchor.href));
  for(const anchor of anchors){const node=anchor.closest('.archive-timeline-item')||directChildWithin(anchor,timeline);if(!node||!timeline.contains(node))continue;const row=timelineRowFromNode(node,index);if(!row)continue;const key=postCanonicalKey(row);if(seen.has(key)){node.remove();changed=true;continue}seen.add(key);const wrapper=document.createElement('div');wrapper.innerHTML=cardMarkup(row,index++,'timeline');const card=wrapper.firstElementChild;if(card){node.replaceWith(card);changed=true}}
  timeline.dataset.postsNormalized='true';hydrateCachedPreviews(timeline);return changed;
}
function cleanSourceTitle(value=''){return clean(value).replace(/^SOOP\s*(?:게시글|공지)\s*[·:：-]\s*/i,'').replace(/^춘봉\s*SOOP\s*(?:게시글|공지)\s*[·:：-]\s*/i,'')||'게시글'}
function sourceRowFromAnchor(anchor,index=0){const date=parseRenderedDate(anchor.textContent||'');return{id:`source-${index}-${soopPostId(anchor.href)||''}`,type:inferType(anchor.textContent||''),title:cleanSourceTitle(anchor.querySelector('strong')?.textContent||anchor.textContent||'게시글'),url:anchor.href,...date}}
function normalizeSourcesPanel(panel){
  if(!panel)return false;const heading=[...panel.querySelectorAll('h2')].find(node=>node.textContent.trim()==='출처');const list=panel.querySelector('.archive-source-list');if(!heading||!list||list.dataset.postsNormalized==='true')return false;
  const seen=new Set();let index=0,changed=false;
  for(const anchor of [...list.querySelectorAll(':scope > a[href]')]){if(!sourceEligible(anchor.href))continue;const row=sourceRowFromAnchor(anchor,index);const key=postCanonicalKey(row);if(seen.has(key)){anchor.remove();changed=true;continue}seen.add(key);const wrapper=document.createElement('div');wrapper.innerHTML=cardMarkup(row,index++,'sources');const card=wrapper.firstElementChild;if(card){anchor.replaceWith(card);changed=true}}
  list.dataset.postsNormalized='true';hydrateCachedPreviews(list);return changed;
}
function normalizeActivePanel(panel){return normalizePanel(panel)||normalizeTimelinePanel(panel)||normalizeSourcesPanel(panel)}
async function toggleCard(button){
  const card=button.closest('[data-archive-post-card]');if(!card)return;const detail=card.querySelector('[data-source-notice-detail]');if(!detail)return;
  const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));const chevron=button.querySelector('.archive-post-chevron');if(chevron)chevron.textContent=open?'⌃':'⌄';detail.hidden=!open;if(!open||card.dataset.previewLoaded==='true')return;if(card.dataset.previewLoaded==='loading')return;
  card.dataset.previewLoaded='loading';detail.hidden=false;detail.innerHTML='<div class="notice-detail-loading">게시글 본문을 불러오는 중...</div>';
  const url=card.dataset.sourceUrl||'',preview=await fetchPreview(url),fallbackTitle=card.querySelector('[data-post-title]')?.textContent||'게시글';
  if(preview){renderPreview(card,preview,url,fallbackTitle);card.dataset.previewLoaded='true';return}
  detail.innerHTML=`<div class="notice-detail-error"><strong>게시글 본문을 가져오지 못했습니다.</strong><p>팬사이트에 저장된 본문이나 공개 원문 응답이 없습니다.</p></div>${url?`<a class="inline-link archive-source-notice-source" data-source-external-link="true" href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${sourceLinkLabel(url)}</a>`:''}`;card.dataset.previewLoaded='error';
}
function ensureStyles(document){if(document.querySelector('link[data-chunbong-posts-style]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='chunbong-posts.css?v=2';link.dataset.chunbongPostsStyle='true';document.head.appendChild(link)}
function install(document){
  if(document.documentElement?.dataset?.chunbongPostsRuntime==='true')return;document.documentElement.dataset.chunbongPostsRuntime='true';ensureStyles(document);
  let queued=false;const refresh=()=>{queued=false;normalizeActivePanel(document.querySelector('[data-archive-panel]'))};const schedule=()=>{if(queued)return;queued=true;(root.requestAnimationFrame||setTimeout)(refresh)};
  document.addEventListener('click',event=>{const toggle=event.target.closest?.('[data-source-preview-toggle]');if(toggle){event.preventDefault();event.stopPropagation();void toggleCard(toggle);return}if(event.target.closest?.('[data-archive-tab]'))setTimeout(schedule,0)},true);
  const Observer=root.MutationObserver||MutationObserver;new Observer(schedule).observe(document.body,{childList:true,subtree:true});schedule();
}
return{postCanonicalKey,mergePostRows,normalizePostRows,normalizePanel,normalizeTimelinePanel,normalizeSourcesPanel,install};
});
