import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const historyPath = path.join(root, 'data', 'soop-external-history.json');
assert.ok(fs.existsSync(historyPath), 'external SOOP history file should exist');
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
assert.equal(history.cutoffKst, '2026-09-03');
assert.equal(history.sourceSummary.name, 'Streams Charts');
assert.ok(history.sessions.length >= 19, 'at least 19 pre-Sep-3 public stream records should be backfilled');
assert.ok(history.sessions.every(item => item.measurement === 'external-public-record'));
assert.ok(history.sessions.every(item => item.date < '2026-09-03'), 'today KST must not be included in historical backfill');
assert.equal(history.sessions.reduce((sum, item) => sum + item.durationMinutes, 0), 12170);
assert.ok(history.sessions.some(item => item.date === '2026-09-02' && item.averageViewers === 44));
assert.ok(history.sessions.every(item => item.maxViewers === null), 'per-stream peak must stay null when source does not expose it publicly');
assert.ok(history.categoryReference.categories.some(item => item.name === 'Minecraft' && item.minutes === 7005));

const analyticsUrl = pathToFileURL(path.join(root, 'lib', 'soop-analytics.js')).href;
const analytics = await import(analyticsUrl);
const result = analytics.buildSoopAnalytics(history.sessions, [], { live: false }, new Date('2026-09-03T11:00:00Z'));
assert.equal(result.overview.measuredTotalMinutes, 12170);
assert.ok(result.daily.some(item => item.date === '2026-08-25' && item.streamCount === 3));
assert.ok(result.monthly.some(item => item.month === '2026-08'));

console.log('SOOP external backfill regression test passed');
