import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const diagnostics=fs.readFileSync(new URL('../operator-redis-diagnostics-core.js',import.meta.url),'utf8');

assert.match(api,/function hasDedicatedOperatorRedis\(\)\{return operatorRedisMode\(\)==='dedicated'\}/);
assert.match(api,/function legacySharedRedisConfigured\(\)/,'system status should expose whether legacy shared Redis exists without reading it');
assert.match(api,/operatorMigration:\{[^}]*dedicatedConfigured:hasDedicatedOperatorRedis\(\)[^}]*legacySharedConfigured:legacySharedRedisConfigured\(\)/s);

assert.match(api,/async function setSession[\s\S]*?if\(hasDedicatedOperatorRedis\(\)\)\{/,'session metadata must not write to shared Redis');
assert.match(api,/async function logSecurity[\s\S]*?if\(!hasDedicatedOperatorRedis\(\)\)return;/,'security logging must not write to shared Redis');
assert.match(api,/if\(details&&hasDedicatedOperatorRedis\(\)&&redisCircuitOpenUntil<=Date\.now\(\)\)/,'session detail list must not read shared Redis');
assert.match(api,/async function handleOperatorAnalytics[\s\S]*?if\(!hasDedicatedOperatorRedis\(\)\)[\s\S]*?analytics_migration_pending/,'analytics reads should degrade without probing shared Redis');
assert.match(api,/async function handleOperatorSecurityLog[\s\S]*?if\(!hasDedicatedOperatorRedis\(\)\)[\s\S]*?security_log_migration_pending/,'security-log reads should degrade without probing shared Redis');

assert.match(diagnostics,/전용 Operator Redis/);
assert.match(diagnostics,/RDB/);
assert.match(diagnostics,/isolatedStores\?\.operator|isolatedStores\.operator/);

assert.doesNotMatch(api,/DEL[^\n]*legacy/i,'cutover preparation must never delete legacy shared data');

console.log('operator dedicated-store cutover regression passed');
