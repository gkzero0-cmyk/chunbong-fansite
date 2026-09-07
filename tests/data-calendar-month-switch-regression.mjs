import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../data-soop-periods-v3.js', import.meta.url), 'utf8');

const calendarButton = { dataset: { calendarDate: '2026-08-08' } };
const currentSelectors = new Set([
  '#data-soop-chart .data-v3-chart',
  '#data-soop-monthly-chart .data-v3-chart',
  '#data-daily-periods .data-daily-month-select',
  '#data-daily-periods .data-daily-week-select',
  '#data-month-periods .data-month-year-select',
  '#data-month-periods .data-month-month-select'
]);

const document = {
  querySelector(selector) {
    if (currentSelectors.has(selector)) return {};
    if (selector === 'link[href="data-soop-periods-v2.css"]') return {};
    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-calendar-date]' ? [calendarButton] : [];
  },
  createElement: () => ({}),
  head: { appendChild() {} }
};

const context = {
  console,
  Intl,
  Date,
  setTimeout,
  document,
  window: { fetch: async () => ({ ok: false }) },
  MutationObserver: class { observe() {} }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context);

const api = context.window.__CHUNBONG_SOOP_PERIOD_V3__;
assert.equal(typeof api?.isV3Current, 'function', 'period UI must expose its freshness check for calendar rerender regressions');

assert.equal(api.isV3Current(), false, 'a calendar rebuilt by data-core without V3 bindings must be treated as stale');
calendarButton.dataset.v3Bound = '1';
assert.equal(api.isV3Current(), true, 'the period UI is current only after the rebuilt calendar buttons are rebound');

console.log('Calendar month-switch binding regression test passed');
