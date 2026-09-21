import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personal = await readFile(new URL('../personal-hub.js', import.meta.url), 'utf8');
const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const media = await readFile(new URL('../page-media.js', import.meta.url), 'utf8');
const mobile = await readFile(new URL('../mobile-site.js', import.meta.url), 'utf8');
const fanart = await readFile(new URL('../fanart-gallery.js', import.meta.url), 'utf8');
const pushApi = await readFile(new URL('../lib/push-notifications-api.js', import.meta.url), 'utf8');
const contentApi = await readFile(new URL('../api/content.js', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.ok(personal.includes('alerts:{enabled:false,pushEnabled:false'), 'broadcast alerts must default OFF');
assert.ok(personal.includes('personal-alert-settings') && personal.includes("'disabled'"), 'alert detail settings should disable while OFF');
assert.ok(personal.includes('syncPushSubscription'), 'push subscription sync missing');
assert.ok(personal.includes("action:'unsubscribe'"), 'turning alerts off must remove push subscription');

assert.ok(sw.includes("chunbong-pwa-20260922-v29"), 'PWA cache must be v29');
assert.ok(sw.includes("self.addEventListener('push'"), 'service worker push receiver missing');
for (const asset of ['/page-media.js','/fanart-gallery.js','/fanart-gallery.css']) {
  assert.ok(!sw.includes("'"+asset+"'"), 'route-specific media asset should runtime-cache after first visit: '+asset);
}

assert.ok(media.includes('setupMobileMiniPlayer'), 'mobile mini player missing');
assert.ok(media.includes('mobile-mini-player-close'), 'mini player close control missing');
assert.ok(fanart.includes("touchstart") && fanart.includes("touchend"), 'fanart gestures missing');
assert.ok(fanart.includes('dialog.close()'), 'fanart swipe-down close missing');
assert.ok(mobile.includes('pwa-compact-header') && mobile.includes('pwa-header-action'), 'installed app header missing');

assert.equal(pkg.dependencies?.['web-push'], '^3.6.7');
for (const token of ['WEB_PUSH_VAPID_PUBLIC_KEY','WEB_PUSH_VAPID_PRIVATE_KEY','CRON_SECRET']) {
  assert.ok(pushApi.includes(token), 'push server missing '+token);
}
for (const token of ["type==='push-config'","type==='push-subscription'","type==='push-dispatch'"]) {
  assert.ok(contentApi.includes(token), 'content API missing '+token);
}
assert.ok(!/WEB_PUSH_VAPID_PRIVATE_KEY\s*[:=]\s*['"][A-Za-z0-9_-]{20,}/.test(pushApi), 'VAPID private key must not be committed');

console.log('mobile-wave2-regression: ok');
