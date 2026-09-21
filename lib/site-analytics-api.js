'use strict';

const crypto=require('node:crypto');
const {hasRedis,redisCommand,getJson,setJson}=require('./operator-store');

const ACTIVE_KEY='analytics:active:v1';
const DAYS_KEY='analytics:days:v1';
const SESSION_INDEX='analytics:session-index:v1';
const COLLECTION_STARTED='analytics:collection-started:v1';
const SESSION_RETENTION_SECONDS=45*24*60*60;
const SESSION_RETENTION_MS=SESSION_RETENTION_SECONDS*1000;
const EVENTS=new Set(['page_view','active_time','menu_click','feature_click']);

function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function sameOrigin(req){
  const origin=String(header(req,'origin')||'').trim();if(!origin)return true;
  try{return new URL(origin).host.toLowerCase()===requestHost(req);}catch{return false;}
}
function sendJson(res,status,payload){
  if(typeof res.setHeader==='function'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');}
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  if(typeof body==='string'&&body.length<=16384){try{return JSON.parse(body);}catch{return null;}}
  return null;
}
function hash(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex').slice(0,32);}
function cleanPath(value){
  const path=String(value||'/').split('?')[0].split('#')[0].slice(0,160);
  return path.startsWith('/')?path:'/';
}
function cleanToken(value,max=64){return String(value||'').trim().replace(/[^a-zA-Z0-9가-힣_:\-.]/g,'').slice(0,max);}
function kstParts(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'})
    .formatToParts(now).reduce((o,p)=>{if(p.type!=='literal')o[p.type]=p.value;return o;},{});
  return {date:`${parts.year}-${parts.month}-${parts.day}`,hour:String(parts.hour||'00').padStart(2,'0')};
}
async function touchSession(payload,{visitorHash,sessionHash,now,path,date}){
  const key='analytics:session:v1:'+sessionHash;
  const previous=await getJson(key,{});
  const row={
    firstSeen:previous?.firstSeen||now.toISOString(),
    lastSeen:now.toISOString(),
    lastPage:path,
    activeMs:Number(previous?.activeMs||0),
    pageviews:Number(previous?.pageviews||0),
    device:cleanToken(payload.device||previous?.device||'unknown',24)||'unknown',
    pwa:payload.pwa===true,
    theme:['dark','light'].includes(payload.theme)?payload.theme:(previous?.theme||'unknown'),
    visitor:visitorHash
  };
  if(payload.event==='page_view')row.pageviews+=1;
  if(payload.event==='active_time')row.activeMs+=Math.max(0,Math.min(60000,Number(payload.deltaMs)||0));
  await setJson(key,row,'EX',SESSION_RETENTION_SECONDS);
  await redisCommand('ZADD',SESSION_INDEX,now.getTime(),sessionHash);
  await redisCommand('ZREMRANGEBYSCORE',SESSION_INDEX,0,now.getTime()-SESSION_RETENTION_MS);
  await redisCommand('SADD','analytics:sessions:v1:'+date,sessionHash);
}
async function recordEvent(payload,now=new Date()){
  const event=String(payload?.event||'');
  if(!EVENTS.has(event))throw new Error('invalid_event');
  const visitorId=String(payload?.visitorId||'');
  const sessionId=String(payload?.sessionId||'');
  if(visitorId.length<12||visitorId.length>128||sessionId.length<12||sessionId.length>128)throw new Error('invalid_session');
  const visitorHash=hash(visitorId),sessionHash=hash(sessionId),path=cleanPath(payload.path),{date,hour}=kstParts(now);
  const summary='analytics:day:v1:'+date;
  const visitors='analytics:visitors:v1:'+date;
  const sessions='analytics:sessions:v1:'+date;
  const pages='analytics:pages:v1:'+date;
  const pageMs='analytics:page-ms:v1:'+date;
  const menu='analytics:menu:v1:'+date;
  const features='analytics:features:v1:'+date;
  const devices='analytics:devices:v1:'+date;
  const pwa='analytics:pwa:v1:'+date;
  const themes='analytics:themes:v1:'+date;
  const hours='analytics:hours:v1:'+date;
  const transitions='analytics:transitions:v1:'+date;

  await redisCommand('SET',COLLECTION_STARTED,now.toISOString(),'NX');
  await redisCommand('ZADD',DAYS_KEY,new Date(date+'T00:00:00+09:00').getTime(),date);
  await redisCommand('SADD',visitors,visitorHash);
  await redisCommand('SADD',sessions,sessionHash);
  await redisCommand('ZADD',ACTIVE_KEY,now.getTime(),visitorHash);
  await redisCommand('ZREMRANGEBYSCORE',ACTIVE_KEY,0,now.getTime()-24*60*60*1000);

  if(event==='page_view'){
    await redisCommand('HINCRBY',summary,'pageviews',1);
    await redisCommand('HINCRBY',pages,path,1);
    await redisCommand('HINCRBY',devices,cleanToken(payload.device,24)||'unknown',1);
    await redisCommand('HINCRBY',pwa,payload.pwa===true?'installed':'browser',1);
    await redisCommand('HINCRBY',themes,['dark','light'].includes(payload.theme)?payload.theme:'unknown',1);
    await redisCommand('HINCRBY',hours,hour,1);
    const from=cleanPath(payload.fromPath||'');
    if(from!=='/'||String(payload.fromPath||'').startsWith('/'))await redisCommand('HINCRBY',transitions,from+' → '+path,1);
  }else if(event==='active_time'){
    const delta=Math.max(0,Math.min(60000,Number(payload.deltaMs)||0));
    if(delta>=500){
      await redisCommand('HINCRBY',summary,'activeMs',Math.round(delta));
      await redisCommand('HINCRBY',pageMs,path,Math.round(delta));
    }
  }else if(event==='menu_click'){
    const key=cleanToken(payload.name,64);if(key)await redisCommand('HINCRBY',menu,key,1);
  }else if(event==='feature_click'){
    const key=cleanToken(payload.name,64);if(key)await redisCommand('HINCRBY',features,key,1);
  }

  await touchSession(payload,{visitorHash,sessionHash,now,path,date});
  return {ok:true};
}
async function handleAnalyticsEvent(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return sendJson(res,503,{error:'analytics_unavailable'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{await recordEvent(body);return sendJson(res,202,{ok:true});}
  catch(error){return sendJson(res,error?.message==='invalid_event'||error?.message==='invalid_session'?400:503,{error:error?.message||'analytics_unavailable'});}
}
module.exports={handleAnalyticsEvent,_internals:{recordEvent,kstParts,cleanPath,cleanToken,hash,EVENTS,ACTIVE_KEY,DAYS_KEY,SESSION_INDEX,COLLECTION_STARTED}};
