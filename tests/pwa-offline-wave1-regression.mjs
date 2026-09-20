import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.ok(sw.includes("chunbong-pwa-20260921-v22"), 'PWA cache version must advance after mobile shell changes');
for (const asset of [
  '/content-filter.css','/content-filter.js','/schedule.html','/schedule-enhancements.css',
  '/live-fixes.js','/tarot.html','/tarot.css','/tarot.js','/vod.html','/clips.html','/youtube.html','/fanart.html'
]) {
  assert.ok(sw.includes("'"+asset+"'"), 'offline shell missing '+asset);
}
console.log('pwa-offline-wave1-regression: ok');
