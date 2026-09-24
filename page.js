(() => {
  const data = window.CHUNBONG_CONTENT || {};
  const page = document.body.dataset.page || 'home';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const API_ENDPOINTS = {
    vod: '/api/content?type=vod',
    notice: '/api/content?type=notice',
    clips: '/api/content?type=clips',
    fanart: '/api/content?type=fanart',
    youtube: '/api/content?type=youtube',
    schedule: '/api/content?type=schedule'
  };
  const pageParams = new URLSearchParams(window.location.search);
  const requestedOpenId = pageParams.get('open') || '';
  const requestedKind = pageParams.get('kind') || '';
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');


  const proxiedImage = (url = '') => url ? `/api/image?url=${encodeURIComponent(url)}` : '';

  async function loadContent(type, force = false) {
    try {
      const payload = window.ChunbongCache
        ? await window.ChunbongCache.fetchJson('content:'+type, API_ENDPOINTS[type], { ttl: 3 * 60 * 1000, force })
        : await (async()=>{const response=await fetch(API_ENDPOINTS[type],{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})();
      return payload && typeof payload === 'object' ? payload : { items: [], fallback: true, reason: 'invalid response' };
    } catch (error) {
      return { items: [], fallback: true, reason: error?.message || 'network error' };
    }
  }

  async function loadItems(type, fallback = []) {
    const payload = await loadContent(type);
    return Array.isArray(payload.items) && payload.items.length ? payload.items : fallback;
  }


  function sourceFor(type) {
    if (type === 'notice') return data.sources?.notice;
    if (type === 'fanart') return data.sources?.fanart;
    if (type === 'catch') return data.sources?.catch;
    if (type === 'clip') return data.sources?.clip;
    if (type === 'vod') return data.sources?.vod;
    if (type === 'youtube' || type === 'videos' || type === 'shorts') return data.sources?.youtube;
    return '#';
  }

  function errorState(type, message) {
    return `
      <div class="content-error reveal">
        <strong>콘텐츠를 불러오지 못했습니다.</strong>
        <p>${esc(message || '원본 서비스의 응답이 없거나 일시적으로 접근이 제한됐습니다.')}</p>
        <div class="content-error-actions">
          <button class="btn btn-primary retry-content" type="button">다시 시도</button>
          <a class="btn btn-ghost" href="${esc(sourceFor(type))}" target="_blank" rel="noreferrer">원본에서 보기 ↗</a>
        </div>
      </div>`;
  }

  function bindRetry(root, callback) {
    $('.retry-content', root)?.addEventListener('click', callback);
  }

  function setupNavigation() {
    const toggle = $('.nav-toggle');
    const nav = $('#main-nav');
    if (!nav) return;
    $$('[data-nav]', nav).forEach(link => {
      const active = link.dataset.nav === page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      $$('a', nav).forEach(link => link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }));
    }
  }

  function setupReveal() {
    const nodes = [...document.querySelectorAll('.reveal')];
    if (!nodes.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(node => node.classList.add('visible'));
      return;
    }
    const initialCutoff = window.innerHeight * 1.08;
    const pending = [];
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      if (rect.top < initialCutoff && rect.bottom > -80) node.classList.add('visible','reveal-initial');
      else if (!node.classList.contains('visible')) pending.push(node);
    });
    if (!pending.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 8% 0px' });
    pending.forEach(node => observer.observe(node));
  }

  function setupToTop() {
    const button = $('.to-top');
    if (!button) return;
    const update = () => button.classList.toggle('visible', window.scrollY > 500);
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    update();
  }






  function setupPwaExperience() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.webmanifest';
      document.head.appendChild(link);
    }

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let deferredInstallPrompt = null;
    let reloadOnControllerChange = false;
    let statusTimer = null;

    const ensureStatus = () => {
      let node = document.querySelector('[data-pwa-status]');
      if (node) return node;
      node = document.createElement('div');
      node.className = 'pwa-status-toast';
      node.dataset.pwaStatus = '';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.hidden = true;
      document.body.appendChild(node);
      return node;
    };

    const showStatus = (message, sticky = false) => {
      const node = ensureStatus();
      node.textContent = message;
      node.hidden = false;
      node.classList.add('is-visible');
      clearTimeout(statusTimer);
      if (!sticky) {
        statusTimer = setTimeout(() => {
          node.classList.remove('is-visible');
          setTimeout(() => { node.hidden = true; }, 180);
        }, 3200);
      }
    };

    const ensureInstallButton = () => {
      if (document.body.dataset.game || standalone) return null;
      let button = document.querySelector('[data-pwa-install]');
      if (button) return button;
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'pwa-install-chip';
      button.dataset.pwaInstall = '';
      button.innerHTML = '<span aria-hidden="true">＋</span><strong>앱으로 설치</strong>';
      button.hidden = true;
      button.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        const prompt = deferredInstallPrompt;
        deferredInstallPrompt = null;
        button.hidden = true;
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice?.outcome === 'accepted') showStatus('춘봉 팬허브를 앱으로 설치했습니다.');
        } catch {}
      });
      document.body.appendChild(button);
      return button;
    };

    const showUpdate = registration => {
      if (!navigator.serviceWorker.controller || document.querySelector('[data-pwa-update]')) return;
      const toast = document.createElement('div');
      toast.className = 'pwa-update-toast';
      toast.dataset.pwaUpdate = '';
      toast.setAttribute('role', 'status');
      toast.innerHTML = '<div><strong>새 버전 준비 완료</strong><span>최신 팬사이트로 바로 바꿀 수 있어요.</span></div><button type="button">새로고침</button>';
      toast.querySelector('button')?.addEventListener('click', () => {
        reloadOnControllerChange = true;
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
      document.body.appendChild(toast);
    };

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      const button = ensureInstallButton();
      if (button) button.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      const button = document.querySelector('[data-pwa-install]');
      if (button) button.hidden = true;
      showStatus('춘봉 팬허브 설치가 완료됐습니다.');
    });

    window.addEventListener('offline', () => showStatus('오프라인 상태입니다. 저장된 기본 화면은 계속 사용할 수 있어요.', true));
    window.addEventListener('online', () => showStatus('인터넷 연결이 복구됐습니다.'));
    if (!navigator.onLine) showStatus('오프라인 상태입니다. 저장된 기본 화면은 계속 사용할 수 있어요.', true);

    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnControllerChange) window.location.reload();
    });

    const resolveServiceWorkerVersion = async () => {
      const fallback='runtime-v33';
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),1400);
      try {
        const response=await fetch('/api/version',{headers:{accept:'application/json'},cache:'no-store',signal:controller.signal});
        if(!response.ok)return fallback;
        const payload=await response.json();
        const raw=String(payload?.sha||payload?.deployed||payload?.mainSha||'').trim();
        return raw?raw.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,40):fallback;
      } catch (_) {
        return fallback;
      } finally {
        clearTimeout(timer);
      }
    };

    const register = async () => {
      try {
        const version=await resolveServiceWorkerVersion();
        const registration = await navigator.serviceWorker.register('/service-worker.js?v='+encodeURIComponent(version), {
          scope: '/',
          updateViaCache: 'none'
        });
        if (registration.waiting) {
          if (standalone) {
            reloadOnControllerChange = true;
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            showUpdate(registration);
          }
        }
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
          });
        });
      } catch (error) {
        console.warn('[PWA] service worker registration failed', error);
      }
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  function init() {
    setupPwaExperience();
    setupNavigation();
    setupToTop();
    setupReveal();
  }

  window.ChunbongPageCore = {
    data, page, $, $$, esc, proxiedImage,
    loadContent, loadItems, sourceFor, errorState, bindRetry, setupReveal,
    requestedOpenId, requestedKind
  };

  init();
})();
