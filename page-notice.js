(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'notice') return;
  const { data, esc, loadContent, errorState, bindRetry, setupReveal, requestedOpenId } = core;
  const q = core.$;
  const qa = core['
  const NOTICE_REFRESH_MS = 5 * 60 * 1000;
  const noticeDetailCache = new Map();
  let noticeRefreshTimer = null;

  async function loadNoticeDetail(id) {
    if (!id) return { item: null, fallback: true, reason: '공지 글 번호가 없습니다.' };
    try {
      const url=`/api/content?type=notice-detail&id=${encodeURIComponent(id)}`;
      const payload = window.ChunbongCache
        ? await window.ChunbongCache.fetchJson('notice-detail:'+id,url,{ttl:10*60*1000})
        : await (async()=>{const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})();
      return payload && typeof payload === 'object' ? payload : { item: null, fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { item: null, fallback: true, reason: error?.message || 'network error' };
    }
  }

  function setupNoticeImageZoom(root) {
    const dialog = q('#notice-image-modal');
    const modalImage = q('#notice-image-modal-image');
    if (!root || !dialog || !modalImage) return;
    qa('img', root).forEach(image => {
      if (image.dataset.zoomBound === 'true') return;
      image.dataset.zoomBound = 'true';
      image.classList.add('notice-zoomable-image');
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `${image.alt || '공지 이미지'} 크게 보기`);
      const open = () => {
        modalImage.src = image.currentSrc || image.src;
        modalImage.alt = image.alt || '공지 이미지 크게 보기';
        dialog.showModal();
      };
      image.addEventListener('click', open);
      image.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
  }

  function setupNoticeImageModal() {
    const dialog = q('#notice-image-modal');
    if (!dialog || dialog.dataset.bound === 'true') return;
    dialog.dataset.bound = 'true';
    qa('[data-notice-image-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  async function renderNoticePage() {
    const list = q('#notice-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-card">공지사항을 불러오는 중...</div>';
    const payload = await loadContent('notice');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      list.innerHTML = errorState('notice', payload.reason || 'SOOP 공지 게시판에서 최신 글을 가져오지 못했습니다.');
      bindRetry(list, renderNoticePage);
      setupReveal();
      return;
    }
    list.innerHTML = items.map((item, index) => `
      <article class="notice-card reveal" data-notice data-notice-id="${esc(item.id || '')}">
        <button class="notice-toggle" type="button" aria-expanded="false">
          <span class="notice-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="notice-main"><small>${esc(item.category || 'NOTICE')} · ${esc(item.date || 'SOOP')}</small><strong>${esc(item.title)}</strong></span>
          <span class="notice-action"><span class="notice-state-label">본문 펼치기</span><span class="notice-chevron">⌄</span></span>
        </button>
        <div class="notice-body">
          <div class="notice-detail" data-notice-detail>
            <p class="notice-hint">제목을 눌러 공지 본문을 불러오세요.</p>
          </div>
          <a class="inline-link" href="${esc(item.link || data.sources?.notice)}" target="_blank" rel="noreferrer">SOOP 원문 보기 ↗</a>
        </div>
      </article>`).join('');

    qa('[data-notice]', list).forEach((card, index) => {
      const button = q('.notice-toggle', card);
      const body = q('.notice-body', card);
      const label = q('.notice-state-label', card);
      const detailRoot = q('[data-notice-detail]', card);
      const item = items[index];

      button.addEventListener('click', async () => {
        const open = !body.classList.contains('open');
        body.classList.toggle('open', open);
        button.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? '본문 접기' : '본문 펼치기';
        if (!open || detailRoot.dataset.loaded === 'true' || detailRoot.dataset.loading === 'true') return;

        detailRoot.dataset.loading = 'true';
        detailRoot.innerHTML = '<div class="notice-detail-loading">공지 본문을 불러오는 중...</div>';
        let detailPayload = noticeDetailCache.get(String(item.id || ''));
        if (!detailPayload) {
          detailPayload = await loadNoticeDetail(item.id);
          if (detailPayload?.item) noticeDetailCache.set(String(item.id || ''), detailPayload);
        }
        const detail = detailPayload?.item;
        const fallbackText = item.content || item.desc || '';

        if (detail && (detail.html || detail.content)) {
          detailRoot.innerHTML = detail.html
            ? `<div class="notice-content">${detail.html}</div>`
            : `<div class="notice-content"><p>${esc(detail.content).replaceAll('\n', '<br>')}</p></div>`;
          detailRoot.dataset.loaded = 'true';
          setupNoticeImageZoom(detailRoot);
        } else if (fallbackText) {
          detailRoot.innerHTML = `<div class="notice-content"><p>${esc(fallbackText).replaceAll('\n', '<br>')}</p></div><p class="notice-detail-warning">상세 API 응답이 없어 목록에 포함된 본문을 표시했습니다.</p>`;
          detailRoot.dataset.loaded = 'true';
        } else {
          detailRoot.innerHTML = `<div class="notice-detail-error"><strong>공지 본문을 가져오지 못했습니다.</strong><p>${esc(detailPayload?.reason || 'SOOP 상세 게시글 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p><button type="button" class="inline-link notice-detail-retry">다시 시도</button></div>`;
          q('.notice-detail-retry', detailRoot)?.addEventListener('click', () => {
            noticeDetailCache.delete(String(item.id || ''));
            detailRoot.dataset.loading = 'false';
            detailRoot.dataset.loaded = 'false';
            button.click();
            button.click();
          });
        }
        detailRoot.dataset.loading = 'false';
      });
    });

    if (requestedOpenId) {
      const targetCard = q('[data-notice-id="' + CSS.escape(String(requestedOpenId)) + '"]', list);
      if (targetCard) requestAnimationFrame(() => {
        q('.notice-toggle', targetCard)?.click();
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (!noticeRefreshTimer) {
      noticeRefreshTimer = setInterval(() => {
        if (document.hidden || q('.notice-body.open', list)) return;
        renderNoticePage();
      }, NOTICE_REFRESH_MS);
    }
    setupReveal();
  }

  setupNoticeImageModal();
  void renderNoticePage();
})();
 + '
  const NOTICE_REFRESH_MS = 5 * 60 * 1000;
  const noticeDetailCache = new Map();
  let noticeRefreshTimer = null;

  async function loadNoticeDetail(id) {
    if (!id) return { item: null, fallback: true, reason: '공지 글 번호가 없습니다.' };
    try {
      const url=`/api/content?type=notice-detail&id=${encodeURIComponent(id)}`;
      const payload = window.ChunbongCache
        ? await window.ChunbongCache.fetchJson('notice-detail:'+id,url,{ttl:10*60*1000})
        : await (async()=>{const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})();
      return payload && typeof payload === 'object' ? payload : { item: null, fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { item: null, fallback: true, reason: error?.message || 'network error' };
    }
  }

  function setupNoticeImageZoom(root) {
    const dialog = q('#notice-image-modal');
    const modalImage = q('#notice-image-modal-image');
    if (!root || !dialog || !modalImage) return;
    qa('img', root).forEach(image => {
      if (image.dataset.zoomBound === 'true') return;
      image.dataset.zoomBound = 'true';
      image.classList.add('notice-zoomable-image');
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `${image.alt || '공지 이미지'} 크게 보기`);
      const open = () => {
        modalImage.src = image.currentSrc || image.src;
        modalImage.alt = image.alt || '공지 이미지 크게 보기';
        dialog.showModal();
      };
      image.addEventListener('click', open);
      image.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
  }

  function setupNoticeImageModal() {
    const dialog = q('#notice-image-modal');
    if (!dialog || dialog.dataset.bound === 'true') return;
    dialog.dataset.bound = 'true';
    qa('[data-notice-image-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  async function renderNoticePage() {
    const list = q('#notice-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-card">공지사항을 불러오는 중...</div>';
    const payload = await loadContent('notice');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      list.innerHTML = errorState('notice', payload.reason || 'SOOP 공지 게시판에서 최신 글을 가져오지 못했습니다.');
      bindRetry(list, renderNoticePage);
      setupReveal();
      return;
    }
    list.innerHTML = items.map((item, index) => `
      <article class="notice-card reveal" data-notice data-notice-id="${esc(item.id || '')}">
        <button class="notice-toggle" type="button" aria-expanded="false">
          <span class="notice-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="notice-main"><small>${esc(item.category || 'NOTICE')} · ${esc(item.date || 'SOOP')}</small><strong>${esc(item.title)}</strong></span>
          <span class="notice-action"><span class="notice-state-label">본문 펼치기</span><span class="notice-chevron">⌄</span></span>
        </button>
        <div class="notice-body">
          <div class="notice-detail" data-notice-detail>
            <p class="notice-hint">제목을 눌러 공지 본문을 불러오세요.</p>
          </div>
          <a class="inline-link" href="${esc(item.link || data.sources?.notice)}" target="_blank" rel="noreferrer">SOOP 원문 보기 ↗</a>
        </div>
      </article>`).join('');

    qa('[data-notice]', list).forEach((card, index) => {
      const button = q('.notice-toggle', card);
      const body = q('.notice-body', card);
      const label = q('.notice-state-label', card);
      const detailRoot = q('[data-notice-detail]', card);
      const item = items[index];

      button.addEventListener('click', async () => {
        const open = !body.classList.contains('open');
        body.classList.toggle('open', open);
        button.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? '본문 접기' : '본문 펼치기';
        if (!open || detailRoot.dataset.loaded === 'true' || detailRoot.dataset.loading === 'true') return;

        detailRoot.dataset.loading = 'true';
        detailRoot.innerHTML = '<div class="notice-detail-loading">공지 본문을 불러오는 중...</div>';
        let detailPayload = noticeDetailCache.get(String(item.id || ''));
        if (!detailPayload) {
          detailPayload = await loadNoticeDetail(item.id);
          if (detailPayload?.item) noticeDetailCache.set(String(item.id || ''), detailPayload);
        }
        const detail = detailPayload?.item;
        const fallbackText = item.content || item.desc || '';

        if (detail && (detail.html || detail.content)) {
          detailRoot.innerHTML = detail.html
            ? `<div class="notice-content">${detail.html}</div>`
            : `<div class="notice-content"><p>${esc(detail.content).replaceAll('\n', '<br>')}</p></div>`;
          detailRoot.dataset.loaded = 'true';
          setupNoticeImageZoom(detailRoot);
        } else if (fallbackText) {
          detailRoot.innerHTML = `<div class="notice-content"><p>${esc(fallbackText).replaceAll('\n', '<br>')}</p></div><p class="notice-detail-warning">상세 API 응답이 없어 목록에 포함된 본문을 표시했습니다.</p>`;
          detailRoot.dataset.loaded = 'true';
        } else {
          detailRoot.innerHTML = `<div class="notice-detail-error"><strong>공지 본문을 가져오지 못했습니다.</strong><p>${esc(detailPayload?.reason || 'SOOP 상세 게시글 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p><button type="button" class="inline-link notice-detail-retry">다시 시도</button></div>`;
          q('.notice-detail-retry', detailRoot)?.addEventListener('click', () => {
            noticeDetailCache.delete(String(item.id || ''));
            detailRoot.dataset.loading = 'false';
            detailRoot.dataset.loaded = 'false';
            button.click();
            button.click();
          });
        }
        detailRoot.dataset.loading = 'false';
      });
    });

    if (requestedOpenId) {
      const targetCard = q('[data-notice-id="' + CSS.escape(String(requestedOpenId)) + '"]', list);
      if (targetCard) requestAnimationFrame(() => {
        q('.notice-toggle', targetCard)?.click();
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (!noticeRefreshTimer) {
      noticeRefreshTimer = setInterval(() => {
        if (document.hidden || q('.notice-body.open', list)) return;
        renderNoticePage();
      }, NOTICE_REFRESH_MS);
    }
    setupReveal();
  }

  setupNoticeImageModal();
  void renderNoticePage();
})();
];
  const NOTICE_REFRESH_MS = 5 * 60 * 1000;
  const noticeDetailCache = new Map();
  let noticeRefreshTimer = null;

  async function loadNoticeDetail(id) {
    if (!id) return { item: null, fallback: true, reason: '공지 글 번호가 없습니다.' };
    try {
      const url=`/api/content?type=notice-detail&id=${encodeURIComponent(id)}`;
      const payload = window.ChunbongCache
        ? await window.ChunbongCache.fetchJson('notice-detail:'+id,url,{ttl:10*60*1000})
        : await (async()=>{const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})();
      return payload && typeof payload === 'object' ? payload : { item: null, fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { item: null, fallback: true, reason: error?.message || 'network error' };
    }
  }

  function setupNoticeImageZoom(root) {
    const dialog = q('#notice-image-modal');
    const modalImage = q('#notice-image-modal-image');
    if (!root || !dialog || !modalImage) return;
    qa('img', root).forEach(image => {
      if (image.dataset.zoomBound === 'true') return;
      image.dataset.zoomBound = 'true';
      image.classList.add('notice-zoomable-image');
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `${image.alt || '공지 이미지'} 크게 보기`);
      const open = () => {
        modalImage.src = image.currentSrc || image.src;
        modalImage.alt = image.alt || '공지 이미지 크게 보기';
        dialog.showModal();
      };
      image.addEventListener('click', open);
      image.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
  }

  function setupNoticeImageModal() {
    const dialog = q('#notice-image-modal');
    if (!dialog || dialog.dataset.bound === 'true') return;
    dialog.dataset.bound = 'true';
    qa('[data-notice-image-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  async function renderNoticePage() {
    const list = q('#notice-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-card">공지사항을 불러오는 중...</div>';
    const payload = await loadContent('notice');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      list.innerHTML = errorState('notice', payload.reason || 'SOOP 공지 게시판에서 최신 글을 가져오지 못했습니다.');
      bindRetry(list, renderNoticePage);
      setupReveal();
      return;
    }
    list.innerHTML = items.map((item, index) => `
      <article class="notice-card reveal" data-notice data-notice-id="${esc(item.id || '')}">
        <button class="notice-toggle" type="button" aria-expanded="false">
          <span class="notice-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="notice-main"><small>${esc(item.category || 'NOTICE')} · ${esc(item.date || 'SOOP')}</small><strong>${esc(item.title)}</strong></span>
          <span class="notice-action"><span class="notice-state-label">본문 펼치기</span><span class="notice-chevron">⌄</span></span>
        </button>
        <div class="notice-body">
          <div class="notice-detail" data-notice-detail>
            <p class="notice-hint">제목을 눌러 공지 본문을 불러오세요.</p>
          </div>
          <a class="inline-link" href="${esc(item.link || data.sources?.notice)}" target="_blank" rel="noreferrer">SOOP 원문 보기 ↗</a>
        </div>
      </article>`).join('');

    qa('[data-notice]', list).forEach((card, index) => {
      const button = q('.notice-toggle', card);
      const body = q('.notice-body', card);
      const label = q('.notice-state-label', card);
      const detailRoot = q('[data-notice-detail]', card);
      const item = items[index];

      button.addEventListener('click', async () => {
        const open = !body.classList.contains('open');
        body.classList.toggle('open', open);
        button.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? '본문 접기' : '본문 펼치기';
        if (!open || detailRoot.dataset.loaded === 'true' || detailRoot.dataset.loading === 'true') return;

        detailRoot.dataset.loading = 'true';
        detailRoot.innerHTML = '<div class="notice-detail-loading">공지 본문을 불러오는 중...</div>';
        let detailPayload = noticeDetailCache.get(String(item.id || ''));
        if (!detailPayload) {
          detailPayload = await loadNoticeDetail(item.id);
          if (detailPayload?.item) noticeDetailCache.set(String(item.id || ''), detailPayload);
        }
        const detail = detailPayload?.item;
        const fallbackText = item.content || item.desc || '';

        if (detail && (detail.html || detail.content)) {
          detailRoot.innerHTML = detail.html
            ? `<div class="notice-content">${detail.html}</div>`
            : `<div class="notice-content"><p>${esc(detail.content).replaceAll('\n', '<br>')}</p></div>`;
          detailRoot.dataset.loaded = 'true';
          setupNoticeImageZoom(detailRoot);
        } else if (fallbackText) {
          detailRoot.innerHTML = `<div class="notice-content"><p>${esc(fallbackText).replaceAll('\n', '<br>')}</p></div><p class="notice-detail-warning">상세 API 응답이 없어 목록에 포함된 본문을 표시했습니다.</p>`;
          detailRoot.dataset.loaded = 'true';
        } else {
          detailRoot.innerHTML = `<div class="notice-detail-error"><strong>공지 본문을 가져오지 못했습니다.</strong><p>${esc(detailPayload?.reason || 'SOOP 상세 게시글 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p><button type="button" class="inline-link notice-detail-retry">다시 시도</button></div>`;
          q('.notice-detail-retry', detailRoot)?.addEventListener('click', () => {
            noticeDetailCache.delete(String(item.id || ''));
            detailRoot.dataset.loading = 'false';
            detailRoot.dataset.loaded = 'false';
            button.click();
            button.click();
          });
        }
        detailRoot.dataset.loading = 'false';
      });
    });

    if (requestedOpenId) {
      const targetCard = q('[data-notice-id="' + CSS.escape(String(requestedOpenId)) + '"]', list);
      if (targetCard) requestAnimationFrame(() => {
        q('.notice-toggle', targetCard)?.click();
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (!noticeRefreshTimer) {
      noticeRefreshTimer = setInterval(() => {
        if (document.hidden || q('.notice-body.open', list)) return;
        renderNoticePage();
      }, NOTICE_REFRESH_MS);
    }
    setupReveal();
  }

  setupNoticeImageModal();
  void renderNoticePage();
})();
