(() => {
  const page = document.body.dataset.page || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  async function json(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function kstToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function statusFor(item, today) {
    const start = String(item.start || '').slice(0, 10);
    const end = String(item.end || item.start || '').slice(0, 10);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function formatWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      const start = fmt.format(new Date(item.start));
      return item.end ? `${start} ~ ${fmt.format(new Date(item.end))} KST` : `${start} KST`;
    }
    const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' });
    const start = fmt.format(new Date(`${String(item.start).slice(0,10)}T00:00:00+09:00`));
    if (!item.end || String(item.end).slice(0,10) === String(item.start).slice(0,10)) return start;
    const end = fmt.format(new Date(`${String(item.end).slice(0,10)}T00:00:00+09:00`));
    return `${start} ~ ${end}`;
  }

  function scheduleCard(item, index, today) {
    const status = statusFor(item, today);
    const labels = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
    return `<article class="schedule-card schedule-${status} reveal visible">
      <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
      <div class="schedule-card-top"><span class="badge">${labels[status]}</span><div class="schedule-tags">${tags}</div></div>
      <h2>${esc(item.title)}</h2>
      <div class="time">${esc(formatWhen(item))}</div>
      <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.'}</p>
      <a class="inline-link" href="${esc(item.link || 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99?pvs=74')}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
    </article>`;
  }

  async function refreshSchedule() {
    if (page !== 'schedule') return;
    const grid = $('#schedule-grid');
    const official = $('#schedule-official');
    if (!grid || !official) return;
    const backup = window.CHUNBONG_CONTENT?.notionSchedule || [];
    let live = [];
    try {
      const payload = await json('/api/content?type=schedule');
      if (Array.isArray(payload.items)) live = payload.items;
    } catch (_) {}
    const source = live.length ? live : backup;
    const today = kstToday();
    const cutoff = new Date(`${today}T00:00:00+09:00`);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(cutoff);
    const visible = [...source]
      .filter(item => String(item.end || item.start || '').slice(0,10) >= cutoffKey)
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
    grid.innerHTML = visible.length ? visible.map((item, index) => scheduleCard(item, index, today)).join('') : '<div class="loading-card">등록된 일정이 없습니다.</div>';
    const updated = $('#schedule-updated');
    if (updated) updated.textContent = live.length ? 'Notion 실시간 일정 · KST 기준' : 'Notion 최신 백업 · KST 기준';

    const active = visible.filter(item => statusFor(item, today) !== 'recent');
    const selected = (active.length ? active : visible.slice(-4)).slice(0, 8);
    const rows = selected.map(item => {
      const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
      return `<div class="schedule-official-snapshot-row"><div class="schedule-official-snapshot-copy"><strong>${esc(item.title)}</strong><span>${esc(formatWhen(item))}</span></div><div class="schedule-tags">${tags}</div></div>`;
    }).join('');
    official.innerHTML = `<div class="schedule-official-meta"><span class="badge">OFFICIAL</span><strong>📅 춘봉 방송 일정표</strong><small>${live.length ? 'Notion 실시간 동기화' : '최신 백업 일정'} · SOOP 변경사항 우선</small></div>
      <div class="schedule-official-snapshot" data-official-snapshot="true">
        <div class="schedule-official-snapshot-head"><strong>현재 방송 일정</strong><span>KST 기준</span></div>
        ${rows || '<p>등록된 일정이 없습니다.</p>'}
      </div>
      <div class="official-strip"><a href="https://www.sooplive.com/station/chunbongtv/post/203015477" target="_blank" rel="noreferrer">SOOP 공식 일정 안내 ↗</a><a href="https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99?pvs=74" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a></div>`;
  }

  let hlsPromise;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsPromise) return hlsPromise;
    hlsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
      script.onload = () => resolve(window.Hls);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return hlsPromise;
  }

  let catchItems = [];
  let catchRequest = 0;
  let hlsInstance = null;
  async function playCatch(item) {
    if (!item?.id) return;
    const request = ++catchRequest;
    const video = $('#clip-video');
    const frame = $('#clip-player');
    const empty = $('#clip-player-empty');
    const title = $('#clip-player-title');
    const meta = $('#clip-player-meta');
    const source = $('#clip-source-link');
    if (!video || !frame || !empty) return;
    frame.hidden = true;
    frame.removeAttribute('src');
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    video.pause();
    video.removeAttribute('src');
    video.hidden = true;
    video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
    empty.hidden = false;
    empty.textContent = 'CATCH 영상을 준비하는 중...';
    if (title) title.textContent = item.title || '춘봉 CATCH';
    if (meta) meta.textContent = ['CATCH', item.date].filter(Boolean).join(' · ');
    if (source) source.href = item.link || `https://www.sooplive.com/station/chunbongtv/catch`;
    try {
      const payload = await json(`/api/content?type=catch-detail&id=${encodeURIComponent(item.id)}`);
      if (request !== catchRequest) return;
      const detail = payload?.item;
      if (!detail?.stream) throw new Error('stream unavailable');
      if (detail.poster || item.thumb) video.poster = `/api/image?url=${encodeURIComponent(detail.poster || item.thumb)}`;
      const stream = detail.stream;
      if (/\.m3u8(?:$|\?)/i.test(stream)) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = stream;
        } else {
          const Hls = await loadHls();
          if (request !== catchRequest) return;
          if (!Hls?.isSupported?.()) throw new Error('HLS unsupported');
          hlsInstance = new Hls({ enableWorker: true });
          hlsInstance.loadSource(stream);
          hlsInstance.attachMedia(video);
        }
      } else {
        video.src = stream;
      }
      video.hidden = false;
      empty.hidden = true;
      video.onerror = () => {
        video.hidden = true;
        empty.hidden = false;
        empty.innerHTML = `브라우저 직접 재생이 차단되었습니다.<br><a class="inline-link" href="${esc(item.link || detail.link || '')}" target="_blank" rel="noreferrer">SOOP에서 재생 ↗</a>`;
      };
    } catch (_) {
      if (request !== catchRequest) return;
      empty.hidden = false;
      empty.innerHTML = `재생 파일을 가져오지 못했습니다.<br><a class="inline-link" href="${esc(item.link || '')}" target="_blank" rel="noreferrer">SOOP에서 재생 ↗</a>`;
    }
  }

  async function enhanceCatch() {
    if (page !== 'clips') return;
    try {
      const payload = await json('/api/content?type=clips');
      catchItems = Array.isArray(payload.groups?.catch) ? payload.groups.catch : [];
    } catch (_) { catchItems = []; }
    const list = $('#clip-list');
    if (!list) return;
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-video-index]');
      if (!button) return;
      const catchTab = $('.clip-tab[data-clip-kind="catch"]');
      if (!catchTab?.classList.contains('active')) return;
      const item = catchItems[Number(button.dataset.videoIndex)];
      if (item) setTimeout(() => playCatch(item), 0);
    });
    $('.clip-tab[data-clip-kind="catch"]')?.addEventListener('click', () => {
      setTimeout(() => { if (catchItems[0]) playCatch(catchItems[0]); }, 50);
    });
    setTimeout(() => {
      const catchTab = $('.clip-tab[data-clip-kind="catch"]');
      if (catchTab?.classList.contains('active') && catchItems[0]) playCatch(catchItems[0]);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { refreshSchedule(); enhanceCatch(); });
  } else {
    refreshSchedule();
    enhanceCatch();
  }
})();
