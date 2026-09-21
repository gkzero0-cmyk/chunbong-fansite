'use strict';

const {hasRedis,redisCommand,hgetall,getJson}=require('./operator-store');
const {requireOperator}=require('./operator-auth-api');
const { _internals:analytics }=require('./site-analytics-api');

function sendJson(res,status,payload){
  if(typeof res.setHeader==='function'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');}
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
function numberMap(raw={}){
  return Object.fromEntries(Object.entries(raw||{}).map(([key,value])=>[key,Number(value)||0]));
}
function mergeMaps(target,source){
  for(const [key,value] of Object.entries(source||{}))target[key]=(target[key]||0)+(Number(value)||0);
  return target;
}
function topEntries(map={},limit=10){
  return Object.entries(map).map(([name,value])=>({name,value:Number(value)||0})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,limit);
}
function kstDateOffset(offset=0){
  const base=new Date(Date.now()+offset*86400000);
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(base).reduce((o,x)=>{if(x.type!=='literal')o[x.type]=x.value;return o;},{});
  return `${p.year}-${p.month}-${p.day}`;
}
async function allDays(){
  const rows=await redisCommand('ZRANGE',analytics.DAYS_KEY,0,-1);
  return Array.isArray(rows)?rows.map(String):[];
}
async function selectedDays(period){
  if(period==='today')return[kstDateOffset(0)];
  if(period==='7d')return Array.from({length:7},(_,i)=>kstDateOffset(i-6));
  if(period==='30d')return Array.from({length:30},(_,i)=>kstDateOffset(i-29));
  const rows=await allDays();return rows.length?rows:[kstDateOffset(0)];
}
async function unionCount(prefix,days){
  if(!days.length)return 0;
  const result=await redisCommand('SUNION',...days.map(day=>prefix+day));
  return Array.isArray(result)?result.length:0;
}
async function recentExitPages(days,limit=500){
  const minDate=days[0]||'0000-00-00';
  const ids=await redisCommand('ZREVRANGE',analytics.SESSION_INDEX,0,limit-1);
  const counts={};
  for(const id of Array.isArray(ids)?ids:[]){
    const row=await getJson('analytics:session:v1:'+id,null).catch(()=>null);
    if(!row?.lastSeen||String(row.lastSeen).slice(0,10)<minDate)continue;
    const path=String(row.lastPage||'/');counts[path]=(counts[path]||0)+1;
  }
  return topEntries(counts,10);
}
async function buildDashboard(period='7d'){
  const days=await selectedDays(period);
  const pageviews={},pageMs={},menu={},features={},devices={},pwa={},themes={},hours={},transitions={};
  let totalPageviews=0,totalActiveMs=0;
  const timeline=[];
  for(const day of days){
    const [summaryRaw,pagesRaw,pageMsRaw,menuRaw,featuresRaw,devicesRaw,pwaRaw,themesRaw,hoursRaw,transitionsRaw,visitors,sessions]=await Promise.all([
      hgetall('analytics:day:v1:'+day),hgetall('analytics:pages:v1:'+day),hgetall('analytics:page-ms:v1:'+day),
      hgetall('analytics:menu:v1:'+day),hgetall('analytics:features:v1:'+day),hgetall('analytics:devices:v1:'+day),
      hgetall('analytics:pwa:v1:'+day),hgetall('analytics:themes:v1:'+day),hgetall('analytics:hours:v1:'+day),
      hgetall('analytics:transitions:v1:'+day),redisCommand('SCARD','analytics:visitors:v1:'+day),redisCommand('SCARD','analytics:sessions:v1:'+day)
    ]);
    const summary=numberMap(summaryRaw),pv=Number(summary.pageviews)||0,active=Number(summary.activeMs)||0;
    totalPageviews+=pv;totalActiveMs+=active;
    mergeMaps(pageviews,numberMap(pagesRaw));mergeMaps(pageMs,numberMap(pageMsRaw));mergeMaps(menu,numberMap(menuRaw));
    mergeMaps(features,numberMap(featuresRaw));mergeMaps(devices,numberMap(devicesRaw));mergeMaps(pwa,numberMap(pwaRaw));
    mergeMaps(themes,numberMap(themesRaw));mergeMaps(hours,numberMap(hoursRaw));mergeMaps(transitions,numberMap(transitionsRaw));
    timeline.push({date:day,pageviews:pv,visitors:Number(visitors)||0,sessions:Number(sessions)||0,activeMs:active});
  }
  const [uniqueVisitors,uniqueSessions,activeUsers,startedAt,exitPages]=await Promise.all([
    unionCount('analytics:visitors:v1:',days),
    unionCount('analytics:sessions:v1:',days),
    redisCommand('ZCOUNT',analytics.ACTIVE_KEY,Date.now()-5*60*1000,'+inf'),
    redisCommand('GET',analytics.COLLECTION_STARTED),
    recentExitPages(days)
  ]);
  const avgSessionMs=uniqueSessions?Math.round(totalActiveMs/uniqueSessions):0;
  const pageTime=Object.fromEntries(Object.entries(pageMs).map(([path,ms])=>[path,{ms:Number(ms)||0,views:pageviews[path]||0,avgMs:(pageviews[path]||0)?Math.round((Number(ms)||0)/(pageviews[path]||1)):0}]));
  return {
    period,days,collectionStartedAt:String(startedAt||''),
    summary:{visitors:uniqueVisitors,activeUsers:Number(activeUsers)||0,avgSessionMs,pageviews:totalPageviews,sessions:uniqueSessions,totalActiveMs},
    topPages:topEntries(pageviews,12),
    pageTime:topEntries(Object.fromEntries(Object.entries(pageTime).map(([path,row])=>[path,row.avgMs])),12),
    topMenu:topEntries(menu,12),topFeatures:topEntries(features,12),devices:topEntries(devices,8),pwa:topEntries(pwa,4),themes:topEntries(themes,4),
    hours:topEntries(hours,24),transitions:topEntries(transitions,12),exitPages,timeline
  };
}
async function handleOperatorDashboard(req,res){
  const operator=await requireOperator(req,res);if(!operator)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return sendJson(res,503,{error:'analytics_unavailable'});
  const period=new URL(req?.url||'/','https://chunbong.local').searchParams.get('period')||'7d';
  const normalized=['today','7d','30d','all'].includes(period)?period:'7d';
  try{return sendJson(res,200,await buildDashboard(normalized));}
  catch(error){console.error('[operator-dashboard]',error?.message||error);return sendJson(res,503,{error:'analytics_unavailable'});}
}
module.exports={handleOperatorDashboard,_internals:{buildDashboard,selectedDays,topEntries,mergeMaps}};
