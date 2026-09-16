import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

const redis = new Map();
const originalFetch = global.fetch;
global.fetch = async url => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [command, key, value] = parts;
  if (command === 'GET') return { ok:true, json:async()=>({ result:redis.has(key)?redis.get(key):null }) };
  if (command === 'SET') { redis.set(key,value); return { ok:true, json:async()=>({ result:'OK' }) }; }
  return { ok:false, status:400, json:async()=>({ error:'unsupported' }) };
};

const handler = require('../lib/chunbak-ranking-api.js');
function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},status(code){this.statusCode=code;return this;},json(payload){this.body=payload;return this;},end(payload){if(payload){try{this.body=JSON.parse(payload);}catch{this.body=payload;}}return this;}};}
async function invoke({method='GET',query={},body=undefined,headers={}}={}){
  const req={method,query,body,headers:{'content-type':'application/json','host':'chunbong-fansite.vercel.app',...headers}};
  const res=makeRes(); await handler(req,res); return res;
}

const empty=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(empty.statusCode,200); assert.deepEqual(empty.body.entries,[]);
const first=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:1000,maxLevel:7}}); assert.equal(first.statusCode,200); assert.equal(first.body.updated,true); assert.equal(first.body.entries[0].score,1000);
const lower=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:900,maxLevel:11}}); assert.equal(lower.body.updated,false); assert.equal(lower.body.entries[0].score,1000);
const sameScoreHigherLevel=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:1000,maxLevel:8}}); assert.equal(sameScoreHigherLevel.body.updated,true); assert.equal(sameScoreHigherLevel.body.entries[0].maxLevel,8);
const invalidNickname=await invoke({method:'POST',body:{mode:'classic',nickname:'x',score:10,maxLevel:1}}); assert.equal(invalidNickname.statusCode,400);
const nonJson=await invoke({method:'POST',headers:{'content-type':'text/plain'},body:{mode:'classic',nickname:'춘봉',score:1,maxLevel:1}}); assert.equal(nonJson.statusCode,415); assert.deepEqual(nonJson.body,{error:'json_required'});
const crossOrigin=await invoke({method:'POST',headers:{origin:'https://evil.example'},body:{mode:'classic',nickname:'춘봉',score:9999,maxLevel:9}}); assert.equal(crossOrigin.statusCode,403); assert.deepEqual(crossOrigin.body,{error:'origin_not_allowed'});
const sameOrigin=await invoke({method:'POST',headers:{origin:'https://chunbong-fansite.vercel.app'},body:{mode:'classic',nickname:'동일출처',score:10,maxLevel:1}}); assert.equal(sameOrigin.statusCode,200);
const unsupportedMethod=await invoke({method:'DELETE',query:{mode:'classic'}}); assert.equal(unsupportedMethod.statusCode,405); assert.equal(unsupportedMethod.headers.allow,'GET, POST');

const savedUrl=process.env.UPSTASH_REDIS_REST_URL; const savedToken=process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.KV_REST_API_URL='https://example.upstash.test'; process.env.KV_REST_API_TOKEN='kv-test-token';
const kvFallback=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(kvFallback.statusCode,200); assert.equal(kvFallback.body.mode,'classic');
delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
const missingEnv=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(missingEnv.statusCode,503); assert.deepEqual(missingEnv.body,{error:'ranking_unavailable'});
process.env.UPSTASH_REDIS_REST_URL=savedUrl; process.env.UPSTASH_REDIS_REST_TOKEN=savedToken;
global.fetch=originalFetch;
console.log('Chunbak ranking API regression passed');
