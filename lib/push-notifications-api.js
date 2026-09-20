'use strict';

const crypto=require('node:crypto');
const fetchSchedule=require('./content-api/schedule');
const fetchChunbongData=require('./chunbong-data');

const SUB_SET='push:subscriptions:v1';
const SUB_PREFIX='push:subscription:v1:';
const LAST_LIVE_KEY='push:last-live:v1';
const VAPID_KEY='push:vapid:v1';

function setHeader(res,name,value){if(typeof res.setHeader==='function')res.setHeader(name,value);}
function sendJson(res,status,payload){
  setHeader(res,'Content-Type','application/json; charset=utf-8');
  setHeader(res,'Cache-Control','no-store');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));
  res.body=payload;return res;
}
function redisEnv(){return{url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''};}
function vapidEnv(){return{publicKey:String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY||''),privateKey:String(process.env.WEB_PUSH_VAPID_PRIVATE_KEY||''),subject:String(process.env.WEB_PUSH_VAPID_SUBJECT||'https://chunbong-fansite.vercel.app')};}
function hasRedis(){const e=redisEnv();return Boolean(e.url&&e.token);}
function hasEnvVapid(){const e=vapidEnv();return Boolean(e.publicKey&&e.privateKey);}
async function resolveVapid(){
  const env=vapidEnv();
  if(env.publicKey&&env.privateKey)return env;
  if(!hasRedis())return null;
  try{
    const stored=await redisCommand('GET',VAPID_KEY);
    if(stored){
      const parsed=typeof stored==='string'?JSON.parse(stored):stored;
      if(parsed?.publicKey&&parsed?.privateKey)return {...parsed,subject:parsed.subject||env.subject};
    }
  }catch(_){}
  try{
    const webpush=require('web-push');
    const generated=webpush.generateVAPIDKeys();
    const candidate={publicKey:generated.publicKey,privateKey:generated.privateKey,subject:env.subject,createdAt:new Date().toISOString()};
    await redisCommand('SET',VAPID_KEY,JSON.stringify(candidate),'NX');
    const saved=await redisCommand('GET',VAPID_KEY);
    const parsed=saved?(typeof saved==='string'?JSON.parse(saved):saved):candidate;
    return parsed?.publicKey&&parsed?.privateKey?{...parsed,subject:parsed.subject||env.subject}:candidate;
  }catch(_){return null}
}
async function redisCommand(command,...args){
  const env=redisEnv(),base=env.url.replace(/\/$/,'');
  const path=[command,...args].map(value=>encodeURIComponent(String(value))).join('/');
  const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});
  if(!response.ok)throw new Error(`redis_${response.status}`);
  const payload=await response.json();if(payload.error)throw new Error(payload.error);return payload.result;
}
function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function sameOrigin(req){
  const origin=String(header(req,'origin')||'').trim();if(!origin)return true;
  try{return new URL(origin).host.toLowerCase()===requestHost(req);}catch{return false;}
}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  if(typeof body==='string'&&body.length<=16384){try{return JSON.parse(body);}catch{return null;}}
  return null;
}
function subId(endpoint=''){return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0,40);}
function validSubscription(value){
  return Boolean(value&&typeof value==='object'&&/^https:\/\//.test(String(value.endpoint||''))&&value.keys&&String(value.keys.p256dh||'').length>20&&String(value.keys.auth||'').length>8);
}
function normalizedPreferences(value={}){
  const types=value?.types&&typeof value.types==='object'?value.types:{};
  return {
    live:types.live!==false,tarot:types.tarot!==false,minecraft:types.minecraft!==false,
    collab:types.collab!==false,special:types.special!==false,other:types.other!==false,
    leadMinutes:[5,10,30].includes(Number(value?.leadMinutes))?Number(value.leadMinutes):10
  };
}
function classifySchedule(item={}){
  const text=[item.title,...(Array.isArray(item.tags)?item.tags:[])].filter(Boolean).join(' ').toLowerCase();
  if(/타로|tarot/.test(text))return'tarot';
  if(/마인크래프트|minecraft|마크|서버|엔더|광질/.test(text))return'minecraft';
  if(/합방|합동|콜라보|collab|with /.test(text))return'collab';
  if(/특별|콘텐츠|대회|원정대|춘타클|이벤트|배그|프로젝트/.test(text))return'special';
  return'other';
}
async function saveSubscription(body){
  if(!hasRedis())throw new Error('push_storage_unavailable');
  const subscription=body?.subscription;if(!validSubscription(subscription))throw new Error('invalid_subscription');
  const id=subId(subscription.endpoint);
  const row={id,subscription,preferences:normalizedPreferences(body?.preferences),updatedAt:new Date().toISOString()};
  await redisCommand('SET',SUB_PREFIX+id,JSON.stringify(row));
  await redisCommand('SADD',SUB_SET,id);
  return row;
}
async function removeSubscription(subscription){
  if(!hasRedis()||!subscription?.endpoint)return false;
  const id=subId(subscription.endpoint);
  await Promise.all([redisCommand('DEL',SUB_PREFIX+id),redisCommand('SREM',SUB_SET,id)]);
  return true;
}
async function subscriptions(){
  if(!hasRedis())return[];
  const ids=await redisCommand('SMEMBERS',SUB_SET);
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.slice(0,1000).map(async id=>{
    try{const raw=await redisCommand('GET',SUB_PREFIX+id);return raw?JSON.parse(raw):null;}catch{return null;}
  }));
  return rows.filter(Boolean);
}
async function sender(){
  const v=await resolveVapid();if(!v)return null;
  const webpush=require('web-push');
  webpush.setVapidDetails(v.subject,v.publicKey,v.privateKey);
  return webpush;
}
async function send(row,payload){
  const webpush=await sender();if(!webpush)return false;
  try{
    await webpush.sendNotification(row.subscription,JSON.stringify(payload),{TTL:90,urgency:'high'});
    return true;
  }catch(error){
    if(error?.statusCode===404||error?.statusCode===410){
      try{await Promise.all([redisCommand('DEL',SUB_PREFIX+row.id),redisCommand('SREM',SUB_SET,row.id)]);}catch{}
    }
    return false;
  }
}
function authorizedCron(req){
  const secret=String(process.env.CRON_SECRET||'');
  if(secret)return String(header(req,'authorization')||'')===`Bearer ${secret}`;
  const cronSchedule=String(header(req,'x-vercel-cron-schedule')||'').trim();
  const userAgent=String(header(req,'user-agent')||'').toLowerCase();
  return Boolean(cronSchedule&&userAgent.includes('vercel'));
}
async function dispatch(){
  if(!hasRedis()||!(await resolveVapid()))return{available:false,sent:0};
  const rows=await subscriptions();if(!rows.length)return{available:true,sent:0,subscribers:0};
  let sent=0;
  let live=null;
  try{live=await fetchChunbongData.fetchSoopLive();}catch{}
  if(live?.live===true){
    const broadcastId=String(live.broadcastId||live.startedAt||live.title||'live');
    const previous=String(await redisCommand('GET',LAST_LIVE_KEY)||'');
    if(previous!==broadcastId){
      const payload={title:'춘봉 방송이 시작됐어요',body:String(live.title||'SOOP에서 방송이 시작됐습니다.'),url:'/',tag:'chunbong-live-'+broadcastId};
      const results=await Promise.all(rows.filter(row=>row.preferences?.live!==false).map(row=>send(row,payload)));
      sent+=results.filter(Boolean).length;
      await redisCommand('SET',LAST_LIVE_KEY,broadcastId,'EX',172800);
    }
  }else if(live?.live===false){
    await redisCommand('DEL',LAST_LIVE_KEY);
  }

  let schedule=[];
  try{schedule=await fetchSchedule();}catch{}
  const now=Date.now();
  for(const row of rows){
    const lead=[5,10,30].includes(Number(row.preferences?.leadMinutes))?Number(row.preferences.leadMinutes):10;
    for(const item of Array.isArray(schedule)?schedule:[]){
      if(!item?.isDateTime)continue;
      const at=Date.parse(item.start);if(!Number.isFinite(at))continue;
      if(now<at-lead*60000||now>at+60000)continue;
      const type=classifySchedule(item);if(row.preferences?.[type]===false)continue;
      const eventKey=crypto.createHash('sha1').update(row.id+'|'+String(item.start)+'|'+String(item.title)+'|'+lead).digest('hex');
      const claimed=await redisCommand('SET','push:sent:v1:'+eventKey,'1','NX','EX',172800);
      if(claimed!=='OK')continue;
      const ok=await send(row,{title:'춘봉 방송 예정 시간이에요',body:String(item.title||'방송 일정을 확인해 보세요.'),url:'/schedule.html',tag:'chunbong-schedule-'+eventKey});
      if(ok)sent+=1;
    }
  }
  return{available:true,sent,subscribers:rows.length};
}

async function handleConfig(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  const v=await resolveVapid();
  return sendJson(res,200,{available:Boolean(hasRedis()&&v?.publicKey),publicKey:v?.publicKey||'',managed:!hasEnvVapid()&&Boolean(v?.publicKey)});
}
async function handleSubscription(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{
    if(body.action==='unsubscribe'){await removeSubscription(body.subscription);return sendJson(res,200,{ok:true,subscribed:false});}
    if(body.action==='subscribe'){
      if(!(await resolveVapid()))return sendJson(res,503,{error:'push_not_configured'});
      await saveSubscription(body);return sendJson(res,200,{ok:true,subscribed:true});
    }
    return sendJson(res,400,{error:'invalid_action'});
  }catch(error){return sendJson(res,503,{error:error?.message||'push_unavailable'});}
}
async function handleDispatch(req,res){
  if(!authorizedCron(req))return sendJson(res,401,{error:'unauthorized'});
  if(hasRedis()){
    try{
      const claimed=await redisCommand('SET','push:dispatch-lock:v1','1','NX','EX',45);
      if(claimed!=='OK')return sendJson(res,200,{ok:true,skipped:'locked'});
    }catch(_){}
  }
  try{return sendJson(res,200,await dispatch());}catch(error){console.error('[push-dispatch]',error?.message||error);return sendJson(res,503,{error:'push_dispatch_failed'});}
}

module.exports={handleConfig,handleSubscription,handleDispatch,dispatch,_internals:{normalizedPreferences,classifySchedule,validSubscription,subId,resolveVapid}};
