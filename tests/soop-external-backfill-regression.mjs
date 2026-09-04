import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const historyPath = path.join(root, 'data', 'soop-external-history.json');
const sessionPath = path.join(root, 'data', 'soop-sessions.json');
assert.ok(fs.existsSync(historyPath), 'external SOOP history file should exist');
assert.ok(fs.existsSync(sessionPath), 'SOOP session store should exist');

const historyText = fs.readFileSync(historyPath, 'utf8');
const history = JSON.parse(historyText);
assert.equal(history.cutoffKst, '2026-09-03');
assert.equal(history.sourceSummary, null);
assert.equal(history.categoryReference, null);
assert.deepEqual(history.sessions, [], 'legacy public backfill must stay removed');
assert.ok(!/Streams Charts|streamscharts|auro\.live/i.test(historyText), 'legacy provider references must stay removed');

const sessionText = fs.readFileSync(sessionPath, 'utf8');
const sessionStore = JSON.parse(sessionText);
assert.ok(Array.isArray(sessionStore.sessions));
assert.equal(sessionStore.sessions.filter(item => item.measurement === 'external-public-record').length, 0, 'legacy external sessions must not remain in the measured store');
assert.ok(!/Streams Charts|streamscharts|auro\.live/i.test(sessionText), 'session store must not contain legacy provider references');

const analyticsUrl = pathToFileURL(path.join(root, 'lib', 'soop-analytics.js')).href;
const analytics = await import(analyticsUrl);
const result = analytics.buildSoopAnalytics(sessionStore.sessions, [], { live: false }, new Date('2026-09-05T00:00:00Z'));
assert.equal(result.overview.measuredTotalMinutes, sessionStore.sessions.reduce((sum, item) => sum + (Number.isFinite(item?.durationMinutes) ? item.durationMinutes : 0), 0));

console.log('SOOP legacy external-history removal regression test passed');
