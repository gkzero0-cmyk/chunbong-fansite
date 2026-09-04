import assert from 'node:assert/strict';
import { buildTrackifyCache } from '../scripts/update-trackify-soop-cache.mjs';

assert.equal(typeof buildTrackifyCache, 'function', 'Trackify cache builder should be exported');

const previous = {
  version: 1,
  capturedAt: '2026-09-03T00:00:00.000Z',
  stats: { followerCount: 29780, subscriberCount: 20, source: 'trackify' },
  sessions: [
    { id: 'trackify-1', startedAt: '2026-08-01T10:00:00+09:00', date: '2026-08-01', durationMinutes: 60, averageViewers: 10 }
  ]
};
const fresh = {
  stats: { followerCount: 29783, subscriberCount: null, source: 'trackify' },
  sessions: [
    { id: 'trackify-1', startedAt: '2026-08-01T10:00:00+09:00', date: '2026-08-01', durationMinutes: 65, averageViewers: 11 },
    { id: 'trackify-2', startedAt: '2026-08-02T10:00:00+09:00', date: '2026-08-02', durationMinutes: 120, averageViewers: 20 }
  ]
};

const next = buildTrackifyCache(previous, fresh, new Date('2026-09-04T12:00:00.000Z'));
assert.equal(next.version, 1);
assert.equal(next.capturedAt, '2026-09-04T12:00:00.000Z');
assert.equal(next.stats.followerCount, 29783, 'fresh finite Trackify metrics should replace cached values');
assert.equal(next.stats.subscriberCount, 20, 'missing fresh Trackify metrics should retain the last good cached value');
assert.deepEqual(next.sessions.map(item => item.id), ['trackify-1', 'trackify-2']);
assert.equal(next.sessions[0].durationMinutes, 65, 'fresh session detail should replace cached session with the same id');

const outage = buildTrackifyCache(next, { stats: null, sessions: [] }, new Date('2026-09-05T12:00:00.000Z'));
assert.equal(outage.stats.followerCount, 29783, 'temporary Trackify failure must not erase the last good stats');
assert.equal(outage.sessions.length, 2, 'temporary Trackify failure must not erase historical sessions');
assert.equal(outage.capturedAt, next.capturedAt, 'outage must preserve the last successful capture time');

console.log('Trackify cache regression test passed');
