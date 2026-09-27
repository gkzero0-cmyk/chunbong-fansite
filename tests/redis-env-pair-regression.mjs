'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const files=['lib/operator-center-api.js','lib/push-notifications-api.js','lib/chungwagame-ranking-api.js','lib/chunbak-ranking-api.js','lib/chuncortile-ranking-api.js','lib/chuntris-ranking-api.js'];
for(const file of files){
 const source=fs.readFileSync(file,'utf8');
 assert.match(source,/const kv=\{url:process\.env\.KV_REST_API_URL\|\|'',token:process\.env\.KV_REST_API_TOKEN\|\|''\}/,file+' must select the managed Vercel KV pair together');
 assert.match(source,/if\(kv\.url&&kv\.token\)return kv/,file+' must prefer a complete KV pair');
 assert.match(source,/if\(upstash\.url&&upstash\.token\)return upstash/,file+' may fall back only to a complete Upstash pair');
 assert.doesNotMatch(source,/url:process\.env\.UPSTASH_REDIS_REST_URL\|\|process\.env\.KV_REST_API_URL/,file+' must not mix Redis providers');
}
console.log('Redis environment pair regression passed for '+files.length+' modules.');
