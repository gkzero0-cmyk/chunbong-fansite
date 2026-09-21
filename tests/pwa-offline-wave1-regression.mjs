import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.ok(sw.includes("chunbong-pwa-20260922-v29"), 'PWA cache version must advance after core-shell optimization');
for (const asset of [
  '/offline.html','/styles.css','/theme.css','/theme-init.js','/site-shell.js',
  '/site-quality.css','/mobile-site.css','/mobile-site.js','/personal-hub.js','/myhub.html'
]) {
  assert.ok(sw.includes("'"+asset+"'"), 'core offline shell missing '+asset);
}
for (const asset of [
  '/schedule.html','/tarot.js','/data.js','/page-media.js','/fanart-gallery.js'
]) {
  assert.ok(!sw.includes("'"+asset+"'"), 'route-specific asset must runtime-cache after first visit: '+asset);
}
console.log('pwa-offline-wave1-regression: ok');
