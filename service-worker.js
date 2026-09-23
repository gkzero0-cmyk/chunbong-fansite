/* CHUNBONG_PWA v1 */
const CACHE_NAME = 'chunbong-pwa-20260923-v32';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles.css',
  '/theme.css',
  '/theme-init.js',
  '/site-design-system.css',
  '/site-quality.css',
  '/mobile-site.css',
  '/mobile-site.js',
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
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('chunbong-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key)));
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
    event.respondWith(staleWhileRevalidate(request, event));
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
