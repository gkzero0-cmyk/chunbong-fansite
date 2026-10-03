(()=>{
'use strict';
if(document.body?.dataset?.page!=='contents')return;
const previewCache=new Map(),SESSION_PREFIX='chunbong:source-preview:v8:';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function addStyles(){if(document.querySelector('link[data-content-page-enhancements]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='content-page-enhancements.css?v=6';link.dataset.contentPageEnhancements='true';document.head.appendChild(link)}
function contentId(){const match=location.pathname.match(/^\/contents\/([^/?#]+)/);if(match)try{return decodeURIComponent(match[1])}catch{return match[1]};return new URLSearchParams(location.search).get('id')||''}
function formatDate(value=''){const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[1]}-${match[2]}-${match[3]}`:''}
function canonical(raw=''){try{const url=new URL(raw,location.href);url.hash='';const soop=url.pathname.match(/\/station\/chunbongtv\/post\/(\d+)/i);if(soop)return`https://www.sooplive.com/station/chunbongtv/post/${soop[1]}`;const fmk=url.pathname.match(/\/(?:best\/)?(\d+)\/?$/i);if(/(^|\.)fmkorea\.com$/i.test(url.hostname)&&fmk)return`https://www.fmkorea.com/${fmk[1]}`;return url.toString()}catch{return String(raw||'')}}
function readSession(key){try{const row=JSON.parse(sessionStorage.getItem(SESSION_PREFIX+key)||'null');if(row?.at&&Date.now()-row.at<30*60*1000)return row.value}catch{}return null}
function writeSession(key,value){try{sessionStorage.setItem(SESSION_PREFIX+key,JSON.stringify({at:Date.now(),value}))}catch{}return value}
async function fetchPreview(url){const id=contentId();if(!id)throw new Error('content_id_missing');const normalized=canonical(url),key=`${id}|${normalized}`,stored=readSession(key);if(stored)return stored;if(previewCache.has(key))return previewCache.get(key);const request=fetch(`/api/content?type=chunbong-content&id=${encodeURIComponent(id)}&sourcePreview=1&previewVersion=5&url=${encodeURIComponent(normalized)}`,{headers:{accept:'application/json'},cache:'default'}).then(async response=>{if(!response.ok)throw new Error(`source_preview_${response.status}`);const payload=await response.json();return writeSession(key,payload?.preview||null)}).catch(()=>null);previewCache.set(key,request);return request}
function bodyMarkup(body=''){const clean=String(body||'').trim();if(!clean)return'';return `<div class="archive-source-notice-copy">${clean.split(/\n{2,}/).map(block=>`<p>${esc(block).replace(/\n/g,'<br>')}</p>`).join('')}</div>`}
function previewImageAllowed(value=''){const src=String(value||'').trim();if(!src)return false;return !/(?:thumb_?profile|\/images\/svg\/|(?:image)?loading(?:light|dark)?\.(?:gif|png|webp))/i.test(src)}
function imagesMarkup(images=[],title=''){const unique=[...new Set((Array.isArray(images)?images:[]).filter(previewImageAllowed))].slice(0,12);if(!unique.length)return'';return `<div class="archive-source-notice-gallery">${unique.map((src,index)=>`<figure><img src="${esc(src)}" alt="${esc(title)}${unique.length>1?` ${index+1}`:''}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`).join('')}</div>`}
function sourceKindLabel(kind=''){const value=String(kind||'').toLowerCase();if(value==='post'||value==='notice')return'NOTICE';if(value==='article')return'ARTICLE';return'POST'}
function sourceLinkLabel(url=''){try{return /(^|\.)sooplive\.com$/i.test(new URL(url,location.href).hostname)?'SOOP 원문 보기 ↗':'원문 보기 ↗'}catch{return'원문 보기 ↗'}}
function sourceLinkMarkup(url=''){return `<a class="inline-link archive-source-notice-source" data-source-external-link="true" href="${esc(url)}" target="_blank" rel="noreferrer noopener">${sourceLinkLabel(url)}</a>`}
function cardUrl(card){return canonical(card?.dataset?.sourceUrl||card?.querySelector?.('[data-source-external-link]')?.href||'')}
function bodyNode(card){let body=card?.querySelector?.('[data-source-preview-body]');if(body)return body;const detail=card?.querySelector?.('[data-source-notice-detail]');if(detail){detail.dataset.sourcePreviewBody='true';return detail}return null}
function contentNode(body){let target=body?.querySelector?.('[data-source-preview-content]');if(!target&&body){target=document.createElement('div');target.dataset.sourcePreviewContent='true';body.appendChild(target)}return target}
function setOpen(card,toggle,open){const body=bodyNode(card);if(!body)return;body.hidden=!open;body.classList.toggle('open',open);toggle?.setAttribute('aria-expanded',String(open));card?.classList?.toggle('is-source-open',open)}
function syncSourceMetadata(url,preview={}){
  const key=canonical(url),date=formatDate(preview?.date||''),title=String(preview?.title||'').trim(),kind=sourceKindLabel(preview?.kind);
  document.querySelectorAll('[data-source-url]').forEach(card=>{
    if(canonical(card.dataset.sourceUrl||'')!==key)return;
    if(title){const node=card.querySelector('[data-source-title],[data-post-title]');if(node)node.textContent=title}
    if(date){let node=card.querySelector('[data-source-date]');if(!node){node=document.createElement('span');node.className='archive-source-card-date';node.dataset.sourceDate='';const host=card.querySelector('[data-source-title-toggle]')?.parentElement||card.querySelector('.archive-post-main')||card;host.appendChild(node)}node.dataset.sourceDate=date;node.textContent=date;node.classList.remove('is-unknown')}
    const meta=card.querySelector('[data-source-notice-meta]');if(meta)meta.textContent=date?`${kind} · ${date}`:kind;
  });
}
function renderPreview(card,preview,url,fallbackTitle='자료 보기'){
  const title=preview?.title||fallbackTitle,officialHtml=preview?.source==='soop-public'&&preview?.html?`<div class="archive-source-notice-html">${preview.html}</div>`:'',content=officialHtml||bodyMarkup(preview?.body||''),images=officialHtml?'':imagesMarkup(preview?.images,title),body=bodyNode(card),target=contentNode(body);
  syncSourceMetadata(url,preview||{});
  if(target)target.innerHTML=`<div class="notice-content">${content||'<div class="archive-source-notice-empty">이 자료는 팬사이트에 본문이 저장되어 있지 않아 확인 가능한 정보만 표시합니다.</div>'}${images}</div>${sourceLinkMarkup(url)}`;
}
async function toggleSourceCard(toggle){
  const card=toggle.closest('[data-source-card],[data-archive-post-card],.archive-post-card');if(!card)return;const body=bodyNode(card);if(!body)return;
  const open=toggle.getAttribute('aria-expanded')!=='true';setOpen(card,toggle,open);if(!open||card.dataset.previewLoaded==='true')return;if(card.dataset.previewLoaded==='loading')return;
  const url=cardUrl(card);if(!url)return;card.dataset.previewLoaded='loading';const target=contentNode(body);if(target)target.innerHTML='<div class="notice-detail-loading">게시글 본문을 불러오는 중...</div>';
  const fallbackTitle=card.querySelector('[data-source-title],[data-post-title]')?.textContent?.trim()||'자료 보기',preview=await fetchPreview(url);
  if(preview){renderPreview(card,preview,url,fallbackTitle);card.dataset.previewLoaded='true';return}
  if(target)target.innerHTML=`<div class="notice-detail-error"><strong>게시글 본문을 가져오지 못했습니다.</strong><p>팬사이트에 저장된 본문이나 공개 원문 응답이 없습니다.</p></div>${sourceLinkMarkup(url)}`;card.dataset.previewLoaded='error';
}
document.addEventListener('click',event=>{if(event.target.closest?.('[data-source-external-link]'))return;const toggle=event.target.closest?.('[data-source-title-toggle],[data-source-preview-toggle]');if(!toggle)return;event.preventDefault();event.stopPropagation();void toggleSourceCard(toggle)},true);
document.addEventListener('chunbong-source-cards-normalized',()=>{document.querySelectorAll('[data-source-card][data-source-url]').forEach(card=>{const toggle=card.querySelector('[data-source-title-toggle],[data-source-preview-toggle]'),body=bodyNode(card);if(toggle&&body&&toggle.getAttribute('aria-expanded')!=='true')body.hidden=true})});
addStyles();
})();