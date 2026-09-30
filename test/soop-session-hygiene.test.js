'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const hygiene = require('../lib/soop-session-hygiene.js');

test('preserves legitimate long sessions below seven days', () => {
  const item = { id: 'long', durationMinutes: 2577, startedAt: '2026-08-01T00:00:00Z', endedAt: '2026-08-02T18:57:00Z' };
  assert.equal(hygiene.normalizeSession(item).durationMinutes, 2577);
});

test('drops gross multi-day anomaly beyond seven days', () => {
  assert.equal(hygiene.normalizeSession({ id: 'bad', durationMinutes: 21164 }), null);
});

test('drops exact 48h Trackify sentinel without trustworthy shorter timestamps', () => {
  assert.equal(hygiene.normalizeSession({ id: 'bad48', durationMinutes: 2880, measurement: 'trackify-session' }), null);
  assert.equal(hygiene.normalizeSession({ id: 'bad48b', durationMinutes: 2880, measurement: 'trackify-session', startedAt: '2026-06-24T00:00:00Z', endedAt: '2026-06-26T00:00:00Z' }), null);
});

test('uses elapsed timestamps when explicit duration is a stale 48h value', () => {
  const item = hygiene.normalizeSession({ id: 'fixed', durationMinutes: 2880, measurement: 'trackify-session', startedAt: '2026-06-24T00:00:00Z', endedAt: '2026-06-24T05:20:00Z' });
  assert.equal(item.durationMinutes, 320);
});

test('dedupes overlapping same-title sessions even when broadcast ids differ', () => {
  const items = hygiene.dedupeSessions([
    { id: 'a', broadcastId: 'fan-1', title: '그냥서버:적자생존 오픈합니다.', startedAt: '2026-09-30T09:00:00Z', endedAt: '2026-09-30T11:51:00Z', durationMinutes: 171, measurement: 'fan-site-sampled-5m', viewerSampleCount: 20 },
    { id: 'b', broadcastId: 'track-9', title: '그냥서버:적자생존 오픈합니다.', startedAt: '2026-09-30T09:02:00Z', endedAt: '2026-09-30T13:12:00Z', durationMinutes: 250, measurement: 'trackify-session' }
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].durationMinutes, 252);
});

test('keeps separate same-title broadcasts when their time ranges do not overlap', () => {
  const items = hygiene.dedupeSessions([
    { id: 'a', title: '소통', startedAt: '2026-09-20T01:00:00Z', endedAt: '2026-09-20T03:00:00Z', durationMinutes: 120 },
    { id: 'b', title: '소통', startedAt: '2026-09-20T10:00:00Z', endedAt: '2026-09-20T12:00:00Z', durationMinutes: 120 }
  ]);
  assert.equal(items.length, 2);
});

test('splits a live broadcast at KST midnight', () => {
  const segments = hygiene.projectLiveSegments({
    live: true,
    broadcastId: 'live-1',
    startedAt: '2026-09-30T14:00:00Z',
    title: '자정 넘김',
    categoryName: 'Minecraft'
  }, new Date('2026-09-30T16:30:00Z'));
  assert.deepEqual(segments.map(row => [row.date, row.durationMinutes]), [
    ['2026-09-30', 60],
    ['2026-10-01', 90]
  ]);
});

test('removes stored partial session that overlaps the currently live broadcast', () => {
  const sessions = [
    { id: 'partial', broadcastId: 'track-1', title: '오픈 방송', startedAt: '2026-09-30T14:00:00Z', endedAt: '2026-09-30T15:00:00Z', durationMinutes: 60 },
    { id: 'older', title: '오픈 방송', startedAt: '2026-09-29T01:00:00Z', endedAt: '2026-09-29T02:00:00Z', durationMinutes: 60 }
  ];
  const filtered = hygiene.removeLiveDuplicates(sessions, { live: true, broadcastId: 'soop-999', title: '오픈 방송', startedAt: '2026-09-30T14:00:00Z' }, new Date('2026-09-30T16:30:00Z'));
  assert.deepEqual(filtered.map(row => row.id), ['older']);
});
