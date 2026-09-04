import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const dataCss = fs.readFileSync(path.join(root, 'data.css'), 'utf8');
const soopExternal = fs.readFileSync(path.join(root, 'lib', 'soop-external.js'), 'utf8');
const dataApi = fs.readFileSync(path.join(root, 'lib', 'chunbong-data.js'), 'utf8');

assert.ok(dataJs.includes('normalizeDailyTrendRows'), 'YouTube trends should normalize, sort, and deduplicate daily snapshots');
assert.ok(dataJs.includes('formatFullDate'), 'chart hover should expose full calendar dates');
assert.ok(dataJs.includes('optionalKpi'), 'SOOP KPIs should be omitted when no real value exists');
assert.ok(!dataJs.includes("['trackify','auro','softc','streamscharts']"), 'SOOP source chips should not expose external sources');
assert.ok(!dataJs.includes("kpi('외부 30일 참고'"), 'Streams Charts reference KPI must be removed');
assert.ok(!dataJs.includes('data-source-strip'), 'SOOP source strip must not render');
assert.ok(!dataJs.includes("measurementBadge(o.externalFieldSources"), 'SOOP KPI source badges must not render');

assert.ok(dataCss.includes('.data-chart-head strong{font-size:18px'), 'chart titles should be larger');
assert.ok(dataCss.includes('.data-chart-head b{font-size:28px'), 'chart current values should be larger');
assert.ok(dataCss.includes('.data-chart-svg .chart-labels text{fill:#777;font-size:13px'), 'chart dates should be larger');
assert.ok(dataCss.includes('.data-chart-hover-card text{fill:#aaa;font-size:13px'), 'hover dates should be larger');
assert.ok(dataCss.includes('.data-chart-hover-card text.value{fill:#fff;font-size:17px'), 'hover values should be larger');

assert.ok(!soopExternal.includes('auroHome'), 'Auro source should be removed');
assert.ok(!soopExternal.includes('auroFollowers'), 'Auro follower history should be removed');
assert.ok(!soopExternal.includes('streamsCharts'), 'Streams Charts source should be removed');
assert.ok(soopExternal.includes("['trackify', SOURCES.trackify]"), 'Trackify must remain the primary external source');
assert.ok(soopExternal.indexOf("['trackify', SOURCES.trackify]") < soopExternal.indexOf("['softc', SOURCES.softc]"), 'Trackify must be attempted before Softc');

assert.ok(dataApi.includes('filterLegacyExternalHistory'), 'legacy Auro/Streams Charts history should be filtered from API output');
assert.ok(!dataApi.includes('sourceSummary: externalHistory.sourceSummary || null'), 'legacy Streams Charts source summary must not be exposed');

console.log('Trackify-first data dashboard UX regression test passed');
