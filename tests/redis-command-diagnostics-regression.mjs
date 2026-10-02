import fs from 'node:fs';
import assert from 'node:assert/strict';

const vod=fs.readFileSync(new URL('../lib/content-api/vod.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const modulePath=new URL('../lib/redis-command-diagnostics.js',import.meta.url);
const entryPath=new URL('../operator-redis-diagnostics.js',import.meta.url);
const uiPath=new URL('../operator-redis-diagnostics-core.js',import.meta.url);

assert.ok(fs.existsSync(modulePath),'Redis diagnostics module missing');
assert.ok(fs.existsSync(entryPath),'Redis diagnostics browser entry missing');
assert.ok(fs.existsSync(uiPath),'Redis diagnostics browser core missing');
const diagnostics=fs.readFileSync(modulePath,'utf8');
const entry=fs.readFileSync(entryPath,'utf8');
const ui=fs.readFileSync(uiPath,'utf8');

assert.match(vod,/redis-command-diagnostics/,'api/content cold start must install Redis diagnostics before Redis-using modules run');
assert.match(vod,/installRedisCommandDiagnostics/,'Redis diagnostics installer missing from the first content module');
assert.match(diagnostics,/installRedisCommandDiagnostics/,'global Redis fetch observer missing');
assert.match(diagnostics,/redisCommandDiagnosticsMemory/,'in-memory Redis diagnostics state missing');
assert.match(diagnostics,/recordRedisDiagnostic/,'Redis command diagnostic recorder missing');
assert.match(diagnostics,/redisDiagnosticsSnapshot/,'Redis diagnostics snapshot helper missing');
assert.match(diagnostics,/categoryForRedisCommand/,'Redis command category mapping missing');
assert.match(diagnostics,/featureForRedisKey/,'Redis feature mapping missing');
assert.match(diagnostics,/handleOperatorSystemStatus/,'operator system status must be augmented without a second Redis endpoint');
assert.match(diagnostics,/officialMonthlyUsageSource:'upstash-console'/,'Vercel-managed Upstash must identify console as official monthly source');
assert.match(diagnostics,/estimatedExtraRedisCommands:0/,'diagnostics must declare zero extra Redis commands');
assert.doesNotMatch(diagnostics,/redisCommand\(/,'diagnostics must not call Redis helpers');

assert.match(html,/operator-redis-diagnostics\.js/,'operator page must load the Redis diagnostics entry');
assert.match(entry,/operator-redis-diagnostics-core\.js/,'operator entry must keep loading the Redis diagnostics core');
assert.match(ui,/system-redis-diagnostics/,'Redis diagnostics panel injection missing');
assert.match(ui,/system-redis-diagnostics-commands/,'Redis command breakdown container missing');
assert.match(ui,/system-redis-diagnostics-features/,'Redis feature breakdown container missing');
assert.match(ui,/renderRedisDiagnostics/,'Redis diagnostics renderer missing');
assert.match(ui,/실시간 진단 표본/,'UI must label memory diagnostics as a sample, not official monthly usage');
assert.match(ui,/Upstash Usage/,'UI must point to Upstash Usage as the official monthly source');
assert.match(ui,/localStorage/,'browser must retain a local diagnostics snapshot without Redis');

console.log('Redis command diagnostics regression passed');
