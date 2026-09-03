(() => {
  const API = '/api/content?type=data';
  const REFRESH_MS = 300000;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const formatNumber = value => Number.isFinite(value) ? new Intl.NumberFormat('ko-KR').format(value) : '수집 중';
  const formatMinutes = value => {
    if (!Number.isFinite(value)) return '집계 중';
    const total = Math.round(value);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return hours ? `${hours}시간 ${minutes ? `${minutes}분` : ''}`.trim() : `${minutes}분`;
  };
  const formatUpdated = value => {
    if (!value) return '업데이트 시간 확인 중';
    try { return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) + ' KST 업데이트'; }
    catch (_) { return '업데이트 시간 확인 중'; }
  };
  const viewText = item => Number.isFinite(item?.viewCount) ? `조회수 ${formatNumber(item.viewCount)}` : (item?.meta || '조회수 확인 중');

  function renderSummary(payload) {
    const live = payload?.soop?.live || {};
    const soop = payload?.soop?.monthly || {};
    const channel = payload?.youtube?.channel || {};
    const youtube = payload?.youtube?.monthly || {};
    const liveLabel = live.live === true ? 'LIVE' : live.live === false ? 'OFFLINE' : '확인 중';
    const liveDesc = live.live === true ? (live.title || '현재 방송 중') : live.live === false ? '현재 오프라인' : 'SOOP 상태 확인 중';
    $('#data-summary-grid').innerHTML = [
      ['SOOP STATUS', liveLabel, liveDesc, live.live === true ? 'live' : ''],
      ['이번 달 다시보기', `${formatNumber(soop.vodCount)}개`, '최근 공개 VOD 기준', ''],
      ['이번 달 방송시간', formatMinutes(soop.vodMinutes), '재생시간 확인 가능한 VOD 합산', ''],
      ['YouTube 업로드', `${formatNumber(youtube.uploadCount)}개`, '이번 달 최근 공개 콘텐츠', 'youtube'],
      ['YouTube 구독자', formatNumber(channel.subscriberCount), channel.subscriberText || '공개 채널 지표', 'youtube'],
      ['YouTube 총 조회수', formatNumber(channel.viewCount), channel.viewText || '공개 채널 지표', 'youtube']
    ].map(([label,value,desc,klass]) => `<article class="data-kpi ${klass}"><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(desc)}</p></article>`).join('');
  }

  function renderPlatforms(payload) {
    const soop = payload?.soop?.monthly || {};
    const channel = payload?.youtube?.channel || {};
    const youtube = payload?.youtube?.monthly || {};
    $('#data-soop-monthly').innerHTML = `<div class="data-platform-head"><div><small>SOOP · ${esc(payload?.capturedAt ? 'CURRENT' : 'DATA')}</small><h3>방송 활동</h3></div><a href="${esc(payload?.sources?.soop || '#')}" target="_blank" rel="noreferrer">SOOP ↗</a></div><div class="data-metric-list"><div class="data-metric"><span>다시보기</span><strong>${formatNumber(soop.vodCount)}개</strong></div><div class="data-metric"><span>확인 방송시간</span><strong>${esc(formatMinutes(soop.vodMinutes))}</strong></div><div class="data-metric"><span>CATCH</span><strong>${formatNumber(soop.catchCount)}개</strong></div><div class="data-metric"><span>클립</span><strong>${formatNumber(soop.clipCount)}개</strong></div></div>`;
    $('#data-youtube-monthly').innerHTML = `<div class="data-platform-head"><div><small>YOUTUBE · PUBLIC</small><h3>춘봉TV</h3></div><a href="${esc(payload?.sources?.youtube || '#')}" target="_blank" rel="noreferrer">YouTube ↗</a></div><div class="data-metric-list"><div class="data-metric"><span>이번 달 업로드</span><strong>${formatNumber(youtube.uploadCount)}개</strong></div><div class="data-metric"><span>구독자</span><strong>${formatNumber(channel.subscriberCount)}</strong></div><div class="data-metric"><span>총 조회수</span><strong>${formatNumber(channel.viewCount)}</strong></div><div class="data-metric"><span>공개 영상</span><strong>${formatNumber(channel.videoCount)}</strong></div></div>`;
  }

  function topPanel(title, items) {
    const list = (items || []).length ? `<ol class="data-top-list">${items.map((item,index) => `<li><span class="data-top-rank">${index + 1}</span><a class="data-top-copy" href="${esc(item.link || '#')}" target="_blank" rel="noreferrer"><strong>${esc(item.title || '제목 없음')}</strong><small>${esc(item.date || item.kind || '')}</small></a><b>${esc(viewText(item))}</b></li>`).join('')}</ol>` : '<div class="data-empty">조회수 데이터를 확인할 수 있는 콘텐츠가 없습니다.</div>';
    return `<section class="data-top-panel"><h3>${esc(title)}</h3>${list}</section>`;
  }

  function renderTop(payload) {
    $('#data-top-content').innerHTML = topPanel('SOOP TOP', payload?.topContent?.soop) + topPanel('YouTube TOP', payload?.topContent?.youtube);
  }

  function renderRecent(payload) {
    const soop = (payload?.soop?.recentVod || []).slice(0, 4).map(item => ({...item, platform:'SOOP'}));
    const youtube = (payload?.youtube?.recentVideos || []).slice(0, 4).map(item => ({...item, platform:'YOUTUBE'}));
    const items = [...soop, ...youtube];
    $('#data-recent-content').innerHTML = items.length ? items.map(item => `<a class="data-recent-card" href="${esc(item.link || '#')}" target="_blank" rel="noreferrer"><small>${esc(item.platform)} · ${esc(item.date || '최근')}</small><strong>${esc(item.title || '제목 없음')}</strong><span>${esc(viewText(item))} ↗</span></a>`).join('') : '<div class="data-empty">최근 콘텐츠를 불러오지 못했습니다.</div>';
  }

  function renderTrend(payload) {
    const rows = (payload?.trends || []).slice(-30);
    const root = $('#data-trend-chart');
    if (rows.length < 2) {
      root.innerHTML = '<div class="data-trend-empty"><strong>데이터 기록을 시작했습니다.</strong><span>매일 한 번씩 공개 지표를 저장해 7일·30일 변화 그래프를 만들어갑니다.</span></div>';
      return;
    }
    const maxSoop = Math.max(1, ...rows.map(item => Number(item?.soop?.monthlyVodCount) || 0));
    const maxYoutube = Math.max(1, ...rows.map(item => Number(item?.youtube?.recentUploadCount) || 0));
    root.innerHTML = `<div class="data-trend-legend"><span><i></i> SOOP 월간 VOD</span><span><i class="youtube-dot"></i> YouTube 월간 업로드</span></div><div class="data-trend-rows">${rows.map(item => {
      const soop = Number(item?.soop?.monthlyVodCount) || 0;
      const youtube = Number(item?.youtube?.recentUploadCount) || 0;
      return `<div class="data-trend-row"><time>${esc(String(item.date || '').slice(5))}</time><div class="data-bar-stack"><div class="data-bar" title="SOOP ${soop}개"><span style="--bar:${Math.max(2,Math.round(soop/maxSoop*100))}%"></span></div><div class="data-bar youtube" title="YouTube ${youtube}개"><span style="--bar:${Math.max(2,Math.round(youtube/maxYoutube*100))}%"></span></div></div></div>`;
    }).join('')}</div>`;
  }

  function renderStatus(payload) {
    const status = $('#data-status');
    const errors = Array.isArray(payload?.errors) ? payload.errors : [];
    status.classList.remove('ready','partial','error');
    status.classList.add(payload?.fallback ? 'error' : errors.length ? 'partial' : 'ready');
    const strong = status.querySelector('strong');
    const updated = $('#data-updated');
    if (strong) strong.textContent = payload?.fallback ? '공개 데이터를 불러오지 못했습니다.' : errors.length ? '일부 지표는 현재 확인할 수 없습니다.' : 'SOOP · YouTube 공개 데이터가 최신 상태입니다.';
    if (updated) updated.textContent = formatUpdated(payload?.capturedAt);
    const old = status.querySelector('.data-error-note');
    if (old) old.remove();
    if (errors.length) {
      const note = document.createElement('div');
      note.className = 'data-error-note';
      note.textContent = errors.map(error => `${error.platform}: ${error.source || 'data'}`).join(' · ');
      status.appendChild(note);
    }
  }

  function render(payload) {
    renderStatus(payload);
    renderSummary(payload);
    renderPlatforms(payload);
    renderTrend(payload);
    renderTop(payload);
    renderRecent(payload);
  }

  async function refresh() {
    const status = $('#data-status');
    try {
      const response = await fetch(API, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      render(payload);
    } catch (error) {
      status.classList.remove('ready','partial');
      status.classList.add('error');
      const strong = status.querySelector('strong');
      if (strong) strong.textContent = '춘봉 데이터를 불러오지 못했습니다.';
      $('#data-updated').textContent = error?.message || '네트워크 오류';
    }
  }

  $('#data-retry')?.addEventListener('click', refresh);
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
})();
