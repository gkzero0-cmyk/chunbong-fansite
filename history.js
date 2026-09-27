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

  function curatedRecords() { return Array.isArray(window.CHUNBONG_HISTORY_RECORDS) ? window.CHUNBONG_HISTORY_RECORDS : []; }
  function displayDate(record) {
    const fmt = value => { const [y,m,d] = String(value).split('-'); return `${y}. ${Number(m)}. ${Number(d)}`; };
    if (!record.end || record.end === record.start) return fmt(record.start);
    const [sy] = record.start.split('-'); const [ey,em,ed] = record.end.split('-');
    return sy === ey ? `${fmt(record.start)} ~ ${Number(em)}. ${Number(ed)}` : `${fmt(record.start)} ~ ${fmt(record.end)}`;
  }
  function renderSimple() {
    const rows = curatedRecords();
    const years = [...new Set(rows.map(row => row.start.slice(0,4)))].sort((a,b)=>b-a);
    root.innerHTML = `<section class="history-simple" aria-label="간단 방송 이력">
      <div class="history-year-filters"><button type="button" class="is-active" data-history-year="all">전체</button>${years.map(y=>`<button type="button" data-history-year="${y}">${y}</button>`).join('')}</div>
      <div class="history-simple-head" aria-hidden="true"><span>년도</span><span>날짜 / 기간</span><span>내용</span></div>
      <div class="history-simple-list">${rows.map((row,i)=>{const year=row.start.slice(0,4);const prev=i?rows[i-1].start.slice(0,4):'';return `<article class="history-simple-row" data-history-row data-year="${year}"><strong class="history-simple-year">${year!==prev?year:''}</strong><time class="history-simple-date">${esc(displayDate(row))}</time><p class="history-simple-content">${esc(row.label)}</p></article>`}).join('')}</div>
      <footer class="history-simple-foot"><span>SOOP 공식 기록 중심 · 공개 자료 교차 검증</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 보기 →</button></footer></section>`;
    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    root.querySelectorAll('[data-history-year]').forEach(button=>button.addEventListener('click',()=>{const y=button.dataset.historyYear;root.querySelectorAll('[data-history-year]').forEach(n=>n.classList.toggle('is-active',n===button));root.querySelectorAll('[data-history-row]').forEach(row=>row.hidden=y!=='all'&&row.dataset.year!==y);}));
  }

  function renderDetail() {
    const rows = curatedRecords();
    const groups = rows.reduce((acc,row)=>{const y=row.start.slice(0,4);(acc[y] ||= []).push(row);return acc;},{});
    root.innerHTML = `<section class="history-curated-detail">${Object.keys(groups).sort((a,b)=>b-a).map(year=>`<section class="history-year-block"><header><span>${year}</span><h2>${year}년 방송 이력</h2><small>${groups[year].length}개 기록</small></header><div class="history-timeline">${groups[year].map(row=>`<article class="history-timeline-item ${row.featured?'is-featured':''}"><div class="history-timeline-date">${esc(displayDate(row))}</div><div class="history-timeline-card"><div class="history-timeline-meta"><span>${esc(row.kind||'방송')}</span>${row.featured?'<b>주요 이력</b>':''}</div><h3>${esc(row.label)}</h3>${row.detail?`<p>${esc(row.detail)}</p>`:''}</div></article>`).join('')}</div></section>`).join('')}<footer class="history-curated-source"><strong>기록 기준</strong><p>SOOP 공식 방송 이력을 중심으로 공개 자료를 교차 확인해 정리했습니다. 원문은 참고·검증용으로 유지합니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a></footer></section>`;
  }

  function renderItem(item = {}) {
    if (!root) return;
    currentItem = item;
    if (currentView === 'detail') renderDetail(); else renderSimple();
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
  window.__CHUNBONG_HISTORY_HELPERS__ = { renderItem, renderSimple, renderDetail, formatDate, setView };
  updateViewUI();
  loadHistory();
  timer = setInterval(() => { if (!document.hidden) loadHistory(true); }, REFRESH_MS);
})();