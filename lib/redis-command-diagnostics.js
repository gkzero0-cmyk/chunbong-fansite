'use strict';

const Module=require('node:module');
const GLOBAL_KEY='__chunbongRedisCommandDiagnosticsV1';
const INSTALL_KEY='__chunbongRedisCommandDiagnosticsInstalledV1';
const BLOCKED_DIAGNOSTIC_REDIS_COMMANDS=new Set(['DBSIZE','INFO']);

function initialMemory(){return{startedAt:Date.now(),updatedAt:0,total:0,requests:0,commands:Object.create(null),categories:Object.create(null),features:Object.create(null)}}
const redisCommandDiagnosticsMemory=globalThis[GLOBAL_KEY]||(globalThis[GLOBAL_KEY]=initialMemory());

function normalizeCommand(value){return String(value||'UNKNOWN').trim().toUpperCase().slice(0,32)||'UNKNOWN'}
function categoryForRedisCommand(command=''){
  const cmd=normalizeCommand(command);
  if(['GET','MGET','HGET','HGETALL','HMGET','ZRANGE','ZREVRANGE','ZRANGEBYSCORE','ZSCORE','ZCARD','SMEMBERS','SCARD','SISMEMBER','EXISTS','TTL','PTTL','DBSIZE','INFO','PING'].includes(cmd))return'read';
  if(['SET','MSET','HSET','HMSET','HINCRBY','INCR','INCRBY','DECR','DECRBY','ZADD','ZREM','SADD','SREM','DEL','EXPIRE','PEXPIRE'].includes(cmd))return'write';
  if(['EVAL','EVALSHA','SCRIPT','MULTI','EXEC'].includes(cmd))return'script';
  return'other';
}
function featureForRedisKey(key=''){
  const value=String(key||'').toLowerCase();
  if(!value)return'unknown';
  if(value.startsWith('operator:analytics:'))return'analytics';
  if(value.startsWith('operator:feedback:'))return'feedback';
  if(value.startsWith('operator:session')||value.startsWith('operator:auth')||value.startsWith('operator:security:'))return'auth-session';
  if(value.startsWith('operator:quota')||value.startsWith('operator:health')||value.startsWith('operator:recovery'))return'operator-health';
  if(value.startsWith('push:'))return'push';
  if(/rank|leaderboard|score/.test(value))return'ranking';
  if(/multiplayer|room|match|presence|progress/.test(value))return'multiplayer';
  if(/content-archive|archive:/.test(value))return'content-archive';
  return'other';
}
function increment(map,key,count){const safe=String(key||'unknown').slice(0,64);map[safe]=(Number(map[safe])||0)+Math.max(1,Number(count)||1)}
function recordRedisDiagnostic(command,count=1,key=''){
  const n=Math.max(1,Number(count)||1),cmd=normalizeCommand(command);
  redisCommandDiagnosticsMemory.total+=n;
  redisCommandDiagnosticsMemory.requests+=1;
  redisCommandDiagnosticsMemory.updatedAt=Date.now();
  increment(redisCommandDiagnosticsMemory.commands,cmd,n);
  increment(redisCommandDiagnosticsMemory.categories,categoryForRedisCommand(cmd),n);
  increment(redisCommandDiagnosticsMemory.features,featureForRedisKey(key),n);
}
function rows(map,total){return Object.entries(map||{}).map(([key,count])=>({key,count:Number(count)||0,pct:total?Math.round((Number(count)||0)/total*1000)/10:0})).sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key)).slice(0,20)}
function redisDiagnosticsSnapshot(){
  const total=Number(redisCommandDiagnosticsMemory.total)||0;
  return{
    mode:'memory-sample',
    scope:'warm-api-content-instance',
    startedAt:new Date(redisCommandDiagnosticsMemory.startedAt).toISOString(),
    updatedAt:redisCommandDiagnosticsMemory.updatedAt?new Date(redisCommandDiagnosticsMemory.updatedAt).toISOString():null,
    observedCommands:total,
    observedRequests:Number(redisCommandDiagnosticsMemory.requests)||0,
    commands:rows(redisCommandDiagnosticsMemory.commands,total),
    categories:rows(redisCommandDiagnosticsMemory.categories,total),
    features:rows(redisCommandDiagnosticsMemory.features,total),
    officialMonthlyUsageSource:'upstash-console',
    officialMonthlyLimit:500000,
    blockedDiagnosticCommands:[...BLOCKED_DIAGNOSTIC_REDIS_COMMANDS],
    estimatedExtraRedisCommands:0,
    persistent:false
  };
}
function redisBases(){
  const urls=[];
  for(const [key,value] of Object.entries(process.env)){
    if(!value||!/(?:REDIS_REST_URL|KV_REST_API_URL)$/.test(key))continue;
    try{urls.push(new URL(String(value)).origin+new URL(String(value)).pathname.replace(/\/$/,''))}catch{}
  }
  return [...new Set(urls)];
}
function parseRequest(input,init,bases){
  let href='';try{href=typeof input==='string'?input:input?.url||String(input||'')}catch{return[]}
  const base=bases.find(value=>href===value||href.startsWith(value+'/'));if(!base)return[];
  let url;try{url=new URL(href)}catch{return[]}
  const relative=url.pathname.slice(new URL(base).pathname.length).replace(/^\/+/, '');
  if(relative==='pipeline'){
    try{
      const body=typeof init?.body==='string'?JSON.parse(init.body):[];
      return(Array.isArray(body)?body:[]).map(row=>({command:normalizeCommand(row?.[0]),key:String(row?.[1]||'')}));
    }catch{return[{command:'PIPELINE',key:''}]}
  }
  const parts=relative.split('/').filter(Boolean).map(part=>{try{return decodeURIComponent(part)}catch{return part}});
  return parts.length?[{command:normalizeCommand(parts[0]),key:String(parts[1]||'')}]:[];
}
function syntheticJsonResponse(payload){
  const body=JSON.stringify(payload);
  if(typeof Response==='function')return new Response(body,{status:200,headers:{'content-type':'application/json'}});
  return{ok:true,status:200,json:async()=>payload,text:async()=>body};
}
function blockedDiagnosticResponse(input,observed=[]){
  if(!observed.length||!observed.every(row=>BLOCKED_DIAGNOSTIC_REDIS_COMMANDS.has(row.command)))return null;
  let href='';try{href=typeof input==='string'?input:input?.url||String(input||'')}catch{}
  const isPipeline=/\/pipeline(?:[?#]|$)/.test(href);
  return syntheticJsonResponse(isPipeline?observed.map(()=>({result:null})):{result:null});
}
function augmentOperatorCenter(exported){
  if(!exported||exported.__redisDiagnosticsWrapped||typeof exported.handleOperatorSystemStatus!=='function')return;
  const original=exported.handleOperatorSystemStatus;
  exported.handleOperatorSystemStatus=async function handleOperatorSystemStatusWithRedisDiagnostics(req,res){
    if(res&&typeof res.json==='function'){
      const json=res.json;
      res.json=function(payload){
        if(payload&&typeof payload==='object'&&!payload.error)payload={...payload,redisCommandDiagnostics:redisDiagnosticsSnapshot()};
        return json.call(this,payload);
      };
    }
    return original(req,res);
  };
  Object.defineProperty(exported,'__redisDiagnosticsWrapped',{value:true,enumerable:false});
}
function installOperatorHook(){
  if(globalThis.__chunbongRedisOperatorHookV1)return;
  globalThis.__chunbongRedisOperatorHookV1=true;
  const originalLoad=Module._load;
  Module._load=function(request,parent,isMain){
    const exported=originalLoad.apply(this,arguments);
    try{
      const resolved=Module._resolveFilename(request,parent,isMain);
      if(/operator-center-api\.js$/.test(String(resolved||'')))augmentOperatorCenter(exported);
    }catch{}
    return exported;
  };
}
function installRedisCommandDiagnostics(){
  if(globalThis[INSTALL_KEY])return redisDiagnosticsSnapshot;
  globalThis[INSTALL_KEY]=true;
  installOperatorHook();
  const originalFetch=globalThis.fetch;if(typeof originalFetch!=='function')return redisDiagnosticsSnapshot;
  globalThis.fetch=async function redisDiagnosticFetch(input,init){
    const observed=parseRequest(input,init,redisBases());
    const blocked=blockedDiagnosticResponse(input,observed);if(blocked)return blocked;
    for(const row of observed)recordRedisDiagnostic(row.command,1,row.key);
    return originalFetch.apply(this,arguments);
  };
  return redisDiagnosticsSnapshot;
}

module.exports={installRedisCommandDiagnostics,redisCommandDiagnosticsMemory,recordRedisDiagnostic,redisDiagnosticsSnapshot,categoryForRedisCommand,featureForRedisKey,_internals:{parseRequest,redisBases,blockedDiagnosticResponse,augmentOperatorCenter}};