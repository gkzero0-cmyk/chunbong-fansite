import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');

assert.match(source,/redisCommand\('MGET',\.\.\.keys\)/,'operator bulk reads must use one MGET command');
for(const prefix of ['FEEDBACK_PREFIX','SESSION_META_PREFIX','SECURITY_PREFIX','HEALTH_PREFIX']){
  assert.match(source,new RegExp('redisMget\\([^\\n]*'+prefix),'operator '+prefix+' reads must be batched');
}
assert.match(source,/const ANALYTICS_CACHE_MS=20000/,'operator analytics cache must stay short-lived');
assert.match(source,/cached&&now-cached\.at<ANALYTICS_CACHE_MS/,'repeated analytics reads must use the short cache');
assert.match(source,/await cachedAnalyticsOverview\(query\(req\)\.get\('days'\)\|\|7\)/,'operator analytics endpoint must use the cache');
assert.doesNotMatch(source,/AUTH_EPOCH_CACHE|authEpochCache/,'auth epoch must not be cached across requests because logout-all revocation must remain immediate');
assert.match(source,/\['INCR',AUTH_EPOCH_KEY\]/,'logout-all must still invalidate every existing session epoch');

console.log('operator Redis read optimization regression passed');
