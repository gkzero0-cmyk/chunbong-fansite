import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataHtml = fs.readFileSync(path.join(root, 'data.html'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const soopExternal = fs.readFileSync(path.join(root, 'lib', 'soop-external.js'), 'utf8');
const enhancementsPath = path.join(root, 'data-enhancements.js');
const enhancementsCssPath = path.join(root, 'data-enhancements.css');
const externalHistoryPath = path.join(root, 'data', 'soop-external-history.json');
const productionSmokePath = path.join(root, '.github', 'workflows', 'production-data-smoke.yml');
const snapshotWorkflowPath = path.join(root, '.github', 'workflows', 'chunbong-data-snapshot.yml');
const siteRegressionPath = path.join(root, '.github', 'workflows', 'site-regression.yml');
const trackifyCachePath = path.join(root, 'data', 'trackify-soop-cache.json');
const trackifyUpdaterPath = path.join(root, 'scripts', 'update-trackify-soop-cache.mjs');

assert.ok(fs.existsSync(enhancementsPath), 'data enhancement script should exist');
assert.ok(fs.existsSync(enhancementsCssPath), 'data enhancement stylesheet should exist');
assert.ok(fs.existsSync(trackifyCachePath), 'persistent Trackify cache should exist');
assert.ok(fs.existsSync(trackifyUpdaterPath), 'Trackify cache updater should exist');
execFileSync(process.execPath, ['--check', enhancementsPath], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', trackifyUpdaterPath], { stdio: 'pipe' });
const enhancements = fs.readFileSync(enhancementsPath, 'utf8');
const enhancementsCss = fs.readFileSync(enhancementsCssPath, 'utf8');
const externalHistoryText = fs.readFileSync(externalHistoryPath, 'utf8');
const externalHistory = JSON.parse(externalHistoryText);
const productionSmoke = fs.readFileSync(productionSmokePath, 'utf8');
const snapshotWorkflow = fs.readFileSync(snapshotWorkflowPath, 'utf8');
const siteRegression = fs.readFileSync(siteRegressionPath, 'utf8');

assert.equal(externalHistory.sourceSummary, null, 'legacy Streams Charts summary should be removed at the data source');
assert.equal(externalHistory.categoryReference, null, 'legacy Streams Charts category reference should be removed at the data source');
assert.deepEqual(externalHistory.sessions, [], 'legacy external backfill sessions should be removed at the data source');
assert.ok(!/Streams Charts|streamscharts|auro\.live/i.test(externalHistoryText), 'legacy Auro/Streams Charts references must not remain in SOOP history');

assert.ok(dataHtml.includes('data-enhancements.css'), 'data page should load chart readability overrides');
assert.ok(dataHtml.includes('data-enhancements.js'), 'data page should load data transformation layer');
assert.ok(dataHtml.indexOf('data-enhancements.js') < dataHtml.indexOf('data.js'), 'enhancement fetch wrapper must load before data.js');
assert.ok(!dataHtml.includes('Streams Charts'), 'Streams Charts must not be mentioned on the data page');
assert.ok(!dataHtml.includes('측정 불가'), 'data page explanatory copy should no longer advertise unavailable metrics');

for (const marker of ['normalizeDailyTrendRows', 'formatFullDate', 'stripLegacySoopData', 'hideUnavailableSoopCards', 'installDataFetchTransform']) {
  assert.ok(enhancements.includes(marker), `enhancement script should include ${marker}`);
}
assert.ok(enhancements.includes("'측정 불가'"), 'unavailable SOOP KPI cards should be removed instead of displayed');
assert.ok(enhancements.includes("'외부 30일 참고'"), 'legacy external reference card should be removed');
assert.ok(enhancements.includes('sourceSummary:null'), 'legacy source summary should be stripped from client payload');
assert.ok(enhancements.includes('categoryReference:null'), 'legacy category reference should be stripped from client payload');
assert.ok(enhancements.includes('cutoffKst'), 'measurement cutoff should remain available to protect the measured data range');

for (const marker of [
  '.data-chart-head strong{font-size:18px',
  '.data-chart-head b{font-size:28px',
  '.data-chart-svg .chart-labels text{font-size:13px',
  '.data-chart-value{font-size:14px',
  '.data-chart-hover-card text{font-size:13px',
  '.data-chart-hover-card text.value{font-size:17px'
]) {
  assert.ok(enhancementsCss.includes(marker), `chart readability CSS should include ${marker}`);
}

assert.ok(!soopExternal.includes('auroHome'), 'Auro source should be removed');
assert.ok(!soopExternal.includes('auroFollowers'), 'Auro follower history should be removed');
assert.ok(!soopExternal.includes('streamsCharts'), 'Streams Charts source should be removed');
assert.ok(soopExternal.includes('fetchTrackifySoopHistory'), 'Trackify broadcast history collector must exist');
assert.ok(soopExternal.includes('const trackifyPromise = fetchTrackifySoopHistory'), 'Trackify must remain the primary external source');
assert.ok(soopExternal.indexOf('const trackifyPromise = fetchTrackifySoopHistory') < soopExternal.indexOf("const softcRequests = [['softc', SOURCES.softc]"), 'Trackify must be attempted before Softc');

assert.ok(snapshotWorkflow.includes("node-version: '24'"), 'snapshot workflow should use Node 24');
assert.ok(snapshotWorkflow.includes('node scripts/update-trackify-soop-cache.mjs'), 'snapshot workflow must refresh Trackify history before the fan-site snapshot');
assert.ok(snapshotWorkflow.includes('data/trackify-soop-cache.json'), 'snapshot workflow must commit the persistent Trackify cache');
assert.ok(snapshotWorkflow.includes('branches: [main]'), 'snapshot workflow push trigger must target main after feature validation');
assert.ok(!snapshotWorkflow.includes('fix/trackify-soop-history'), 'snapshot workflow must not retain the temporary feature-branch trigger');
assert.ok(siteRegression.includes('node --check scripts/update-trackify-soop-cache.mjs'), 'site regression must syntax-check the Trackify updater');
assert.ok(!siteRegression.includes('Probe live Chunbong Trackify API'), 'temporary live Trackify diagnostic step must be removed before merge');
assert.ok(!siteRegression.includes('TRACKIFY_PROBE_SUMMARY'), 'temporary Trackify diagnostic output must be removed before merge');

for (const marker of [
  "'data-enhancements.js'",
  "'data-enhancements.css'",
  "'data/soop-external-history.json'",
  "'data/trackify-soop-cache.json'",
  "'/data-enhancements.js'",
  "'/data-enhancements.css'",
  'normalizeDailyTrendRows',
  'sourceSummary === null',
  'legacySessionCount',
  'trackifyHistorySessionCount',
  'result.apiSummary.arrayCounts.daily > 0',
  'result.apiSummary.arrayCounts.monthlyStats > 0',
  'result.apiSummary.arrayCounts.calendar > 0',
  'result.apiSummary.arrayCounts.recentSessions > 0'
]) {
  assert.ok(productionSmoke.includes(marker), `production smoke should verify ${marker}`);
}
assert.ok(productionSmoke.includes('git pull --rebase origin main'), 'production smoke result commit must rebase before push to survive concurrent snapshot updates');

assert.ok(dataJs.includes('createSvgChart'), 'existing shared SOOP/YouTube interactive chart renderer must remain in use');

console.log('Trackify-first data dashboard UX regression test passed');
