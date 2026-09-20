import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobileJs = await readFile(new URL('../mobile-site.js', import.meta.url), 'utf8');
const mobileCss = await readFile(new URL('../mobile-site.css', import.meta.url), 'utf8');
const scheduleJs = await readFile(new URL('../live-fixes.js', import.meta.url), 'utf8');

for (const token of [
  'pwa-home-dashboard-mode',
  'pwa-dashboard-live',
  'mobileTarotDock',
  'mobile-tarot-dock-confirm',
  'has-mobile-fortune-launcher'
]) {
  assert.ok(mobileJs.includes(token), 'mobile-site.js missing '+token);
}

for (const token of [
  '.pwa-dashboard-grid',
  '.mobile-tarot-dock',
  '.mobile-schedule-week',
  'body.pwa-home-dashboard-mode',
  'font-size:10.5px'
]) {
  assert.ok(mobileCss.includes(token), 'mobile-site.css missing '+token);
}

assert.ok(scheduleJs.includes('renderMobileWeekStrip'), 'schedule mobile week renderer missing');
assert.ok(scheduleJs.includes('data-schedule-date'), 'schedule cards need mobile date hooks');
assert.ok(scheduleJs.includes('mobileDateFilter'), 'schedule mobile filter state missing');
assert.ok(scheduleJs.includes('aria-pressed'), 'mobile day strip should expose selection state');

console.log('mobile-pwa-wave1-regression: ok');
