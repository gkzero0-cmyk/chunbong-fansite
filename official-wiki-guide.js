(function(){
'use strict';
if(!document.querySelector('link[data-official-wiki-guide-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='official-wiki-guide.css?v=3';link.dataset.officialWikiGuideStyle='true';document.head.appendChild(link)}
const SOURCE='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';
const CONTENT_PROXY='/api/survival-wiki?mode=content';
const IMAGE_PROXY='/api/survival-wiki?mode=image&url=';
let modelPromise=null;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function isSurvival(){const title=document.querySelector('[data-archive-detail] h1')?.textContent||'';return /적자생존/.test(title)}
function absoluteUrl(value){try{return new URL(String(value||''),SOURCE).href}catch{return''}}
async function officialModel(){
  if(!modelPromise)modelPromise=fetch(CONTENT_PROXY,{headers:{accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(!Array.isArray(data?.wiki?.pages))throw new Error('invalid official wiki content');return data});
  return modelPromise;
}
const ALLOWED_TAGS=new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SPAN','STRONG','B','EM','I','U','SMALL','UL','OL','LI','BLOCKQUOTE','PRE','CODE','HR','BR','FIGURE','FIGCAPTION','IMG','PICTURE','SOURCE','A','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DL','DT','DD','KBD']);
function cleanNode(node){
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent||'');
  if(node.nodeType!==Node.ELEMENT_NODE)return null;
  const tag=ALLOWED_TAGS.has(node.tagName)?node.tagName.toLowerCase():'div',out=document.createElement(tag);
  if(node.tagName==='IMG'){
    const raw=node.getAttribute('src')||node.getAttribute('data-src')||node.getAttribute('data-original')||node.getAttribute('data-lazy-src')||'';
    const src=absoluteUrl(raw);if(!src)return null;
    out.src=IMAGE_PROXY+encodeURIComponent(src);out.dataset.officialOriginal=src;out.alt=node.getAttribute('alt')||'적자생존 공식 위키 이미지';out.loading='lazy';out.decoding='async';
  }else if(node.tagName==='SOURCE'){
    const src=absoluteUrl(node.getAttribute('src')||'');if(src)out.src=IMAGE_PROXY+encodeURIComponent(src);
  }else if(node.tagName==='A'){
    const href=absoluteUrl(node.getAttribute('href')||'');if(href){out.href=href;out.target='_blank';out.rel='noreferrer'}
  }else if(['TD','TH'].includes(node.tagName)){
    for(const attr of ['colspan','rowspan']){const value=node.getAttribute(attr);if(value)out.setAttribute(attr,value)}
  }
  for(const child of node.childNodes){const clean=cleanNode(child);if(clean)out.appendChild(clean)}
  return out;
}
function sanitizeHtml(html=''){
  const parsed=new DOMParser().parseFromString('<div id="root">'+String(html||'')+'</div>','text/html');
  const holder=document.createElement('div');for(const child of parsed.querySelector('#root')?.childNodes||[]){const clean=cleanNode(child);if(clean)holder.appendChild(clean)}
  holder.querySelectorAll('img').forEach(img=>{if(img.closest('figure'))return;const figure=document.createElement('figure');figure.className='official-guide-image';img.replaceWith(figure);figure.appendChild(img)});
  return holder.innerHTML;
}
function blockMarkup(block,page){
  if(!block)return'';
  if(Array.isArray(block.table)&&block.table.length){return `<table>${block.table.map((row,i)=>`<tr>${(row||[]).map(v=>`<${i?'td':'th'}>${esc(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`}
  const text=String(block.text||'').trim();let body='';
  if(text){const type=String(block.type||'');if(type.includes('header'))body=`<h4>${esc(text)}</h4>`;else if(type.includes('bulleted'))body=`<p>• ${esc(text)}</p>`;else body=`<p>${esc(text)}</p>`}
  for(const image of Array.isArray(block.images)?block.images:[]){const src=absoluteUrl(image?.src||image?.url||'');if(src)body+=`<figure class="official-guide-image"><img src="${IMAGE_PROXY+encodeURIComponent(src)}" data-official-original="${esc(src)}" alt="${esc(page.title||'적자생존 공식 위키 이미지')}" loading="lazy" decoding="async"></figure>`}
  return body;
}
function pageBody(page){
  const sections=(Array.isArray(page.sections)?page.sections:[]).filter(section=>!section?.hidden);
  if(sections.length)return sections.map(section=>`<section class="official-guide-source-section"><h4>${esc(section.title||'안내')}</h4>${sanitizeHtml(section.html||'')}</section>`).join('');
  const scenes=Array.isArray(page.storyScenes)?page.storyScenes:[];
  if(scenes.length)return scenes.map((scene,i)=>`<section class="official-guide-source-section"><h4>${esc(scene.title||`장면 ${i+1}`)}</h4>${scene.subtitle?`<p class="official-guide-subtitle">${esc(scene.subtitle)}</p>`:''}${sanitizeHtml(scene.html||'')}</section>`).join('');
  const blocks=Array.isArray(page.blocks)?page.blocks:[];
  if(blocks.length)return blocks.map(block=>blockMarkup(block,page)).join('');
  return '<p class="official-guide-empty">현재 공식 위키에 작성된 본문이 없습니다.</p>';
}
function buildGroups(data){
  const pages=(data.wiki.pages||[]).map((page,index)=>({...page,_index:index})).filter(page=>!page.deleted);
  const declared=Array.isArray(data.officialGroups)?data.officialGroups.filter(Boolean):[];
  const encountered=[];for(const page of pages){const category=String(page.category||'기타').trim()||'기타';if(!encountered.includes(category))encountered.push(category)}
  const order=[...declared,...encountered.filter(category=>!declared.includes(category))];
  return order.map(title=>({title,pages:pages.filter(page=>(String(page.category||'기타').trim()||'기타')===title)})).filter(group=>group.pages.length);
}
function shellMarkup(groups){return `<section class="official-guide" data-official-guide><div class="official-guide-head"><div><small>OFFICIAL WIKI SOURCE</small><h2>적자생존 가이드</h2><p>공식 위키의 실제 목록·문서 구성·이미지를 가져와 팬페이지에 맞게 다시 구성했습니다.</p></div><a href="${SOURCE}" target="_blank" rel="noreferrer">공식 위키 열기 ↗</a></div><div class="official-guide-layout"><nav class="official-guide-nav" aria-label="적자생존 가이드 문서">${groups.map(group=>`<section><h3>${esc(group.title)}</h3>${group.pages.map(page=>`<button type="button" data-official-page="${page._index}">${esc(page.title)}</button>`).join('')}</section>`).join('')}</nav><article class="official-guide-document" data-official-document></article></div></section>`}
function bindImages(root){root.querySelectorAll('img[data-official-original]').forEach(img=>{const original=img.dataset.officialOriginal||'';img.addEventListener('error',()=>{if(img.dataset.originalTried)return;img.dataset.originalTried='1';img.src=original},{once:true});img.addEventListener('click',()=>{const dialog=document.querySelector('[data-archive-lightbox]'),target=dialog?.querySelector('img');if(!dialog||!target)return;target.src=img.currentSrc||img.src;target.alt=img.alt||'적자생존 공식 위키 이미지';const cap=dialog.querySelector('[data-archive-lightbox-caption]');if(cap)cap.textContent=img.alt||'';const sourceLink=dialog.querySelector('[data-archive-lightbox-source]');if(sourceLink){sourceLink.href=SOURCE+'#doc-'+(Number(img.closest('[data-official-document]')?.dataset.pageIndex||0)+1);sourceLink.hidden=false}dialog.showModal?.()})})}
function showPage(root,page,button){
  root.querySelectorAll('[data-official-page]').forEach(row=>row.classList.toggle('is-active',row===button));
  const target=root.querySelector('[data-official-document]');if(!target)return;target.dataset.pageIndex=String(page._index);
  target.innerHTML=`<header class="official-guide-document-head"><small>${esc(page.category||'적자생존 공식 위키')}</small><h3>${esc(page.title)}</h3><a href="${SOURCE}#doc-${page._index+1}" target="_blank" rel="noreferrer">원문 위치에서 보기 ↗</a></header><div class="official-guide-blocks">${pageBody(page)}</div>`;
  bindImages(target);
}
async function render(){
  if(!isSurvival())return;const panel=document.querySelector('[data-archive-panel]');if(!panel)return;
  panel.innerHTML='<div class="official-guide-loading">적자생존 공식 위키를 불러오는 중입니다.</div>';
  try{
    const data=await officialModel(),groups=buildGroups(data);if(!groups.length)throw new Error('official wiki navigation not found');
    panel.innerHTML=shellMarkup(groups);const root=panel.querySelector('[data-official-guide]'),pages=groups.flatMap(group=>group.pages),buttons=[...root.querySelectorAll('[data-official-page]')];
    buttons.forEach(button=>button.addEventListener('click',()=>{const page=pages.find(row=>row._index===Number(button.dataset.officialPage));if(page)showPage(root,page,button)}));
    if(buttons[0]&&pages[0])showPage(root,pages[0],buttons[0]);
  }catch(error){panel.innerHTML=`<div class="official-guide-error"><strong>적자생존 공식 위키를 불러오지 못했습니다.</strong><p>Notion이나 다른 위키 자료로 대체하지 않습니다. <a href="${SOURCE}" target="_blank" rel="noreferrer">공식 위키에서 직접 보기 ↗</a></p></div>`}
}
document.addEventListener('click',event=>{const tab=event.target.closest?.('[data-archive-tab="guide"]');if(!tab||!isSurvival())return;setTimeout(()=>void render(),0)},true);
})();
