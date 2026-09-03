import assert from 'node:assert/strict';
import { advanceTelemetry } from '../scripts/collect-soop-telemetry.mjs';
import { applySessionStore } from '../scripts/apply-soop-session.mjs';

const empty = { version: 1, session: null, lastProfile: null };

const offline1 = advanceTelemetry(empty, {
  capturedAt: '2026-09-03T10:00:00.000Z', live: false,
  followerCount: 1000, fanclubCount: 50
});
assert.equal(offline1.state.session, null);
assert.equal(offline1.finalizedSession, null);
assert.equal(offline1.state.lastProfile.followerCount, 1000);

const start = advanceTelemetry(offline1.state, {
  capturedAt: '2026-09-03T10:05:00.000Z', live: true,
  startedAt: '2026-09-03T10:04:00.000Z', title: '첫 방송', viewerCount: 30,
  categoryId: 'v', categoryName: '버추얼', followerCount: 1001, fanclubCount: 50
});
assert.equal(start.state.session.active, true);
assert.equal(start.state.session.sessionId, '2026-09-03T10:04:00.000Z');
assert.equal(start.state.session.samples.length, 1);
assert.equal(start.finalizedSession, null);

const middle = advanceTelemetry(start.state, {
  capturedAt: '2026-09-03T10:10:00.000Z', live: true,
  startedAt: '2026-09-03T10:04:00.000Z', title: '첫 방송', viewerCount: 40,
  categoryId: 'g', categoryName: '종합게임', followerCount: 1003, fanclubCount: 51
});
assert.equal(middle.state.session.samples.length, 2);
assert.equal(middle.state.session.title, '첫 방송');
assert.equal(middle.state.lastProfile.followerCount, 1003);

const duplicateTime = advanceTelemetry(middle.state, {
  capturedAt: '2026-09-03T10:10:00.000Z', live: true,
  startedAt: '2026-09-03T10:04:00.000Z', title: '첫 방송', viewerCount: 41,
  categoryId: 'g', categoryName: '종합게임', followerCount: 1003, fanclubCount: 51
});
assert.equal(duplicateTime.state.session.samples.length, 2, 'same capturedAt should replace rather than duplicate');
assert.equal(duplicateTime.state.session.samples.at(-1).viewerCount, 41);

const end = advanceTelemetry(duplicateTime.state, {
  capturedAt: '2026-09-03T10:20:00.000Z', live: false,
  followerCount: 1005, fanclubCount: 52
});
assert.equal(end.state.session, null);
assert.ok(end.finalizedSession);
assert.equal(end.finalizedSession.id, '2026-09-03T10:04:00.000Z');
assert.equal(end.finalizedSession.durationMinutes, 16);
assert.equal(end.finalizedSession.averageViewers, 36);
assert.equal(end.finalizedSession.maxViewers, 41);
assert.equal(end.finalizedSession.followerDelta, 2, 'session uses first/last live samples, not offline profile sample');
assert.equal(end.finalizedSession.fanclubDelta, 1);
assert.equal(end.state.lastProfile.followerCount, 1005);

const store1 = applySessionStore({ version: 1, sessions: [] }, end.finalizedSession);
assert.equal(store1.sessions.length, 1);
const store2 = applySessionStore(store1, { ...end.finalizedSession, maxViewers: 45 });
assert.equal(store2.sessions.length, 1);
assert.equal(store2.sessions[0].maxViewers, 45);

const idle = advanceTelemetry(end.state, {
  capturedAt: '2026-09-03T10:25:00.000Z', live: false,
  followerCount: 1005, fanclubCount: 52
});
assert.equal(idle.finalizedSession, null, 'offline after finalized session must not finalize again');

console.log('SOOP telemetry regression test passed');
