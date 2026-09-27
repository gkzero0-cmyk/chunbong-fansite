import fs from 'node:fs';
import assert from 'node:assert/strict';

const client=fs.readFileSync(new URL('../site-analytics.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
assert.match(client,/activePending>=120000/);
assert.match(client,/\},120000\);/);
assert.doesNotMatch(client,/activePending>=15000/);
assert.match(api,/hasPageView=events\.some/);
assert.match(api,/if\(hasPageView\)commands\.push/);
assert.match(api,/Math\.min\(300000,Math\.round\(Number\(event\.activeMs\)/);
const baseStart=api.indexOf('const commands=[');
const pageGate=api.indexOf('if(hasPageView)commands.push',baseStart);
const visitorPf=api.indexOf("['PFADD',keys.visitors",baseStart);
assert.ok(baseStart>=0&&pageGate>baseStart&&visitorPf>pageGate);
console.log('analytics Redis budget regression passed');

const ingest=api.slice(api.indexOf('async function ingestAnalytics'),api.indexOf('/* Privacy guard'));
assert.doesNotMatch(ingest,/allKeys\./,'analytics ingestion must not duplicate every write into all-time keys');
assert.doesNotMatch(ingest,/analyticsKeys\('all'\)/,'analytics ingestion must be daily-key only');
assert.doesNotMatch(ingest,/ZREMRANGEBYSCORE',ACTIVE_KEY/,'active-user pruning should happen on operator reads, not every analytics write');
assert.match(api,/const aggregateDates=all\?recordedDates:requestedDates;/,'all-time analytics must aggregate from daily keys');
