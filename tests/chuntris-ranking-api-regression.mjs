import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN='test-token';
const redis=new Map(),originalFetch=global.fetch;
global.fetch=async url=>{
  const parsed=new URL(url),parts=parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent),[command,key,value]=parts;
  if(command==='GET')return{ok:true,json:async()=>({result:redis.has(key)?redis.get(key):null})};
  if(command==='SET'){redis.set(key,value);return{ok:true,json:async()=>({result:'OK'})};}
  return{ok:false,status:400,json:async()=>({error:'unsupported'})};
};
const handler=require('../lib/chuntris-ranking-api.js');
function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},status(code){this.statusCode=code;return this;},json(payload){this.body=payload;return this;},end(payload){if(payload){try{this.body=JSON.parse(payload);}catch{this.body=payload;}}return this;}};}
async function invoke({method='GET',query={},body=undefined,headers={}}={}){const req={method,query,body,headers:{'content-type':'application/json','host':'chunbong-fansite.vercel.app',...headers}},res=makeRes();await handler(req,res);return res;}

const empty=await invoke({query:{mode:'classic',difficulty:'normal'}});assert.equal(empty.statusCode,200);assert.deepEqual(empty.body.entries,[]);
const classic=await invoke({method:'POST',body:{mode:'classic',difficulty:'normal',nickname:'춘봉',score:1000,lines:10,level:2,timeMs:60000}});assert.equal(classic.body.updated,true);assert.equal(classic.body.difficulty,'normal');
const hard=await invoke({method:'POST',body:{mode:'classic',difficulty:'hard',nickname:'하드춘봉',score:2200,lines:18,level:4,timeMs:45000}});assert.equal(hard.statusCode,200);assert.equal(hard.body.mode,'classic');assert.equal(hard.body.difficulty,'hard');
const legacyHard=await invoke({method:'POST',body:{mode:'hard',nickname:'레거시하드',score:2100,lines:17,level:4,timeMs:46000}});assert.equal(legacyHard.statusCode,200);assert.equal(legacyHard.body.mode,'classic');assert.equal(legacyHard.body.difficulty,'hard');
const extreme=await invoke({method:'POST',body:{mode:'classic',difficulty:'extreme',nickname:'익스트림',score:3000,lines:22,level:6,timeMs:40000}});assert.equal(extreme.statusCode,200);assert.equal(extreme.body.difficulty,'extreme');
const getHard=await invoke({query:{mode:'classic',difficulty:'hard'}});assert.equal(getHard.body.entries[0].nickname,'하드춘봉');

const incompleteSprint=await invoke({method:'POST',body:{mode:'sprint40',difficulty:'normal',nickname:'춘봉',score:7000,lines:39,level:1,timeMs:90000}});assert.equal(incompleteSprint.statusCode,400);
const sprint=await invoke({method:'POST',body:{mode:'sprint40',difficulty:'extreme',nickname:'춘봉',score:8000,lines:40,level:8,timeMs:90000}});assert.equal(sprint.body.updated,true);assert.equal(sprint.body.difficulty,'extreme');
const score180=await invoke({method:'POST',body:{mode:'score180',difficulty:'hard',nickname:'점수왕',score:14000,lines:52,level:9,timeMs:180000}});assert.equal(score180.statusCode,200);assert.equal(score180.body.mode,'score180');assert.equal(score180.body.entries[0].score,14000);

const invalidNickname=await invoke({method:'POST',body:{mode:'classic',difficulty:'normal',nickname:'x',score:10,lines:1,level:1,timeMs:10}});assert.equal(invalidNickname.statusCode,400);
const nonJson=await invoke({method:'POST',headers:{'content-type':'text/plain'},body:{mode:'classic',nickname:'춘봉',score:1,lines:1,level:1,timeMs:1}});assert.equal(nonJson.statusCode,415);
const crossOrigin=await invoke({method:'POST',headers:{origin:'https://evil.example'},body:{mode:'classic',nickname:'춘봉',score:9999,lines:99,level:9,timeMs:1}});assert.equal(crossOrigin.statusCode,403);
const unsupported=await invoke({method:'DELETE',query:{mode:'classic'}});assert.equal(unsupported.statusCode,405);

global.fetch=originalFetch;
console.log('Chuntris ranking API regression passed');
