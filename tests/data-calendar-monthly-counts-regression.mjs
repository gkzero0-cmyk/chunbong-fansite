import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../data-soop-periods-v3.js', import.meta.url), 'utf8');

const context = {
  console,
  Intl,
  Date,
  setTimeout,
  document: {
    querySelector: () => null,
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
assert.equal(typeof api?.calendarMonthMetrics, 'function', 'calendar UI must expose a month-level count resolver');

const payload = {
  capturedAt: '2026-09-07T12:00:00.000Z',
  soop: {
    daily: [
      { date:'2026-07-31', followerCount:29803, fanclubCount:7586 },
      { date:'2026-08-31', followerCount:29793, followerDelta:-10, fanclubCount:7591, fanclubDelta:5 },
      { date:'2026-09-01', followerCount:29769, followerDelta:-24, fanclubCount:7595, fanclubDelta:4 },
      { date:'2026-09-07', followerCount:29768, followerDelta:-1, fanclubCount:7615, fanclubDelta:20 }
    ],
    calendar: [
      { date:'2026-08-31', followerCount:29793, followerDelta:-10, fanclubCount:7591, fanclubDelta:5 },
      { date:'2026-09-01', followerCount:29769, followerDelta:-24, fanclubCount:7595, fanclubDelta:4 },
      { date:'2026-09-07', followerCount:29768, followerDelta:-1, fanclubCount:7615, fanclubDelta:20 }
    ],
    monthlyStats: [
      { month:'2026-08', followerDelta:-10, fanclubDelta:5 },
      { month:'2026-09', followerCount:29768, followerDelta:-18, fanclubCount:7615, fanclubDelta:24 }
    ],
    overview: {}
  },
  trends: []
};

const september = api.calendarMonthMetrics(payload, '2026-09-01');
assert.equal(september.followerCount, 29768, 'September calendar cards must use the month-end/latest follower count, not the selected day count');
assert.equal(september.followerDelta, -18, 'September calendar cards must use the monthly follower delta');
assert.equal(september.fanclubCount, 7615, 'September calendar cards must use the month-end/latest fanclub count, not the selected day count');
assert.equal(september.fanclubDelta, 24, 'September calendar cards must use the monthly fanclub delta');

const august = api.calendarMonthMetrics(payload, '2026-08-15');
assert.equal(august.followerCount, 29793, 'Past months must fall back to the last recorded follower count in that month');
assert.equal(august.followerDelta, -10, 'Past months must keep the stored monthly follower delta');
assert.equal(august.fanclubCount, 7591, 'Past months must fall back to the last recorded fanclub count in that month');
assert.equal(august.fanclubDelta, 5, 'Past months must keep the stored monthly fanclub delta');

console.log('Calendar monthly count presentation regression test passed');
