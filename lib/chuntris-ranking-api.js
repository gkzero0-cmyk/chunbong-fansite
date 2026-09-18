'use strict';
const Core=require('../chuntris-ranking-core.js');

const KEY_BY_CONFIG=Object.freeze({
  'classic:normal':'chuntris:classic:players',
  'classic:hard':'chuntris:hard:players',
  'classic:extreme':'chuntris:classic:extreme:players',
  'sprint40:normal':'chuntris:sprint40:players',
  'sprint40:hard':'chuntris:sprint40:hard:players',
  'sprint40:extreme':'chuntris:sprint40:extreme:players',
  'score180:normal':'chuntris:score180:normal:players',
  'score180:hard':'chuntris:score180:hard:players',
  'score180:extreme':'chuntris:score180:extreme:players'
});
function setHeader(res,name,value){if(typeof res.setHeader==='function')res.setHeader(name,value);}
function sendJson(res,statusCode,payload){setHeader(res,'Content-Type','application/json; charset=utf-8');if(typeof res.status==='function'&&typeof res.json==='function')return res.status(statusCode).json(payload);res.statusCode=statusCode;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;}
function redisEnv(){return{url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''};}
async function redisCommand(command,...args){const env=redisEnv(),base=env.url.replace(/\/$/,'');const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});if(!response.ok)throw new Error(`redis ${response.status}`);const payload=await response.json();if(payload.error)throw new Error(payload.error);return payload.result;}
function hasRedisEnv(){const env=redisEnv();return Boolean(env.url&&env.token);}
function configFrom(modeValue,difficultyValue){
  if(!Core.MODES.has(modeValue)&&modeValue!=='hard')return null;
  const config=Core.normalizeConfig(modeValue,difficultyValue);
  const key=KEY_BY_CONFIG[`${config.mode}:${config.difficulty}`];
  return key?{...config,key}:null;
}
function parseBody(body){if(body&&typeof body==='object')return body;if(typeof body==='string'&&body.length<=4096){try{return JSON.parse(body)}catch{return null}}return null;}
function parseMap(raw){if(!raw)return{};try{const parsed=typeof raw==='string'?JSON.parse(raw):raw;return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch{return{}}}
function publicEntry(record,rank){const entry={rank,nickname:record.displayName,score:record.score,lines:record.lines,achievedAt:record.achievedAt,difficulty:record.difficulty||'normal'};if(record.mode!=='sprint40')entry.level=record.level;if(record.mode==='sprint40')entry.timeMs=record.timeMs;if(record.mode==='score180')entry.timeMs=record.timeMs;return entry;}
function topEntries(mode,map){return Core.sortRecords(mode,Object.values(map)).slice(0,10).map((record,index)=>publicEntry(record,index+1));}
function header(req,name){const headers=req?.headers||{};return headers[name]??headers[name.toLowerCase()]??headers[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function isAllowedOrigin(req){const origin=String(header(req,'origin')||'').trim();if(!origin)return true;try{return new URL(origin).host.toLowerCase()===requestHost(req)}catch{return false}}

module.exports=async function handler(req,res){
  const method=String(req?.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='POST'){setHeader(res,'Allow','GET, POST');return sendJson(res,405,{error:'method_not_allowed'});}
  if(!hasRedisEnv())return sendJson(res,503,{error:'ranking_unavailable'});
  try{
    if(method==='GET'){
      const config=configFrom(req?.query?.mode,req?.query?.difficulty);
      if(!config)return sendJson(res,400,{error:'invalid_mode'});
      setHeader(res,'Cache-Control','public, max-age=10, stale-while-revalidate=20');
      const map=parseMap(await redisCommand('GET',config.key));
      return sendJson(res,200,{mode:config.mode,difficulty:config.difficulty,entries:topEntries(config.mode,map)});
    }
    setHeader(res,'Cache-Control','no-store');
    if(!String(header(req,'content-type')).toLowerCase().includes('application/json'))return sendJson(res,415,{error:'json_required'});
    if(!isAllowedOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
    const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_record'});
    const validation=Core.validateRecord(body);if(!validation.ok)return sendJson(res,400,{error:validation.error});
    const record=validation.record,config=configFrom(record.mode,record.difficulty);if(!config)return sendJson(res,400,{error:'invalid_mode'});
    const map=parseMap(await redisCommand('GET',config.key)),current=map[record.key]||null,candidate={...record,achievedAt:new Date().toISOString()};
    const updated=Core.isBetterRecord(record.mode,candidate,current);
    if(updated){map[record.key]=candidate;await redisCommand('SET',config.key,JSON.stringify(map));}
    const personalBest=updated?candidate:current;
    return sendJson(res,200,{mode:record.mode,difficulty:record.difficulty,updated,personalBest:personalBest?publicEntry(personalBest,null):null,entries:topEntries(record.mode,map)});
  }catch(error){console.error('[chuntris-ranking] unavailable:',error?.message||'unknown');return sendJson(res,503,{error:'ranking_unavailable'});}
};