(()=>{
'use strict';
if(document.body?.dataset?.page!=='contents')return;
const previewCache=new Map(),SESSION_PREFIX='chunbong:source-preview:v7:';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function addStyles(){if(document.querySelector('link[data-content-page-enhancements]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='content-page-enhancements.css?v=6';link.dataset.contentPageEnhancements='true';document.head.appendChild(link)}
function contentId(){const match=location.pathname.match(/^\/contents\/([^/?#]+)/);if(match)try{return decodeURIComponent(match[1])}catch{return match[1]};return new URLSearchParams(location.search).get('id')||''}
function formatDate(value=''){const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[1]}-${match[2]}-${match[3]}`:''}
function sourceEligible(anchor){if(!anchor?.href)return false;try{const url=new URL(anchor.href,location.href);if(/(^|\.)sooplive\.com$/i.test(url.hostname)&&/\/station\/chunbongtv\/post\/\d+/i.test(url.pathname))return true;if(/(^|\.)fmkorea\.com$/i.test(url.hostname)&&/\/(?:best\/)?\d+\/?$/i.test(url.pathname))return true}catch{}return false}
function readSession(key){try{const row=JSON.parse(sessionStorage.getItem(SESSION_PREFIX+key)||'null');if(row?.at&&Date.now()-row.at<30*60*1000)return row.value}catch{}return null}
function writeSession(key,value){try{sessionStorage.setItem(SESSION_PREFIX+key,JSON.stringify({at:Date.now(),value}))}catch{}return value}
async function fetchPreview(url){const id=contentId();if(!id)throw new Error('content_id_missing');const key=`${id}|${url}`,stored=readSession(key);if(stored)return stored;if(previewCache.has(key))return previewCache.get(key);const request=fetch(`/api/content?type=chunbong-content&id=${encodeURIComponent(id)}&sourcePreview=1&previewVersion=5&url=${encodeURIComponent(url)}`,{headers:{accept:'application/json'},cache:'default'}).then(async response=>{if(!response.ok)throw new Error(`source_preview_${response.status}`);const payload=await response.json();return writeSession(key,payload?.preview||null)}).catch(()=>null);previewCache.set(key,request);return request}
function bodyMarkup(body=''){const clean=String(body||'').trim();if(!clean)return'';return `<div class="archive-source-notice-copy">${clean.split(/\n{2,}/).map(block=>`<p>${esc(block).replace(/\n/g,'<br>')}</p>`).join('')}</div>`}
function previewImageAllowed(value=''){const src=String(value||'').trim();if(!src)return false;return !/(?:thumb_?profile|\/images\/svg\/|(?:image)?loading(?:light|dark)?\.(?:gif|png|webp))/i.test(src)}
function imagesMarkup(images=[],title=''){const unique=[...new Set((Array.isArray(images)?images:[]).filter(previewImageAllowed))].slice(0,12);if(!unique.length)return'';return `<div class="archive-source-notice-gallery">${unique.map((src,index)=>`<figure><img src="${esc(src)}" alt="${esc(title)}${unique.length>1?` ${index+1}`:''}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`).join('')}</div>`}
function sourceKindLabel(kind=''){const value=String(kind||'').toLowerCase();if(value==='post'||value==='notice')return'NOTICE';if(value==='article')return'ARTICLE';return'POST'}
function sourceNumber(anchor){const rows=[...(anchor.parentElement?.querySelectorAll(':scope > a[href]')||[])].filter(sourceEligible);const index=Math.max(0,rows.indexOf(anchor));return String(index+1).padStart(2,'0')}
function sourceLinkLabel(url=''){try{return /(^|\.)sooplive\.com$/i.test(new URL(url,location.href).hostname)?'SOOP 원문 보기 ↗':'원문 보기 ↗'}catch{return'원문 보기 ↗'}}
function sourceLinkMarkup(url=''){return `<a class="inline-link archive-source-notice-source" data-source-external-link="true" href="${esc(url)}" target="_blank" rel="noreferrer noopener">${sourceLinkLabel(url)}</a>`}
function buildNotice(anchor){
  const existing=anchor.nextElementSibling;if(existing?.classList?.contains('archive-source-notice'))return existing;
  const fallbackTitle=anchor.querySelector('strong')?.textContent?.trim()||anchor.textContent.trim()||'자료 보기';
  const card=document.createElement('article');card.className='notice-card archive-source-notice';card.dataset.archiveSourceNotice='true';card.dataset.sourceUrl=anchor.href;
  card.innerHTML=`<button class="notice-toggle" type="button" aria-expanded="true"><span class="notice-index">${sourceNumber(anchor)}</span><span class="notice-main"><small data-source-notice-meta>POST</small><strong data-source-notice-title>${esc(fallbackTitle)}</strong></span><span class="notice-action"><span class="notice-state-label">본문 접기</span><span class="notice-chevron">⌃</span></span></button><div class="notice-body open"><div class="notice-detail" data-source-notice-detail><div class="notice-detail-loading">게시글 본문을 불러오는 중...</div></div></div>`;
  anchor.insertAdjacentElement('afterend',card);anchor.hidden=true;
  const toggle=card.querySelector('.notice-toggle'),body=card.querySelector('.notice-body'),label=card.querySelector('.notice-state-label'),chevron=card.querySelector('.notice-chevron');
  toggle?.addEventListener('click',()=>{const open=!body.classList.contains('open');body.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));if(label)label.textContent=open?'본문 접기':'본문 펼치기';if(chevron)chevron.textContent=open?'⌃':'⌄'});
  return card;
}
function renderPreview(card,preview,url,fallbackTitle='자료 보기'){
  const title=preview?.title||fallbackTitle,date=formatDate(preview?.date||''),kind=sourceKindLabel(preview?.kind),officialHtml=preview?.source==='soop-public'&&preview?.html?`<div class="archive-source-notice-html">${preview.html}</div>`:'',content=officialHtml||bodyMarkup(preview?.body||''),images=officialHtml?'':imagesMarkup(preview?.images,title),detail=card.querySelector('[data-source-notice-detail]'),titleNode=card.querySelector('[data-source-notice-title]'),meta=card.querySelector('[data-source-notice-meta]');
  if(titleNode)titleNode.textContent=title;if(meta)meta.textContent=date?`${kind} · ${date}`:kind;
  if(detail)detail.innerHTML=`<div class="notice-content">${content||'<div class="archive-source-notice-empty">이 자료는 팬사이트에 본문이 저장되어 있지 않아 확인 가능한 정보만 표시합니다.</div>'}${images}</div>${sourceLinkMarkup(url)}`;
}
async function openNotice(anchor){
  const card=buildNotice(anchor),url=anchor.href,fallbackTitle=anchor.querySelector('strong')?.textContent?.trim()||anchor.textContent.trim()||'자료 보기';
  if(card.dataset.loaded==='true')return;
  card.dataset.loaded='loading';const preview=await fetchPreview(url);
  if(preview){renderPreview(card,preview,url,fallbackTitle);card.dataset.loaded='true';return}
  const detail=card.querySelector('[data-source-notice-detail]');if(detail)detail.innerHTML=`<div class="notice-detail-error"><strong>게시글 본문을 가져오지 못했습니다.</strong><p>팬사이트에 저장된 본문이나 공개 원문 응답이 없습니다.</p></div>${sourceLinkMarkup(url)}`;card.dataset.loaded='error';
}
document.addEventListener('click',event=>{const anchor=event.target.closest?.('[data-archive-detail] a[href], [data-archive-panel] a[href]');if(anchor?.matches?.('[data-source-external-link]'))return;if(!sourceEligible(anchor))return;event.preventDefault();event.stopPropagation();void openNotice(anchor)},true);
addStyles();
})();