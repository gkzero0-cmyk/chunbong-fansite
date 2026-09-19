import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const htmlPaths = [
  'changelog.html','clips.html','data.html','fanart.html','history.html','index.html',
  'minigames.html','myhub.html','notice.html','schedule.html','tarot.html','timeline.html','vod.html','youtube.html'
];
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('service-worker.js');
const page = read('page.js');
const schedulePage = read('page-schedule.js');
const shell = read('site-shell.js');
const css = read('site-quality.css');
const offline = read('offline.html');
const vercel = JSON.parse(read('vercel.json'));
for (const iconPath of ['assets/app-icon-192.png','assets/app-icon-512.png','assets/apple-touch-icon.png']) {
  const stat = fs.statSync(iconPath);
  assert.ok(stat.size > 1000, iconPath + ' must be a real PNG asset');
  const signature = fs.readFileSync(iconPath).subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', iconPath + ' must have a PNG signature');
}

assert.equal(manifest.name, '춘봉 팬허브');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/?source=pwa', 'installed app should open the canonical root URL');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.src === '/assets/app-icon.svg'));
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-192.png' && icon.sizes === '192x192' && icon.type === 'image/png'), '192px PNG PWA icon missing');
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-512.png' && icon.sizes === '512x512' && icon.type === 'image/png' && icon.purpose === 'any'), '512px PNG PWA icon missing');
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-512.png' && icon.sizes === '512x512' && icon.type === 'image/png' && icon.purpose === 'maskable'), 'maskable PWA icon missing');
assert.match(page, /setupPwaExperience/);
assert.match(page, /serviceWorker\.register\('\/service-worker\.js'/);
assert.match(page, /beforeinstallprompt/);
assert.match(page, /link\.href = '\/manifest\.webmanifest'/);
assert.match(page, /새 버전 준비 완료/);
assert.match(css, /\.pwa-install-chip/);
assert.match(css, /\.pwa-update-toast/);
assert.match(sw, /CHUNBONG_PWA/);
assert.match(sw, /chunbong-pwa-20260920-v17/,'mobile app mode release must advance the PWA cache');
assert.match(sw, /\/offline\.html/);
assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
assert.match(sw, /networkFirst/);
assert.match(sw, /request\.destination === 'document'/, 'documents should remain network-first');
assert.match(sw, /\['script','style','worker','image','font'\]/, 'static assets should use stale-while-revalidate');
assert.match(shell, /chunbong-cache-v2:/, 'cross-page session cache namespace missing');
assert.match(shell, /sessionStorage\.setItem/, 'shared cache should persist within the tab');
assert.match(sw, /\/site-shell\.js/, 'PWA app shell must cache site-shell.js');
assert.match(sw, /\/mobile-site\.js/, 'PWA app shell must cache mobile-site.js');
assert.match(sw, /\/personal-hub\.js/, 'PWA app shell must cache personal hub runtime');
assert.match(sw, /\/myhub\.html/, 'PWA app shell must cache My Fan Hub');
assert.match(sw, /\/timeline\.html/, 'PWA app shell must cache timeline');
assert.match(sw, /notificationclick/, 'PWA service worker must route reminder notification clicks');
assert.match(page, /schedule: '\/api\/content\?type=schedule'/, 'schedule page must use live content API');
assert.match(schedulePage, /await loadContent\('schedule'\)/, 'schedule renderer must request live schedule data');
assert.match(offline, /오프라인 상태입니다/);

for (const html of htmlPaths) {
  const source = read(html);
  assert.match(source, /rel="manifest" href="\/manifest\.webmanifest"/, html + ' manifest link missing');
  assert.match(source, /rel="icon" type="image\/svg\+xml" href="\/assets\/app-icon\.svg"/, html + ' app icon missing');
  assert.ok(source.includes('rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png"'), html + ' apple touch icon missing');
}

const swHeaders = (vercel.headers || []).find(item => item.source === '/service-worker.js');
assert.ok(swHeaders, 'service worker cache header is missing');
assert.ok(swHeaders.headers.some(header => header.key === 'Cache-Control' && /no-cache/.test(header.value)), 'service worker must be no-cache');

console.log('PWA regression passed');
