import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');

assert.match(api,/redisCommandDiagnosticsMemory/,'in-memory Redis diagnostics state missing');
assert.match(api,/recordRedisDiagnostic/,'Redis command diagnostic recorder missing');
assert.match(api,/redisDiagnosticsSnapshot/,'Redis diagnostics snapshot helper missing');
assert.match(api,/categoryForRedisCommand/,'Redis command category mapping missing');
assert.match(api,/recordRedisDiagnostic\(command,1/,'single Redis commands must be counted without extra Redis calls');
assert.match(api,/recordRedisDiagnostic\(String\(row\?\[0\]\|\|'UNKNOWN'\),1/,'pipeline commands must be counted individually');
assert.match(api,/diagnostics:redisDiagnosticsSnapshot\(\)/,'system status must expose Redis diagnostics from memory');
assert.match(api,/officialMonthlyUsageSource:'upstash-console'/,'Vercel-managed Upstash must identify console as official monthly source');
assert.doesNotMatch(api,/redisCommand\([^\n]*DIAGNOSTIC/i,'diagnostics must not persist itself into Redis');

assert.match(html,/system-redis-diagnostics/,'Redis diagnostics panel missing');
assert.match(html,/system-redis-diagnostics-commands/,'Redis command breakdown container missing');
assert.match(html,/system-redis-diagnostics-categories/,'Redis category breakdown container missing');
assert.match(ui,/renderRedisDiagnostics/,'Redis diagnostics renderer missing');
assert.match(ui,/실시간 진단 표본/,'UI must label memory diagnostics as a sample, not official monthly usage');
assert.match(ui,/Upstash Usage/,'UI must point to Upstash Usage as the official monthly source');

console.log('Redis command diagnostics regression passed');
