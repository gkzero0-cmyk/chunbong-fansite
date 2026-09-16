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

const handler = require('../lib/chuntris-ranking-api.js');

function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},status(code){this.statusCode=code;return this;},json(payload){this.body=payload;return this;},end(payload){if(payload){try{this.body=JSON.parse(payload);}catch{this.body=payload;}}return this;}};}
async function invoke({method='GET',query={},body=undefined,headers={}}={}){
  const req={method,query,body,headers:{'content-type':'application/json','host':'chunbong-fansite.vercel.app',...headers}};
  const res=makeRes(); await handler(req,res); return res;
}

const getEmpty=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(getEmpty.statusCode,200); assert.deepEqual(getEmpty.body.entries,[]);
const firstClassic=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:1000,lines:10,level:2,timeMs:60000}}); assert.equal(firstClassic.statusCode,200); assert.equal(firstClassic.body.updated,true); assert.equal(firstClassic.body.entries[0].nickname,'춘봉'); assert.equal(firstClassic.body.entries[0].score,1000);
const lowerClassic=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:900,lines:20,level:3,timeMs:70000}}); assert.equal(lowerClassic.body.updated,false); assert.equal(lowerClassic.body.entries[0].score,1000);
const higherClassic=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:1500,lines:12,level:3,timeMs:65000}}); assert.equal(higherClassic.body.updated,true); assert.equal(higherClassic.body.entries[0].score,1500);
const incompleteSprint=await invoke({method:'POST',body:{mode:'sprint40',nickname:'춘봉',score:7000,lines:39,level:1,timeMs:90000}}); assert.equal(incompleteSprint.statusCode,400);
const firstSprint=await invoke({method:'POST',body:{mode:'sprint40',nickname:'춘봉',score:8000,lines:40,level:1,timeMs:90000}}); assert.equal(firstSprint.body.updated,true);
const fasterSprint=await invoke({method:'POST',body:{mode:'sprint40',nickname:'춘봉',score:7500,lines:40,level:1,timeMs:80000}}); assert.equal(fasterSprint.body.updated,true); assert.equal(fasterSprint.body.entries[0].timeMs,80000);
const slowerSprint=await invoke({method:'POST',body:{mode:'sprint40',nickname:'춘봉',score:9000,lines:40,level:1,timeMs:85000}}); assert.equal(slowerSprint.body.updated,false); assert.equal(slowerSprint.body.entries[0].timeMs,80000);
const invalidNickname=await invoke({method:'POST',body:{mode:'classic',nickname:'x',score:10,lines:1,level:1,timeMs:10}}); assert.equal(invalidNickname.statusCode,400);
const nonJson=await invoke({method:'POST',headers:{'content-type':'text/plain'},body:{mode:'classic',nickname:'춘봉',score:1,lines:1,level:1,timeMs:1}}); assert.equal(nonJson.statusCode,415); assert.deepEqual(nonJson.body,{error:'json_required'});
const crossOrigin=await invoke({method:'POST',headers:{origin:'https://evil.example'},body:{mode:'classic',nickname:'춘봉',score:9999,lines:99,level:9,timeMs:1}}); assert.equal(crossOrigin.statusCode,403); assert.deepEqual(crossOrigin.body,{error:'origin_not_allowed'});
const sameOrigin=await invoke({method:'POST',headers:{origin:'https://chunbong-fansite.vercel.app'},body:{mode:'classic',nickname:'동일출처',score:10,lines:1,level:1,timeMs:10}}); assert.equal(sameOrigin.statusCode,200);
const unsupportedMethod=await invoke({method:'DELETE',query:{mode:'classic'}}); assert.equal(unsupportedMethod.statusCode,405); assert.equal(unsupportedMethod.headers.allow,'GET, POST');

const savedUrl=process.env.UPSTASH_REDIS_REST_URL; const savedToken=process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.KV_REST_API_URL='https://example.upstash.test'; process.env.KV_REST_API_TOKEN='kv-test-token';
const kvFallback=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(kvFallback.statusCode,200); assert.equal(kvFallback.body.mode,'classic');
delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
const missingEnv=await invoke({method:'GET',query:{mode:'classic'}}); assert.equal(missingEnv.statusCode,503); assert.deepEqual(missingEnv.body,{error:'ranking_unavailable'});
process.env.UPSTASH_REDIS_REST_URL=savedUrl; process.env.UPSTASH_REDIS_REST_TOKEN=savedToken;

global.fetch=originalFetch;
console.log('Chuntris ranking API regression passed');
