import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const htmlPaths = [
  'changelog.html','clips.html','data.html','fanart.html','history.html','index.html',
  'minigames.html','notice.html','schedule.html','tarot.html','vod.html','youtube.html'
];
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('service-worker.js');
const page = read('page.js');
const schedulePage = read('page-schedule.js');
const content = read('content.js');
const css = read('site-quality.css');
const offline = read('offline.html');
const vercel = JSON.parse(read('vercel.json'));

assert.equal(manifest.name, '춘봉 팬허브');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.src === '/assets/app-icon.svg'));
assert.match(page, /setupPwaExperience/);
assert.match(page, /serviceWorker\.register\('\/service-worker\.js'/);
assert.match(page, /beforeinstallprompt/);
assert.match(page, /link\.href = '\/manifest\.webmanifest'/);
assert.match(page, /새 버전 준비 완료/);
assert.match(css, /\.pwa-install-chip/);
assert.match(css, /\.pwa-update-toast/);
assert.match(sw, /CHUNBONG_PWA/);
assert.match(sw, /\/offline\.html/);
assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
assert.match(sw, /networkFirst/);
assert.match(sw, /request\.destination === 'document'/, 'documents should remain network-first');
assert.match(sw, /\['script','style','worker','image','font'\]/, 'static assets should use stale-while-revalidate');
assert.match(content, /chunbong-cache-v2:/, 'cross-page session cache namespace missing');
assert.match(content, /sessionStorage\.setItem/, 'content cache should persist within the tab');
assert.match(page, /schedule: '\/api\/content\?type=schedule'/, 'schedule page must use live content API');
assert.match(schedulePage, /await loadContent\('schedule'\)/, 'schedule renderer must request live schedule data');
assert.match(offline, /오프라인 상태입니다/);

for (const html of htmlPaths) {
  const source = read(html);
  assert.match(source, /rel="manifest" href="\/manifest\.webmanifest"/, html + ' manifest link missing');
  assert.match(source, /rel="icon" type="image\/svg\+xml" href="\/assets\/app-icon\.svg"/, html + ' app icon missing');
}

const swHeaders = (vercel.headers || []).find(item => item.source === '/service-worker.js');
assert.ok(swHeaders, 'service worker cache header is missing');
assert.ok(swHeaders.headers.some(header => header.key === 'Cache-Control' && /no-cache/.test(header.value)), 'service worker must be no-cache');

console.log('PWA regression passed');
