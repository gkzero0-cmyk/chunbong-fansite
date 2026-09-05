import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../data.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const enhancements = fs.readFileSync(new URL('../data-enhancements.js', import.meta.url), 'utf8');

assert.ok(html.includes('id="data-daily-periods"'), 'daily view must expose rolling-week controls');
assert.ok(html.includes('id="data-month-periods"'), 'monthly view must expose data-driven month controls');
assert.ok(js.includes('buildRollingWeekOptions'));
assert.ok(js.includes('filterDailyByWeek'));
assert.ok(js.includes('availableMonthKeys'));
assert.ok(js.includes('dailyWeekOffset'));
assert.ok(js.includes('selectedMonth'));
assert.ok(js.includes('data-daily-week-offset'));
assert.ok(js.includes('data-month-key'));
assert.ok(!js.includes("kpi('이번 달 후원자'"), 'removed monthly supporter KPI must not be rendered');
assert.ok(enhancements.includes("'이번 달 후원자'"), 'enhancement cleanup must hide stale cached versions of removed KPI');
assert.ok(!enhancements.includes('soop.daily = limitDailyRows(soop.daily)'), 'raw daily history must no longer be truncated to ten rows');
assert.ok(js.includes('최근 3개월 카테고리 분석'));
assert.ok(js.includes('streamCount'));
assert.ok(js.includes('sharePercent'));

const helperStart = js.indexOf('function buildRollingWeekOptions');
const helperEnd = js.indexOf('function kpi', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'period helpers must be independently testable');
const helperSource = `${js.slice(helperStart, helperEnd)}\nthis.periodHelpers={buildRollingWeekOptions,filterDailyByWeek,availableMonthKeys};`;
const context = { Intl, Date, console };
vm.createContext(context);
vm.runInContext(helperSource, context);

const daily = Array.from({ length: 20 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 6 - index));
  return { date: date.toISOString().slice(0, 10), durationMinutes: index };
});
const weeks = context.periodHelpers.buildRollingWeekOptions(daily, '2026-09-06');
assert.deepEqual([weeks[0].start, weeks[0].end], ['2026-08-31', '2026-09-06']);
assert.deepEqual([weeks[1].start, weeks[1].end], ['2026-08-24', '2026-08-30']);
assert.equal(context.periodHelpers.filterDailyByWeek(daily, weeks[0]).length, 7);

const months = context.periodHelpers.availableMonthKeys({
  soop: {
    monthlyStats: [{ month:'2026-07' }, { month:'2026-09' }],
    calendar: [{ date:'2026-08-01' }, { date:'2026-09-02' }]
  }
});
assert.deepEqual(Array.from(months), ['2026-09','2026-08','2026-07']);

console.log('SOOP dashboard period controls regression test passed');
