(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || !['vod','clips','youtube'].includes(core.page)) return;
  const {
    data, $, $$, esc, loadContent, loadItems, sourceFor,
    errorState, bindRetry, setupReveal, requestedOpenId, requestedKind
  } = core;

  function setVideoPlayer(kind, item, { trackRecent = false } = {}) {
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
    document.dispatchEvent(new CustomEvent('chunbong:media-selected',{detail:{
      page:kind,
      id:String(item?.id||''),
      title:item?.title||'',
      kind:item?.kind||kind,
      date:item?.date||item?.meta||'',
      thumb:item?.thumb||'',
      link:item?.link||'',
      embed:item?.embed||'',
      trackRecent:Boolean(trackRecent)
    }}));
        if (item?.embed) {
      frame.loading = 'lazy';
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

  function renderVideoList(kind, items, list, selectedId = '') {
    const selectedIndex = Math.max(0, items.findIndex(item => String(item?.id || '') === String(selectedId || '')));
    list.innerHTML = items.map((item, index) => `
      <button class="video-list-card${index === selectedIndex ? ' selected' : ''}" type="button" data-video-index="${index}">
        <span class="video-thumb">
          ${item.thumb ? `<img src="${esc(item.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="thumb-placeholder">▶</span>'}
          <i>▶</i>
        </span>
        <span class="video-copy"><small>${esc((item.kind || '').toUpperCase() || item.date || (kind === 'vod' ? 'REPLAY' : 'HOT CLIP'))}${item.date ? ` · ${esc(item.date)}` : ''}</small><strong>${esc(item.title)}</strong></span>
      </button>`).join('');
    if (items[selectedIndex]) setVideoPlayer(kind, items[selectedIndex], { trackRecent: Boolean(selectedId) });
    $$('[data-video-index]', list).forEach(button => {
      button.addEventListener('click', () => {
        $$('[data-video-index]', list).forEach(node => node.classList.remove('selected'));
        button.classList.add('selected');
        setVideoPlayer(kind, items[Number(button.dataset.videoIndex)], { trackRecent: true });
        window.scrollTo({ top: Math.max(0, $(`#${kind}-viewer`).offsetTop - 90), behavior: 'smooth' });
      });
    });
  }

  async function renderVideoPage(kind) {
    const list = $(`#${kind}-list`);
    if (!list) return;
    const fallback = data.fallback?.vod || [];
    list.setAttribute('aria-busy','true');
    list.innerHTML = '<div class="loading-card">영상을 불러오는 중...</div>';
    const items = await loadItems('vod', fallback);
    renderVideoList(kind, items, list, requestedOpenId);
    list.setAttribute('aria-busy','false');
  }

  async function renderClipsPage() {
    const list = $('#clip-list');
    const tabs = $$('.clip-tab');
    const kindLabel = $('#clip-kind-label');
    if (!list || !tabs.length) return;
    list.setAttribute('aria-busy','true');
    list.innerHTML = '<div class="loading-card">CATCH와 클립을 불러오는 중...</div>';
    const payload = await loadContent('clips');
    list.setAttribute('aria-busy','false');
    const groups = {
      catch: Array.isArray(payload.groups?.catch) ? payload.groups.catch : [],
      clip: Array.isArray(payload.groups?.clip) ? payload.groups.clip : []
    };
    let activeKind = requestedKind === 'clip' || requestedKind === 'catch' ? requestedKind : 'catch';

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
      renderVideoList('clip', items, list, kind === requestedKind ? requestedOpenId : '');
    };

    updateCounts();
    tabs.forEach(tab => tab.addEventListener('click', () => renderKind(tab.dataset.clipKind)));
    if (!groups[activeKind]?.length) activeKind = groups.catch.length ? 'catch' : 'clip';
    renderKind(activeKind);
  }


  async function renderYoutubePage() {
    const list = $('#youtube-list');
    const tabs = $$('.youtube-tab');
    const kindLabel = $('#youtube-kind-label');
    if (!list || !tabs.length) return;
    list.setAttribute('aria-busy','true');
    list.innerHTML = '<div class="loading-card">유튜브 동영상과 Shorts를 불러오는 중...</div>';
    const payload = await loadContent('youtube');
    list.setAttribute('aria-busy','false');
    const groups = {
      videos: Array.isArray(payload.groups?.videos) ? payload.groups.videos.slice(0, 12) : [],
      shorts: Array.isArray(payload.groups?.shorts) ? payload.groups.shorts.slice(0, 12) : []
    };
    let activeKind = requestedKind === 'shorts' || requestedKind === 'videos' ? requestedKind : (groups.videos.length ? 'videos' : 'shorts');

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
      renderVideoList('youtube', items, list, kind === requestedKind ? requestedOpenId : '');
    };

    updateCounts();
    tabs.forEach(tab => tab.addEventListener('click', () => renderKind(tab.dataset.youtubeKind)));
    if (!groups[activeKind]?.length) activeKind = groups.videos.length ? 'videos' : 'shorts';
    renderKind(activeKind);
  }

  if (core.page === 'vod') void renderVideoPage('vod');
  if (core.page === 'clips') void renderClipsPage();
  if (core.page === 'youtube') void renderYoutubePage();
})();
