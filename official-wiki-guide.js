(function(){
'use strict';
if(!document.querySelector('link[data-official-wiki-guide-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='official-wiki-guide.css?v=1';link.dataset.officialWikiGuideStyle='true';document.head.appendChild(link)}
const FEED='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide';
let feedPromise=null;
const docs=new Map();
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function isSurvival(){const title=document.querySelector('[data-archive-detail] h1')?.textContent||'';return /적자생존|그냥서버/.test(title)}
async function json(url){const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
function feed(){return feedPromise||(feedPromise=json(FEED))}
function doc(pageId){if(!docs.has(pageId))docs.set(pageId,json(FEED+'?pageId='+encodeURIComponent(pageId)));return docs.get(pageId)}
function blockMarkup(block){
  if(!block)return'';
  if(block.type==='heading'){const level=Math.min(4,Math.max(2,Number(block.level||2)+1));return `<h${level} class="official-guide-heading">${esc(block.text)}</h${level}>`}
  if(block.type==='divider')return'<hr class="official-guide-divider">';
  if(block.type==='image')return `<figure class="official-guide-image"><button type="button" data-official-guide-image="${esc(block.src)}" aria-label="이미지 크게 보기"><img src="${esc(block.src)}" alt="${esc(block.alt||block.caption||'적자생존 공식 위키 이미지')}" loading="lazy" decoding="async"></button>${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  const style=String(block.style||'');
  if(style==='bullet')return `<p class="official-guide-text is-bullet">${esc(block.text)}</p>`;
  if(style==='number')return `<p class="official-guide-text is-number">${esc(block.text)}</p>`;
  if(style==='quote'||style==='callout')return `<blockquote class="official-guide-text is-${esc(style)}">${esc(block.text)}</blockquote>`;
  if(style==='code')return `<pre class="official-guide-code"><code>${esc(block.text)}</code></pre>`;
  return `<p class="official-guide-text">${esc(block.text)}</p>`;
}
function shellMarkup(data){
  const groups=Array.isArray(data.groups)?data.groups:[];
  return `<section class="official-guide" data-official-guide><div class="official-guide-head"><div><small>OFFICIAL WIKI</small><h2>적자생존 공식 가이드</h2><p>공식 위키의 문서 구조와 이미지를 그대로 기준으로 구성합니다.</p></div><a href="${esc(data.source||'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/')}" target="_blank" rel="noreferrer">공식 위키 열기 ↗</a></div><div class="official-guide-layout"><nav class="official-guide-nav" aria-label="적자생존 가이드 문서">${groups.map(group=>`<section><h3>${esc(group.title)}</h3>${(group.pages||[]).map((page,i)=>`<button type="button" data-official-page="${esc(page.pageId)}"${i===0&&groups[0]===group?' class="is-active"':''}>${esc(page.title)}</button>`).join('')}</section>`).join('')}</nav><article class="official-guide-document" data-official-document><div class="official-guide-loading">공식 위키 문서를 불러오는 중입니다.</div></article></div></section>`;
}
async function loadDocument(root,pageId,title){
  const target=root.querySelector('[data-official-document]');if(!target)return;
  target.innerHTML='<div class="official-guide-loading">공식 위키 문서를 불러오는 중입니다.</div>';
  try{
    const data=await doc(pageId),blocks=Array.isArray(data.document?.blocks)?data.document.blocks:[];
    target.innerHTML=`<header class="official-guide-document-head"><small>적자생존 공식 위키</small><h3>${esc(data.page?.title||data.document?.title||title||'가이드')}</h3>${data.page?.lastEdited?`<span>최근 원본 갱신 ${esc(String(data.page.lastEdited).slice(0,10))}</span>`:''}</header><div class="official-guide-blocks">${blocks.length?blocks.map(blockMarkup).join(''):'<p class="official-guide-empty">표시할 본문 블록이 없습니다. 공식 위키에서 원문을 확인해 주세요.</p>'}</div>`;
    target.querySelectorAll('[data-official-guide-image]').forEach(button=>button.addEventListener('click',()=>{const src=button.dataset.officialGuideImage;if(!src)return;const dialog=document.querySelector('[data-archive-lightbox]'),img=dialog?.querySelector('img');if(dialog&&img){img.src=src;img.alt=button.querySelector('img')?.alt||'적자생존 공식 위키 이미지';dialog.querySelector('[data-archive-lightbox-caption]').textContent=button.querySelector('img')?.alt||'';dialog.querySelector('[data-archive-lightbox-source]')?.setAttribute('hidden','');dialog.showModal?.()}}));
  }catch{target.innerHTML='<div class="official-guide-error"><strong>공식 위키 문서를 불러오지 못했습니다.</strong><p>잠시 뒤 다시 시도하거나 공식 위키에서 확인해 주세요.</p></div>'}
}
async function render(){
  if(!isSurvival())return;
  const panel=document.querySelector('[data-archive-panel]');if(!panel)return;
  panel.innerHTML='<div class="official-guide-loading">공식 위키 구조를 불러오는 중입니다.</div>';
  try{
    const data=await feed();panel.innerHTML=shellMarkup(data);const root=panel.querySelector('[data-official-guide]');if(!root)return;
    const buttons=[...root.querySelectorAll('[data-official-page]')];
    buttons.forEach(button=>button.addEventListener('click',()=>{buttons.forEach(b=>b.classList.toggle('is-active',b===button));loadDocument(root,button.dataset.officialPage,button.textContent)}));
    const first=buttons[0];if(first)await loadDocument(root,first.dataset.officialPage,first.textContent);
  }catch{panel.innerHTML='<div class="official-guide-error"><strong>공식 위키 가이드를 불러오지 못했습니다.</strong><p>기존 기록에는 영향을 주지 않습니다. 잠시 뒤 다시 시도해 주세요.</p></div>'}
}
document.addEventListener('click',event=>{const tab=event.target.closest?.('[data-archive-tab="guide"]');if(!tab||!isSurvival())return;setTimeout(()=>void render(),0)},true);
})();
