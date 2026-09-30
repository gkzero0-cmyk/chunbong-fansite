'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','operator-redis-diagnostics.js'),'utf8');

test('operator Redis diagnostics exposes a visible degraded read-only mode',()=>{
  assert.match(source,/operator-redis-limit-banner/,'Redis limit banner must be rendered');
  assert.match(source,/setRedisDegradedMode/,'degraded mode state helper is required');
  assert.match(source,/redisCircuitOpen/,'system status circuit state must drive degraded mode');
  assert.match(source,/redisCircuitUntil/,'circuit retry time must be shown');
});

test('Redis-dependent operator mutations are blocked while degraded',()=>{
  assert.match(source,/REDIS_DEPENDENT_MUTATIONS/,'explicit Redis mutation allowlist is required');
  for(const type of ['operator-feedback-update','operator-recovery-mode','operator-session-revoke','operator-logout-all','push-dispatch']){
    assert.match(source,new RegExp(type.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${type} must be protected`);
  }
  assert.match(source,/operator_read_only/,'blocked writes need a stable operator_read_only error');
});

test('read-only mode never blocks normal logout or GET diagnostics',()=>{
  assert.doesNotMatch(source,/REDIS_DEPENDENT_MUTATIONS[^;]*operator-logout['"]/,'current-device logout must remain available');
  assert.match(source,/const method=requestMethod\(input,init\),type=operatorRequestType\(input\)/,'request method classification must remain explicit');
  assert.match(source,/if\(method!=='GET'\)\{/,'write and GET paths must remain separated');
  const lockBody=source.match(/function applyWriteLocks\(active\)\{([\s\S]*?)\n\}/)?.[1]||'';
  assert.doesNotMatch(lockBody,/operator-redis-refresh/,'Redis detail refresh is a diagnostic GET and must remain available');
});

test('degraded write locks are reapplied to controls rendered after mode activation',()=>{
  assert.match(source,/MutationObserver/,'dynamic session controls need a mutation observer');
  assert.match(source,/applyWriteLocks\(redisDegradedState\.active\)/,'new controls must inherit the current degraded lock state');
});
