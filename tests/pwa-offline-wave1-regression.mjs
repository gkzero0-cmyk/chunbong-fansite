import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const appShell = sw.match(/const APP_SHELL = \[([\s\S]*?)\n\]/)?.[1] || '';
assert.match(sw,/const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/,'PWA cache must be deployment-aware');
for (const asset of [
  '/content-filter.css','/content-filter.js','/schedule.html','/schedule-enhancements.css',
  '/live-fixes.js','/tarot.html','/tarot.css','/tarot.js','/tarot-quality.css','/tarot-composite.css','/tarot-data.js','/tarot-composite.js','/tarot-sfx-v2.js',
  '/data.html','/data.css','/data.js','/data-core.js','/data-soop-periods-v3.js','/data-recent-session-metrics.js','/data-enhancements.js','/data-enhancements.css',
  '/vod.html','/clips.html','/youtube.html','/fanart.html'
]) {
  assert.ok(!appShell.includes("'"+asset+"'"), 'feature asset should runtime-cache after first visit instead of initial PWA install: '+asset);
}
console.log('pwa-offline-wave1-regression: ok');
