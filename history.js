(() => {
  'use strict';

  const SOURCE_ID = '202862381';
  const SOURCE_URL = `https://www.sooplive.com/station/chunbongtv/post/${SOURCE_ID}`;
  const API = '/api/content?type=notice-detail&id=202862381';
  const REFRESH_MS = 5 * 60 * 1000;
  const root = document.getElementById('history-content');
  const status = document.getElementById('history-sync-status');
  const guide = document.querySelector('[data-history-guide]');
  const viewButtons = [...document.querySelectorAll('[data-history-view]')];
  const viewTitle = document.querySelector('[data-history-view-title]');
  const viewDesc = document.querySelector('[data-history-view-desc]');
  let timer = null;
  let loading = false;
  let currentItem = null;
  let currentView = localStorage.getItem('chunbong-history-view') === 'detail' ? 'detail' : 'simple';

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

  function cleanText(value = '') {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalizeYear(value = '', fallback = '') {
    const match = String(value).match(/(?:19|20)\d{2}/);
    return match ? match[0] : fallback;
  }

  function looksLikeDate(value = '') {
    const text = cleanText(value);
    return /(?:19|20)\d{2}[.\-/년\s]|\d{1,2}\s*[.\-/월]\s*\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일|~|～|현재|방송\s*시작|첫\s*방송/i.test(text);
  }

  function rowsFromTable(container) {
    const rows = [];
    container.querySelectorAll('table tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('th,td')].map(cell => cleanText(cell.textContent));
      if (cells.length < 2 || !cells.some(Boolean)) return;
      const joined = cells.join(' ');
      if (/^(년도|연도)\s*(날짜|기간)/.test(joined.replace(/\s+/g, ' '))) return;
      if (cells.length >= 3) rows.push({ year: normalizeYear(cells[0]), date: cells[1], content: cells.slice(2).join(' · ') });
      else rows.push({ year: normalizeYear(cells[0]), date: looksLikeDate(cells[0]) ? cells[0] : '', content: cells[1] });
    });
    return rows.filter(row => row.content);
  }

  function rowsFromLines(container) {
    const raw = cleanText(container.innerText || container.textContent || '');
    const lines = raw.split(/\n+/).map(cleanText).filter(Boolean);
    const rows = [];
    let year = '';
    for (const line of lines) {
      const yearOnly = line.match(/^((?:19|20)\d{2})\s*(?:년)?$/);
      if (yearOnly) { year = yearOnly[1]; continue; }
      const prefixed = line.match(/^((?:19|20)\d{2})(?:년)?\s*[.\-/]?\s*(.+)$/);
      if (prefixed && looksLikeDate(prefixed[2])) {
        year = prefixed[1];
        const rest = prefixed[2];
        const split = rest.match(/^(.{1,34}?(?:현재|까지|[일월]|\d)(?:\s*[~～-]\s*.{1,20})?)\s{1,}|^([^:：]{1,34})[:：]\s*(.+)$/);
        if (split && split[3]) rows.push({ year, date: cleanText(split[2]), content: cleanText(split[3]) });
        else rows.push({ year, date: '', content: rest });
        continue;
      }
      const dated = line.match(/^((?:\d{1,2}[.\-/]\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*월|[^:：]{1,24}(?:~|～|-)[^:：]{1,24}|현재)[^:：]{0,16})[:：\s]+(.+)$/);
      if (dated) rows.push({ year, date: cleanText(dated[1]), content: cleanText(dated[2]) });
      else if (rows.length && line.length < 180) rows[rows.length - 1].content += ` ${line}`;
    }
    return rows.filter(row => row.content);
  }

  function extractSimpleRows(item = {}) {
    const container = document.createElement('div');
    if (item.html) container.innerHTML = item.html;
    else container.textContent = item.content || '';
    let rows = rowsFromTable(container);
    if (rows.length < 3) rows = rowsFromLines(container);
    let lastYear = '';
    return rows.map(row => {
      const detected = normalizeYear(row.year || row.date || row.content, lastYear);
      if (detected) lastYear = detected;
      return { ...row, year: detected || lastYear || '기타' };
    }).filter(row => row.content && !/^(춘봉\s*)?방송\s*이력$/i.test(row.content));
  }

  function renderSimple(item = {}) {
    const rows = extractSimpleRows(item);
    if (!rows.length) {
      root.innerHTML = `<div class="history-simple-empty"><strong>간단 보기를 구성하는 중입니다.</strong><p>원문 형식을 자동 분석하지 못해 상세 보기에서 공식 기록을 확인할 수 있습니다.</p><button class="btn btn-primary" type="button" data-open-detail>상세 보기</button></div>`;
      root.querySelector('[data-open-detail]')?.addEventListener('click', () => setView('detail'));
      return;
    }
    const years = [...new Set(rows.map(row => row.year).filter(Boolean))];
    const filters = years.length > 1 ? `<div class="history-year-filters"><button type="button" class="is-active" data-history-year="all">전체</button>${years.map(year => `<button type="button" data-history-year="${esc(year)}">${esc(year)}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <section class="history-simple" aria-label="간단 방송 이력">
        ${filters}
        <div class="history-simple-head" aria-hidden="true"><span>년도</span><span>날짜 / 기간</span><span>내용</span></div>
        <div class="history-simple-list">
          ${rows.map((row, index) => `<article class="history-simple-row" data-history-row data-year="${esc(row.year)}">
            <strong class="history-simple-year">${index === 0 || rows[index - 1].year !== row.year ? esc(row.year) : '<span class="sr-only">' + esc(row.year) + '</span>'}</strong>
            <time class="history-simple-date">${esc(row.date || '—')}</time>
            <p class="history-simple-content">${esc(row.content)}</p>
          </article>`).join('')}
        </div>
        <footer class="history-simple-foot"><span>SOOP 공식 방송 이력 기반 · 원본 변경 시 자동 갱신</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 보기 →</button></footer>
      </section>`;
    root.querySelectorAll('[data-open-detail]').forEach(button => button.addEventListener('click', () => setView('detail')));
    root.querySelectorAll('[data-history-year]').forEach(button => button.addEventListener('click', () => {
      const selected = button.dataset.historyYear;
      root.querySelectorAll('[data-history-year]').forEach(node => node.classList.toggle('is-active', node === button));
      root.querySelectorAll('[data-history-row]').forEach(row => { row.hidden = selected !== 'all' && row.dataset.year !== selected; });
    }));
  }

  function renderDetail(item = {}) {
    const body = item.html
      ? `<div class="history-source-body">${item.html}</div>`
      : item.content
        ? `<div class="history-source-body"><p>${esc(item.content).replaceAll('\n', '<br>')}</p></div>`
        : '';
    if (!body) { renderError('SOOP 게시글의 방송 이력 내용을 가져오지 못했습니다.'); return; }
    root.innerHTML = `
      <article class="history-document">
        <header class="history-document-head"><div><span class="history-document-label">SOOP OFFICIAL POST</span><h2>${esc(item.title || '춘봉 방송 이력')}</h2><p>${esc(formatDate(item.date))}</p></div><a class="btn btn-ghost history-source-button" href="${esc(item.link || SOURCE_URL)}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a></header>
        ${body}
        <footer class="history-document-foot"><span>원본 게시글 #${SOURCE_ID}</span><a class="inline-link" href="${SOURCE_URL}" target="_blank" rel="noreferrer">원본에서 보기 ↗</a></footer>
      </article>`;
  }

  function renderItem(item = {}) {
    if (!root) return;
    currentItem = item;
    if (currentView === 'detail') renderDetail(item); else renderSimple(item);
    if (status) status.textContent = syncText();
    updateViewUI();
  }

  function updateViewUI() {
    viewButtons.forEach(button => {
      const active = button.dataset.historyView === currentView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (viewTitle) viewTitle.textContent = currentView === 'simple' ? '한눈에 보는 방송 이력' : '기록을 자세히 보기';
    if (viewDesc) viewDesc.textContent = currentView === 'simple' ? '년도 · 날짜(기간) · 내용만 간결하게 확인합니다.' : 'SOOP 공식 게시글의 상세 내용과 이미지까지 확인합니다.';
    document.body.dataset.historyView = currentView;
    if (guide) guide.hidden = currentView === 'simple';
  }

  function setView(view) {
    currentView = view === 'detail' ? 'detail' : 'simple';
    localStorage.setItem('chunbong-history-view', currentView);
    if (currentItem) renderItem(currentItem); else updateViewUI();
  }

  function renderError(message = '') {
    if (!root) return;
    root.innerHTML = `<div class="history-error"><span class="history-error-mark">!</span><div><strong>방송 이력을 불러오지 못했습니다.</strong><p>${esc(message || 'SOOP 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p></div><div class="history-error-actions"><button class="btn btn-primary" type="button" data-history-retry>다시 시도</button><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a></div></div>`;
    root.querySelector('[data-history-retry]')?.addEventListener('click', () => loadHistory(true));
    if (status) status.textContent = 'SOOP 동기화 실패 · 다시 시도해 주세요.';
  }

  async function loadHistory(force = false) {
    if (!root || loading) return;
    loading = true;
    if (force) root.innerHTML = '<div class="history-loading"><span></span><strong>춘봉 방송 이력을 다시 불러오는 중...</strong><p>SOOP 원본 게시글과 동기화하고 있습니다.</p></div>';
    try {
      const response = await fetch(`${API}${force ? `&_ts=${Date.now()}` : ''}`, { headers: { accept: 'application/json' }, cache: force ? 'no-store' : 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.item) throw new Error(payload?.reason || '방송 이력 데이터가 없습니다.');
      renderItem(payload.item);
    } catch (error) { renderError(error?.message || 'network error'); }
    finally { loading = false; }
  }

  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.historyView)));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadHistory(true); });
  window.__CHUNBONG_HISTORY_HELPERS__ = { renderItem, renderSimple, renderDetail, extractSimpleRows, formatDate, setView };
  updateViewUI();
  loadHistory();
  timer = setInterval(() => { if (!document.hidden) loadHistory(true); }, REFRESH_MS);
})();