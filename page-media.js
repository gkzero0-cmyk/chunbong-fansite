(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || !['vod','clips','youtube'].includes(core.page)) return;
  const {
    data, $, $$, esc, loadContent, loadItems, sourceFor,
    errorState, bindRetry, setupReveal, requestedOpenId, requestedKind
  } = core;
  const itemKey=item=>String(item?.id||item?.videoId||item?.link||item?.title||'');
  const miniState={kind:'',dismissed:false};
  function setupMobileMiniPlayer(kind){
    if(!window.matchMedia('(max-width:760px)').matches)return;
    const viewer=$('#'+kind+'-viewer');
    if(!viewer||viewer.dataset.mobileMiniReady==='true')return;
    viewer.dataset.mobileMiniReady='true';
    const close=document.createElement('button');
    close.type='button';
    close.className='mobile-mini-player-close';
    close.setAttribute('aria-label','미니플레이어 닫기');
    close.textContent='×';
    viewer.appendChild(close);
    close.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      miniState.dismissed=true;
      viewer.classList.remove('is-mobile-mini');
    });
    const sync=()=>{
      if(!window.matchMedia('(max-width:760px)').matches){viewer.classList.remove('is-mobile-mini');return}
      const frame=viewer.querySelector('iframe:not([hidden]),video:not([hidden])');
      if(!frame||miniState.dismissed){viewer.classList.remove('is-mobile-mini');return}
      const top=Number(viewer.dataset.mobileMiniOriginTop||viewer.offsetTop||0);
      if(!viewer.dataset.mobileMiniOriginTop)viewer.dataset.mobileMiniOriginTop=String(top);
      const active=window.scrollY>top+Math.min(260,viewer.offsetHeight*.7);
      viewer.classList.toggle('is-mobile-mini',active);
    };
    window.addEventListener('scroll',sync,{passive:true});
    window.addEventListener('resize',()=>{viewer.dataset.mobileMiniOriginTop='';sync()},{passive:true});
    sync();
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
    if (item) {
      const personalDetail={
      id:itemKey(item),
      type:kind==='youtube'?'youtube':String(item.kind||kind||'vod'),
      title:String(item.title||''),
      meta:[platformLabel,item.date||item.meta||''].filter(Boolean).join(' · '),
      href:(kind==='youtube'?'youtube.html':kind==='clip'?'clips.html':'vod.html')+'?'+(item.kind?'kind='+encodeURIComponent(item.kind)+'&':'')+'open='+encodeURIComponent(itemKey(item)),
      sourceHref:item.link||'',thumb:item.thumb||''
      };
      window.__CHUNBONG_CURRENT_MEDIA__=personalDetail;
      document.dispatchEvent(new CustomEvent('chunbong:media-selected',{detail:personalDetail}));
    }
    miniState.kind=kind;miniState.dismissed=false;setupMobileMiniPlayer(kind);
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
    const selectedIndex = Math.max(0, items.findIndex(item => itemKey(item) === String(selectedId || '')));
    list.innerHTML = items.map((item, index) => `
      <button class="video-list-card${index === selectedIndex ? ' selected' : ''}" type="button" data-video-index="${index}">
        <span class="video-thumb">
          ${item.thumb ? `<img src="${esc(item.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="thumb-placeholder">▶</span>'}
          <i>▶</i>
        </span>
        <span class="video-copy"><small>${esc((item.kind || '').toUpperCase() || item.date || (kind === 'vod' ? 'REPLAY' : 'HOT CLIP'))}${item.date ? ` · ${esc(item.date)}` : ''}</small><strong>${esc(item.title)}</strong></span>
      </button>`).join('');
    if (items[selectedIndex]) setVideoPlayer(kind, items[selectedIndex]);
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
