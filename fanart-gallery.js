(() => {
  'use strict';
  if (document.body.dataset.page !== 'fanart') return;

  const grid = document.getElementById('fanart-grid');
  const dialog = document.getElementById('fanart-modal');
  const media = dialog?.querySelector('.fanart-modal-media');
  const image = document.getElementById('fanart-modal-image');
  const sourceLink = document.getElementById('fanart-modal-link');
  if (!grid || !dialog || !media || !image || !sourceLink) return;

  if (!document.querySelector('link[data-fanart-gallery-styles]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'fanart-gallery.css';
    stylesheet.dataset.fanartGalleryStyles = 'true';
    document.head.appendChild(stylesheet);
  }

  const nav = document.createElement('div');
  nav.className = 'fanart-gallery-nav';
  nav.innerHTML = `
    <button class="fanart-gallery-prev" type="button" aria-label="이전 이미지" hidden>‹</button>
    <button class="fanart-gallery-next" type="button" aria-label="다음 이미지" hidden>›</button>`;
  const counter = document.createElement('span');
  counter.className = 'fanart-gallery-counter';
  counter.hidden = true;
  const loading = document.createElement('span');
  loading.className = 'fanart-gallery-loading';
  loading.textContent = '원본 이미지 확인 중…';
  loading.hidden = true;
  media.append(nav, counter, loading);

  const prev = nav.querySelector('.fanart-gallery-prev');
  const next = nav.querySelector('.fanart-gallery-next');
  let images = [];
  let index = 0;
  let requestId = 0;

  const proxied = (url = '') => {
    const value = String(url || '');
    if (!value) return '';
    if (value.startsWith('/api/image?url=')) return value;
    return `/api/image?url=${encodeURIComponent(value)}`;
  };

  const setControls = () => {
    const multiple = images.length > 1;
    prev.hidden = !multiple;
    next.hidden = !multiple;
    counter.hidden = images.length < 1;
    if (images.length) counter.textContent = `${index + 1} / ${images.length}`;
  };

  const render = () => {
    if (!images.length) {
      setControls();
      return;
    }
    image.src = proxied(images[index]);
    image.hidden = false;
    setControls();
  };

  const move = (delta) => {
    if (images.length < 2) return;
    index = (index + delta + images.length) % images.length;
    render();
  };

  const articleIdFromLink = (href = '') => {
    const text = String(href || '');
    return text.match(/\/articles\/(\d+)/)?.[1]
      || text.match(/[?&](?:articleid|articleId|articleNo)=(\d+)/)?.[1]
      || '';
  };

  const fallbackImages = () => {
    const current = image.getAttribute('src') || image.currentSrc || '';
    return current ? [current] : [];
  };

  const loadSelectedPost = async () => {
    const token = ++requestId;
    const fallback = fallbackImages();
    images = fallback;
    index = 0;
    setControls();
    const articleId = articleIdFromLink(sourceLink.href);
    if (!articleId) return;
    loading.hidden = false;
    try {
      const response = await fetch(`/api/fanart-detail?id=${encodeURIComponent(articleId)}`, {
        headers: { accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (token !== requestId) return;
      const detailImages = Array.isArray(payload?.item?.images) ? payload.item.images.filter(Boolean) : [];
      if (detailImages.length) {
        images = [...new Set(detailImages)];
        index = 0;
        render();
      }
    } catch (_) {
      if (token === requestId) {
        images = fallback;
        index = 0;
        setControls();
      }
    } finally {
      if (token === requestId) loading.hidden = true;
    }
  };

  prev.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    move(-1);
  });
  next.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    move(1);
  });

  grid.addEventListener('click', event => {
    const card = event.target.closest('[data-fanart-index]');
    if (!card) return;
    queueMicrotask(loadSelectedPost);
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  });

  dialog.addEventListener('close', () => {
    requestId += 1;
    images = [];
    index = 0;
    loading.hidden = true;
    setControls();
  });
})();
