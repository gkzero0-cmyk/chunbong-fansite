(() => {
  'use strict';

  const SOURCE_ID = '202862381';
  const SOURCE_URL = `https://www.sooplive.com/station/chunbongtv/post/${SOURCE_ID}`;
  const API = `/api/content?type=notice-detail&id=${SOURCE_ID}`;
  const REFRESH_MS = 5 * 60 * 1000;
  const root = document.getElementById('history-content');
  const status = document.getElementById('history-sync-status');
  let timer = null;
  let loading = false;

  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function formatDate(value = '') {
    const text = String(value || '').trim();
    if (!text) return 'SOOP 공식 기록';
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return text;
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric'
    }).format(parsed);
  }

  function syncText() {
    const now = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date());
    return `SOOP 원본과 동기화 · ${now} KST · 5분마다 자동 갱신`;
  }

  function renderItem(item = {}) {
    if (!root) return;
    const body = item.html
      ? `<div class="history-source-body">${item.html}</div>`
      : item.content
        ? `<div class="history-source-body"><p>${esc(item.content).replaceAll('\n', '<br>')}</p></div>`
        : '';

    if (!body) {
      renderError('SOOP 게시글의 방송 이력 내용을 가져오지 못했습니다.');
      return;
    }

    root.innerHTML = `
      <article class="history-document">
        <header class="history-document-head">
          <div>
            <span class="history-document-label">SOOP OFFICIAL POST</span>
            <h2>${esc(item.title || '춘봉 방송 이력')}</h2>
            <p>${esc(formatDate(item.date))}</p>
          </div>
          <a class="btn btn-ghost history-source-button" href="${esc(item.link || SOURCE_URL)}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a>
        </header>
        ${body}
        <footer class="history-document-foot">
          <span>원본 게시글 #${SOURCE_ID}</span>
          <a class="inline-link" href="${SOURCE_URL}" target="_blank" rel="noreferrer">원본에서 보기 ↗</a>
        </footer>
      </article>`;
    if (status) status.textContent = syncText();
  }

  function renderError(message = '') {
    if (!root) return;
    root.innerHTML = `
      <div class="history-error">
        <span class="history-error-mark">!</span>
        <div><strong>방송 이력을 불러오지 못했습니다.</strong><p>${esc(message || 'SOOP 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p></div>
        <div class="history-error-actions"><button class="btn btn-primary" type="button" data-history-retry>다시 시도</button><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a></div>
      </div>`;
    root.querySelector('[data-history-retry]')?.addEventListener('click', () => loadHistory(true));
    if (status) status.textContent = 'SOOP 동기화 실패 · 다시 시도해 주세요.';
  }

  async function loadHistory(force = false) {
    if (!root || loading) return;
    loading = true;
    if (force) root.innerHTML = '<div class="history-loading"><span></span><strong>춘봉 방송 이력을 다시 불러오는 중...</strong><p>SOOP 원본 게시글과 동기화하고 있습니다.</p></div>';
    try {
      const response = await fetch(`${API}${force ? `&_ts=${Date.now()}` : ''}`, {
        headers: { accept: 'application/json' },
        cache: force ? 'no-store' : 'default'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.item) throw new Error(payload?.reason || '방송 이력 데이터가 없습니다.');
      renderItem(payload.item);
    } catch (error) {
      renderError(error?.message || 'network error');
    } finally {
      loading = false;
    }
  }

  function startRefresh() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!document.hidden) loadHistory(true);
    }, REFRESH_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadHistory(true);
  });

  window.__CHUNBONG_HISTORY_HELPERS__ = { renderItem, formatDate };
  loadHistory();
  startRefresh();
})();
