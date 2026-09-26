/* CHUNBONG_PWA v2 · deployment-aware cache */
const CACHE_PREFIX = 'chunbong-pwa-';
const FALLBACK_VERSION = 'runtime-v33';
const requestedVersion = new URL(self.location.href).searchParams.get('v') || FALLBACK_VERSION;
const BUILD_VERSION = String(requestedVersion).replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,48) || FALLBACK_VERSION;
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles.css',
  '/theme.css',
  '/theme-init.js',
  '/site-design-system.css',
  '/site-quality.css',
  '/site-improvements.css',
  '/mobile-site.css?v=3',
  '/mobile-runtime-loader.js?v=1',
  '/mobile-site.js?v=3',
  '/page.js?v=2',
  '/site-shell.js',
  '/site-meta.js',
  '/site-health.js',
  '/site-improvements.js',
  '/content.js',
  '/manifest.webmanifest',
  '/assets/app-icon.svg',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/chunbong-main.webp'
]
const APP_SHELL_PATHS = new Set(APP_SHELL.map(asset => new URL(asset, self.location.origin).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, event) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const preload = request.mode === 'navigate' ? await event.preloadResponse : null;
    const response = preload || await fetch(request);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || (request.mode === 'navigate' ? await cache.match('/offline.html') : Response.error());
  }
}

async function boundedNetworkFirst(request, event, timeoutMs = 450) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = (async () => {
    try {
      const response = await fetch(request);
      if (response?.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return null;
    }
  })();
  if (!cached) return await network || Response.error();
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), timeoutMs));
  const first = await Promise.race([network.then(response => response || cached), timeout]);
  event?.waitUntil(network);
  return first || cached;
}

async function staleWhileRevalidate(request, event, fallback = '') {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = (async () => {
    const preload = request.mode === 'navigate' && event ? await event.preloadResponse : null;
    if (preload?.ok) {
      await cache.put(request, preload.clone());
      return preload;
    }
    const response = await fetch(request);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  })().catch(() => null);
  if (cached) {
    event?.waitUntil(network);
    return cached;
  }
  return await network || (fallback ? await cache.match(fallback) : null) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, event));
    return;
  }

  if (['script','style'].includes(request.destination)) {
    event.respondWith(boundedNetworkFirst(request, event, 450));
    return;
  }

  if (request.destination === 'worker') {
    event.respondWith(networkFirst(request, event));
    return;
  }

  if (['image','font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json?.()||{}}catch(_){try{payload={body:event.data?.text?.()||''}}catch{}}
  const title=String(payload.title||'춘봉 팬허브');
  const options={
    body:String(payload.body||'새 알림이 도착했습니다.'),
    icon:'/assets/app-icon-192.png',
    badge:'/assets/app-icon-192.png',
    tag:String(payload.tag||'chunbong-push'),
    renotify:false,
    data:{url:String(payload.url||'/')}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification?.close();
  const target=new URL(event.notification?.data?.url||'/schedule.html',self.location.origin).href;
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clientsList.find(client=>client.url.startsWith(self.location.origin));
    if(existing){await existing.focus();if('navigate'in existing)await existing.navigate(target);return;}
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
