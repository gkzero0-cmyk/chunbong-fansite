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
    const payload = window.ChunbongCache
      ? await window.ChunbongCache.fetchJson('content:fanart','/api/content?type=fanart',{ttl:15*60*1000,staleIfError:true})
      : await loadContent('fanart');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      grid.innerHTML = errorState('fanart', payload.reason || '네이버 카페 팬아트 게시판에서 공개 글을 가져오지 못했습니다.');
      bindRetry(grid, renderFanartPage);
      setupReveal();
      return;
    }

    grid.innerHTML = items.map((item, index) => `
      <button class="fanart-card reveal" type="button" data-fanart-index="${index}" data-fanart-id="${esc(item.id || '')}">
        <span class="fanart-image" data-fanart-thumb>
          ${item.thumb ? `<img src="${esc(proxiedImage(item.thumb))}" alt="${esc(item.title || '춘봉 팬아트')}" loading="lazy" decoding="async" fetchpriority="low">` : `<span class="fan-placeholder">${esc(item.symbol || '✦')}</span>`}
        </span>
        <span class="fanart-copy"><strong>${esc(item.title || item.caption || '춘봉 팬아트')}</strong><small>${esc(item.author || 'CHUNBONG FAN ART')}${item.date ? ` · ${esc(item.date)}` : ''}</small></span>
      </button>`).join('');

    const detailUrl = id => `/api/content?type=fanart-detail&id=${encodeURIComponent(id)}`;
    const detailPayload = async id => {
      const key = 'fanart-detail:' + id;
      if (window.ChunbongCache) return window.ChunbongCache.fetchJson(key, detailUrl(id), { ttl:30*60*1000 });
      const response = await fetch(detailUrl(id), { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    };

    const queue = [];
    let activeThumbLoads = 0;
    const drainThumbQueue = () => {
      while (activeThumbLoads < 2 && queue.length) {
        const button = queue.shift();
        if (!button || button.dataset.fanartThumbLoading === '1' || button.querySelector('[data-fanart-thumb] img')) continue;
        const id = String(button.dataset.fanartId || '');
        if (!id) continue;
        button.dataset.fanartThumbLoading = '1';
        activeThumbLoads += 1;
        detailPayload(id).then(detail => {
          const src = Array.isArray(detail?.item?.images) ? detail.item.images.find(Boolean) : '';
          const wrap = button.querySelector('[data-fanart-thumb]');
          if (!src || !wrap || wrap.querySelector('img')) return;
          const img = document.createElement('img');
          img.src = proxiedImage(src);
          img.alt = button.querySelector('strong')?.textContent || '춘봉 팬아트';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.fetchPriority = 'low';
          wrap.replaceChildren(img);
        }).catch(()=>{}).finally(() => {
          activeThumbLoads -= 1;
          delete button.dataset.fanartThumbLoading;
          drainThumbQueue();
        });
      }
    };
    const enqueueThumb = button => {
      if (!button || button.querySelector('[data-fanart-thumb] img') || queue.includes(button)) return;
      queue.push(button);
      drainThumbQueue();
    };
    const cardsMissingThumb = $$('[data-fanart-index]', grid).filter(button => !button.querySelector('[data-fanart-thumb] img'));
    if ('IntersectionObserver' in window) {
      const thumbObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          thumbObserver.unobserve(entry.target);
          enqueueThumb(entry.target);
        });
      }, { rootMargin:'320px 0px', threshold:0.01 });
      cardsMissingThumb.forEach(button => thumbObserver.observe(button));
    } else {
      cardsMissingThumb.slice(0,4).forEach(enqueueThumb);
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
        const hydrated = button.querySelector('[data-fanart-thumb] img')?.getAttribute('src') || '';
        if (item.thumb) {
          modalImage.src = proxiedImage(item.fullImage || item.thumb);
          modalImage.alt = item.title || '춘봉 팬아트';
          modalImage.hidden = false;
        } else if (hydrated) {
          modalImage.src = hydrated;
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
