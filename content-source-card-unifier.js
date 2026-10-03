(()=>{
'use strict';
if(document.body?.dataset?.page!=='contents')return;

const POST_RE=/\/station\/chunbongtv\/post\/(\d+)\/?$/i;
const FM_RE=/\/(?:best\/)?\d+\/?$/i;
let scheduled=false;

function esc(value=''){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]||char))}
function contentId(){const match=location.pathname.match(/^\/contents\/([^/?#]+)/);if(match)try{return decodeURIComponent(match[1])}catch{return match[1]};return new URLSearchParams(location.search).get('id')||''}
function canonical(raw=''){
  try{
    const url=new URL(raw,location.href);url.hash='';
    if(/(^|\.)sooplive\.com$/i.test(url.hostname)){const m=url.pathname.match(POST_RE);if(m)return`https://www.sooplive.com/station/chunbongtv/post/${m[1]}`}
    if(/(^|\.)fmkorea\.com$/i.test(url.hostname)){const m=url.pathname.match(/\/(?:best\/)?(\d+)\/?$/i);if(m)return`https://www.fmkorea.com/${m[1]}`}
    return url.toString();
  }catch{return''}
}
function sourceEligibleUrl(raw=''){
  try{const url=new URL(raw,location.href);if(/(^|\.)sooplive\.com$/i.test(url.hostname)&&POST_RE.test(url.pathname))return true;if(/(^|\.)fmkorea\.com$/i.test(url.hostname)&&FM_RE.test(url.pathname))return true}catch{}return false
}
function dateFromText(value=''){
  const text=String(value||'');let m=text.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=text.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''
}
function displayDate(value=''){const m=String(value||'').match(/^(20\d{2})-(\d{2})-(\d{2})$/);return m?`${m[1]}-${m[2]}-${m[3]}`:'날짜 확인 중'}
function normalizeText(value=''){return String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/g,'')}
function justserverRelevant(title=''){
  if(contentId()!=='justserver-survival')return true;
  return normalizeText(title).includes('적자생존');
}
function titleText(root){return String(root?.querySelector?.('[data-source-title],[data-post-title],strong,h3,h4')?.textContent||root?.textContent||'').trim()}
function sourceUrl(root){const own=root?.dataset?.sourceUrl||'';if(own)return canonical(own);const link=root?.querySelector?.('[data-source-external-link],a[href]');return link?canonical(link.href):''}
function kindLabel(url=''){try{return /sooplive\.com/i.test(new URL(url).hostname)?'NOTICE':'POST'}catch{return'POST'}}
function sourceCardMarkup({title='',url='',date='',note='',kind='',index=''}){
  const href=canonical(url),label=kind||kindLabel(href),known=Boolean(date),safeTitle=title||'자료 보기';
  return `<article class="archive-post-card archive-source-card" data-source-card="true" data-source-url="${esc(href)}"><div class="archive-source-card-head">${index?`<span class="archive-source-card-index">${esc(index)}</span>`:''}<div class="archive-source-card-copy"><small data-source-kind>${esc(label)}</small><button class="archive-post-title-toggle" type="button" data-source-title-toggle="true" data-source-preview-toggle="true" aria-expanded="false"><span data-source-title>${esc(safeTitle)}</span></button><span class="archive-source-card-date${known?'':' is-unknown'}" data-source-date="${esc(date)}">${esc(displayDate(date))}</span>${note?`<p>${esc(note)}</p>`:''}</div>${href?`<a class="inline-link archive-source-card-link" data-source-external-link="true" href="${esc(href)}" target="_blank" rel="noreferrer noopener">원문 보기 ↗</a>`:''}</div><div class="archive-post-preview archive-source-card-body" data-source-preview-body data-source-notice-detail hidden><div data-source-preview-content><div class="notice-detail-loading">게시글 본문을 불러오는 중...</div></div></div></article>`
}
function cardElement(data){const wrap=document.createElement('div');wrap.innerHTML=sourceCardMarkup(data);return wrap.firstElementChild}
function upgradePostCard(card){
  if(!(card instanceof Element)||card.dataset.sourceCard==='true')return;
  const url=sourceUrl(card);if(!sourceEligibleUrl(url))return;
  const title=titleText(card);if(!justserverRelevant(title)){card.remove();return}
  card.dataset.sourceCard='true';card.dataset.sourceUrl=url;
  let titleNode=card.querySelector('[data-source-title],[data-post-title]')||card.querySelector('strong');
  const oldToggle=card.querySelector('[data-source-preview-toggle]');
  if(titleNode&&!titleNode.closest('[data-source-title-toggle]')){
    const button=document.createElement('button');button.type='button';button.className='archive-post-title-toggle';button.dataset.sourceTitleToggle='true';button.dataset.sourcePreviewToggle='true';button.setAttribute('aria-expanded','false');
    const span=document.createElement('span');span.dataset.sourceTitle='true';span.dataset.postTitle='true';span.textContent=titleNode.textContent||title;button.appendChild(span);titleNode.replaceWith(button);titleNode=span;
  }
  if(oldToggle&&!oldToggle.matches('[data-source-title-toggle]'))oldToggle.remove();
  const dateText=[...card.querySelectorAll('small,span,time')].map(node=>node.textContent||'').find(text=>/20\d{2}|날짜\s*확인\s*중/.test(text))||'';
  let dateNode=card.querySelector('[data-source-date]');
  if(!dateNode){dateNode=document.createElement('span');dateNode.className='archive-source-card-date';dateNode.dataset.sourceDate=dateFromText(dateText);dateNode.textContent=displayDate(dateNode.dataset.sourceDate);if(!dateNode.dataset.sourceDate)dateNode.classList.add('is-unknown');(card.querySelector('[data-source-title-toggle]')?.parentElement||card).appendChild(dateNode)}
  let body=card.querySelector('[data-source-preview-body],[data-source-notice-detail]');
  if(body){body.dataset.sourcePreviewBody='true';body.setAttribute('data-source-notice-detail','');body.classList.add('archive-post-preview','archive-source-card-body');body.hidden=true}
  else{body=document.createElement('div');body.className='archive-post-preview archive-source-card-body';body.dataset.sourcePreviewBody='true';body.setAttribute('data-source-notice-detail','');body.hidden=true;body.innerHTML='<div data-source-preview-content><div class="notice-detail-loading">게시글 본문을 불러오는 중...</div></div>';card.appendChild(body)}
}
function convertTimeline(root){
  const seen=new Set();
  root.querySelectorAll('.archive-timeline-item').forEach((row,index)=>{
    const link=row.querySelector('a[href]');if(!link||!sourceEligibleUrl(link.href))return;
    const url=canonical(link.href),key=url;if(seen.has(key)){row.remove();return}seen.add(key);
    const title=titleText(row);if(!justserverRelevant(title)){row.remove();return}
    const date=dateFromText(row.textContent||''),note=String(row.querySelector('p')?.textContent||'').trim();
    row.replaceWith(cardElement({title,url,date,note,kind:kindLabel(url),index:String(index+1).padStart(2,'0')}));
  });
}
function convertSources(root){
  const list=root.querySelector('.archive-source-list');if(!list)return;
  const panel=list.closest('[data-archive-panel]'),heading=String(panel?.querySelector('h2')?.textContent||'').trim();if(heading==='게시글')return;
  const seen=new Set();
  [...list.children].forEach((row,index)=>{
    const link=row.matches?.('a[href]')?row:row.querySelector?.('a[href]');if(!link||!sourceEligibleUrl(link.href))return;
    const url=canonical(link.href);if(seen.has(url)){row.remove();return}seen.add(url);
    const title=titleText(row).replace(/팬사이트에서 보기/g,'').trim();if(!justserverRelevant(title)){row.remove();return}
    const date=dateFromText(row.textContent||'');row.replaceWith(cardElement({title,url,date,kind:kindLabel(url),index:String(index+1).padStart(2,'0')}));
  });
}
function dedupeCards(root){const seen=new Set();root.querySelectorAll('[data-source-card][data-source-url],.archive-post-card').forEach(card=>{const url=sourceUrl(card);if(!url)return;if(seen.has(url)){card.remove();return}seen.add(url)})}
function normalizePanel(){
  const detail=document.querySelector('[data-archive-detail]');if(!detail)return;
  detail.querySelectorAll('.archive-post-card').forEach(upgradePostCard);
  convertTimeline(detail);convertSources(detail);
  detail.querySelectorAll('.archive-panel,.archive-post-list,.archive-timeline,.archive-source-list').forEach(dedupeCards);
  document.dispatchEvent(new CustomEvent('chunbong-source-cards-normalized'));
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;normalizePanel()})}
new MutationObserver(schedule).observe(document.querySelector('[data-archive-detail]')||document.body,{subtree:true,childList:true});
document.addEventListener('click',event=>{if(event.target.closest?.('[data-source-external-link]'))return;const tab=event.target.closest?.('[data-archive-tab]');if(tab)setTimeout(schedule,0)},true);
schedule();
window.ChunbongSourceCards={sourceCardMarkup,canonical,sourceEligibleUrl,justserverRelevant,normalizePanel};
})();