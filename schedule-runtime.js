(() => {
  const official = document.querySelector('#schedule-official');
  const grid = document.querySelector('#schedule-grid');
  if (!official || !grid) return;

  const officialUrl = 'https://www.sooplive.com/station/chunbongtv/post/203015477';
  let rendering = false;

  function renderSnapshot() {
    if (rendering) return;
    const cards = [...grid.querySelectorAll('.schedule-card')];
    if (!cards.length) return;
    rendering = true;
    const cardHtml = cards.slice(0, 8).map(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('visible');
      return clone.outerHTML;
    }).join('');
    official.innerHTML = `
      <div class="schedule-official-meta">
        <span class="badge">OFFICIAL</span>
        <strong>📅 방송 일정표</strong>
        <small>팬사이트 일정 · KST 기준</small>
      </div>
      <div class="schedule-grid schedule-official-runtime" data-official-snapshot="true">${cardHtml}</div>
      <div class="source-note">SOOP 공식 일정 글의 외부 콘텐츠가 만료되거나 표시되지 않을 때도 팬사이트 일정표를 직접 확인할 수 있습니다. 당일 변경사항은 SOOP 원문을 우선 확인해 주세요.</div>
      <a class="inline-link" href="${officialUrl}" target="_blank" rel="noreferrer">SOOP 일정 원문 보기 ↗</a>`;
    rendering = false;
  }

  const gridObserver = new MutationObserver(renderSnapshot);
  gridObserver.observe(grid, { childList: true, subtree: true });
  const officialObserver = new MutationObserver(() => {
    if (!official.querySelector('[data-official-snapshot="true"]')) renderSnapshot();
  });
  officialObserver.observe(official, { childList: true, subtree: true });

  queueMicrotask(renderSnapshot);
  setTimeout(renderSnapshot, 300);
  setTimeout(renderSnapshot, 1200);
})();
