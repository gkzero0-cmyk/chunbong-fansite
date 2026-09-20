(() => {
  'use strict';
  const memory = new Map();
  const CACHE_PREFIX = 'chunbong-cache-v2:';
  const shouldPersist = key =>
    String(key).startsWith('content:') ||
    String(key).startsWith('notice-detail:') ||
    String(key) === 'changelog-summary';

  const read = key => {
    const cached = memory.get(key);
    if (cached) return cached;
    if (!shouldPersist(key)) return null;
    try {
      const stored = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!stored) return null;
      const row = JSON.parse(stored);
      if (!row || typeof row.at !== 'number' || !('value' in row)) return null;
      memory.set(key, row);
      return row;
    } catch (_) {
      return null;
    }
  };

  const write = (key, value) => {
    const row = { at: Date.now(), value };
    memory.set(key, row);
    if (shouldPersist(key)) {
      try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(row));
      } catch (_) {}
    }
    return value;
  };

  const clear = key => {
    memory.delete(key);
    if (shouldPersist(key)) {
      try { sessionStorage.removeItem(CACHE_PREFIX + key); } catch (_) {}
    }
  };

  window.ChunbongCache = {
    get(key, ttl = 180000) {
      const row = read(key);
      if (!row) return null;
      if (Date.now() - Number(row.at || 0) >= ttl) {
        clear(key);
        return null;
      }
      return row.value;
    },
    set: write,
    clear,
    async fetchJson(key, url, { ttl = 180000, force = false, headers = { accept: 'application/json' } } = {}) {
      if (!force) {
        const cached = this.get(key, ttl);
        if (cached) return cached;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return write(key, await response.json());
    }
  };

  if (!document.querySelector('link[data-personal-hub-styles]')) {
    const personalStyles = document.createElement('link');
    personalStyles.rel = 'stylesheet';
    personalStyles.href = 'personal-hub.css';
    personalStyles.dataset.personalHubStyles = 'true';
    document.head.appendChild(personalStyles);
  }
  if (!document.querySelector('link[data-site-design-system]')) {
    const design = document.createElement('link');
    design.rel = 'stylesheet';
    design.href = 'site-design-system.css';
    design.dataset.siteDesignSystem = 'true';
    document.head.appendChild(design);
  }
  if (!document.querySelector('link[data-site-quality]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'site-quality.css';
    link.dataset.siteQuality = 'true';
    document.head.appendChild(link);
  }
  for (const src of ['site-meta.js', 'site-health.js', 'site-improvements.js', 'personal-hub.js']) {
    if (document.querySelector('script[src="' + src + '"]')) continue;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }
})();

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
  const nav=document.getElementById('main-nav');
  if(!nav||nav.querySelector('.nav-group')) return;
  const NAV_GROUPS=[
    {label:'방송',items:['schedule','notice']},
    {label:'영상',items:['vod','clips','youtube']},
    {label:'팬존',items:['fanart','tarot']},
    {label:'기록',items:['history','data']}
  ];
  const NAV_PAGE_ALIASES={chuntris:'minigames',chunbak:'minigames',chungwagame:'minigames',chuncortile:'minigames'};
  const rawCurrent=document.body.dataset.page||'';
  const current=NAV_PAGE_ALIASES[rawCurrent]||rawCurrent;
  nav.querySelectorAll('[data-nav]').forEach(link=>{
    const active=link.dataset.nav===current;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  NAV_GROUPS.forEach(group=>{
    const links=group.items.map(key=>nav.querySelector('[data-nav="'+key+'"]')).filter(Boolean);
    if(!links.length) return;
    const wrap=document.createElement('div');
    const currentSection=group.items.includes(current);
    wrap.className='nav-group'+(currentSection?' active is-current-section':'');
    const trigger=document.createElement('button');
    trigger.type='button';trigger.className='nav-group-trigger';trigger.textContent=group.label;
    trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');
    const menu=document.createElement('div');
    menu.className='nav-group-submenu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',group.label+' 메뉴');
    const first=links[0];
    first.parentNode.insertBefore(wrap,first);
    wrap.append(trigger,menu);
    links.forEach(link=>{link.setAttribute('role','menuitem');menu.appendChild(link)});
    const setOpen=open=>{wrap.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open))};
    trigger.addEventListener('click',()=>setOpen(!wrap.classList.contains('open')));
    wrap.addEventListener('mouseenter',()=>setOpen(true));
    wrap.addEventListener('mouseleave',()=>setOpen(false));
    wrap.addEventListener('focusin',()=>setOpen(true));
    wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget))setOpen(false)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&wrap.classList.contains('open')){setOpen(false);trigger.focus()}});
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
      if (icon) icon.textContent = light ? '🌙' : '☀';
    }
  };

  applyTheme(saved);
  if (!header || header.querySelector('.theme-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span>';
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

  const CHANGELOG_REFRESH_MS = 60 * 1000;
  let changelogCheckAt = 0;
  let changelogCheckPromise = null;

  const checkChangelogUnread = ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && changelogCheckAt && now - changelogCheckAt < CHANGELOG_REFRESH_MS) {
      return changelogCheckPromise || Promise.resolve();
    }
    if (changelogCheckPromise) return changelogCheckPromise;
    changelogCheckAt = now;
    changelogCheckPromise = (async () => {
      try {
        const payload = window.ChunbongCache
          ? await window.ChunbongCache.fetchJson('changelog-summary','/api/content?type=changelog-history&summary=1',{ttl:CHANGELOG_REFRESH_MS,force})
          : await (async()=>{const response=await fetch('/api/content?type=changelog-history&summary=1',{headers:{accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);return response.json()})();
        const latestKey = payload.latest?.sha || payload.latest?.shortSha || '';
        if (!latestKey) return setUnread(false);
        if (document.body.dataset.page === 'changelog') return markSeen(latestKey);
        let seen = '';
        try { seen = localStorage.getItem(CHANGELOG_SEEN_KEY) || ''; } catch (_) {}
        setUnread(seen !== latestKey);
      } catch (_) {
        setUnread(false);
      } finally {
        changelogCheckPromise = null;
      }
    })();
    return changelogCheckPromise;
  };

  void checkChangelogUnread();
  window.addEventListener('focus', () => { void checkChangelogUnread(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkChangelogUnread();
  });
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

