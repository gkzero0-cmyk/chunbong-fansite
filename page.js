(() => {
  const data = window.CHUNBONG_CONTENT || {};
  const page = document.body.dataset.page || 'home';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const API_ENDPOINTS = {
    vod: '/api/content?type=vod',
    notice: '/api/content?type=notice',
    clips: '/api/content?type=clips',
    fanart: '/api/content?type=fanart',
    youtube: '/api/content?type=youtube'
  };
  const NOTICE_REFRESH_MS = 5 * 60 * 1000;
  const noticeDetailCache = new Map();
  let noticeRefreshTimer = null;
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');


  const proxiedImage = (url = '') => url ? `/api/image?url=${encodeURIComponent(url)}` : '';

  async function loadContent(type) {
    try {
      const response = await fetch(API_ENDPOINTS[type], { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return payload && typeof payload === 'object' ? payload : { items: [], fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { items: [], fallback: true, reason: error?.message || 'network error' };
    }
  }

  async function loadItems(type, fallback = []) {
    const payload = await loadContent(type);
    return Array.isArray(payload.items) && payload.items.length ? payload.items : fallback;
  }

  async function loadNoticeDetail(id) {
    if (!id) return { item: null, fallback: true, reason: '공지 글 번호가 없습니다.' };
    try {
      const response = await fetch(`/api/content?type=notice-detail&id=${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return payload && typeof payload === 'object' ? payload : { item: null, fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { item: null, fallback: true, reason: error?.message || 'network error' };
    }
  }

  function sourceFor(type) {
    if (type === 'notice') return data.sources?.notice;
    if (type === 'fanart') return data.sources?.fanart;
    if (type === 'catch') return data.sources?.catch;
    if (type === 'clip') return data.sources?.clip;
    if (type === 'vod') return data.sources?.vod;
    if (type === 'youtube' || type === 'videos' || type === 'shorts') return data.sources?.youtube;
    return '#';
  }

  function errorState(type, message) {
    return `
      <div class="content-error reveal">
        <strong>콘텐츠를 불러오지 못했습니다.</strong>
        <p>${esc(message || '원본 서비스의 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p>
        <div class="content-error-actions">
          <button class="btn btn-primary retry-content" type="button">다시 시도</button>
          <a class="btn btn-ghost" href="${esc(sourceFor(type))}" target="_blank" rel="noreferrer">원본에서 보기 ↗</a>
        </div>
      </div>`;
  }

  function bindRetry(root, callback) {
    $('.retry-content', root)?.addEventListener('click', callback);
  }

  function setupNavigation() {
    const toggle = $('.nav-toggle');
    const nav = $('#main-nav');
    if (!nav) return;
    $$('[data-nav]', nav).forEach(link => link.classList.toggle('active', link.dataset.nav === page));
    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      $$('a', nav).forEach(link => link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }));
    }
  }

  function setupReveal() {
    const nodes = $$('.reveal');
    if (!nodes.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(node => node.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach(node => {
      if (!node.classList.contains('visible')) observer.observe(node);
    });
  }

  function setupToTop() {
    const button = $('.to-top');
    if (!button) return;
    const update = () => button.classList.toggle('visible', window.scrollY > 500);
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    update();
  }

  function kstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function formatScheduleWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const start = new Date(item.start);
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      });
      const startText = formatter.format(start);
      if (!item.end) return `${startText} KST`;
      return `${startText} ~ ${formatter.format(new Date(item.end))} KST`;
    }
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' });
    const startText = dateFormatter.format(new Date(`${item.start}T00:00:00+09:00`));
    if (!item.end || item.end === item.start) return startText;
    const endText = dateFormatter.format(new Date(`${item.end}T00:00:00+09:00`));
    return `${startText} ~ ${endText}`;
  }

  function scheduleStatus(item, today) {
    const start = String(item.start || '').slice(0, 10);
    const end = String(item.end || item.start || '').slice(0, 10);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  async function renderSchedulePage() {
    const grid = $('#schedule-grid');
    const official = $('#schedule-official');
    if (!grid) return;
    const today = kstDateKey();
    const items = [...(data.notionSchedule || [])].sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const visibleItems = items.filter(item => {
      const end = String(item.end || item.start || '').slice(0, 10);
      const cutoff = new Date(`${today}T00:00:00+09:00`);
      cutoff.setDate(cutoff.getDate() - 7);
      return end >= kstDateKey(cutoff);
    });
    const statusLabel = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    grid.innerHTML = visibleItems.length ? visibleItems.map((item, index) => {
      const status = scheduleStatus(item, today);
      const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
      return `
        <article class="schedule-card schedule-${status} reveal">
          <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="schedule-card-top"><span class="badge">${statusLabel[status]}</span><div class="schedule-tags">${tags}</div></div>
          <h2>${esc(item.title)}</h2>
          <div class="time">${esc(formatScheduleWhen(item))}</div>
          <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.'}</p>
          <a class="inline-link" href="${esc(item.link || data.sources?.notion)}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
        </article>`;
    }).join('') : '<div class="loading-card">등록된 일정이 없습니다. SOOP 공식 일정 안내를 확인해 주세요.</div>';

    const updated = $('#schedule-updated');
    if (updated) updated.textContent = 'Notion 일정 · 한국 시간(KST) 기준';

    if (official) {
      official.innerHTML = '<div class="loading-card">SOOP 공식 일정 안내를 불러오는 중...</div>';
      const payload = await loadNoticeDetail('203015477');
      const detail = payload.item;
      if (detail && (detail.html || detail.content || detail.embeds?.length)) {
        const embeds = Array.isArray(detail.embeds) ? detail.embeds : [];
        const embedHtml = embeds.map((src, index) => `
          <div class="schedule-official-embed">
            <iframe class="schedule-official-embed-frame" src="${esc(src)}" title="춘봉 공식 일정 ${index + 1}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
            <a class="inline-link" href="${esc(src)}" target="_blank" rel="noreferrer noopener">일정 콘텐츠 새 창에서 보기 ↗</a>
          </div>`).join('');
        const placeholderOnly = embeds.length > 0 && /잠시\s*기다리시면\s*보입니다/i.test(String(detail.content || '')) && String(detail.content || '').trim().length < 100;
        const bodyHtml = placeholderOnly ? '' : (detail.html || `<p>${esc(detail.content).replaceAll('\n','<br>')}</p>`);
        official.innerHTML = `
          <div class="schedule-official-meta"><span class="badge">OFFICIAL</span><strong>${esc(detail.title || '춘봉 방송 일정')}</strong>${detail.date ? `<small>${esc(detail.date)}</small>` : ''}</div>
          ${embedHtml}
          ${bodyHtml ? `<div class="schedule-official-body notice-content">${bodyHtml}</div>` : ''}
          <a class="inline-link" href="https://www.sooplive.com/station/chunbongtv/post/203015477" target="_blank" rel="noreferrer">SOOP 일정 원문 보기 ↗</a>`;
      } else {
        official.innerHTML = `<div class="notice-detail-error"><strong>SOOP 공식 일정 글을 불러오지 못했습니다.</strong><p>${esc(payload.reason || '일시적으로 원본 서비스 응답이 없습니다.')}</p><a class="inline-link" href="https://www.sooplive.com/station/chunbongtv/post/203015477" target="_blank" rel="noreferrer">SOOP 일정 원문 보기 ↗</a></div>`;
      }
    }
    setupReveal();
  }

  function setupNoticeImageZoom(root) {
    const dialog = $('#notice-image-modal');
    const modalImage = $('#notice-image-modal-image');
    if (!root || !dialog || !modalImage) return;
    $$('img', root).forEach(image => {
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
    const dialog = $('#notice-image-modal');
    if (!dialog || dialog.dataset.bound === 'true') return;
    dialog.dataset.bound = 'true';
    $$('[data-notice-image-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  async function renderNoticePage() {
    const list = $('#notice-list');
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

    $$('[data-notice]', list).forEach((card, index) => {
      const button = $('.notice-toggle', card);
      const body = $('.notice-body', card);
      const label = $('.notice-state-label', card);
      const detailRoot = $('[data-notice-detail]', card);
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
          $('.notice-detail-retry', detailRoot)?.addEventListener('click', () => {
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

    if (!noticeRefreshTimer) {
      noticeRefreshTimer = setInterval(() => {
        if (document.hidden || $('.notice-body.open', list)) return;
        renderNoticePage();
      }, NOTICE_REFRESH_MS);
    }
    setupReveal();
  }

  function setVideoPlayer(kind, item) {
    const frame = $(`#${kind}-player`);
    const title = $(`#${kind}-player-title`);
    const meta = $(`#${kind}-player-meta`);
    const source = $(`#${kind}-source-link`);
    const empty = $(`#${kind}-player-empty`);
    if (!frame) return;
    title.textContent = item?.title || (kind === 'vod' ? '춘봉 다시보기' : kind === 'youtube' ? '춘봉TV' : '춘봉 핫클립');
    const platformLabel = item?.platform === 'youtube' ? (item?.kind === 'shorts' ? 'SHORTS' : 'YOUTUBE') : item?.kind === 'catch' ? 'CATCH' : item?.kind === 'clip' ? 'CLIP' : '';
    meta.textContent = [platformLabel, item?.date || item?.meta || (item?.platform === 'youtube' ? 'YouTube' : 'SOOP')].filter(Boolean).join(' · ');
    if (source) source.href = item?.link || sourceFor(item?.kind || (kind === 'vod' ? 'vod' : kind === 'youtube' ? 'youtube' : 'catch'));
    if (item?.embed) {
      frame.src = item.embed;
      frame.hidden = false;
      if (empty) empty.hidden = true;
    } else {
      frame.removeAttribute('src');
      frame.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = item?.link
          ? `이 영상은 사이트 내부 재생을 지원하지 않습니다.<br><a class="inline-link" href="${esc(item.link)}" target="_blank" rel="noreferrer">원본에서 보기 ↗</a>`
          : '영상을 선택하면 이곳에서 재생됩니다.';
      }
    }
  }

  function renderVideoList(kind, items, list) {
    list.innerHTML = items.map((item, index) => `
      <button class="video-list-card${index === 0 ? ' selected' : ''}" type="button" data-video-index="${index}">
        <span class="video-thumb">
          ${item.thumb ? `<img src="${esc(item.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="thumb-placeholder">▶</span>'}
          <i>▶</i>
        </span>
        <span class="video-copy"><small>${esc((item.kind || '').toUpperCase() || item.date || (kind === 'vod' ? 'REPLAY' : 'HOT CLIP'))}${item.date ? ` · ${esc(item.date)}` : ''}</small><strong>${esc(item.title)}</strong></span>
      </button>`).join('');
    if (items[0]) setVideoPlayer(kind, items[0]);
    $$('[data-video-index]', list).forEach(button => {
      button.addEventListener('click', () => {
        $$('[data-video-index]', list).forEach(node => node.classList.remove('selected'));
        button.classList.add('selected');
        setVideoPlayer(kind, items[Number(button.dataset.videoIndex)]);
        window.scrollTo({ top: Math.max(0, $(`#${kind}-viewer`).offsetTop - 90), behavior: 'smooth' });
      });
    });
  }

  async function renderVideoPage(kind) {
    const list = $(`#${kind}-list`);
    if (!list) return;
    const fallback = data.fallback?.vod || [];
    list.innerHTML = '<div class="loading-card">영상을 불러오는 중...</div>';
    const items = await loadItems('vod', fallback);
    renderVideoList(kind, items, list);
  }

  async function renderClipsPage() {
    const list = $('#clip-list');
    const tabs = $$('.clip-tab');
    const kindLabel = $('#clip-kind-label');
    if (!list || !tabs.length) return;
    list.innerHTML = '<div class="loading-card">CATCH와 클립을 불러오는 중...</div>';
    const payload = await loadContent('clips');
    const groups = {
      catch: Array.isArray(payload.groups?.catch) ? payload.groups.catch : [],
      clip: Array.isArray(payload.groups?.clip) ? payload.groups.clip : []
    };
    let activeKind = 'catch';

    const updateCounts = () => {
      const catchCount = $('[data-clip-count="catch"]');
      const clipCount = $('[data-clip-count="clip"]');
      if (catchCount) catchCount.textContent = String(groups.catch.length);
      if (clipCount) clipCount.textContent = String(groups.clip.length);
    };

    const renderKind = (kind) => {
      activeKind = kind;
      tabs.forEach(tab => {
        const active = tab.dataset.clipKind === kind;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      if (kindLabel) kindLabel.textContent = kind === 'catch' ? 'CATCH' : '클립';
      const items = groups[kind];
      if (!items.length) {
        list.innerHTML = errorState(kind, `${kind === 'catch' ? 'CATCH' : '클립'} 목록을 불러오지 못했습니다.`);
        bindRetry(list, renderClipsPage);
        setVideoPlayer('clip', null);
        setupReveal();
        return;
      }
      renderVideoList('clip', items, list);
    };

    updateCounts();
    tabs.forEach(tab => tab.addEventListener('click', () => renderKind(tab.dataset.clipKind)));
    if (!groups.catch.length && groups.clip.length) activeKind = 'clip';
    renderKind(activeKind);
  }


  async function renderYoutubePage() {
    const list = $('#youtube-list');
    const tabs = $$('.youtube-tab');
    const kindLabel = $('#youtube-kind-label');
    if (!list || !tabs.length) return;
    list.innerHTML = '<div class="loading-card">유튜브 동영상과 Shorts를 불러오는 중...</div>';
    const payload = await loadContent('youtube');
    const groups = {
      videos: Array.isArray(payload.groups?.videos) ? payload.groups.videos.slice(0, 12) : [],
      shorts: Array.isArray(payload.groups?.shorts) ? payload.groups.shorts.slice(0, 12) : []
    };
    let activeKind = groups.videos.length ? 'videos' : 'shorts';

    const updateCounts = () => {
      const videoCount = $('[data-youtube-count="videos"]');
      const shortsCount = $('[data-youtube-count="shorts"]');
      if (videoCount) videoCount.textContent = String(groups.videos.length);
      if (shortsCount) shortsCount.textContent = String(groups.shorts.length);
    };

    const renderKind = (kind) => {
      activeKind = kind;
      tabs.forEach(tab => {
        const active = tab.dataset.youtubeKind === kind;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      if (kindLabel) kindLabel.textContent = kind === 'shorts' ? 'Shorts' : '동영상';
      const items = groups[kind];
      if (!items.length) {
        list.innerHTML = errorState('youtube', `${kind === 'shorts' ? 'Shorts' : '동영상'} 목록을 불러오지 못했습니다.`);
        bindRetry(list, renderYoutubePage);
        setVideoPlayer('youtube', null);
        setupReveal();
        return;
      }
      renderVideoList('youtube', items, list);
    };

    updateCounts();
    tabs.forEach(tab => tab.addEventListener('click', () => renderKind(tab.dataset.youtubeKind)));
    renderKind(activeKind);
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
    setupReveal();
  }

  async function init() {
    setupNavigation();
    setupToTop();
    setupNoticeImageModal();
    if (page === 'schedule') await renderSchedulePage();
    if (page === 'notice') await renderNoticePage();
    if (page === 'vod') await renderVideoPage('vod');
    if (page === 'clips') await renderClipsPage();
    if (page === 'fanart') await renderFanartPage();
    if (page === 'youtube') await renderYoutubePage();
    setupReveal();
  }

  init();
})();
