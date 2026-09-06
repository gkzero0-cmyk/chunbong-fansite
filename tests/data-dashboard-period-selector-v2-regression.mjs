import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const loader = fs.readFileSync(new URL('data.js', root), 'utf8');
const v2Path = new URL('data-soop-periods-v2.js', root);
const persistencePath = new URL('data-soop-periods-v2-persistence.js', root);
const cssPath = new URL('data-soop-periods-v2.css', root);

assert.ok(fs.existsSync(v2Path), 'compact SOOP period controller must exist');
assert.ok(fs.existsSync(persistencePath), 'compact SOOP period persistence guard must exist');
assert.ok(fs.existsSync(cssPath), 'compact SOOP period styles must exist');
const v2 = fs.readFileSync(v2Path, 'utf8');
const persistence = fs.readFileSync(persistencePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.ok(loader.includes("load('data-soop-periods-v2.js')"), 'data loader must use the v2 period controller');
assert.ok(loader.includes("load('data-soop-periods-v2-persistence.js')"), 'data loader must install the persistence guard after v2');
for (const marker of [
  'mergeDailyHistory', 'mergeMonthlyHistory', 'data-period-select', 'data-daily-month-select',
  'data-daily-week-select', 'data-month-year-select', 'fanclubCombinedChart', 'periodFanclubDeltaSum',
  'fanclubCount', 'fanclubDelta', 'cumulativeMinutes'
]) assert.ok(v2.includes(marker), `v2 controller must include ${marker}`);

assert.ok(!v2.includes('options.map(item=>`<button'), 'daily period history must not be rendered as a long button list');
assert.ok(v2.includes('calendar'), 'daily history merge must use calendar history as a fallback');
assert.ok(v2.includes('monthlyStats'), 'monthly history merge must preserve API monthly history');
assert.ok(v2.includes('7606 (+7)') || v2.includes('countDeltaText'), 'combined fanclub labels must render count and delta together');
for (const marker of ['MutationObserver','schedulePersistentRender','data-soop-chart','data-soop-monthly-chart','data-fanclub-combined','data-retry']) {
  assert.ok(persistence.includes(marker), `persistence guard must preserve compact charts after core refreshes via ${marker}`);
}
assert.ok(css.includes('.data-period-select'), 'compact select styling must exist');
assert.ok(css.includes('.data-chart-hover-card text.value'), 'hover value text must be enlarged');
assert.ok(css.includes('font-size:20px'), 'hover value text must be materially larger');

console.log('SOOP period selector v2 regression test passed');
