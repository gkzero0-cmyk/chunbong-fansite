'use strict';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const operatorSource=fs.readFileSync('lib/operator-center-api.js','utf8');
assert.match(operatorSource,/const kv=\{url:process\.env\.KV_REST_API_URL\|\|'',token:process\.env\.KV_REST_API_TOKEN\|\|''\}/,'operator store must select the managed Vercel KV pair together');
assert.match(operatorSource,/if\(kv\.url&&kv\.token\)return kv/,'operator store must prefer a complete KV pair');
assert.match(operatorSource,/if\(upstash\.url&&upstash\.token\)return upstash/,'operator store may fall back only to a complete Upstash pair');
assert.doesNotMatch(operatorSource,/url:process\.env\.UPSTASH_REDIS_REST_URL\|\|process\.env\.KV_REST_API_URL/,'operator store must not mix Redis providers');

const {resolveRealtimeRedisEnv}=require('../lib/realtime-redis-env.js');
const kvEnv={KV_REST_API_URL:'https://kv.example',KV_REST_API_TOKEN:'kv-token'};
assert.deepEqual(resolveRealtimeRedisEnv('push',kvEnv),{url:'https://kv.example',token:'kv-token'},'realtime helper must select a complete KV pair');
const upstashEnv={UPSTASH_REDIS_REST_URL:'https://upstash.example',UPSTASH_REDIS_REST_TOKEN:'upstash-token'};
assert.deepEqual(resolveRealtimeRedisEnv('ranking',upstashEnv),{url:'https://upstash.example',token:'upstash-token'},'realtime helper must select a complete Upstash pair');
assert.deepEqual(resolveRealtimeRedisEnv('multiplayer',{UPSTASH_REDIS_REST_URL:'https://wrong.example',KV_REST_API_TOKEN:'wrong-token'}),{url:'',token:''},'realtime helper must never mix providers');

const realtimeFiles=['lib/push-notifications-api.js','lib/chungwagame-ranking-api.js','lib/chunbak-ranking-api.js','lib/chuncortile-ranking-api.js','lib/chuntris-ranking-api.js','lib/minigame-multiplayer-api.js'];
for(const file of realtimeFiles){
 const source=fs.readFileSync(file,'utf8');
 assert.match(source,/realtime-redis-env/,file+' must use the shared realtime Redis resolver');
 assert.doesNotMatch(source,/url:process\.env\.UPSTASH_REDIS_REST_URL\|\|process\.env\.KV_REST_API_URL/,file+' must not mix Redis providers');
}
console.log('Redis environment pair regression passed for operator + '+realtimeFiles.length+' realtime modules.');
