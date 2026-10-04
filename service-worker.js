/* CHUNBONG_PWA v2 · deployment-aware cache */
const CACHE_PREFIX = 'chunbong-pwa-';
const MEDIA_CACHE_PREFIX = 'chunbong-media-';
// Previous deployed cache generation: runtime-v36. Kept as a migration note only.
const FALLBACK_VERSION = 'runtime-v37';
const requestedVersion = new URL(self.location.href).searchParams.get('v') || FALLBACK_VERSION;
const BUILD_VERSION = String(requestedVersion).replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,48) || FALLBACK_VERSION;
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;
const MEDIA_CACHE_NAME = MEDIA_CACHE_PREFIX + BUILD_VERSION;
const MAX_MEDIA_ENTRIES = 96;
const MAX_MEDIA_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;
const MAX_MEDIA_ITEM_BYTES = 6 * 1024 * 1024;
const CACHED_AT_HEADER = 'x-chunbong-cached-at';
const CACHED_BYTES_HEADER = 'x-chunbong-cache-bytes';
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
  '/mobile-runtime-loader.js',
  '/mobile-site.js',
  '/page.js',
  '/site-shell.js',
  '/manifest.webmanifest',
  '/assets/chunbong-main.webp'
]
const APP_SHELL_PATHS = new Set(APP_SHELL.map(asset => new URL(asset, self.location.origin).pathname));

function keepAlive(event, promise) {
  try { event?.waitUntil?.(Promise.resolve(promise).catch(() => null)); } catch {}
}

async function safeOpenCache(name) {
  try { return await caches.open(name); } catch { return null; }
}

async function safeCacheMatch(cache, request) {
  if (!cache) return null;
  try { return await cache.match(request); } catch { return null; }
}

function staticAssetKind(request) {
  try {
    if (request?.destination === 'style') return 'style';
    if (request?.destination === 'script') return 'script';
    const raw = typeof request === 'string' ? request : request?.url;
    const pathname = new URL(raw, self.location.origin).pathname.toLowerCase();
    if (pathname.endsWith('.css')) return 'style';
    if (pathname.endsWith('.js')) return 'script';
  } catch {}
  return '';
}

function isValidStaticAssetResponse(request, response) {
  if (!response?.ok) return false;
  const kind = staticAssetKind(request);
  if (!kind) return true;
  const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
  if (kind === 'style') return /^text\/css(?:\s*;|$)/i.test(contentType);
  return /(?:javascript|ecmascript)/i.test(contentType);
}

async function safeCachePut(cache, request, response, options = {}) {
  if (!cache || !response) return false;
  try {
    const reportedBytes = Math.max(0, Number(response.headers?.get?.('content-length') || 0) || 0);
    if (options.maxItemBytes && reportedBytes > options.maxItemBytes) return false;
    let stored = response.clone();
    if (options.stamp) {
      const headers = new Headers(stored.headers);
      headers.set(CACHED_AT_HEADER, String(Date.now()));
      if (reportedBytes) headers.set(CACHED_BYTES_HEADER, String(reportedBytes));
      stored = new Response(stored.body, {
        status: stored.status,
        statusText: stored.statusText,
        headers
      });
    }
    await cache.put(request, stored);
    return true;
  } catch {
    return false;
  }
}

async function precacheAppShell(cache) {
  for (const asset of APP_SHELL) {
    const request = new Request(asset, { cache: 'reload' });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`PWA precache failed: ${asset} (${response.status})`);
    if (!isValidStaticAssetResponse(request, response)) {
      throw new Error(`PWA precache rejected invalid static asset MIME: ${asset}`);
    }
    await cache.put(asset, response.clone());
  }
}

async function pruneCoreCache(cache) {
  if (!cache) return;
  try {
    const requests = await cache.keys();
    await Promise.all(requests.map(async request => {
      try {
        const pathname = new URL(request.url).pathname;
        if (!APP_SHELL_PATHS.has(pathname)) await cache.delete(request);
      } catch {}
    }));
  } catch {}
}

async function pruneMediaCache(cache) {
  if (!cache) return;
  try {
    const now = Date.now();
    const requests = await cache.keys();
    const live = [];
    for (const request of requests) {
      const response = await safeCacheMatch(cache, request);
      if (!response) continue;
      const cachedAt = Math.max(0, Number(response.headers?.get?.(CACHED_AT_HEADER) || 0) || 0);
      const bytes = Math.max(0, Number(response.headers?.get?.(CACHED_BYTES_HEADER) || response.headers?.get?.('content-length') || 0) || 0);
      if (cachedAt && now - cachedAt > MAX_MEDIA_AGE_MS) {
        try { await cache.delete(request); } catch {}
        continue;
      }
      live.push({request, cachedAt, bytes});
    }
    live.sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));
    let totalBytes = live.reduce((sum, row) => sum + row.bytes, 0);
    let excessEntries = Math.max(0, live.length - MAX_MEDIA_ENTRIES);
    for (const row of live) {
      if (excessEntries <= 0 && totalBytes <= MAX_MEDIA_BYTES) break;
      try {
        const deleted = await cache.delete(row.request);
        if (deleted) {
          totalBytes = Math.max(0, totalBytes - row.bytes);
          excessEntries = Math.max(0, excessEntries - 1);
        }
      } catch {}
    }
  } catch {}
}

async function safeMediaMatch(cache, request) {
  const response = await safeCacheMatch(cache, request);
  if (!response) return null;
  const cachedAt = Math.max(0, Number(response.headers?.get?.(CACHED_AT_HEADER) || 0) || 0);
  if (cachedAt && Date.now() - cachedAt > MAX_MEDIA_AGE_MS) {
    try { await cache.delete(request); } catch {}
    return null;
  }
  return response;
}

async function storeMedia(cache, request, response) {
  const stored = await safeCachePut(cache, request, response, {stamp:true, maxItemBytes:MAX_MEDIA_ITEM_BYTES});
  if (stored) await pruneMediaCache(cache);
  return stored;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Mandatory core app-shell preparation: if this fails the new worker does not activate,
    // so the previous worker and its known-good CSS remain in control.
    const cache = await caches.open(CACHE_NAME);
    await precacheAppShell(cache);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (
      (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      || (key.startsWith(MEDIA_CACHE_PREFIX) && key !== MEDIA_CACHE_NAME)
    )).map(key => caches.delete(key)));
    const coreCache = await caches.open(CACHE_NAME);
    await pruneCoreCache(coreCache);
    const mediaCache = await safeOpenCache(MEDIA_CACHE_NAME);
    await pruneMediaCache(mediaCache);
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
  const cache = await safeOpenCache(CACHE_NAME);
  let response = null;
  try {
    const preload = request.mode === 'navigate' ? await event.preloadResponse : null;
    if (preload?.ok) response = preload;
    else response = await fetch(request);
  } catch {}
  if (response) {
    if (response.ok && cache) keepAlive(event, safeCachePut(cache, request, response));
    return response;
  }
  return (await safeCacheMatch(cache, request))
    || (request.mode === 'navigate' ? await safeCacheMatch(cache, '/offline.html') : Response.error());
}

async function validatedStaticCacheMatch(cache, request) {
  const response = await safeCacheMatch(cache, request);
  if (!response) return null;
  if (isValidStaticAssetResponse(request, response)) return response;
  try { await cache?.delete?.(request); } catch {}
  return null;
}

async function matchCanonicalAsset(cache, request) {
  try {
    const url = new URL(request.url);
    if (!url.search) return null;
    const canonicalRequest = new Request(url.pathname);
    const response = await safeCacheMatch(cache, canonicalRequest);
    if (!response) return null;
    if (isValidStaticAssetResponse(request, response)) return response;
    try { await cache?.delete?.(canonicalRequest); } catch {}
    return null;
  } catch {
    return null;
  }
}

async function boundedNetworkFirst(request, event, timeoutMs = 450) {
  const cache = await safeOpenCache(CACHE_NAME);
  if (!cache) {
    try {
      const response = await fetch(request);
      return isValidStaticAssetResponse(request, response) ? response : Response.error();
    } catch { return Response.error(); }
  }
  const cached = await validatedStaticCacheMatch(cache, request);
  const canonicalCached = cached ? null : await matchCanonicalAsset(cache, request);
  const network = (async () => {
    let response = null;
    try { response = await fetch(request); } catch { return null; }
    if (!isValidStaticAssetResponse(request, response)) return null;
    keepAlive(event, safeCachePut(cache, request, response));
    return response;
  })();
  if (!cached) return await network || canonicalCached || Response.error();
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), timeoutMs));
  const first = await Promise.race([network.then(response => response || cached), timeout]);
  keepAlive(event, network);
  return first || cached;
}

async function staleWhileRevalidateMedia(request, event) {
  const cache = await safeOpenCache(MEDIA_CACHE_NAME);
  if (!cache) {
    try { return await fetch(request); } catch { return Response.error(); }
  }
  const cached = await safeMediaMatch(cache, request);
  const network = (async () => {
    let response = null;
    try { response = await fetch(request); } catch { return null; }
    if (response?.ok) keepAlive(event, storeMedia(cache, request, response));
    return response;
  })();
  if (cached) {
    keepAlive(event, network);
    return cached;
  }
  return await network || Response.error();
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
    event.respondWith(staleWhileRevalidateMedia(request, event));
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
