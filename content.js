window.CHUNBONG_CONTENT = {
  sources: {
    station: 'https://www.sooplive.com/station/chunbongtv',
    vod: 'https://www.sooplive.com/station/chunbongtv/vod',
    notice: 'https://www.sooplive.com/station/chunbongtv/board/126448625',
    catch: 'https://www.sooplive.com/station/chunbongtv/catch',
    clip: 'https://www.sooplive.com/station/chunbongtv/vod/clip',
    fanart: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I',
    youtube: 'https://www.youtube.com/@%EC%B6%98%EB%B4%89TV',
    cafe: 'https://cafe.naver.com/chunbongtv',
    notion: 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99',
    saza: 'https://saza-company.vercel.app/',
    history: 'https://www.sooplive.com/station/chunbongtv/post/202862381'
  },
  schedulePostId: '203015477',
  notionScheduleUpdatedAt: '2026-08-26T20:28:56Z',
  notionSchedule: [
    { title: '챈나님 경찰과 도둑', tags: ['마크'], start: '2026-08-24T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c259c07cee480dd9c42e7b2ee1825dd' },
    { title: '세구님 스까묵자 배그', tags: ['배그'], start: '2026-08-25T11:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c459c07cee480d4aa17cd306d01dc9b' },
    { title: '타로상담소 w. 김규민', tags: ['타로'], start: '2026-08-27T11:20:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c059c07cee480729794f235597d9d1d' },
    { title: '조까치 수련회2', tags: ['마크'], start: '2026-08-28', end: '2026-08-29', isDateTime: false, link: 'https://app.notion.com/p/3bb59c07cee480c69681cc1b39523e65' },
    { title: '왁굳님 아르마3', tags: ['콘텐츠'], start: '2026-08-29T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c459c07cee480ff9cbfd45c7c76dd71' },
    { title: '세구님 세바버', tags: ['콘텐츠'], start: '2026-08-30T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c859c07cee480bd8c31eb139e179e6d' },
    { title: '성하늘님 랜버워치', tags: ['콘텐츠'], start: '2026-08-31T10:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c859c07cee480da9f91f702a1e609b4' }
  ],
  schedule: [
    { badge: 'LIVE', title: '오늘의 방송', time: '방송국 공지 기준', desc: '당일 방송 여부와 시작 시간은 춘봉 SOOP 방송국 공지를 기준으로 확인합니다.', link: 'https://www.sooplive.com/station/chunbongtv', action: 'SOOP 방송국' },
    { badge: 'PLAN', title: '주간 일정', time: 'Notion 일정표', desc: '예정된 콘텐츠와 방송 스케줄을 팬사이트에서 확인하고 원본 일정표로도 이동할 수 있습니다.', link: 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99', action: 'Notion 원본' },
    { badge: 'NOTICE', title: '일정 변경', time: 'SOOP 공지 게시판', desc: '휴방, 시간 변경, 특별 방송 등 변동 사항은 공지 페이지와 공식 게시판에서 확인하세요.', link: 'notice.html', action: '팬사이트 공지' }
  ],
  fallback: {
    notices: [
      { category: 'NOTICE', title: '춘봉 공지사항', date: 'SOOP', content: '현재 SOOP 공지 목록을 불러오지 못했습니다. 아래 원문 보기 버튼을 눌러 공식 게시판에서 확인해 주세요.', link: 'https://www.sooplive.com/station/chunbongtv/board/126448625' }
    ],
    vod: [
      { title: '춘봉 다시보기', meta: 'SOOP 다시보기 게시판', link: 'https://www.sooplive.com/station/chunbongtv/vod', embed: '' }
    ],
    clips: [
      { title: '춘봉 Catch', meta: 'SOOP Catch', link: 'https://www.sooplive.com/station/chunbongtv/catch', embed: '' },
      { title: '춘봉 클립', meta: 'SOOP 클립', link: 'https://www.sooplive.com/station/chunbongtv/vod/clip', embed: '' }
    ],
    fanart: [
      { title: '춘봉 팬아트 게시판', author: 'NAVER CAFE', symbol: '✦', link: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I' },
      { title: '팬아트 더 보러가기', author: 'CHUNBONG FAN ART', symbol: '♌', link: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I' }
    ]
  }
};

(() => {
  const nav = document.getElementById('main-nav');
  if (!nav || nav.querySelector('[data-nav="history"]')) return;
  const link = document.createElement('a');
  link.dataset.nav = 'history';
  link.href = 'history.html';
  link.textContent = '방송 이력';
  const dataLink = nav.querySelector('[data-nav="data"]');
  nav.insertBefore(link, dataLink || null);
})();

(() => {
  const nav = document.getElementById('main-nav');
  const link = nav?.querySelector('[data-nav="minigames"]');
  if (!nav || !link || link.closest('.nav-minigames')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-minigames';
  link.parentNode.insertBefore(wrapper, link);
  wrapper.appendChild(link);
  link.setAttribute('aria-haspopup', 'true');
  link.setAttribute('aria-expanded', 'false');

  const submenu = document.createElement('div');
  submenu.className = 'nav-minigames-submenu';
  submenu.setAttribute('role', 'menu');
  submenu.setAttribute('aria-label', '미니게임 바로가기');
  submenu.innerHTML =
    '<a role="menuitem" href="chuntris.html"><span>춘트리스</span><small>TETRIS</small></a>' +
    '<a role="menuitem" href="chunbak.html"><span>춘박게임</span><small>MERGE</small></a>' +
    '<a role="menuitem" href="chungwagame.html"><span>춘과게임</span><small>SUM 10</small></a>' +
    '<a role="menuitem" href="chuncortile.html"><span>춘컬타일</span><small>COLOR</small></a>';
  wrapper.appendChild(submenu);

  const setExpanded = value => link.setAttribute('aria-expanded', String(value));
  wrapper.addEventListener('mouseenter', () => setExpanded(true));
  wrapper.addEventListener('mouseleave', () => setExpanded(false));
  wrapper.addEventListener('focusin', () => setExpanded(true));
  wrapper.addEventListener('focusout', event => {
    if (!wrapper.contains(event.relatedTarget)) setExpanded(false);
  });
})();

(() => {
  const STORAGE_KEY = 'chunbong-theme';
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  if (!document.querySelector('link[data-theme-styles]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'theme.css';
    stylesheet.dataset.themeStyles = 'true';
    document.head.appendChild(stylesheet);
  }

  let saved = 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') saved = stored;
  } catch (_) {}

  const applyTheme = (theme) => {
    const next = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = next;
    const button = document.querySelector('.theme-toggle');
    if (button) {
      const light = next === 'light';
      button.setAttribute('aria-pressed', String(light));
      button.setAttribute('aria-label', light ? '다크 모드로 전환' : '라이트 모드로 전환');
      button.title = light ? '다크 모드로 전환' : '라이트 모드로 전환';
      const icon = button.querySelector('.theme-toggle-icon');
      const label = button.querySelector('.theme-toggle-label');
      if (icon) icon.textContent = light ? '🌙' : '☀';
      if (label) label.textContent = light ? '다크' : '라이트';
    }
  };

  applyTheme(saved);
  if (!header || header.querySelector('.theme-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    applyTheme(next);
  });
  const live = header.querySelector('.header-live');
  header.insertBefore(button, live || null);
  applyTheme(saved);
})();

(() => {
  if (document.body.dataset.page !== 'fanart' || document.querySelector('script[data-fanart-gallery-runtime]')) return;
  const script = document.createElement('script');
  script.src = 'fanart-gallery.js';
  script.dataset.fanartGalleryRuntime = 'true';
  document.body.appendChild(script);
})();


(() => {
  const header = document.querySelector('.site-header');
  if (!header || header.querySelector('.changelog-button')) return;
  const themeToggle = header.querySelector('.theme-toggle');
  const navToggle = header.querySelector('.nav-toggle');
  const link = document.createElement('a');
  link.className = 'changelog-button';
  link.href = 'changelog.html';
  link.setAttribute('aria-label', '업데이트 일지');
  link.title = '업데이트 일지';
  if (document.body.dataset.page === 'changelog') link.setAttribute('aria-current', 'page');
  link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"></path><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4L10.7 6A8 8 0 0 0 9 7L6.6 6.1l-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4L9 17a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.4.9 2-3.4-2-1.5Z"></path></svg><span>업데이트 일지</span><i class="changelog-unread-dot" hidden aria-hidden="true"></i>';
  if (themeToggle) themeToggle.insertAdjacentElement('afterend', link);
  else header.insertBefore(link, navToggle || null);

  const CHANGELOG_SEEN_KEY = 'chunbong-changelog-seen-v2';
  const unreadDot = link.querySelector('.changelog-unread-dot');
  const setUnread = unread => {
    if (unreadDot) unreadDot.hidden = !unread;
    link.classList.toggle('has-unread', Boolean(unread));
    link.setAttribute('aria-label', unread ? '업데이트 일지 · 새 업데이트 있음' : '업데이트 일지');
    link.title = unread ? '업데이트 일지 · 새 업데이트 있음' : '업데이트 일지';
  };
  const markSeen = key => {
    if (!key) return;
    try { localStorage.setItem(CHANGELOG_SEEN_KEY, String(key)); } catch (_) {}
    setUnread(false);
  };

  document.addEventListener('chunbong:changelog-ready', event => {
    markSeen(event.detail?.latestKey || '');
  });

  (async () => {
    try {
      const response = await fetch('/api/content?type=changelog-history&summary=1', { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      const latestKey = payload.latest?.sha || payload.latest?.shortSha || '';
      if (!latestKey) return setUnread(false);
      if (document.body.dataset.page === 'changelog') return markSeen(latestKey);
      let seen = '';
      try { seen = localStorage.getItem(CHANGELOG_SEEN_KEY) || ''; } catch (_) {}
      setUnread(seen !== latestKey);
    } catch (_) {
      setUnread(false);
    }
  })();
})();


(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  header.querySelectorAll('.header-live[href*="sooplive.com"]').forEach(node => node.remove());

  if (!document.querySelector('link[data-activity-center-styles]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'activity-center.css';
    stylesheet.dataset.activityCenterStyles = 'true';
    document.head.appendChild(stylesheet);
  }

  if (!document.querySelector('script[data-activity-center-runtime]')) {
    const script = document.createElement('script');
    script.src = 'activity-center.js';
    script.defer = true;
    script.dataset.activityCenterRuntime = 'true';
    document.body.appendChild(script);
  }
})();
