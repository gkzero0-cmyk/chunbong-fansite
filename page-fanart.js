(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'fanart') return;
  const {
    data, $, $$, esc, proxiedImage, loadContent,
    errorState, bindRetry, setupReveal, requestedOpenId
  } = core;
  const itemKey=item=>String(item?.id||item?.link||item?.title||'');

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
          ${item.thumb ? `<img src="${esc(proxiedImage(item.thumb))}" alt="${esc(item.title || '춘봉 팬아트')}" loading="lazy">` : `<span class="fan-placeholder">${esc(item.symbol || '✦')}</span>`}
        </span>
        <span class="fanart-copy"><strong>${esc(item.title || item.caption || '춘봉 팬아트')}</strong><small>${esc(item.author || 'CHUNBONG FAN ART')}${item.date ? ` · ${esc(item.date)}` : ''}</small></span>
      </button>`).join('');

    let activeIndex=-1;
    const modalImage = $('#fanart-modal-image');
    const modalTitle = $('#fanart-modal-title');
    const modalAuthor = $('#fanart-modal-author');
    const modalLink = $('#fanart-modal-link');
    const renderModal=(index,{announce=true}={})=>{
      activeIndex=(index+items.length)%items.length;
      const item=items[activeIndex];
      modalTitle.textContent=item.title||item.caption||'춘봉 팬아트';
      modalAuthor.textContent=item.author?`by ${item.author} · ${activeIndex+1} / ${items.length}`:`CHUNBONG FAN ART · ${activeIndex+1} / ${items.length}`;
      modalLink.href=item.link||data.sources?.fanart||'#';
      if(item.thumb){
        modalImage.src=proxiedImage(item.fullImage||item.thumb);
        modalImage.alt=item.title||'춘봉 팬아트';
        modalImage.hidden=false;
      }else{
        modalImage.removeAttribute('src');
        modalImage.hidden=true;
      }
      if(announce)document.dispatchEvent(new CustomEvent('chunbong:fanart-selected',{detail:{
        id:itemKey(item),type:'fanart',title:String(item.title||item.caption||'춘봉 팬아트'),
        meta:String(item.author||'CHUNBONG FAN ART'),href:'fanart.html?open='+encodeURIComponent(itemKey(item)),
        sourceHref:item.link||'',thumb:item.thumb||''
      }}));
    };
    $('[data-fanart-index]', grid).forEach(button => {
      button.addEventListener('click', () => {
        renderModal(Number(button.dataset.fanartIndex));
        dialog.showModal();
      });
    });
    if(window.matchMedia('(max-width:760px)').matches&&!dialog.dataset.mobileGestures){
      dialog.dataset.mobileGestures='true';
      const hint=document.createElement('div');
      hint.className='fanart-gesture-hint';
      hint.textContent='← 이전 · 좌우 스와이프 · 다음 →  ·  아래로 내려 닫기';
      dialog.querySelector('.fanart-modal-copy')?.prepend(hint);
      let startX=0,startY=0,tracking=false;
      dialog.addEventListener('touchstart',event=>{
        if(event.touches.length!==1)return;
        const touch=event.touches[0];startX=touch.clientX;startY=touch.clientY;tracking=true;
      },{passive:true});
      dialog.addEventListener('touchend',event=>{
        if(!tracking||event.changedTouches.length!==1)return;
        tracking=false;
        const touch=event.changedTouches[0],dx=touch.clientX-startX,dy=touch.clientY-startY;
        if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.25){
          renderModal(activeIndex+(dx<0?1:-1));
          if(navigator.vibrate)navigator.vibrate(8);
        }else if(dy>95&&Math.abs(dy)>Math.abs(dx)*1.2){
          dialog.close();
          if(navigator.vibrate)navigator.vibrate(6);
        }
      },{passive:true});
    }
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
