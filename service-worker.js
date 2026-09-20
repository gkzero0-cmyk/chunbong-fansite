/* CHUNBONG_PWA v1 */
const CACHE_NAME = 'chunbong-pwa-20260921-v21';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles.css',
  '/theme.css',
  '/theme-init.js',
  '/site-quality.css',
  '/site-improvements.css',
  '/mobile-site.css',
  '/mobile-site.js',
  '/mobile-app-enhancements.css',
  '/mobile-app-enhancements.js',
  '/page.js?v=2',
  '/site-shell.js',
  '/site-meta.js',
  '/site-health.js',
  '/site-improvements.js',
  '/activity-center.css',
  '/activity-center.js',
  '/content.js',
  '/daily-fortune.css',
  '/daily-fortune.js',
  '/home-overview.css',
  '/home-overview.js',
  '/manifest.webmanifest',
  '/assets/app-icon.svg',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png',
  '/assets/apple-touch-icon.png',
  '/schedule.html',
  '/schedule-enhancements.css',
  '/page-schedule.js?v=1',
  '/tarot.html',
  '/tarot.css',
  '/tarot-quality.css',
  '/tarot-composite.css?v=2',
  '/tarot-data.js',
  '/tarot-reading-config.js',
  '/tarot.js?v=3',
  '/tarot-composite.js?v=2',
  '/minigames.html',
  '/minigames.css',
  '/minigame-profile.css',
  '/minigame-profile.js',
  '/personal-hub.css',
  '/personal-hub.js',
  '/myhub.html',
  '/changelog-data.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response?.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await network || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api/content') {
    const cacheableTypes = new Set(['schedule','activity','notice','vod','clips','youtube','fanart','data']);
    if (cacheableTypes.has(url.searchParams.get('type') || '')) {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, event));
    return;
  }

  if (['script','style','worker','image','font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
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

const ALERT_STATE_CACHE='chunbong-alert-state-v1';

async function readAlertMarker(key){
  const cache=await caches.open(ALERT_STATE_CACHE);
  const response=await cache.match('/__chunbong_alert__/'+key);
  return response?response.text():'';
}

async function writeAlertMarker(key,value){
  const cache=await caches.open(ALERT_STATE_CACHE);
  await cache.put('/__chunbong_alert__/'+key,new Response(String(value||''),{
    headers:{'content-type':'text/plain;charset=utf-8'}
  }));
}

async function checkBackgroundLive(){
  try{
    const response=await fetch('/api/content?type=live',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const payload=await response.json();
    if(payload?.live!==true)return;
    const broadcastId=String(payload.broadcastId||payload.startedAt||payload.title||'live');
    const previous=await readAlertMarker('live');
    if(previous===broadcastId)return;
    await self.registration.showNotification('춘봉 방송이 시작됐어요',{
      body:payload.title||'SOOP에서 방송이 시작됐습니다.',
      icon:'/assets/app-icon-192.png',
      badge:'/assets/app-icon-192.png',
      tag:'chunbong-live-'+broadcastId,
      data:{url:'/'}
    });
    await writeAlertMarker('live',broadcastId);
  }catch{}
}

self.addEventListener('periodicsync',event=>{
  if(event.tag==='chunbong-live-background')event.waitUntil(checkBackgroundLive());
});
