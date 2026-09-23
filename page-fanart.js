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
      <button class="fanart-card reveal" type="button" data-fanart-index="${index}" data-fanart-id="${esc(item.id || '')}">
        <span class="fanart-image">
          ${item.thumb ? `<img src="${esc(proxiedImage(item.thumb))}" alt="${esc(item.title || '춘봉 팬아트')}" loading="lazy" decoding="async">` : `<span class="fan-placeholder">${esc(item.symbol || '✦')}</span>`}
        </span>
        <span class="fanart-copy"><strong>${esc(item.title || item.caption || '춘봉 팬아트')}</strong><small>${esc(item.author || 'CHUNBONG FAN ART')}${item.date ? ` · ${esc(item.date)}` : ''}</small></span>
      </button>`).join('');

    const detailQueue = [];
    let detailActive = 0;
    const DETAIL_CONCURRENCY = 2;

    const loadFanartDetail = async item => {
      const id = String(item?.id || '');
      if (!id) return null;
      const url = '/api/content?type=fanart-detail&id=' + encodeURIComponent(id);
      try {
        return window.ChunbongCache
          ? await window.ChunbongCache.fetchJson('fanart-detail:' + id, url, { ttl: 6 * 60 * 60 * 1000 })
          : await (async()=>{const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error('HTTP '+response.status);return response.json()})();
      } catch (_) {
        return null;
      }
    };

    const hydrateCard = async (button, item) => {
      if (!button || !item || button.dataset.fanartHydrated === '1') return;
      button.dataset.fanartHydrated = '1';
      const payload = await loadFanartDetail(item);
      const src = Array.isArray(payload?.item?.images) ? payload.item.images.find(Boolean) : '';
      if (!src) return;
      item.thumb ||= src;
      item.fullImage ||= src;
      const media = button.querySelector('.fanart-image');
      if (!media || media.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = proxiedImage(src);
      img.alt = item.title || '춘봉 팬아트';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.replaceChildren(img);
    };

    const pumpDetailQueue = () => {
      while (detailActive < DETAIL_CONCURRENCY && detailQueue.length) {
        const job = detailQueue.shift();
        detailActive += 1;
        void hydrateCard(job.button, job.item).finally(() => {
          detailActive -= 1;
          pumpDetailQueue();
        });
      }
    };

    const enqueueDetail = (button, item) => {
      if (!button || !item || item.thumb || button.dataset.fanartQueued === '1') return;
      button.dataset.fanartQueued = '1';
      detailQueue.push({ button, item });
      pumpDetailQueue();
    };

    const missingThumbButtons = $('[data-fanart-index]', grid).filter(button => {
      const item = items[Number(button.dataset.fanartIndex)];
      return item && !item.thumb;
    });
    if ('IntersectionObserver' in window) {
      const detailObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          detailObserver.unobserve(entry.target);
          const item = items[Number(entry.target.dataset.fanartIndex)];
          enqueueDetail(entry.target, item);
        });
      }, { rootMargin:'420px 0px', threshold:0.01 });
      missingThumbButtons.forEach(button => detailObserver.observe(button));
    } else {
      missingThumbButtons.slice(0, 6).forEach(button => enqueueDetail(button, items[Number(button.dataset.fanartIndex)]));
    }
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
