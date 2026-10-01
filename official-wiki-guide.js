(function(){
'use strict';
if(!document.querySelector('link[data-official-wiki-guide-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='official-wiki-guide.css?v=2';link.dataset.officialWikiGuideStyle='true';document.head.appendChild(link)}
const SOURCE='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';
const SOURCE_PROXY='/api/survival-wiki?mode=source';
const IMAGE_PROXY='/api/survival-wiki?mode=image&url=';
let sourcePromise=null;
let parsedCache=null;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function isSurvival(){const title=document.querySelector('[data-archive-detail] h1')?.textContent||'';return /적자생존/.test(title)}
async function sourceHtml(){if(!sourcePromise)sourcePromise=fetch(SOURCE_PROXY,{headers:{accept:'text/html'}}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()});return sourcePromise}
function absoluteUrl(value){try{return new URL(String(value||''),SOURCE).href}catch{return''}}
function hashId(value){try{const u=new URL(String(value||''),SOURCE);return /^#doc-[\w-]+$/i.test(u.hash)?u.hash.slice(1):''}catch{return''}}
function directDocLinks(root){return [...root.querySelectorAll('a[href]')].filter(a=>hashId(a.getAttribute('href')))}
function bestNavigation(source){
  const candidates=[...source.querySelectorAll('nav,aside,[class*="sidebar" i],[class*="menu" i],[class*="navigation" i],[class*="toc" i]')];
  let best=null,bestCount=0;
  for(const node of candidates){const ids=new Set(directDocLinks(node).map(a=>hashId(a.getAttribute('href'))));if(ids.size>bestCount){best=node;bestCount=ids.size}}
  return bestCount>=2?best:source.body;
}
function menuModel(source){
  const nav=bestNavigation(source),groups=[],seen=new Set();let group={title:'가이드',pages:[]};groups.push(group);
  for(const node of nav.querySelectorAll('h1,h2,h3,h4,h5,h6,a[href]')){
    if(/^H[1-6]$/.test(node.tagName)){
      const title=node.textContent.trim();if(title&&title.length<60){group={title,pages:[]};groups.push(group)}
      continue;
    }
    const id=hashId(node.getAttribute('href'));if(!id||seen.has(id))continue;
    const title=node.textContent.replace(/\s+/g,' ').trim();if(!title)continue;
    seen.add(id);group.pages.push({id,title});
  }
  const useful=groups.filter(row=>row.pages.length);
  if(useful.length)return useful;
  const pages=[];
  for(const a of directDocLinks(source)){const id=hashId(a.getAttribute('href'));if(!id||seen.has(id))continue;seen.add(id);pages.push({id,title:a.textContent.replace(/\s+/g,' ').trim()||id})}
  return pages.length?[{title:'가이드',pages}]:[];
}
function containsOtherDocMarker(node,currentId){
  if(!node)return false;
  if(node.id&&/^doc-/i.test(node.id)&&node.id!==currentId)return true;
  return [...node.querySelectorAll?.('[id^="doc-"]')||[]].some(el=>el.id!==currentId);
}
function sourceNodesForDocument(source,id){
  const target=source.getElementById(id);if(!target)return[];
  let start=target.closest('h1,h2,h3,h4,h5,h6')||target;
  const nodes=[start];let cursor=start.nextElementSibling;
  while(cursor&&!containsOtherDocMarker(cursor,id)){nodes.push(cursor);cursor=cursor.nextElementSibling}
  if(nodes.length>1)return nodes;
  let parent=start.parentElement;
  while(parent&&parent!==source.body){const markers=[...parent.querySelectorAll('[id^="doc-"]')];if(markers.length===1&&markers[0].id===id)return [parent];if(markers.length>1)break;parent=parent.parentElement}
  return nodes;
}
const ALLOWED_TAGS=new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SPAN','STRONG','B','EM','I','U','SMALL','UL','OL','LI','BLOCKQUOTE','PRE','CODE','HR','BR','FIGURE','FIGCAPTION','IMG','PICTURE','SOURCE','A','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DL','DT','DD']);
function cleanElement(node){
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent||'');
  if(node.nodeType!==Node.ELEMENT_NODE)return null;
  const tag=ALLOWED_TAGS.has(node.tagName)?node.tagName.toLowerCase():'div',out=document.createElement(tag);
  if(node.tagName==='IMG'){
    const raw=node.getAttribute('src')||node.getAttribute('data-src')||node.getAttribute('data-original')||node.getAttribute('data-lazy-src')||'';
    const src=absoluteUrl(raw);if(!src)return null;
    out.src=IMAGE_PROXY+encodeURIComponent(src);out.dataset.officialOriginal=src;out.alt=node.getAttribute('alt')||'적자생존 공식 위키 이미지';out.loading='lazy';out.decoding='async';
  }else if(node.tagName==='SOURCE'){
    const raw=node.getAttribute('src')||'';const src=absoluteUrl(raw);if(src)out.src=IMAGE_PROXY+encodeURIComponent(src);
  }else if(node.tagName==='A'){
    const href=absoluteUrl(node.getAttribute('href'));if(href){out.href=href;out.target='_blank';out.rel='noreferrer'}
  }else if(['TD','TH'].includes(node.tagName)){
    for(const attr of ['colspan','rowspan']){const value=node.getAttribute(attr);if(value)out.setAttribute(attr,value)}
  }
  for(const child of node.childNodes){const clean=cleanElement(child);if(clean)out.appendChild(clean)}
  if(node.tagName==='IMG'&&!out.src)return null;
  return out;
}
function documentMarkup(source,page){
  const nodes=sourceNodesForDocument(source,page.id);if(!nodes.length)return `<p class="official-guide-empty">공식 위키에서 이 문서의 본문을 찾지 못했습니다.</p>`;
  const holder=document.createElement('div');for(const node of nodes){const clean=cleanElement(node);if(clean)holder.appendChild(clean)}
  holder.querySelectorAll('img').forEach(img=>{const figure=img.closest('figure');if(figure)return;const wrap=document.createElement('figure');wrap.className='official-guide-image';img.replaceWith(wrap);wrap.appendChild(img)});
  return holder.innerHTML;
}
async function parsed(){
  if(parsedCache)return parsedCache;
  const html=await sourceHtml(),source=new DOMParser().parseFromString(html,'text/html'),groups=menuModel(source);
  if(!groups.length)throw new Error('official wiki navigation not found');
  parsedCache={source,groups};return parsedCache;
}
function shellMarkup(groups){return `<section class="official-guide" data-official-guide><div class="official-guide-head"><div><small>OFFICIAL WIKI SOURCE</small><h2>적자생존 가이드</h2><p>목록·문서 구성·이미지는 적자생존 공식 위키 페이지를 기준으로 하며, 화면만 팬페이지에 맞게 다시 구성했습니다.</p></div><a href="${SOURCE}" target="_blank" rel="noreferrer">공식 위키 열기 ↗</a></div><div class="official-guide-layout"><nav class="official-guide-nav" aria-label="적자생존 가이드 문서">${groups.map(group=>`<section><h3>${esc(group.title)}</h3>${group.pages.map(page=>`<button type="button" data-official-page="${esc(page.id)}">${esc(page.title)}</button>`).join('')}</section>`).join('')}</nav><article class="official-guide-document" data-official-document></article></div></section>`}
function bindImages(root){root.querySelectorAll('img[data-official-original]').forEach(img=>{const original=img.dataset.officialOriginal||'';img.addEventListener('error',()=>{if(img.dataset.originalTried)return;img.dataset.originalTried='1';img.src=original},{once:true});img.addEventListener('click',()=>{const dialog=document.querySelector('[data-archive-lightbox]'),target=dialog?.querySelector('img');if(!dialog||!target)return;target.src=img.currentSrc||img.src;target.alt=img.alt||'적자생존 공식 위키 이미지';const cap=dialog.querySelector('[data-archive-lightbox-caption]');if(cap)cap.textContent=img.alt||'';const sourceLink=dialog.querySelector('[data-archive-lightbox-source]');if(sourceLink){sourceLink.href=SOURCE;sourceLink.hidden=false}dialog.showModal?.()})})}
function showDocument(root,model,page,button){
  root.querySelectorAll('[data-official-page]').forEach(row=>row.classList.toggle('is-active',row===button));
  const target=root.querySelector('[data-official-document]');if(!target)return;
  const markup=documentMarkup(model.source,page);
  target.innerHTML=`<header class="official-guide-document-head"><small>적자생존 공식 위키</small><h3>${esc(page.title)}</h3><a href="${SOURCE}#${encodeURIComponent(page.id)}" target="_blank" rel="noreferrer">원문 위치에서 보기 ↗</a></header><div class="official-guide-blocks">${markup}</div>`;
  bindImages(target);
}
async function render(){
  if(!isSurvival())return;
  const panel=document.querySelector('[data-archive-panel]');if(!panel)return;
  panel.innerHTML='<div class="official-guide-loading">적자생존 공식 위키 페이지를 불러오는 중입니다.</div>';
  try{
    const model=await parsed();panel.innerHTML=shellMarkup(model.groups);const root=panel.querySelector('[data-official-guide]');if(!root)return;
    const pages=model.groups.flatMap(group=>group.pages),buttons=[...root.querySelectorAll('[data-official-page]')];
    buttons.forEach(button=>button.addEventListener('click',()=>{const page=pages.find(row=>row.id===button.dataset.officialPage);if(page)showDocument(root,model,page,button)}));
    const firstButton=buttons[0],firstPage=pages[0];if(firstButton&&firstPage)showDocument(root,model,firstPage,firstButton);
  }catch(error){panel.innerHTML=`<div class="official-guide-error"><strong>적자생존 공식 위키를 불러오지 못했습니다.</strong><p>Notion이나 다른 위키 자료로 대체하지 않습니다. <a href="${SOURCE}" target="_blank" rel="noreferrer">공식 위키에서 직접 보기 ↗</a></p></div>`}
}
document.addEventListener('click',event=>{const tab=event.target.closest?.('[data-archive-tab="guide"]');if(!tab||!isSurvival())return;setTimeout(()=>void render(),0)},true);
})();
