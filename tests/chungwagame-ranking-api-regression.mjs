import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.test';process.env.UPSTASH_REDIS_REST_TOKEN='test-token';
const redis=new Map(),originalFetch=global.fetch;
global.fetch=async url=>{const parsed=new URL(url),parts=parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent),[command,key,value]=parts;if(command==='GET')return{ok:true,json:async()=>({result:redis.has(key)?redis.get(key):null})};if(command==='SET'){redis.set(key,value);return{ok:true,json:async()=>({result:'OK'})}}return{ok:false,status:400,json:async()=>({error:'unsupported'})}};
const handler=require('../lib/chungwagame-ranking-api.js');
function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value},status(code){this.statusCode=code;return this},json(payload){this.body=payload;return this},end(payload){if(payload){try{this.body=JSON.parse(payload)}catch{this.body=payload}}return this}}}
async function invoke({method='GET',query={},body,headers={}}={}){const req={method,query,body,headers:{'content-type':'application/json',host:'chunbong-fansite.vercel.app',...headers}},res=makeRes();await handler(req,res);return res}
const empty=await invoke({query:{mode:'classic'}});assert.equal(empty.statusCode,200);assert.deepEqual(empty.body.entries,[]);
const first=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:80,maxCombo:3,cleared:50}});assert.equal(first.statusCode,200);assert.equal(first.body.updated,true);
const lower=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:70,maxCombo:8,cleared:70}});assert.equal(lower.body.updated,false);
const tieBetter=await invoke({method:'POST',body:{mode:'classic',nickname:'춘봉',score:80,maxCombo:4,cleared:50}});assert.equal(tieBetter.body.updated,true);assert.equal(tieBetter.body.entries[0].maxCombo,4);
const invalid=await invoke({method:'POST',body:{mode:'classic',nickname:'x',score:1,maxCombo:1,cleared:1}});assert.equal(invalid.statusCode,400);assert.equal(invalid.body.error,'invalid_nickname');
const cross=await invoke({method:'POST',headers:{origin:'https://evil.example'},body:{mode:'classic',nickname:'테스트',score:1,maxCombo:1,cleared:1}});assert.equal(cross.statusCode,403);
const same=await invoke({method:'POST',headers:{origin:'https://chunbong-fansite.vercel.app'},body:{mode:'classic',nickname:'테스트',score:1,maxCombo:1,cleared:1}});assert.equal(same.statusCode,200);
global.fetch=originalFetch;
console.log('Chungwagame ranking API regression passed');
