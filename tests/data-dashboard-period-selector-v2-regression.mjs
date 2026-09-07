import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const loader = fs.readFileSync(new URL('data.js', root), 'utf8');
const v3Path = new URL('data-soop-periods-v3.js', root);
const cssPath = new URL('data-soop-periods-v2.css', root);

assert.ok(fs.existsSync(v3Path), 'single-owner SOOP period controller must exist');
assert.ok(fs.existsSync(cssPath), 'compact SOOP period styles must exist');
const v3 = fs.readFileSync(v3Path, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.ok(loader.includes("load('data-soop-periods-v3.js')"), 'data loader must use the v3 period controller');
assert.ok(!loader.includes("load('data-soop-periods-v2.js')"), 'legacy v2 period controller must not be active');
assert.ok(!loader.includes("load('data-soop-periods-v2-persistence.js')"), 'retry-click persistence workaround must not be active');
for (const marker of [
  'mergeDailyHistory', 'mergeMonthlyHistory', 'data-period-select', 'data-daily-month-select',
  'data-daily-week-select', 'data-month-year-select', 'data-month-month-select', 'followerCombinedChart',
  'fanclubCombinedChart', 'fanclubCount', 'followerCount', 'fanclubDelta', 'followerDelta', 'cumulativeMinutes'
]) assert.ok(v3.includes(marker), `v3 controller must include ${marker}`);

assert.ok(!v3.includes('options.map(item=>`<button'), 'daily period history must not be rendered as a long button list');
assert.ok(v3.includes('calendar'), 'daily history merge must use calendar history as a fallback');
assert.ok(v3.includes('monthlyStats'), 'monthly history merge must preserve API monthly history');
assert.ok(v3.includes('countDeltaText'), 'favorite and fanclub labels must render count and delta together');
assert.ok(v3.includes('MutationObserver'), 'v3 must restore its view after core refresh mutations without clicking retry');
assert.ok(!v3.includes('retry.click()'), 'v3 must not use retry-button recursion to preserve charts');
assert.ok(css.includes('.data-period-select'), 'compact select styling must exist');
assert.ok(css.includes('.data-chart-hover-card text.value'), 'hover value text must be enlarged');
assert.ok(css.includes('font-size:20px'), 'hover value text must be materially larger');

console.log('SOOP period selector v3 regression test passed');
