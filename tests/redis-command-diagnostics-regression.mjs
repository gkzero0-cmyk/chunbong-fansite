import fs from 'node:fs';
import assert from 'node:assert/strict';

const contentApi=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const modulePath=new URL('../lib/redis-command-diagnostics.js',import.meta.url);
const uiPath=new URL('../operator-redis-diagnostics.js',import.meta.url);

assert.ok(fs.existsSync(modulePath),'Redis diagnostics module missing');
assert.ok(fs.existsSync(uiPath),'Redis diagnostics browser module missing');
const diagnostics=fs.readFileSync(modulePath,'utf8');
const ui=fs.readFileSync(uiPath,'utf8');

assert.match(contentApi,/redis-command-diagnostics/,'content API must install Redis diagnostics');
assert.match(contentApi,/operator-redis-diagnostics/,'protected diagnostics route missing');
assert.match(diagnostics,/installRedisCommandDiagnostics/,'global Redis fetch observer missing');
assert.match(diagnostics,/redisCommandDiagnosticsMemory/,'in-memory Redis diagnostics state missing');
assert.match(diagnostics,/recordRedisDiagnostic/,'Redis command diagnostic recorder missing');
assert.match(diagnostics,/redisDiagnosticsSnapshot/,'Redis diagnostics snapshot helper missing');
assert.match(diagnostics,/categoryForRedisCommand/,'Redis command category mapping missing');
assert.match(diagnostics,/featureForRedisKey/,'Redis feature mapping missing');
assert.match(diagnostics,/officialMonthlyUsageSource:'upstash-console'/,'Vercel-managed Upstash must identify console as official monthly source');
assert.match(diagnostics,/estimatedExtraRedisCommands:0/,'diagnostics must declare zero extra Redis commands');
assert.doesNotMatch(diagnostics,/fetch\([^\n]*DIAGNOSTIC/i,'diagnostics must not write its own counters to Redis');
assert.doesNotMatch(diagnostics,/redisCommand\(/,'diagnostics must not call Redis helpers');

assert.match(html,/system-redis-diagnostics/,'Redis diagnostics panel missing');
assert.match(html,/system-redis-diagnostics-commands/,'Redis command breakdown container missing');
assert.match(html,/system-redis-diagnostics-features/,'Redis feature breakdown container missing');
assert.match(ui,/renderRedisDiagnostics/,'Redis diagnostics renderer missing');
assert.match(ui,/실시간 진단 표본/,'UI must label memory diagnostics as a sample, not official monthly usage');
assert.match(ui,/Upstash Usage/,'UI must point to Upstash Usage as the official monthly source');
assert.match(ui,/localStorage/,'browser must retain a local diagnostics snapshot without Redis');

console.log('Redis command diagnostics regression passed');
