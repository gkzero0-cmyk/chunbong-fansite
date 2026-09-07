import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../data-soop-periods-v3.js', import.meta.url), 'utf8');
const detailRoot = { innerHTML: '' };

const context = {
  console,
  Intl,
  Date,
  setTimeout,
  document: {
    querySelector(selector) {
      if (selector === '#data-soop-calendar-detail') return detailRoot;
      if (selector === 'link[href="data-soop-periods-v2.css"]') return {};
      return null;
    },
    querySelectorAll: () => [],
    createElement: () => ({}),
    head: { appendChild() {} }
  },
  window: {
    fetch: async () => ({ ok: false })
  },
  MutationObserver: class { observe() {} }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context);

const api = context.window.__CHUNBONG_SOOP_PERIOD_V3__;
assert.equal(typeof api?.renderCalendarDetail, 'function', 'calendar UI must expose its detail renderer');

const fixedMonthlyMetrics = {
  followerCount: 29778,
  followerDelta: -15,
  fanclubCount: 7615,
  fanclubDelta: 24
};

api.renderCalendarDetail({
  date: '2026-09-01',
  streamCount: 1,
  durationMinutes: 418,
  averageViewers: 45,
  maxViewers: 59,
  followerCount: 29769,
  followerDelta: -24,
  fanclubCount: 7595,
  fanclubDelta: 4,
  sessions: []
}, fixedMonthlyMetrics);

assert.ok(detailRoot.innerHTML.includes('애청자 <b>29,769 (-24)</b>'), 'September 1 must display that selected day’s follower count and delta');
assert.ok(detailRoot.innerHTML.includes('팬클럽 <b>7,595 (+4)</b>'), 'September 1 must display that selected day’s fanclub count and delta');
assert.ok(!detailRoot.innerHTML.includes('애청자 <b>29,778 (-15)</b>'), 'calendar detail must not reuse one fixed monthly follower value for every day');

api.renderCalendarDetail({
  date: '2026-09-02',
  streamCount: 1,
  durationMinutes: 793,
  averageViewers: 43,
  maxViewers: 65,
  followerCount: 29771,
  followerDelta: 2,
  fanclubCount: 7598,
  fanclubDelta: 3,
  sessions: []
}, fixedMonthlyMetrics);

assert.ok(detailRoot.innerHTML.includes('애청자 <b>29,771 (+2)</b>'), 'changing the selected date must update the follower value');
assert.ok(detailRoot.innerHTML.includes('팬클럽 <b>7,598 (+3)</b>'), 'changing the selected date must update the fanclub value');
assert.ok(!detailRoot.innerHTML.includes('팬클럽 <b>7,615 (+24)</b>'), 'calendar detail must not reuse one fixed monthly fanclub value for every day');

console.log('Calendar selected-day follower/fanclub regression test passed');
