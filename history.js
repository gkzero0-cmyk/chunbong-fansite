(() => {
  'use strict';

  const SOURCE_URL = 'https://www.sooplive.com/station/chunbongtv/post/202862381';
  const root = document.getElementById('history-content');
  const status = document.getElementById('history-sync-status');
  const guide = document.querySelector('[data-history-guide]');
  const viewButtons = [...document.querySelectorAll('[data-history-view]')];
  const viewTitle = document.querySelector('[data-history-view-title]');
  const viewDesc = document.querySelector('[data-history-view-desc]');
  const meta = window.CHUNBONG_HISTORY_META || {};
  let currentView = localStorage.getItem('chunbong-history-view') === 'detail' ? 'detail' : 'simple';

  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function records() {
    return (Array.isArray(window.CHUNBONG_HISTORY_RECORDS) ? [...window.CHUNBONG_HISTORY_RECORDS] : [])
      .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(String(row?.start || '')))
      .sort((a, b) => {
        const date = String(b.start).localeCompare(String(a.start));
        if (date) return date;
        return String(b.end || '').localeCompare(String(a.end || ''));
      });
  }

  function fmt(value = '') {
    const [y, m, d] = String(value).split('-');
    if (!y || !m || !d) return String(value || '');
    return `${y}. ${Number(m)}. ${Number(d)}`;
  }

  function displayDate(record = {}) {
    if (record.dateLabel) return String(record.dateLabel);
    if (record.status === '진행' && !record.end) return `${fmt(record.start)} ~ 현재`;
    if (!record.end || record.end === record.start) return fmt(record.start);
    const [sy] = record.start.split('-');
    const [ey, em, ed] = record.end.split('-');
    return sy === ey
      ? `${fmt(record.start)} ~ ${Number(em)}. ${Number(ed)}`
      : `${fmt(record.start)} ~ ${fmt(record.end)}`;
  }

  function statusBadge(record = {}) {
    if (record.status === '예정') return '<span class="history-state is-planned">예정</span>';
    if (record.status === '진행') return '<span class="history-state is-live">진행 중</span>';
    return '';
  }

  function verifiedBadge(record = {}) {
    const count = Array.isArray(record.sources) ? record.sources.length : 0;
    return count >= 2 ? '<span class="history-verified">교차 확인</span>' : '';
  }

  function renderSimple() {
    const rows = records();
    const years = [...new Set(rows.map(row => row.start.slice(0, 4)))];
    if (!rows.length) {
      root.innerHTML = '<div class="history-simple-empty"><strong>표시할 방송 이력이 없습니다.</strong><p>검증된 기록을 준비하고 있습니다.</p></div>';
      return;
    }

    root.innerHTML = `
      <section class="history-simple" aria-label="간단 방송 이력">
        <div class="history-simple-note">
          <strong>날짜 표기 기준</strong>
          <span>기간이 교차 확인된 기록만 <b>시작일 ~ 종료일</b>로 표시하고, 그 외에는 참여·발표가 확인된 날짜만 표시합니다.</span>
        </div>
        <div class="history-year-filters" aria-label="연도 필터">
          <button type="button" class="is-active" data-history-year="all">전체</button>
          ${years.map(year => `<button type="button" data-history-year="${year}">${year}</button>`).join('')}
        </div>
        <div class="history-simple-head" aria-hidden="true"><span>년도</span><span>날짜 / 기간</span><span>내용</span></div>
        <div class="history-simple-list">
          ${rows.map((row, index) => {
            const year = row.start.slice(0, 4);
            const prevYear = index ? rows[index - 1].start.slice(0, 4) : '';
            return `<article class="history-simple-row ${row.featured ? 'is-featured' : ''} ${row.status === '예정' ? 'is-planned' : ''}" data-history-row data-year="${year}">
              <strong class="history-simple-year">${year !== prevYear ? year : ''}</strong>
              <time class="history-simple-date" datetime="${esc(row.start)}">${esc(displayDate(row))}</time>
              <p class="history-simple-content"><span>${esc(row.label)}</span>${statusBadge(row)}</p>
            </article>`;
          }).join('')}
        </div>
        <footer class="history-simple-foot">
          <span>마지막 교차 검증 ${esc(String(meta.verifiedAt || '2026-09-28').replaceAll('-', '.'))} · ${rows.length}개 기록</span>
          <button type="button" class="history-detail-link" data-open-detail>상세 기록 보기 →</button>
        </footer>
      </section>`;

    root.querySelector('[data-open-detail]')?.addEventListener('click', () => setView('detail'));
    root.querySelectorAll('[data-history-year]').forEach(button => {
      button.addEventListener('click', () => {
        const selected = button.dataset.historyYear;
        root.querySelectorAll('[data-history-year]').forEach(node => node.classList.toggle('is-active', node === button));
        root.querySelectorAll('[data-history-row]').forEach(row => {
          row.hidden = selected !== 'all' && row.dataset.year !== selected;
        });
      });
    });
  }

  function renderDetail() {
    const rows = records();
    const groups = rows.reduce((acc, row) => {
      const year = row.start.slice(0, 4);
      (acc[year] ||= []).push(row);
      return acc;
    }, {});

    root.innerHTML = `
      <section class="history-curated-detail">
        <div class="history-detail-note">
          <div><strong>검증 원칙</strong><span>SOOP 공식 기록·방송국/방송 제목 우선, 공개 아카이브·나무위키·FM코리아 보조 교차 확인</span></div>
          <div><strong>기간 표기</strong><span>시작·종료가 확인된 경우만 기간으로 표기</span></div>
          <div><strong>마지막 검증</strong><span>${esc(String(meta.verifiedAt || '2026-09-28').replaceAll('-', '.'))}</span></div>
        </div>
        ${Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(year => `
          <section class="history-year-block">
            <header><span>${year}</span><h2>${year}년 방송 이력</h2><small>${groups[year].length}개 기록</small></header>
            <div class="history-timeline">
              ${groups[year].map(row => `
                <article class="history-timeline-item ${row.featured ? 'is-featured' : ''} ${row.status === '예정' ? 'is-planned' : ''}">
                  <div class="history-timeline-date">${esc(displayDate(row))}</div>
                  <div class="history-timeline-card">
                    <div class="history-timeline-meta">
                      <span>${esc(row.kind || '방송')}</span>
                      ${row.featured ? '<b>주요 이력</b>' : ''}
                      ${statusBadge(row)}
                      ${verifiedBadge(row)}
                    </div>
                    <h3>${esc(row.label)}</h3>
                    ${row.detail ? `<p>${esc(row.detail)}</p>` : ''}
                  </div>
                </article>`).join('')}
            </div>
          </section>`).join('')}
        <footer class="history-curated-source">
          <strong>원본과 검증 자료</strong>
          <p>표시 데이터는 원문 HTML을 그대로 복사하지 않고, 서로 일치하는 기록을 구조화해 사용합니다. 출처 간 날짜가 다를 때는 서버 전체 기간과 춘봉 개인 참여일을 구분했습니다.</p>
          <a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a>
        </footer>
      </section>`;
  }

  function updateViewUI() {
    viewButtons.forEach(button => {
      const active = button.dataset.historyView === currentView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (viewTitle) viewTitle.textContent = currentView === 'simple' ? '한눈에 보는 방송 이력' : '연도별 상세 방송 이력';
    if (viewDesc) viewDesc.textContent = currentView === 'simple'
      ? '년도 · 날짜(기간) · 내용만 간결하게 확인합니다.'
      : '역할과 주요 기록, 검증된 기간을 연도별 타임라인으로 확인합니다.';
    document.body.dataset.historyView = currentView;
    if (guide) guide.hidden = currentView === 'simple';
  }

  function render() {
    if (!root) return;
    if (currentView === 'detail') renderDetail();
    else renderSimple();
    updateViewUI();
    if (status) {
      const count = records().length;
      status.textContent = `마지막 검증 ${String(meta.verifiedAt || '2026-09-28').replaceAll('-', '.')} · ${count}개 기록`;
    }
  }

  function setView(view) {
    currentView = view === 'detail' ? 'detail' : 'simple';
    localStorage.setItem('chunbong-history-view', currentView);
    render();
  }

  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.historyView)));
  window.__CHUNBONG_HISTORY_HELPERS__ = { records, displayDate, renderSimple, renderDetail, setView };
  render();
})();