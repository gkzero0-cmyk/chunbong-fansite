(() => {
  const data = window.CHUNBONG_CONTENT;
  const $ = (selector) => document.querySelector(selector);
  const API_ENDPOINTS = {
    vod: '/api/content?type=vod',
    notice: '/api/content?type=notice',
    clips: '/api/content?type=clips',
    fanart: '/api/content?type=fanart'
  };
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  async function loadItems(type, fallback) {
    try {
      const response = await fetch(API_ENDPOINTS[type], { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload.items) && payload.items.length ? payload.items : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function renderSchedule() {
    $('#schedule-grid').innerHTML = data.schedule.map(item => `
      <article class="schedule-card reveal">
        <span class="badge">${esc(item.badge)}</span>
        <h3>${esc(item.title)}</h3>
        <div class="time">${esc(item.time)}</div>
        <p>${esc(item.desc)}</p>
        <a class="card-link" href="${esc(item.link)}" target="_blank" rel="noreferrer">${esc(item.action)} ↗</a>
      </article>`).join('');
  }

  async function renderNotices() {
    const items = await loadItems('notice', data.fallback.notices);
    $('#notice-list').innerHTML = items.map(item => `
      <a class="notice-row reveal" href="${esc(item.link)}" target="_blank" rel="noreferrer">
        <span class="notice-category">${esc(item.category || 'NOTICE')}</span>
        <div><h3>${esc(item.title)}</h3><p>${esc(item.desc || 'SOOP 공지 게시판에서 내용을 확인하세요.')}</p></div>
        <span class="notice-date">${esc(item.date || 'SOOP')}</span><span class="notice-arrow">↗</span>
      </a>`).join('');
  }

  async function renderMedia() {
    const [vodItems, clipItems] = await Promise.all([
      loadItems('vod', data.fallback.vod),
      loadItems('clips', data.fallback.clips)
    ]);

    $('#vod-grid').innerHTML = vodItems.map((item, index) => `
      <a class="media-card reveal" href="${esc(item.link)}" target="_blank" rel="noreferrer">
        <span class="media-icon">▶</span><small>REPLAY ${String(index + 1).padStart(2, '0')}</small>
        <h3>${esc(item.title)}</h3><p>${esc(item.date || item.meta || 'SOOP 다시보기')}</p>
      </a>`).join('');

    $('#clip-grid').innerHTML = clipItems.map((item, index) => `
      <a class="clip-card reveal" href="${esc(item.link)}" target="_blank" rel="noreferrer">
        <span class="clip-rank">${String(index + 1).padStart(2, '0')}</span><div class="clip-glyph">${esc(item.glyph || '▶')}</div>
        <small>${esc(item.label || 'HOT CLIP')}</small><h3>${esc(item.title)}</h3><p>${esc(item.date || item.desc || 'SOOP에서 영상 보기')}</p>
      </a>`).join('');
  }

  async function renderFanart() {
    const items = await loadItems('fanart', data.fallback.fanart);
    $('#fanart-grid').innerHTML = items.map((item, index) => `
      <a class="fan-tile ${esc(item.style || ['a','b','c','d','e','f'][index % 6])} reveal" href="${esc(item.link || data.sources.fanart)}" target="_blank" rel="noreferrer" aria-label="${esc(item.title || '춘봉 팬아트')} 보러가기">
        ${item.thumb ? `<img class="fanart-thumb" src="${esc(item.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}
        <span class="word">${esc(item.word || 'ART')}</span><span class="symbol">${esc(item.symbol || '✦')}</span>
        <span class="caption">${esc(item.title || item.caption || 'FAN ART')}${item.author ? ` · ${esc(item.author)}` : ''}</span>
      </a>`).join('');
  }

  function setupNavigation() {
    const toggle = $('.nav-toggle');
    const nav = $('#main-nav');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));

    const sections = [...document.querySelectorAll('main section[id]')];
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }

  function setupReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(node => node.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    nodes.forEach(node => observer.observe(node));
  }

  function setupToTop() {
    const button = $('.to-top');
    const update = () => button.classList.toggle('visible', window.scrollY > 650);
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    update();
  }

  async function init() {
    renderSchedule();
    await Promise.all([renderNotices(), renderMedia(), renderFanart()]);
    setupNavigation();
    setupReveal();
    setupToTop();
  }

  init();
})();
