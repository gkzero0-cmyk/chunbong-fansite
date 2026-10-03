import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const htmlPaths = [
  'changelog.html','clips.html','data.html','fanart.html','history.html','index.html',
  'minigames.html','myhub.html','notice.html','schedule.html','tarot.html','vod.html','youtube.html'
];
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('service-worker.js');
const page = read('page.js');
const schedulePage = read('page-schedule.js');
const shell = read('site-shell.js');
const css = read('site-quality.css');
const offline = read('offline.html');
const vercel = JSON.parse(read('vercel.json'));
const timelineRedirect=(vercel.redirects||[]).find(item=>item.source==='/timeline.html');
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
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-192.png' && icon.sizes === '192x192' && icon.type === 'image/png'));
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-512.png' && icon.sizes === '512x512' && icon.type === 'image/png' && icon.purpose === 'any'));
assert.ok(manifest.icons.some(icon => icon.src === '/assets/app-icon-512.png' && icon.sizes === '512x512' && icon.type === 'image/png' && icon.purpose === 'maskable'));
assert.match(page, /setupPwaExperience/);
assert.match(page, /serviceWorker\.register\('\/service-worker\.js\?v='\+encodeURIComponent\(version\)/);
assert.match(page, /beforeinstallprompt/);
assert.match(page, /link\.href = '\/manifest\.webmanifest'/);
assert.match(page, /새 버전 준비 완료/);
assert.match(css, /\.pwa-install-chip/);
assert.match(css, /\.pwa-update-toast/);
assert.match(sw, /CHUNBONG_PWA/);
assert.match(sw, /const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/);
assert.match(sw, /\/offline\.html/);
assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
assert.match(sw, /request\.destination === 'document'[\s\S]*networkFirst\(request, event\)/);
assert.match(sw, /\['script','style'\][\s\S]*boundedNetworkFirst\(request, event, 450\)/);
assert.match(sw, /request\.destination === 'worker'[\s\S]*networkFirst\(request, event\)/);
assert.match(sw, /\['image','font'\]/);
assert.match(page, /standalone[\s\S]*activateUpdate\(registration, registration\.waiting\)/);
const installBlock=(sw.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/)||[''])[0];
assert.doesNotMatch(installBlock,/skipWaiting/);
assert.match(sw,/event\.data\?\.type === 'SKIP_WAITING'[\s\S]*self\.skipWaiting\(\)/);
assert.match(page,/registration\.waiting \|\| \(candidate\?\.state === 'installed' \? candidate : null\)/);
assert.match(page,/await registration\.update\(\)/);
assert.match(page,/button\.textContent = '업데이트 중…'/);
assert.match(page,/updateReloadFallback[\s\S]*window\.location\.reload\(\)/);
assert.match(shell, /chunbong-cache-v2:/);
assert.match(shell, /sessionStorage\.setItem/);
assert.match(sw, /\/site-shell\.js/);
assert.match(sw, /\/mobile-runtime-loader\.js/);
assert.match(sw, /\/mobile-site\.js/);
for (const runtimeLazy of ['/site-meta.js','/site-health.js','/site-improvements.js','/site-improvements.css','/content.js','/site-shell-idle.js','/personal-hub.js','/chunbong-contents.js','/activity-center.js','/daily-fortune.js','/myhub.html']) {
  assert.ok(!sw.includes(runtimeLazy), runtimeLazy+' should runtime-cache after use instead of blocking PWA install');
}
assert.match(sw, /\/assets\/chunbong-main\.webp/);
for (const optional of ['/site-analytics.js','/feedback-widget.js','/feedback-widget.css']) assert.ok(!sw.includes(optional));
for (const heavy of ['/tarot.html','/data.html','/minigames.html','/chuntris.html','/chunbak.html']) assert.ok(!sw.includes(heavy));
assert.doesNotMatch(sw, /\/timeline(?:\.html|\.css|\.js)/);
assert.match(sw, /notificationclick/);
assert.match(page, /schedule: '\/api\/content\?type=schedule'/);
assert.match(schedulePage, /await loadContent\('schedule'\)/);
assert.match(offline, /오프라인 상태입니다/);
assert.equal(timelineRedirect?.destination,'/history.html');
assert.equal(timelineRedirect?.permanent,true);
for (const html of htmlPaths) {
  const source = read(html);
  assert.match(source, /rel="manifest" href="\/manifest\.webmanifest"/, html + ' manifest link missing');
  assert.match(source, /rel="icon" type="image\/svg\+xml" href="\/assets\/app-icon\.svg"/, html + ' app icon missing');
  assert.ok(source.includes('rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png"'), html + ' apple touch icon missing');
}
const swHeaders = (vercel.headers || []).find(item => item.source === '/service-worker.js');
assert.ok(swHeaders);
assert.ok(swHeaders.headers.some(header => header.key === 'Cache-Control' && /no-cache/.test(header.value)));
console.log('PWA regression passed');
