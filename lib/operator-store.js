'use strict';

function redisEnv(){
  return {
    url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',
    token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''
  };
}
function hasRedis(){const e=redisEnv();return Boolean(e.url&&e.token);}
async function redisCommand(command,...args){
  const env=redisEnv();
  if(!env.url||!env.token)throw new Error('storage_unavailable');
  const base=env.url.replace(/\/$/,'');
  const path=[command,...args].map(value=>encodeURIComponent(String(value))).join('/');
  const response=await fetch(base+'/'+path,{headers:{Authorization:'Bearer '+env.token}});
  if(!response.ok)throw new Error('redis_'+response.status);
  const payload=await response.json();
  if(payload?.error)throw new Error(String(payload.error));
  return payload?.result;
}
function parseJson(raw,fallback=null){
  if(raw===null||raw===undefined||raw==='')return fallback;
  if(typeof raw==='object')return raw;
  try{return JSON.parse(String(raw));}catch{return fallback;}
}
function hashObject(raw){
  if(!raw)return{};
  if(!Array.isArray(raw)&&typeof raw==='object')return raw;
  if(!Array.isArray(raw))return{};
  const out={};
  for(let i=0;i<raw.length;i+=2)out[String(raw[i])]=raw[i+1];
  return out;
}
async function getJson(key,fallback=null){return parseJson(await redisCommand('GET',key),fallback);}
async function setJson(key,value,...args){return redisCommand('SET',key,JSON.stringify(value),...args);}
async function hgetall(key){return hashObject(await redisCommand('HGETALL',key));}
module.exports={redisEnv,hasRedis,redisCommand,parseJson,hashObject,getJson,setJson,hgetall};
