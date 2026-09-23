(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'fanart') return;
  const {
    data, $, $$, esc, proxiedImage, loadContent,
    errorState, bindRetry, setupReveal, requestedOpenId
  } = core;
  const itemKey=item=>String(item?.id||item?.link||item?.title||'');
  const detailCache=new Map();
  const detailQueue=[];
  let detailActive=0;
  const DETAIL_CONCURRENCY=2;

  const pumpDetailQueue=()=>{
    while(detailActive<DETAIL_CONCURRENCY&&detailQueue.length){
      const job=detailQueue.shift();
      detailActive+=1;
      job().finally(()=>{detailActive-=1;pumpDetailQueue();});
    }
  };
  const fetchDetailImages=item=>{
    const id=String(item?.id||'');
    if(!/^\d+$/.test(id))return Promise.resolve([]);
    if(detailCache.has(id))return detailCache.get(id);
    const promise=new Promise(resolve=>{
      detailQueue.push(async()=>{
        try{
          const response=await fetch('/api/content?type=fanart-detail&id='+encodeURIComponent(id),{headers:{accept:'application/json'}});
          if(!response.ok)return resolve([]);
          const payload=await response.json();
          resolve(Array.isArray(payload?.item?.images)?payload.item.images.filter(Boolean):[]);
        }catch(_){resolve([]);}
      });
      pumpDetailQueue();
    });
    detailCache.set(id,promise);
    return promise;
  };

  async function hydrateCardImage(button,item){
    if(!button||!item||item.thumb||button.dataset.imageHydrated==='1')return;
    button.dataset.imageHydrated='1';
    const images=await fetchDetailImages(item);
    if(!images.length||!button.isConnected)return;
    item.thumb=images[0];
    item.fullImage=images[0];
    const wrap=button.querySelector('.fanart-image');
    if(!wrap)return;
    const img=document.createElement('img');
    img.src=proxiedImage(images[0]);
    img.alt=item.title||'춘봉 팬아트';
    img.loading='lazy';
    img.decoding='async';
    wrap.replaceChildren(img);
  }

  function hydrateVisibleCards(grid,items){
    const buttons=$$('[data-fanart-index]',grid);
    if(!('IntersectionObserver' in window)){
      buttons.slice(0,4).forEach(button=>void hydrateCardImage(button,items[Number(button.dataset.fanartIndex)]));
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        observer.unobserve(entry.target);
        const index=Number(entry.target.dataset.fanartIndex);
        void hydrateCardImage(entry.target,items[index]);
      });
    },{rootMargin:'240px 0px',threshold:0.01});
    buttons.forEach(button=>observer.observe(button));
  }

  async function renderFanartPage() {
    const grid = $('#fanart-grid');
    const dialog = $('#fanart-modal');
    if (!grid || !dialog) return;
    grid.innerHTML = '<div class="loading-card">팬아트를 불러오는 중...</div>';
    const payload = await loadContent('fanart');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      grid.innerHTML = errorState('fanart', payload.reason || '네이버 카페 팬아트 게시판에서 공개 글을 가져오지 못했습니다.');
      bindRetry(grid, renderFanartPage);
      setupReveal();
      return;
    }
    grid.innerHTML = items.map((item, index) => `
      <button class="fanart-card reveal" type="button" data-fanart-index="${index}">
        <span class="fanart-image">
          ${item.thumb ? `<img src="${esc(proxiedImage(item.thumb))}" alt="${esc(item.title || '춘봉 팬아트')}" loading="lazy" decoding="async">` : `<span class="fan-placeholder">${esc(item.symbol || '✦')}</span>`}
        </span>
        <span class="fanart-copy"><strong>${esc(item.title || item.caption || '춘봉 팬아트')}</strong><small>${esc(item.author || 'CHUNBONG FAN ART')}${item.date ? ` · ${esc(item.date)}` : ''}</small></span>
      </button>`).join('');

    const modalImage = $('#fanart-modal-image');
    const modalTitle = $('#fanart-modal-title');
    const modalAuthor = $('#fanart-modal-author');
    const modalLink = $('#fanart-modal-link');
    $$('[data-fanart-index]', grid).forEach(button => {
      button.addEventListener('click', () => {
        const item = items[Number(button.dataset.fanartIndex)];
        modalTitle.textContent = item.title || item.caption || '춘봉 팬아트';
        modalAuthor.textContent = item.author ? `by ${item.author}` : 'CHUNBONG FAN ART';
        modalLink.href = item.link || data.sources?.fanart || '#';
        if (item.thumb) {
          modalImage.src = proxiedImage(item.fullImage || item.thumb);
          modalImage.alt = item.title || '춘봉 팬아트';
          modalImage.hidden = false;
        } else {
          modalImage.removeAttribute('src');
          modalImage.hidden = true;
        }
        dialog.showModal();
        document.dispatchEvent(new CustomEvent('chunbong:fanart-selected',{detail:{
          id:itemKey(item),
          type:'fanart',title:String(item.title||item.caption||'춘봉 팬아트'),
          meta:String(item.author||'CHUNBONG FAN ART'),href:'fanart.html?open='+encodeURIComponent(itemKey(item)),
          sourceHref:item.link||'',thumb:item.thumb||''
        }}));
      });
    });
    hydrateVisibleCards(grid,items);
    $$('[data-dialog-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    if (requestedOpenId) {
      const targetIndex = items.findIndex(item => itemKey(item) === String(requestedOpenId));
      if (targetIndex >= 0) requestAnimationFrame(() => $('[data-fanart-index="' + targetIndex + '"]', grid)?.click());
    }
    setupReveal();
  }

  void renderFanartPage();
})();
