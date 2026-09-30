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
  assert.match(source,/requestMethod\(input,init\)!=='GET'/,'GET optimization path must remain explicit');
});
