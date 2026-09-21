import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.ok(sw.includes("chunbong-pwa-20260921-v28"), 'PWA cache version must include the current production shell');
for (const asset of [
  '/index.html','/offline.html','/site-shell.js','/site-improvements.js','/mobile-site.js',
  '/personal-hub.js','/personal-hub.css','/myhub.html'
]) {
  assert.ok(sw.includes("'"+asset+"'"), 'core offline shell missing '+asset);
}
for (const featureAsset of [
  '/schedule.html','/tarot.html','/tarot.js','/data.html','/data.js',
  '/vod.html','/clips.html','/youtube.html','/fanart.html'
]) {
  assert.ok(!sw.includes("'"+featureAsset+"'"), 'heavy feature asset should be runtime-cached, not install-precached: '+featureAsset);
}
assert.ok(sw.includes("['script','style','worker']"), 'feature JS/CSS must be cached on first use');
assert.ok(sw.includes("['image','font']"), 'full-quality images must be runtime cached without recompression');
console.log('pwa-offline-wave1-regression: ok');
