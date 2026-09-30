'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {resolveRealtimeRedisEnv,realtimeRedisMode}=require('../lib/realtime-redis-env');

const operatorApi=fs.readFileSync(path.join(__dirname,'..','lib','operator-center-api.js'),'utf8');
const operatorUi=fs.readFileSync(path.join(__dirname,'..','operator.js'),'utf8');

test('feature-specific Redis credentials win over shared fallbacks',()=>{
  const env={
    PUSH_REDIS_REST_URL:'https://push.example',PUSH_REDIS_REST_TOKEN:'push-token',
    REALTIME_REDIS_REST_URL:'https://realtime.example',REALTIME_REDIS_REST_TOKEN:'realtime-token',
    KV_REST_API_URL:'https://shared.example',KV_REST_API_TOKEN:'shared-token'
  };
  assert.deepEqual(resolveRealtimeRedisEnv('push',env),{url:'https://push.example',token:'push-token'});
  assert.equal(realtimeRedisMode('push',env),'feature-dedicated');
  assert.equal(realtimeRedisMode('ranking',env),'realtime-dedicated');
});

test('operator system status exposes Redis mode per workload',()=>{
  assert.match(operatorApi,/realtimeRedisMode/,'system status must use the common realtime Redis resolver');
  assert.match(operatorApi,/redisModes/,'resource budget must expose Redis modes');
  for(const feature of ['operator','ranking','multiplayer','push']){
    assert.match(operatorApi,new RegExp(`${feature}:`),`${feature} Redis mode must be reported`);
  }
});

test('operator UI names each Redis workload instead of only a total count',()=>{
  assert.match(operatorUi,/redisModes/,'operator UI must consume Redis mode details');
  for(const label of ['운영자','랭킹','멀티플레이','Push']){
    assert.match(operatorUi,new RegExp(label),`${label} isolation state must be visible`);
  }
});
