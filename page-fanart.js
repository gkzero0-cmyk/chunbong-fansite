(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'fanart') return;
  const {
    data, $, $$, esc, proxiedImage, loadContent,
    errorState, bindRetry, setupReveal, requestedOpenId
  } = core;

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
      });
    });
    $$('[data-dialog-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    if (requestedOpenId) {
      const targetIndex = items.findIndex(item => String(item?.id || '') === String(requestedOpenId));
      if (targetIndex >= 0) requestAnimationFrame(() => $('[data-fanart-index="' + targetIndex + '"]', grid)?.click());
    }
    setupReveal();
  }

  void renderFanartPage();
})();
