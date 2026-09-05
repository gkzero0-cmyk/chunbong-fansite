import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'data-enhancements.js'), 'utf8');

assert.doesNotMatch(source, /function limitDailyRows/);
assert.doesNotMatch(source, /soop\.daily\s*=\s*limitDailyRows/);
assert.match(source, /이번 달 별풍선/);
assert.match(source, /별풍선 시급/);
assert.match(source, /이번 달 채금/);
assert.match(source, /DISALLOWED_SOOP_LABELS/);

const dates = Array.from({ length: 14 }, (_, index) => new Date(Date.UTC(2026, 7, 20 + index)).toISOString().slice(0, 10));
const nativePayload = {
  fallback: false,
  capturedAt: '2026-09-05T00:00:00Z',
  youtube: { channel: {} },
  trends: [],
  soop: {
    overview: {},
    daily: dates.map((date, index) => ({ date, durationMinutes: index + 1 })),
    monthlyStats: [{ month: '2026-08' }],
    calendar: dates.map(date => ({ date })),
    recentSessions: [],
    externalHistory: { currentFallback: { sources: [], errors: [], fieldSources: {} } }
  }
};

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = init.headers || new Map();
    this.ok = this.status >= 200 && this.status < 300;
  }
  async json() { return JSON.parse(this.body); }
  clone() { return new FakeResponse(this.body, { status: this.status, statusText: this.statusText, headers: this.headers }); }
}
class FakeHeaders {
  constructor() { this.map = new Map(); }
  set(key, value) { this.map.set(key, value); }
  delete(key) { this.map.delete(key); }
}

const window = {
  fetch: async () => new FakeResponse(JSON.stringify(nativePayload), { status: 200 }),
  addEventListener() {}
};
const document = {
  readyState: 'complete',
  hidden: false,
  documentElement: {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};
class FakeMutationObserver { observe() {} }
const localStorage = { getItem() { return null; }, setItem() {} };

vm.runInNewContext(source, {
  window, document, MutationObserver: FakeMutationObserver, localStorage,
  Intl, Date, Map, Set, Object, Array, String, Number, Math, JSON, console,
  setTimeout() { return 0; },
  Headers: FakeHeaders,
  Response: FakeResponse
});
const response = await window.fetch('/api/content?type=data');
const payload = await response.json();
assert.equal(payload.soop.daily.length, 14, 'SOOP daily payload must remain complete so older rolling weeks can be selected');
assert.equal(payload.soop.daily[0].date, '2026-08-20');
assert.equal(payload.soop.daily.at(-1).date, '2026-09-02');
assert.equal(payload.soop.calendar.length, 14, 'calendar history must remain complete');
assert.equal(payload.soop.monthlyStats.length, 1, 'monthly history must remain complete');

console.log('SOOP daily display regression test passed');
