import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry=fs.readFileSync(new URL('../operator-redis-diagnostics.js',import.meta.url),'utf8');
const optimizer=fs.readFileSync(new URL('../operator-redis-diagnostics-core.js',import.meta.url),'utf8');
const diagnostics=fs.readFileSync(new URL('../lib/redis-command-diagnostics.js',import.meta.url),'utf8');
const operator=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');

assert.match(entry,/operator-soop-diagnostics\.js/,'operator entry should load SOOP diagnostics');
assert.match(entry,/operator-redis-diagnostics-core\.js/,'operator entry should preserve the Redis diagnostics runtime');
assert.match(optimizer,/installOperatorRequestOptimizer/,'operator request optimizer missing');
assert.match(optimizer,/SECURITY_LOG_CACHE_MS=5\*60\*1000/,'security log cache must be five minutes');
assert.match(optimizer,/operator-system-status/,'system status boot deferral missing');
assert.match(optimizer,/operator-content-archive/,'archive health boot deferral missing');
assert.match(optimizer,/operator-security-log/,'security log cache endpoint missing');
assert.match(optimizer,/operator-security-refresh/,'manual security refresh must invalidate the browser cache');
assert.match(optimizer,/data-operator-tab/,'tab activation must release deferred operator requests');
assert.match(optimizer,/cache\.response\.clone\(\)/,'cached security responses must be cloned before reuse');

assert.match(operator,/Promise\.allSettled\(\[loadAnalytics\(\),loadSystemStatus\(\),loadArchiveHealth\(\)\]\)/,'boot call shape changed; re-evaluate optimizer deferral');
assert.match(api,/if\(deepStorage&&redisConfigured&&!circuitLimited\)/,'direct Redis storage probes must stay behind explicit deep-storage mode');
assert.match(api,/publicEndpointHealth\(base,\{includePush:deepStorage\}\)/,'storage-backed Push probe must stay manual/deep only');
assert.doesNotMatch(api,/\['LLEN'/,'unsupported LLEN probe must not return');
assert.match(diagnostics,/BLOCKED_DIAGNOSTIC_REDIS_COMMANDS/,'nonessential Redis diagnostic command guard missing');
assert.match(diagnostics,/new Set\(\['DBSIZE','INFO'\]\)/,'DBSIZE and INFO diagnostic probes must be blocked before reaching managed Redis');

console.log('operator request optimizer regression passed');
