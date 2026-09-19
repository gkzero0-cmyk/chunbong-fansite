import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../data.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const periods = fs.readFileSync(new URL('../data-soop-periods-v3.js', import.meta.url), 'utf8');
const enhancements = fs.readFileSync(new URL('../data-enhancements.js', import.meta.url), 'utf8');
const productionSmoke = fs.readFileSync(new URL('../.github/workflows/soop-dashboard-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(html.includes('id="data-daily-periods"'), 'daily view must expose rolling-week controls');
assert.ok(html.includes('id="data-month-periods"'), 'monthly view must expose data-driven month controls');
for (const marker of ['buildRollingWeekOptions','filterDailyByWeek','availableMonthKeys','formatRollingWeekLabel','formatMonthLabel','dailyWeekOffset','selectedMonth']) assert.ok(js.includes(marker), `data loader should include ${marker}`);
for (const marker of [
  'mergeDailyHistory','mergeMonthlyHistory','data-period-select','data-daily-month-select',
  'data-daily-week-select','data-month-year-select','data-month-month-select',
  'followerCombinedChart','fanclubCombinedChart','countDeltaText',
  'fanclubCount','followerCount','fanclubDelta','followerDelta','cumulativeMinutes','MutationObserver'
]) assert.ok(periods.includes(marker), `active SOOP v3 period controller should include ${marker}`);
assert.ok(!periods.includes('slice(-10)'), 'active period controller must operate on full daily API history');
assert.ok(!periods.includes('retry.click()'), 'active period controller must not use retry recursion to restore its UI');
assert.ok(js.includes("load('data-soop-periods-v3.js')"), 'data loader must load only the active v3 period controller');
assert.ok(!js.includes("load('data-soop-periods-v2.js')"), 'legacy v2 period controller must remain inactive');
assert.ok(!js.includes("load('data-soop-periods-v2-persistence.js')"), 'legacy v2 persistence workaround must remain inactive');

const limitDailyStart = enhancements.indexOf('function limitDailyRows');
const limitDailyEnd = enhancements.indexOf('\n  function normalizeDailyTrendRows', limitDailyStart);
assert.ok(limitDailyStart >= 0 && limitDailyEnd > limitDailyStart, 'enhancement daily-history transform must remain testable');
const limitDailySource = enhancements.slice(limitDailyStart, limitDailyEnd).replace(/\/\/.*$/gm, '');
assert.ok(!limitDailySource.includes('slice(-10)'), 'enhancement transform must never truncate SOOP daily history to 10 rows');
assert.ok(limitDailySource.includes('.sort('), 'enhancement transform should preserve sorted full history');

for (const marker of [
  "- 'data-enhancements.js'",
  "curl -fsSL --retry 2 --max-time 60 \"$BASE/data-enhancements.js\"",
  'formatRollingWeekLabel',
  'formatMonthLabel',
  "countKey:'fanclubCount'",
  "deltaKey:'fanclubDelta'",
  "key:'cumulativeMinutes'",
  'fullDailyHistory',
  'dailyFollowerCount',
  'dailyFanclubCount',
  'monthlyFollowerCount',
  'monthlyFanclubCount',
  'calendarFollowerCount',
  'calendarFanclubCount',
  'monthlyCumulativeMinutes'
]) assert.ok(productionSmoke.includes(marker), `production SOOP smoke should verify ${marker}`);

const helperStart = js.indexOf('function formatRollingWeekLabel');
const helperEnd = js.indexOf('function kpi', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'period helpers must be independently testable');
const helperSource = `${js.slice(helperStart, helperEnd)}\nthis.periodHelpers={buildRollingWeekOptions,filterDailyByWeek,availableMonthKeys,formatRollingWeekLabel,formatMonthLabel};`;
const context = { Intl, Date, console };
vm.createContext(context);
vm.runInContext(helperSource, context);

const daily = Array.from({ length: 380 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 6 - index));
  return { date: date.toISOString().slice(0, 10), durationMinutes: index };
});
const weeks = context.periodHelpers.buildRollingWeekOptions(daily, '2026-09-06');
assert.deepEqual([weeks[0].start, weeks[0].end], ['2026-08-31', '2026-09-06']);
assert.deepEqual([weeks[1].start, weeks[1].end], ['2026-08-24', '2026-08-30']);
assert.equal(context.periodHelpers.filterDailyByWeek(daily, weeks[0]).length, 7);
assert.equal(context.periodHelpers.formatRollingWeekLabel(weeks[0]), '2026.08.31 ~ 09.06');
const priorYearWeek = weeks.find(item => item.start.startsWith('2025-'));
assert.ok(priorYearWeek, 'full daily history must create prior-year week controls');
assert.ok(context.periodHelpers.formatRollingWeekLabel(priorYearWeek).startsWith('2025.'), 'prior-year week label must show its year explicitly');

const months = context.periodHelpers.availableMonthKeys({
  soop: {
    monthlyStats: [{ month:'2025-09' }, { month:'2026-07' }, { month:'2026-09' }],
    calendar: [{ date:'2026-08-01' }, { date:'2026-09-02' }]
  }
});
assert.deepEqual(Array.from(months), ['2026-09','2026-08','2026-07','2025-09']);
assert.equal(context.periodHelpers.formatMonthLabel('2026-09'), '2026년 9월');
assert.equal(context.periodHelpers.formatMonthLabel('2025-09'), '2025년 9월');

console.log('SOOP dashboard period controls regression test passed');
