'use strict';

const crypto=require('node:crypto');

const OWNER_GITHUB_ID=322299248;
const OWNER_GITHUB_LOGIN='gkzero0-cmyk';
const OWNER_EMAIL_SHA256='0c640d100529df1d326a494f9de2a8255e3e860fc33e0260bdda5f08d280e945';
const SESSION_COOKIE='cb_operator_session';
const SESSION_SECONDS=365*24*60*60;
const SESSION_SECRET_KEY='operator:session-secret:v1';
const AUTH_EPOCH_KEY='operator:auth-epoch:v1';
const SESSION_INDEX='operator:session-index:v1';
const SESSION_META_PREFIX='operator:session-meta:v1:';
const GITHUB_PKCE_PREFIX='operator:github-pkce:v1:';
const ANALYTICS_START_KEY='operator:analytics:start:v1';
const ANALYTICS_DAYS_KEY='operator:analytics:days:v1';
const ACTIVE_KEY='operator:analytics:active:v1';
const FEEDBACK_INDEX='operator:feedback:index:v1';
const FEEDBACK_PREFIX='operator:feedback:item:v1:';
const FEEDBACK_COUNTS='operator:feedback:counts:v1';
const SECURITY_INDEX='operator:security:index:v1';
const SECURITY_PREFIX='operator:security:item:v1:';
const HEALTH_STATE_KEY='operator:health:last:v1';
const HEALTH_INDEX='operator:health:index:v1';
const HEALTH_PREFIX='operator:health:item:v1:';
const GITHUB_STATE_CACHE_KEY='operator:github-state-cache:v1';

function setHeader(res,name,value){if(typeof res.setHeader==='function')res.setHeader(name,value)}
function sendJson(res,status,payload){
  setHeader(res,'Content-Type','application/json; charset=utf-8');
  setHeader(res,'Cache-Control','no-store, max-age=0');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));
  res.body=payload;return res;
}
function redirect(res,location,status=302){
  setHeader(res,'Cache-Control','no-store, max-age=0');
  setHeader(res,'Location',location);
  if(typeof res.status==='function'&&typeof res.end==='function'){res.status(status);return res.end()}
  res.statusCode=status;if(typeof res.end==='function')return res.end();return res;
}
function redisEnv(){return{url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''}}
function hasRedis(){const e=redisEnv();return Boolean(e.url&&e.token)}
async function redisCommand(command,...args){
  const env=redisEnv(),base=env.url.replace(/\/$/,'');
  if(!base||!env.token)throw new Error('operator_storage_unavailable');
  const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});
  if(!response.ok)throw new Error('redis_'+response.status);
  const payload=await response.json();if(payload.error)throw new Error(payload.error);return payload.result;
}
async function redisPipeline(commands=[]){
  if(!commands.length)return[];
  const env=redisEnv(),base=env.url.replace(/\/$/,'');
  if(!base||!env.token)throw new Error('operator_storage_unavailable');
  try{
    const response=await fetch(base+'/pipeline',{
      method:'POST',
      headers:{Authorization:`Bearer ${env.token}`,'Content-Type':'application/json'},
      body:JSON.stringify(commands)
    });
    if(!response.ok)throw new Error('pipeline_'+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload))throw new Error('pipeline_invalid');
    return payload.map(row=>row?.result);
  }catch(_){
    return Promise.all(commands.map(([command,...args])=>redisCommand(command,...args)));
  }
}
function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??''}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase()}
function protocol(req){return String(header(req,'x-forwarded-proto')||'https').split(',')[0].trim()==='http'?'http':'https'}
function origin(req){const host=requestHost(req)||'chunbong-fansite.vercel.app';return protocol(req)+'://'+host}
function sameOrigin(req){
  const value=String(header(req,'origin')||'').trim();if(!value)return true;
  try{return new URL(value).host.toLowerCase()===requestHost(req)}catch{return false}
}
function parseBody(value,limit=32768){
  if(value&&typeof value==='object')return value;
  if(typeof value==='string'&&value.length<=limit){try{return JSON.parse(value)}catch{return null}}
  return null;
}
function query(req){
  try{return new URL(req?.url||'/','https://operator.local').searchParams}catch{return new URLSearchParams()}
}
function sha256(value){return crypto.createHash('sha256').update(String(value)).digest('hex')}
function sha256Base64url(value){return crypto.createHash('sha256').update(String(value)).digest('base64url')}
function safeText(value,max=120){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)}
function safeMultiline(value,max=2000){return String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').trim().slice(0,max)}
function normalizePage(value){const text=safeText(value,120).split('?')[0].split('#')[0];return /^\/[a-zA-Z0-9._\/-]*$/.test(text)?text:'/'}
function dayKst(date=new Date()){
  const shifted=new Date(date.getTime()+9*60*60*1000);
  return shifted.toISOString().slice(0,10);
}
function hourKst(date=new Date()){
  const shifted=new Date(date.getTime()+9*60*60*1000);
  return shifted.toISOString().slice(11,13);
}
function recentDays(count){
  const out=[],now=Date.now();
  for(let i=count-1;i>=0;i--)out.push(dayKst(new Date(now-i*86400000)));
  return out;
}
function hashObject(raw){
  if(!raw)return{};
  if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
  if(!Array.isArray(raw))return{};
  const out={};for(let i=0;i<raw.length;i+=2)out[String(raw[i])]=raw[i+1];return out;
}
function sumHash(target,raw){
  for(const [key,value] of Object.entries(hashObject(raw)))target[key]=(target[key]||0)+(Number(value)||0);
  return target;
}
function topRows(map,limit=8){return Object.entries(map).map(([key,value])=>({key,value:Number(value)||0})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key)).slice(0,limit)}

async function resolveSessionSecret(){
  const env=String(process.env.OPERATOR_SESSION_SECRET||'').trim();
  if(env.length>=32)return env;
  if(!hasRedis())throw new Error('operator_storage_unavailable');
  const current=await redisCommand('GET',SESSION_SECRET_KEY);
  if(current&&String(current).length>=32)return String(current);
  const generated=crypto.randomBytes(48).toString('base64url');
  await redisCommand('SET',SESSION_SECRET_KEY,generated,'NX');
  return String(await redisCommand('GET',SESSION_SECRET_KEY)||generated);
}
async function signToken(payload){
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret=await resolveSessionSecret();
  const signature=crypto.createHmac('sha256',secret).update(encoded).digest('base64url');
  return encoded+'.'+signature;
}
async function verifyToken(token,purpose='session'){
  const [encoded,signature]=String(token||'').split('.');
  if(!encoded||!signature)return null;
  try{
    const secret=await resolveSessionSecret();
    const expected=crypto.createHmac('sha256',secret).update(encoded).digest('base64url');
    const a=Buffer.from(signature),b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
    const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
    if(payload?.purpose!==purpose||Number(payload?.exp||0)<Date.now())return null;
    return payload;
  }catch{return null}
}
function cookies(req){
  const raw=String(header(req,'cookie')||'');const out={};
  raw.split(';').forEach(part=>{const at=part.indexOf('=');if(at<0)return;out[part.slice(0,at).trim()]=decodeURIComponent(part.slice(at+1).trim())});
  return out;
}
async function authEpoch(){
  if(!hasRedis())return 1;
  const current=Number(await redisCommand('GET',AUTH_EPOCH_KEY));
  if(Number.isFinite(current)&&current>=1)return current;
  await redisCommand('SET',AUTH_EPOCH_KEY,'1','NX');
  return Number(await redisCommand('GET',AUTH_EPOCH_KEY))||1;
}
async function session(req){
  const current=await verifyToken(cookies(req)[SESSION_COOKIE],'session');
  if(!current?.owner)return null;
  if(Number(current.epoch||0)!==await authEpoch())return null;
  if(hasRedis()&&current.jti){
    try{
      const now=Date.now(),score=Number(await redisCommand('ZSCORE',SESSION_INDEX,current.jti));
      if(!Number.isFinite(score)||score<now)return null;
      let meta={};
      try{const raw=await redisCommand('GET',SESSION_META_PREFIX+current.jti);if(raw)meta=JSON.parse(raw)}catch{}
      const lastSeen=Date.parse(meta.lastSeen||'')||0;
      if(!lastSeen||now-lastSeen>5*60*1000){
        meta={id:current.jti,provider:safeText(meta.provider||current.provider||'unknown',24),createdAt:meta.createdAt||new Date(Number(current.iat)||now).toISOString(),lastSeen:new Date(now).toISOString(),expiresAt:meta.expiresAt||new Date(Number(current.exp)||score).toISOString()};
        await redisCommand('SET',SESSION_META_PREFIX+current.jti,JSON.stringify(meta),'EX',Math.max(60,Math.ceil((score-now)/1000)));
      }
    }catch{return null}
  }
  return current;
}
async function setSession(res,provider,extra={}){
  const now=Date.now(),exp=now+SESSION_SECONDS*1000,jti=crypto.randomBytes(18).toString('base64url'),epoch=await authEpoch();
  const token=await signToken({purpose:'session',owner:true,provider,githubId:OWNER_GITHUB_ID,jti,epoch,iat:now,exp,...extra});
  if(hasRedis()){
    try{
      const meta={id:jti,provider:safeText(provider,24),createdAt:new Date(now).toISOString(),lastSeen:new Date(now).toISOString(),expiresAt:new Date(exp).toISOString()};
      await redisPipeline([
        ['ZADD',SESSION_INDEX,exp,jti],
        ['SET',SESSION_META_PREFIX+jti,JSON.stringify(meta),'EX',SESSION_SECONDS],
        ['ZREMRANGEBYSCORE',SESSION_INDEX,0,now]
      ]);
    }catch(_){}
  }
  setHeader(res,'Set-Cookie',SESSION_COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000');
}
function clearSession(res){setHeader(res,'Set-Cookie',`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)}
async function requireOwner(req,res){
  const current=await session(req);
  if(!current?.owner){sendJson(res,401,{error:'operator_auth_required'});return null}
  return current;
}
function githubConfig(){
  return{clientId:String(process.env.OPERATOR_GITHUB_CLIENT_ID||''),clientSecret:String(process.env.OPERATOR_GITHUB_CLIENT_SECRET||'')}
}
function firebaseConfig(){
  return{
    apiKey:String(process.env.FIREBASE_API_KEY||''),
    authDomain:String(process.env.FIREBASE_AUTH_DOMAIN||''),
    projectId:String(process.env.FIREBASE_PROJECT_ID||''),
    appId:String(process.env.FIREBASE_APP_ID||'')
  };
}
function githubReady(){const c=githubConfig();return Boolean(c.clientId&&c.clientSecret)}
function firebaseReady(){const c=firebaseConfig();return Boolean(c.apiKey&&c.authDomain&&c.projectId)}
function ownerEmail(value){
  const actual=Buffer.from(sha256(String(value||'').trim().toLowerCase()));
  const expected=Buffer.from(OWNER_EMAIL_SHA256);
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function publicFirebase(){const c=firebaseConfig();return{apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,appId:c.appId}}
function safeReturn(value){const text=String(value||'/operator.html');return /^\/operator\.html(?:[?#].*)?$/.test(text)?text:'/operator.html'}

async function logSecurity(action,provider='system',detail=''){
  if(!hasRedis())return;
  try{
    const id='SEC-'+Date.now().toString(36)+'-'+crypto.randomBytes(2).toString('hex');
    const row={id,action:safeText(action,48),provider:safeText(provider,24),detail:safeText(detail,160),at:new Date().toISOString()};
    await redisPipeline([['SET',SECURITY_PREFIX+id,JSON.stringify(row),'EX',60*60*24*180],['ZADD',SECURITY_INDEX,Date.now(),id],['ZREMRANGEBYSCORE',SECURITY_INDEX,0,Date.now()-180*86400000]]);
  }catch(_){}
}

function analyticsKeys(day){
  const p='operator:analytics:';
  return{
    summary:`${p}summary:v1:${day}`,pages:`${p}pages:v1:${day}`,menus:`${p}menus:v1:${day}`,
    devices:`${p}devices:v1:${day}`,features:`${p}features:v1:${day}`,hours:`${p}hours:v1:${day}`,pageTime:`${p}page-time:v1:${day}`,
    visitors:`${p}visitors:v1:${day}`,sessions:`${p}sessions:v1:${day}`,
    perfTotal:`${p}perf-total:v1:${day}`,perfCount:`${p}perf-count:v1:${day}`,
    vitalTotal:`${p}vital-total:v1:${day}`,vitalCount:`${p}vital-count:v1:${day}`,
    vitalGood:`${p}vital-good:v1:${day}`,vitalNeeds:`${p}vital-needs:v1:${day}`,vitalPoor:`${p}vital-poor:v1:${day}`
  };
}
function validAnonId(value){return /^[A-Za-z0-9_-]{12,96}$/.test(String(value||''))}
function validEventType(value){return['page_view','active_time','menu_click','navigation_timing','web_vital','game_start','game_finish','tarot_start','tarot_result','schedule_open','data_tab_open','feedback_open','feedback_submit'].includes(String(value||''))}
async function ingestAnalytics(body){
  if(!hasRedis())throw new Error('analytics_unavailable');
  const visitorId=safeText(body?.visitorId,96),sessionId=safeText(body?.sessionId,96);
  if(!validAnonId(visitorId)||!validAnonId(sessionId))throw new Error('invalid_analytics_id');
  const events=(Array.isArray(body?.events)?body.events:[]).slice(0,20).filter(row=>row&&validEventType(row.type));
  if(!events.length)return{accepted:0};
  const now=new Date(),day=dayKst(now),hour=hourKst(now),keys=analyticsKeys(day),allKeys=analyticsKeys('all');
  const visitorHash=sha256('visitor:'+visitorId).slice(0,32),sessionHash=sha256('session:'+sessionId).slice(0,32);
  const commands=[
    ['SET',ANALYTICS_START_KEY,new Date().toISOString(),'NX'],['ZADD',ANALYTICS_DAYS_KEY,Date.now(),day],
    ['PFADD',keys.visitors,visitorHash],['PFADD',keys.sessions,sessionHash],['PFADD',allKeys.visitors,visitorHash],['PFADD',allKeys.sessions,sessionHash],
    ['ZADD',ACTIVE_KEY,Date.now(),visitorHash],['ZREMRANGEBYSCORE',ACTIVE_KEY,0,Date.now()-5*60*1000]
  ];
  for(const event of events){
    const type=String(event.type),page=normalizePage(event.page||'/');
    if(type==='page_view'){
      commands.push(['HINCRBY',keys.summary,'pageviews',1],['HINCRBY',keys.pages,page,1],['HINCRBY',keys.hours,hour,1],['HINCRBY',allKeys.summary,'pageviews',1],['HINCRBY',allKeys.pages,page,1],['HINCRBY',allKeys.hours,hour,1]);
      const device=['mobile','tablet','desktop'].includes(event.device)?event.device:'other';
      commands.push(['HINCRBY',keys.devices,'device:'+device,1],['HINCRBY',allKeys.devices,'device:'+device,1]);
      commands.push(['HINCRBY',keys.devices,'pwa:'+(event.pwa?'yes':'no'),1],['HINCRBY',allKeys.devices,'pwa:'+(event.pwa?'yes':'no'),1]);
      commands.push(['HINCRBY',keys.devices,'theme:'+(event.theme==='light'?'light':'dark'),1],['HINCRBY',allKeys.devices,'theme:'+(event.theme==='light'?'light':'dark'),1]);
      if(event.visitorState==='new')commands.push(['HINCRBY',keys.summary,'newVisitors',1],['HINCRBY',allKeys.summary,'newVisitors',1]);
      else if(event.visitorState==='returning')commands.push(['HINCRBY',keys.summary,'returningVisits',1],['HINCRBY',allKeys.summary,'returningVisits',1]);
    }else if(type==='active_time'){
      const ms=Math.max(0,Math.min(60000,Math.round(Number(event.activeMs)||0)));
      if(ms)commands.push(
        ['HINCRBY',keys.summary,'activeMs',ms],['HINCRBY',allKeys.summary,'activeMs',ms],
        ['HINCRBY',keys.pageTime,page,ms],['HINCRBY',allKeys.pageTime,page,ms]
      );
    }else if(type==='menu_click'){
      const target=safeText(event.target,80)||'unknown';commands.push(['HINCRBY',keys.menus,target,1],['HINCRBY',allKeys.menus,target,1]);
    }else if(type==='navigation_timing'){
      const ms=Math.max(0,Math.min(15000,Math.round(Number(event.durationMs)||0)));
      if(ms)commands.push(
        ['HINCRBY',keys.perfTotal,page,ms],['HINCRBY',keys.perfCount,page,1],
        ['HINCRBY',allKeys.perfTotal,page,ms],['HINCRBY',allKeys.perfCount,page,1]
      );
    }else if(type==='web_vital'){
      const metric=String(event.metric||'').toLowerCase();
      if(!['lcp','inp','cls'].includes(metric))continue;
      const raw=Number(event.value);if(!Number.isFinite(raw)||raw<0)continue;
      const scaled=metric==='cls'?Math.round(Math.min(2,raw)*1000):Math.round(Math.min(metric==='lcp'?30000:10000,raw));
      const field=metric+'|'+page;
      const good=metric==='lcp'?raw<=2500:metric==='inp'?raw<=200:raw<=0.1;
      const needs=metric==='lcp'?raw<=4000:metric==='inp'?raw<=500:raw<=0.25;
      const bucket=good?'vitalGood':needs?'vitalNeeds':'vitalPoor';
      commands.push(
        ['HINCRBY',keys.vitalTotal,field,scaled],['HINCRBY',keys.vitalCount,field,1],['HINCRBY',keys[bucket],field,1],
        ['HINCRBY',allKeys.vitalTotal,field,scaled],['HINCRBY',allKeys.vitalCount,field,1],['HINCRBY',allKeys[bucket],field,1]
      );
    }else{
      const target=safeText(event.target,80);
      const featureKey=target?`${type}:${target}`:type;commands.push(['HINCRBY',keys.features,featureKey,1],['HINCRBY',allKeys.features,featureKey,1]);
    }
  }
  await redisPipeline(commands);
  return{accepted:events.length};
}

/* Privacy guard: No raw IP address is persisted. A one-way transient hash is used only for anti-spam rate limiting. */
function transientRequestHash(req){
  const raw=String(header(req,'x-forwarded-for')||header(req,'x-real-ip')||'').split(',')[0].trim();
  return raw?sha256('feedback-rate:'+raw).slice(0,28):'';
}
async function feedbackRateLimit(req,visitorId=''){
  if(!hasRedis())return false;
  const parts=[transientRequestHash(req)].filter(Boolean);
  if(validAnonId(visitorId))parts.push(sha256('feedback-visitor:'+visitorId).slice(0,28));
  for(const part of [...new Set(parts)]){
    const claimed=await redisCommand('SET','operator:feedback:rate:v1:'+part,'1','NX','EX',15);
    if(claimed!=='OK')return true;
  }
  return false;
}
const FEEDBACK_CATEGORIES=new Set(['bug','inconvenience','feature','design','content','other']);
const FEEDBACK_STATUS=new Set(['new','reviewing','planned','done','archived']);
const FEEDBACK_PRIORITY=new Set(['high','normal','low']);
async function saveFeedback(req,body){
  if(!hasRedis())throw new Error('feedback_unavailable');
  const category=FEEDBACK_CATEGORIES.has(String(body?.category))?String(body.category):'other';
  const nickname=safeText(body?.nickname,24);
  const message=safeMultiline(body?.message,2000);
  const visitorId=safeText(body?.visitorId,96);
  if(message.length<2)throw new Error('message_required');
  if(await feedbackRateLimit(req,visitorId))throw new Error('rate_limited');
  const now=new Date(),id='FB-'+dayKst(now).replaceAll('-','')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const row={
    id,category,nickname,message,status:'new',priority:'normal',tags:[],relatedUpdate:'',createdAt:now.toISOString(),updatedAt:now.toISOString(),
    page:normalizePage(body?.page||'/'),
    device:['mobile','tablet','desktop'].includes(body?.device)?body.device:'other',
    viewport:safeText(body?.viewport,24),
    pwa:Boolean(body?.pwa),theme:body?.theme==='light'?'light':'dark',
    siteSha:String(process.env.VERCEL_GIT_COMMIT_SHA||'').slice(0,40)
  };
  await redisPipeline([
    ['SET',FEEDBACK_PREFIX+id,JSON.stringify(row)],
    ['ZADD',FEEDBACK_INDEX,Date.now(),id],
    ['HINCRBY',FEEDBACK_COUNTS,'new',1]
  ]);
  return row;
}
async function feedbackList(limit=100){
  const ids=await redisCommand('ZREVRANGE',FEEDBACK_INDEX,0,Math.max(0,Math.min(200,limit)-1));
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.map(async id=>{try{const raw=await redisCommand('GET',FEEDBACK_PREFIX+id);return raw?JSON.parse(raw):null}catch{return null}}));
  return rows.filter(Boolean);
}
async function feedbackItem(id){
  const safe=safeText(id,40);if(!/^FB-\d{8}-[A-F0-9]{6}$/.test(safe))return null;
  const raw=await redisCommand('GET',FEEDBACK_PREFIX+safe);if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}
async function updateFeedback(id,changes={}){
  const row=await feedbackItem(id);if(!row)throw new Error('feedback_not_found');
  const nextStatus=changes.status===undefined||changes.status===null||changes.status===''?row.status:String(changes.status);
  if(!FEEDBACK_STATUS.has(nextStatus))throw new Error('invalid_status');
  const nextPriority=changes.priority===undefined||changes.priority===null||changes.priority===''?(FEEDBACK_PRIORITY.has(row.priority)?row.priority:'normal'):String(changes.priority);
  if(!FEEDBACK_PRIORITY.has(nextPriority))throw new Error('invalid_priority');
  const previous=FEEDBACK_STATUS.has(row.status)?row.status:'new';
  row.status=nextStatus;row.priority=nextPriority;
  if(changes.memo!==undefined)row.operatorMemo=safeMultiline(changes.memo,2000);
  if(changes.tags!==undefined){
    const raw=Array.isArray(changes.tags)?changes.tags:String(changes.tags||'').split(',');
    row.tags=[...new Set(raw.map(value=>safeText(value,24)).filter(Boolean))].slice(0,8);
  }
  if(changes.relatedUpdate!==undefined)row.relatedUpdate=safeText(changes.relatedUpdate,160);
  row.updatedAt=new Date().toISOString();
  const commands=[['SET',FEEDBACK_PREFIX+row.id,JSON.stringify(row)]];
  if(previous!==nextStatus)commands.push(['HINCRBY',FEEDBACK_COUNTS,previous,-1],['HINCRBY',FEEDBACK_COUNTS,nextStatus,1]);
  await redisPipeline(commands);
  return row;
}
function pctChange(current,previous){
  const a=Number(current)||0,b=Number(previous)||0;
  if(!b)return a?null:0;
  return Math.round((a-b)/b*1000)/10;
}
async function analyticsTotalsForDates(dates=[]){
  if(!dates.length)return{pageviews:0,visitors:0,sessions:0,activeMs:0};
  let pageviews=0,activeMs=0;
  for(const day of dates){
    const summary=hashObject(await redisCommand('HGETALL',analyticsKeys(day).summary));
    pageviews+=Number(summary.pageviews)||0;activeMs+=Number(summary.activeMs)||0;
  }
  const visitorKeys=dates.map(day=>analyticsKeys(day).visitors),sessionKeys=dates.map(day=>analyticsKeys(day).sessions);
  const [visitors,sessions]=await Promise.all([
    redisCommand('PFCOUNT',...visitorKeys),
    redisCommand('PFCOUNT',...sessionKeys)
  ]);
  return{pageviews,visitors:Number(visitors)||0,sessions:Number(sessions)||0,activeMs};
}
function featureCount(features,prefix){
  return Object.entries(features).reduce((sum,[key,value])=>sum+(key===prefix||key.startsWith(prefix+':')?(Number(value)||0):0),0);
}
async function analyticsBreakdownsForDates(dates=[]){
  const pages={},menus={},features={};
  for(const day of dates){
    const keys=analyticsKeys(day);
    const [pageRaw,menuRaw,featureRaw]=await Promise.all([
      redisCommand('HGETALL',keys.pages),redisCommand('HGETALL',keys.menus),redisCommand('HGETALL',keys.features)
    ]);
    sumHash(pages,pageRaw);sumHash(menus,menuRaw);sumHash(features,featureRaw);
  }
  return{pages,menus,features};
}
function compareRows(rows=[],previous={}){
  return rows.map(row=>{const previousValue=Number(previous?.[row.key])||0;return{...row,previousValue,changePct:pctChange(row.value,previousValue)}});
}
function webVitalSummary(metric,totalMap,countMap,goodMap,needsMap,poorMap){
  const prefix=metric+'|',keys=Object.keys(countMap).filter(key=>key.startsWith(prefix));
  const pages=keys.map(key=>{
    const samples=Number(countMap[key])||0,total=Number(totalMap[key])||0,good=Number(goodMap[key])||0,needs=Number(needsMap[key])||0,poor=Number(poorMap[key])||0;
    const average=samples?(metric==='cls'?Math.round(total/samples)/1000:Math.round(total/samples)):0;
    return{key:key.slice(prefix.length),samples,average,goodPct:samples?Math.round(good/samples*100):0,needsPct:samples?Math.round(needs/samples*100):0,poorPct:samples?Math.round(poor/samples*100):0};
  }).sort((a,b)=>b.poorPct-a.poorPct||b.average-a.average||b.samples-a.samples);
  const samples=pages.reduce((sum,row)=>sum+row.samples,0),total=keys.reduce((sum,key)=>sum+(Number(totalMap[key])||0),0),good=keys.reduce((sum,key)=>sum+(Number(goodMap[key])||0),0),needs=keys.reduce((sum,key)=>sum+(Number(needsMap[key])||0),0),poor=keys.reduce((sum,key)=>sum+(Number(poorMap[key])||0),0);
  const average=samples?(metric==='cls'?Math.round(total/samples)/1000:Math.round(total/samples)):0;
  return{metric,samples,average,goodPct:samples?Math.round(good/samples*100):0,needsPct:samples?Math.round(needs/samples*100):0,poorPct:samples?Math.round(poor/samples*100):0,pages:pages.slice(0,20)};
}
async function analyticsOverview(days=7){
  const all=String(days)==='all';
  const count=all?'all':([1,7,30].includes(Number(days))?Number(days):7);
  const allRecordedDates=(await redisCommand('ZRANGE',ANALYTICS_DAYS_KEY,0,-1))||[];
  const requestedDates=all?allRecordedDates:recentDays(count);
  const recordedSet=new Set(allRecordedDates);
  const recordedDates=all?allRecordedDates:requestedDates.filter(day=>recordedSet.has(day));
  const chartDates=all?recordedDates.slice(-60):requestedDates;
  const aggregateDates=all?['all']:requestedDates;
  const daily=[];
  for(const day of chartDates){
    const keys=analyticsKeys(day);
    const [summaryRaw,visitors,sessions]=await Promise.all([
      redisCommand('HGETALL',keys.summary),redisCommand('PFCOUNT',keys.visitors),redisCommand('PFCOUNT',keys.sessions)
    ]);
    const summary=hashObject(summaryRaw);
    daily.push({date:day,pageviews:Number(summary.pageviews)||0,visitors:Number(visitors)||0,sessions:Number(sessions)||0,activeMs:Number(summary.activeMs)||0});
  }

  const pages={},pageTime={},menus={},devices={},features={},hours={},perfTotal={},perfCount={},vitalTotal={},vitalCount={},vitalGood={},vitalNeeds={},vitalPoor={};
  let pageviews=0,activeMs=0,newVisitors=0,returningVisits=0,visitors=0,sessions=0;
  if(all){
    const keys=analyticsKeys('all');
    const [summaryRaw,pageRaw,pageTimeRaw,menuRaw,deviceRaw,featureRaw,hourRaw,perfTotalRaw,perfCountRaw,vitalTotalRaw,vitalCountRaw,vitalGoodRaw,vitalNeedsRaw,vitalPoorRaw,v,s]=await Promise.all([
      redisCommand('HGETALL',keys.summary),redisCommand('HGETALL',keys.pages),redisCommand('HGETALL',keys.pageTime),redisCommand('HGETALL',keys.menus),
      redisCommand('HGETALL',keys.devices),redisCommand('HGETALL',keys.features),redisCommand('HGETALL',keys.hours),redisCommand('HGETALL',keys.perfTotal),redisCommand('HGETALL',keys.perfCount),
      redisCommand('HGETALL',keys.vitalTotal),redisCommand('HGETALL',keys.vitalCount),redisCommand('HGETALL',keys.vitalGood),redisCommand('HGETALL',keys.vitalNeeds),redisCommand('HGETALL',keys.vitalPoor),
      redisCommand('PFCOUNT',keys.visitors),redisCommand('PFCOUNT',keys.sessions)
    ]);
    const summary=hashObject(summaryRaw);
    pageviews=Number(summary.pageviews)||0;activeMs=Number(summary.activeMs)||0;
    newVisitors=Number(summary.newVisitors)||0;returningVisits=Number(summary.returningVisits)||0;
    visitors=Number(v)||0;sessions=Number(s)||0;
    sumHash(pages,pageRaw);sumHash(pageTime,pageTimeRaw);sumHash(menus,menuRaw);sumHash(devices,deviceRaw);sumHash(features,featureRaw);sumHash(hours,hourRaw);sumHash(perfTotal,perfTotalRaw);sumHash(perfCount,perfCountRaw);sumHash(vitalTotal,vitalTotalRaw);sumHash(vitalCount,vitalCountRaw);sumHash(vitalGood,vitalGoodRaw);sumHash(vitalNeeds,vitalNeedsRaw);sumHash(vitalPoor,vitalPoorRaw);
  }else{
    for(const day of aggregateDates){
      const keys=analyticsKeys(day);
      const [summaryRaw,pageRaw,pageTimeRaw,menuRaw,deviceRaw,featureRaw,hourRaw,perfTotalRaw,perfCountRaw,vitalTotalRaw,vitalCountRaw,vitalGoodRaw,vitalNeedsRaw,vitalPoorRaw]=await Promise.all([
        redisCommand('HGETALL',keys.summary),redisCommand('HGETALL',keys.pages),redisCommand('HGETALL',keys.pageTime),redisCommand('HGETALL',keys.menus),
        redisCommand('HGETALL',keys.devices),redisCommand('HGETALL',keys.features),redisCommand('HGETALL',keys.hours),redisCommand('HGETALL',keys.perfTotal),redisCommand('HGETALL',keys.perfCount),
        redisCommand('HGETALL',keys.vitalTotal),redisCommand('HGETALL',keys.vitalCount),redisCommand('HGETALL',keys.vitalGood),redisCommand('HGETALL',keys.vitalNeeds),redisCommand('HGETALL',keys.vitalPoor)
      ]);
      const summary=hashObject(summaryRaw);
      pageviews+=Number(summary.pageviews)||0;activeMs+=Number(summary.activeMs)||0;
      newVisitors+=Number(summary.newVisitors)||0;returningVisits+=Number(summary.returningVisits)||0;
      sumHash(pages,pageRaw);sumHash(pageTime,pageTimeRaw);sumHash(menus,menuRaw);sumHash(devices,deviceRaw);sumHash(features,featureRaw);sumHash(hours,hourRaw);sumHash(perfTotal,perfTotalRaw);sumHash(perfCount,perfCountRaw);sumHash(vitalTotal,vitalTotalRaw);sumHash(vitalCount,vitalCountRaw);sumHash(vitalGood,vitalGoodRaw);sumHash(vitalNeeds,vitalNeedsRaw);sumHash(vitalPoor,vitalPoorRaw);
    }
    const visitorKeys=aggregateDates.map(day=>analyticsKeys(day).visitors),sessionKeys=aggregateDates.map(day=>analyticsKeys(day).sessions);
    visitors=Number(visitorKeys.length?await redisCommand('PFCOUNT',...visitorKeys):0)||0;
    sessions=Number(sessionKeys.length?await redisCommand('PFCOUNT',...sessionKeys):0)||0;
  }

  const [startAt,feedbackCounts]=await Promise.all([redisCommand('GET',ANALYTICS_START_KEY),redisCommand('HGETALL',FEEDBACK_COUNTS)]);
  let averageDailyVisitors=0;
  if(all&&recordedDates.length){
    const dailyVisitorCounts=await redisPipeline(recordedDates.map(day=>['PFCOUNT',analyticsKeys(day).visitors]));
    averageDailyVisitors=Math.round(dailyVisitorCounts.reduce((sum,value)=>sum+(Number(value)||0),0)/recordedDates.length);
  }else if(daily.length){
    averageDailyVisitors=Math.round(daily.reduce((sum,row)=>sum+row.visitors,0)/daily.length);
  }
  await redisCommand('ZREMRANGEBYSCORE',ACTIVE_KEY,0,Date.now()-5*60*1000);
  const activeNow=Number(await redisCommand('ZCARD',ACTIVE_KEY))||0;
  let comparison=null,previousBreakdowns={pages:{},menus:{},features:{}};
  if(!all){
    const compareDates=recentDays(count*2).slice(0,count);
    const [previous,breakdowns]=await Promise.all([analyticsTotalsForDates(compareDates),analyticsBreakdownsForDates(compareDates)]);
    previousBreakdowns=breakdowns;
    const currentAverage=sessions?Math.round(activeMs/sessions/1000):0;
    const previousAverage=previous.sessions?Math.round(previous.activeMs/previous.sessions/1000):0;
    comparison={
      previous,
      visitorsPct:pctChange(visitors,previous.visitors),
      sessionsPct:pctChange(sessions,previous.sessions),
      pageviewsPct:pctChange(pageviews,previous.pageviews),
      averageActiveSecondsPct:pctChange(currentAverage,previousAverage)
    };
  }
  const funnel={
    game:{start:featureCount(features,'game_start'),finish:featureCount(features,'game_finish')},
    tarot:{start:featureCount(features,'tarot_start'),finish:featureCount(features,'tarot_result')},
    feedback:{start:featureCount(features,'feedback_open'),finish:featureCount(features,'feedback_submit')}
  };
  const performanceAll=Object.keys(perfCount).map(key=>({key,samples:Number(perfCount[key])||0,totalMs:Number(perfTotal[key])||0})).filter(row=>row.samples>0).map(row=>({...row,averageMs:Math.round(row.totalMs/row.samples)})).sort((a,b)=>b.averageMs-a.averageMs||b.samples-a.samples);
  const performancePages=performanceAll.slice(0,20);
  const performanceSamples=performanceAll.reduce((sum,row)=>sum+row.samples,0),performanceTotalMs=performanceAll.reduce((sum,row)=>sum+row.totalMs,0);
  const menuTotal=Object.values(menus).reduce((sum,value)=>sum+(Number(value)||0),0);
  const featureTotal=Object.values(features).reduce((sum,value)=>sum+(Number(value)||0),0);
  const webVitals={
    lcp:webVitalSummary('lcp',vitalTotal,vitalCount,vitalGood,vitalNeeds,vitalPoor),
    inp:webVitalSummary('inp',vitalTotal,vitalCount,vitalGood,vitalNeeds,vitalPoor),
    cls:webVitalSummary('cls',vitalTotal,vitalCount,vitalGood,vitalNeeds,vitalPoor)
  };
  return{
    periodDays:count,collectionStartedAt:startAt||null,activeNow,pageviews,visitors,sessions,
    averageActiveSeconds:sessions?Math.round(activeMs/sessions/1000):0,
    averageDailyVisitors,
    newVisitors,returningVisits,daily,recordedDays:recordedDates.length,
    topPages:compareRows(topRows(pages,10).map(row=>({...row,averageActiveSeconds:row.value?Math.round((Number(pageTime[row.key])||0)/row.value/1000):0})),previousBreakdowns.pages),
    topMenus:compareRows(topRows(menus,10),previousBreakdowns.menus),menuTotal,devices:topRows(devices,20),
    topFeatures:compareRows(topRows(features,14),previousBreakdowns.features),featureTotal,hourly:topRows(hours,24).sort((a,b)=>a.key.localeCompare(b.key)),
    funnel,comparison,
    performance:{averageMs:performanceSamples?Math.round(performanceTotalMs/performanceSamples):0,samples:performanceSamples,pages:performancePages,webVitals},
    feedbackCounts:hashObject(feedbackCounts)
  };
}
async function operatorSessionList(currentJti=''){
  if(!hasRedis())return[];
  await redisCommand('ZREMRANGEBYSCORE',SESSION_INDEX,0,Date.now());
  const raw=await redisCommand('ZREVRANGE',SESSION_INDEX,0,19,'WITHSCORES');
  const pairs=[];
  if(Array.isArray(raw))for(let i=0;i<raw.length;i+=2)pairs.push([String(raw[i]),Number(raw[i+1])||0]);
  return Promise.all(pairs.map(async([id,score])=>{
    let meta={};
    try{const value=await redisCommand('GET',SESSION_META_PREFIX+id);if(value)meta=JSON.parse(value)}catch{}
    return{id,current:id===currentJti,provider:meta.provider||'unknown',createdAt:meta.createdAt||null,lastSeen:meta.lastSeen||meta.createdAt||null,expiresAt:meta.expiresAt||new Date(score).toISOString()};
  }));
}
function redisInfoObject(value=''){
  const out={};
  for(const line of String(value||'').split(/\r?\n/)){
    if(!line||line.startsWith('#'))continue;
    const at=line.indexOf(':');if(at<1)continue;
    out[line.slice(0,at)]=line.slice(at+1).trim();
  }
  return out;
}
async function redisStorageStats(){
  if(!hasRedis())return{keyCount:null,usedMemory:null,usedMemoryHuman:null,maxMemory:null,maxMemoryHuman:null};
  try{
    const [keyCount,infoRaw]=await Promise.all([
      redisCommand('DBSIZE').catch(()=>null),
      redisCommand('INFO','memory').catch(()=>null)
    ]);
    const info=redisInfoObject(infoRaw);
    return{
      keyCount:Number.isFinite(Number(keyCount))?Number(keyCount):null,
      usedMemory:Number.isFinite(Number(info.used_memory))?Number(info.used_memory):null,
      usedMemoryHuman:safeText(info.used_memory_human||'',32)||null,
      maxMemory:Number.isFinite(Number(info.maxmemory))&&Number(info.maxmemory)>0?Number(info.maxmemory):null,
      maxMemoryHuman:safeText(info.maxmemory_human||'',32)||null
    };
  }catch{return{keyCount:null,usedMemory:null,usedMemoryHuman:null,maxMemory:null,maxMemoryHuman:null}}
}
async function endpointHealth(base,label,path){
  const started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
  try{
    const response=await fetch(base+path,{headers:{Accept:'application/json','User-Agent':'chunbong-fansite-operator-health'},cache:'no-store',signal:controller.signal});
    return{label,path,ok:response.ok,status:response.status,ms:Date.now()-started};
  }catch(error){
    return{label,path,ok:false,status:0,ms:Date.now()-started,error:safeText(error?.name||error?.message||'request_failed',48)};
  }finally{clearTimeout(timer)}
}
async function publicEndpointHealth(base){
  const rows=await Promise.all([
    endpointHealth(base,'버전','/api/version'),
    endpointHealth(base,'LIVE','/api/content?type=live'),
    endpointHealth(base,'방송 일정','/api/content?type=schedule'),
    endpointHealth(base,'Push','/api/content?type=push-config')
  ]);
  return rows;
}

async function githubProjectState(){
  if(hasRedis()){
    try{
      const cached=await redisCommand('GET',GITHUB_STATE_CACHE_KEY);
      if(cached){const parsed=JSON.parse(cached);if(parsed&&Date.now()-Number(parsed.cachedAt||0)<120000)return parsed}
    }catch{}
  }
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
  try{
    const headers={Accept:'application/vnd.github+json','User-Agent':'chunbong-fansite-operator'};
    const [repoResponse,commitResponse]=await Promise.all([
      fetch('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite',{headers,signal:controller.signal}),
      fetch('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/commits/main',{headers,signal:controller.signal})
    ]);
    const repo=repoResponse.ok?await repoResponse.json():null,commit=commitResponse.ok?await commitResponse.json():null,mainSha=String(commit?.sha||'');
    let vercelStatus=null;
    if(mainSha){
      try{
        const statusResponse=await fetch('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/commits/'+encodeURIComponent(mainSha)+'/status',{headers,signal:controller.signal});
        if(statusResponse.ok){const payload=await statusResponse.json();const row=(payload.statuses||[]).find(item=>item.context==='Vercel');if(row)vercelStatus={state:String(row.state||''),description:safeText(row.description||'',160),createdAt:row.created_at||null,targetUrl:String(row.target_url||'')}}
      }catch{}
    }
    const result={available:Boolean(repo||commit),mainSha,repoSizeKb:Number(repo?.size)||0,updatedAt:repo?.updated_at||null,vercelStatus,cachedAt:Date.now()};
    if(hasRedis())try{await redisCommand('SET',GITHUB_STATE_CACHE_KEY,JSON.stringify(result),'EX',180)}catch{}
    return result;
  }catch{return{available:false,mainSha:'',repoSizeKb:0,updatedAt:null,vercelStatus:null,cachedAt:Date.now()}}finally{clearTimeout(timer)}
}

async function securityLogList(limit=40){
  if(!hasRedis())return[];
  const ids=await redisCommand('ZREVRANGE',SECURITY_INDEX,0,Math.max(0,Math.min(100,limit)-1));
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.map(async id=>{try{const raw=await redisCommand('GET',SECURITY_PREFIX+id);return raw?JSON.parse(raw):null}catch{return null}}));
  return rows.filter(Boolean);
}
async function healthHistoryList(limit=20){
  if(!hasRedis())return[];
  const ids=await redisCommand('ZREVRANGE',HEALTH_INDEX,0,Math.max(0,Math.min(50,limit)-1));
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.map(async id=>{try{const raw=await redisCommand('GET',HEALTH_PREFIX+id);return raw?JSON.parse(raw):null}catch{return null}}));
  return rows.filter(Boolean);
}
async function recordHealthState(summary={}){
  if(!hasRedis())return[];
  try{
    const normalized={level:safeText(summary.level||'ok',12),issues:(Array.isArray(summary.issues)?summary.issues:[]).map(value=>safeText(value,120)).filter(Boolean).slice(0,8)};
    const fingerprint=sha256(JSON.stringify(normalized)).slice(0,24),previous=String(await redisCommand('GET',HEALTH_STATE_KEY)||'');
    if(previous!==fingerprint){
      const id='HLT-'+Date.now().toString(36)+'-'+crypto.randomBytes(2).toString('hex');
      const row={id,...normalized,at:new Date().toISOString()};
      await redisPipeline([['SET',HEALTH_STATE_KEY,fingerprint],['SET',HEALTH_PREFIX+id,JSON.stringify(row),'EX',60*60*24*90],['ZADD',HEALTH_INDEX,Date.now(),id],['ZREMRANGEBYSCORE',HEALTH_INDEX,0,Date.now()-90*86400000]]);
    }
    return await healthHistoryList(20);
  }catch{return[]}
}

async function operatorSystemStatus(req){
  const now=new Date().toISOString(),deploymentSha=String(process.env.VERCEL_GIT_COMMIT_SHA||''),deploymentUrl=String(process.env.VERCEL_URL||'chunbong-fansite.vercel.app');
  let redisOk=false,recordedDays=0,feedbackTotal=0,pushReady=false;
  if(hasRedis()){
    try{
      const [pong,days,feedbackCount,managedVapid]=await Promise.all([
        redisCommand('PING'),
        redisCommand('ZCARD',ANALYTICS_DAYS_KEY),
        redisCommand('ZCARD',FEEDBACK_INDEX),
        redisCommand('GET','push:vapid:v1')
      ]);
      redisOk=String(pong).toUpperCase()==='PONG';recordedDays=Number(days)||0;feedbackTotal=Number(feedbackCount)||0;
      pushReady=Boolean((process.env.WEB_PUSH_VAPID_PUBLIC_KEY&&process.env.WEB_PUSH_VAPID_PRIVATE_KEY)||managedVapid);
    }catch{}
  }
  const base=origin(req);
  const [github,today,storageStats,endpoints]=await Promise.all([
    githubProjectState(),
    hasRedis()?analyticsOverview(1).catch(()=>null):null,
    redisStorageStats(),
    publicEndpointHealth(base)
  ]);
  const synced=github.available&&github.mainSha&&deploymentSha?github.mainSha===deploymentSha:null;
  const vercel=github.vercelStatus||null,rateLimited=Boolean(vercel&&/rate limited/i.test(vercel.description||''));
  const rateLimitAt=rateLimited&&vercel?.createdAt?vercel.createdAt:null,retryAfter=rateLimitAt?new Date(Date.parse(rateLimitAt)+25*60*60*1000).toISOString():null;
  const healthIssues=[];
  if(synced===false)healthIssues.push('Production과 GitHub main의 버전이 다릅니다.');
  if(!redisOk)healthIssues.push('Redis/KV 상태를 확인해야 합니다.');
  if(!pushReady)healthIssues.push('Push 알림 설정을 확인해야 합니다.');
  endpoints.filter(row=>!row.ok).forEach(row=>healthIssues.push((row.label||'API')+' 응답 실패'));
  endpoints.filter(row=>row.ok&&Number(row.ms)>=1500).forEach(row=>healthIssues.push((row.label||'API')+' 응답 지연'));
  if(rateLimited)healthIssues.push('Vercel 배포 제한으로 Production 반영이 대기 중입니다.');
  const healthLevel=healthIssues.some(text=>/실패|Redis/.test(text))?'bad':healthIssues.length?'warn':'ok';
  const healthHistory=await recordHealthState({level:healthLevel,issues:healthIssues});
  return{
    checkedAt:now,
    deployment:{environment:String(process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown'),sha:deploymentSha,url:deploymentUrl,mainSha:github.mainSha,synced,vercel,rateLimited,rateLimitAt,retryAfter},
    storage:{redisConfigured:hasRedis(),redisOk,analyticsRecordedDays:recordedDays,feedbackTotal,...storageStats},
    services:{githubAuth:githubReady(),emailAuth:firebaseReady(),push:pushReady,analytics:hasRedis(),feedback:hasRedis()},
    endpoints,
    traffic:{visitors:Number(today?.visitors)||0,sessions:Number(today?.sessions)||0,pageviews:Number(today?.pageviews)||0,activeNow:Number(today?.activeNow)||0},
    repository:{available:github.available,sizeKb:github.repoSizeKb,updatedAt:github.updatedAt},
    health:{level:healthLevel,issues:healthIssues,history:healthHistory},
    vercelUsage:{available:false,reason:'Detailed Fast Data Transfer / Function usage is not exposed to this runtime without a dedicated Vercel Usage integration.'}
  };
}

async function handleAnalyticsEvent(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{return sendJson(res,200,{ok:true,...await ingestAnalytics(body)})}catch(error){
    const status=String(error?.message||'').startsWith('invalid_')?400:503;
    return sendJson(res,status,{error:error?.message||'analytics_unavailable'});
  }
}
async function handleFeedbackSubmit(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{
    const row=await saveFeedback(req,body);
    return sendJson(res,200,{ok:true,id:row.id,submittedAt:row.createdAt});
  }catch(error){
    const name=String(error?.message||'feedback_unavailable');
    return sendJson(res,name==='rate_limited'?429:name==='message_required'?400:503,{error:name});
  }
}
async function handleAuthConfig(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  const current=await session(req);
  return sendJson(res,200,{
    authenticated:Boolean(current?.owner),
    provider:current?.provider||null,
    providers:{github:githubReady(),email:firebaseReady()},
    firebase:firebaseReady()?publicFirebase():null,
    storage:hasRedis(),
    ownerRegistered:true,
    ...(current?.owner?{owner:{githubLogin:OWNER_GITHUB_LOGIN,githubId:OWNER_GITHUB_ID,emailRegistered:true}}:{})
  });
}
async function handleSession(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  const current=await session(req);
  if(!current?.owner)return sendJson(res,401,{authenticated:false});
  let activeSessions=1;
  if(hasRedis()){try{await redisCommand('ZREMRANGEBYSCORE',SESSION_INDEX,0,Date.now());activeSessions=Number(await redisCommand('ZCARD',SESSION_INDEX))||1}catch(_){}}
  const sessions=await operatorSessionList(current.jti);
  return sendJson(res,200,{authenticated:true,provider:current.provider,expiresAt:new Date(current.exp).toISOString(),activeSessions,sessions,currentSessionId:current.jti,owner:{githubLogin:OWNER_GITHUB_LOGIN,githubId:OWNER_GITHUB_ID,emailRegistered:true}});
}
async function handleGithubStart(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  if(!githubReady())return redirect(res,'/operator.html?auth=github-not-configured');
  const cfg=githubConfig(),returnPath=safeReturn(query(req).get('return'));
  const verifier=crypto.randomBytes(32).toString('base64url');
  const state=await signToken({purpose:'github-state',exp:Date.now()+10*60*1000,returnPath,nonce:crypto.randomBytes(12).toString('hex')});
  await redisCommand('SET',GITHUB_PKCE_PREFIX+sha256(state),verifier,'EX',600);
  const callback=origin(req)+'/api/operator/github/callback';
  const target=new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id',cfg.clientId);
  target.searchParams.set('redirect_uri',callback);
  target.searchParams.set('scope','read:user');
  target.searchParams.set('state',state);
  target.searchParams.set('code_challenge',sha256Base64url(verifier));
  target.searchParams.set('code_challenge_method','S256');
  target.searchParams.set('login',OWNER_GITHUB_LOGIN);
  return redirect(res,target.toString());
}
async function handleGithubCallback(req,res){
  const q=query(req),rawState=String(q.get('state')||''),state=await verifyToken(rawState,'github-state'),code=safeText(q.get('code'),240);
  if(!state||!code){await logSecurity('login_failed','github','invalid_state');return redirect(res,'/operator.html?auth=denied')}
  try{
    const cfg=githubConfig(),pkceKey=GITHUB_PKCE_PREFIX+sha256(rawState);
    const verifier=String(await redisCommand('GET',pkceKey)||'');
    await redisCommand('DEL',pkceKey);
    if(verifier.length<43)throw new Error('pkce_missing');
    const callback=origin(req)+'/api/operator/github/callback';
    const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','User-Agent':'chunbong-fansite-operator'},
      body:JSON.stringify({client_id:cfg.clientId,client_secret:cfg.clientSecret,code,redirect_uri:callback,code_verifier:verifier})
    });
    const tokenPayload=await tokenResponse.json(),accessToken=String(tokenPayload?.access_token||'');
    if(!accessToken)throw new Error('oauth_exchange_failed');
    const userResponse=await fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+accessToken,Accept:'application/vnd.github+json','User-Agent':'chunbong-fansite-operator'}});
    const user=await userResponse.json();
    if(!userResponse.ok||Number(user?.id)!==OWNER_GITHUB_ID)throw new Error('owner_mismatch');
    await setSession(res,'github',{githubLogin:safeText(user.login,80)});
    await logSecurity('login_success','github',safeText(user.login,80));
    return redirect(res,safeReturn(state.returnPath)+'?auth=success');
  }catch(error){
    await logSecurity('login_failed','github',String(error?.message||'unknown'));
    return redirect(res,'/operator.html?auth=denied');
  }
}
async function handleEmailStart(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body),email=String(body?.email||'').trim().toLowerCase();
  if(!firebaseReady())return sendJson(res,503,{error:'email_auth_not_configured'});
  if(ownerEmail(email)){
    try{
      if(hasRedis()){
        const cooldown=await redisCommand('SET','operator:auth:email-cooldown:v1','1','NX','EX',60);
        if(cooldown!=='OK')return sendJson(res,200,{ok:true});
      }
      const cfg=firebaseConfig(),continueUrl=origin(req)+'/operator.html?email=complete';
      const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key='+encodeURIComponent(cfg.apiKey),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requestType:'EMAIL_SIGNIN',email,continueUrl,canHandleCodeInApp:true})
      });
      if(!response.ok)throw new Error('firebase_email_send_failed');
      await logSecurity('login_email_requested','email','owner');
    }catch(error){
      console.error('[operator-email]',error?.message||error);
    }
  }else{
    await logSecurity('login_email_requested','email','unregistered');
  }
  return sendJson(res,200,{ok:true});
}
async function handleEmailComplete(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body),idToken=String(body?.idToken||'');
  if(!firebaseReady()||idToken.length<100)return sendJson(res,401,{error:'email_auth_invalid'});
  try{
    const cfg=firebaseConfig();
    const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(cfg.apiKey),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})
    });
    const payload=await response.json(),user=Array.isArray(payload?.users)?payload.users[0]:null;
    if(!response.ok||!user||user.emailVerified!==true||!ownerEmail(user.email))throw new Error('owner_mismatch');
    await setSession(res,'email',{emailVerified:true});
    await logSecurity('login_success','email','owner');
    return sendJson(res,200,{ok:true,authenticated:true});
  }catch(error){
    await logSecurity('login_failed','email',String(error?.message||'unknown'));
    return sendJson(res,401,{error:'email_auth_invalid'});
  }
}
async function handleOperatorAnalytics(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return sendJson(res,503,{error:'analytics_unavailable'});
  try{return sendJson(res,200,await analyticsOverview(query(req).get('days')||7))}catch(error){return sendJson(res,503,{error:'analytics_unavailable'})}
}
async function handleOperatorFeedback(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return sendJson(res,503,{error:'feedback_unavailable'});
  try{
    const id=query(req).get('id');
    if(id){const item=await feedbackItem(id);return item?sendJson(res,200,{item}):sendJson(res,404,{error:'feedback_not_found'})}
    return sendJson(res,200,{items:await feedbackList(120)});
  }catch{return sendJson(res,503,{error:'feedback_unavailable'})}
}
async function handleOperatorFeedbackUpdate(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{return sendJson(res,200,{ok:true,item:await updateFeedback(safeText(body.id,40),{status:body.status,memo:body.memo,priority:body.priority,tags:body.tags,relatedUpdate:body.relatedUpdate})})}
  catch(error){
    const name=String(error?.message||'feedback_unavailable');
    return sendJson(res,name==='feedback_not_found'?404:(name==='invalid_status'||name==='invalid_priority')?400:503,{error:name});
  }
}
async function handleOperatorSystemStatus(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  try{return sendJson(res,200,await operatorSystemStatus(req))}catch{return sendJson(res,503,{error:'system_status_unavailable'})}
}
async function handleOperatorSecurityLog(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return sendJson(res,503,{error:'security_log_unavailable'});
  try{return sendJson(res,200,{items:await securityLogList(Number(query(req).get('limit'))||40)})}catch{return sendJson(res,503,{error:'security_log_unavailable'})}
}
async function handleOperatorSessionRevoke(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  const id=safeText(body.id,96);if(!/^[A-Za-z0-9_-]{16,96}$/.test(id))return sendJson(res,400,{error:'invalid_session'});
  if(hasRedis())try{await redisPipeline([['ZREM',SESSION_INDEX,id],['DEL',SESSION_META_PREFIX+id]])}catch{}
  await logSecurity('session_revoked',current.provider||'unknown',id===current.jti?'current':'other');
  if(id===current.jti)clearSession(res);
  return sendJson(res,200,{ok:true,current:id===current.jti});
}

async function handleLogout(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const current=await session(req);clearSession(res);
  if(current?.jti&&hasRedis()){try{await redisPipeline([['ZREM',SESSION_INDEX,current.jti],['DEL',SESSION_META_PREFIX+current.jti]])}catch(_){}}
  if(current?.owner)await logSecurity('logout',current.provider||'unknown','');
  return sendJson(res,200,{ok:true});
}
async function handleLogoutAll(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  if(hasRedis()){try{await redisPipeline([['INCR',AUTH_EPOCH_KEY],['DEL',SESSION_INDEX]])}catch(_){}}
  clearSession(res);
  await logSecurity('logout_all',current.provider||'unknown','');
  return sendJson(res,200,{ok:true});
}

module.exports={
  handleAnalyticsEvent,handleFeedbackSubmit,handleAuthConfig,handleSession,handleGithubStart,handleGithubCallback,
  handleEmailStart,handleEmailComplete,handleOperatorAnalytics,handleOperatorFeedback,handleOperatorFeedbackUpdate,handleOperatorSystemStatus,handleOperatorSecurityLog,handleOperatorSessionRevoke,handleLogout,handleLogoutAll,
  _internals:{OWNER_GITHUB_ID,OWNER_GITHUB_LOGIN,OWNER_EMAIL_SHA256,ownerEmail,ingestAnalytics,analyticsOverview,saveFeedback,verifyToken,signToken,requireOwner,sameOrigin,parseBody,safeText}
};
