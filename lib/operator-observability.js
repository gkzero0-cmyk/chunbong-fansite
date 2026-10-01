'use strict';

const CLIENT_SAMPLE_RATE=0.02;
const MAX_CLIENT_SAMPLES=60;
const collectorState=new Map();
const clientSamples=[];

function safeText(value,max=160){
  return String(value??'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/https?:\/\/\S+/gi,'[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]')
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{32,}\b/gi,'[secret]')
    .replace(/\s+/g,' ').trim().slice(0,max);
}
function newestDataAt(items=[]){
  let newest=0;
  for(const item of Array.isArray(items)?items:[]){
    for(const key of ['publishedAt','createdAt','uploadedAt','date','startAt','start','timestamp']){
      const time=Date.parse(String(item?.[key]||''));
      if(Number.isFinite(time)&&time>newest)newest=time;
    }
  }
  return newest?new Date(newest).toISOString():null;
}
function recordCollectorResult(type,payload={}){
  const key=safeText(type,40)||'unknown';
  const previous=collectorState.get(key)||{type:key,consecutiveFailures:0,lastSuccessAt:null,lastFailureAt:null,lastDataAt:null};
  const items=Array.isArray(payload?.items)?payload.items:Array.isArray(payload?.posts)?payload.posts:Array.isArray(payload?.vods)?payload.vods:[];
  const degraded=payload?.fallback===true||payload?.stale===true||payload?.ok===false||Boolean(payload?.error);
  const now=new Date().toISOString();
  const next={
    ...previous,
    type:key,
    lastCheckedAt:now,
    fallback:payload?.fallback===true,
    stale:payload?.stale===true,
    itemCount:items.length,
    lastDataAt:newestDataAt(items)||previous.lastDataAt||null,
    consecutiveFailures:degraded?(Number(previous.consecutiveFailures)||0)+1:0,
    ...(degraded?{lastFailureAt:now}:{lastSuccessAt:now})
  };
  collectorState.set(key,next);
  return next;
}
function recordCollectorFailure(type,error){
  return recordCollectorResult(type,{fallback:true,items:[],reason:safeText(error?.message||error||'collector_failed')});
}
function recordClientHealth(input={}){
  const kind=['error','promise','slow'].includes(String(input.kind||input.type))?String(input.kind||input.type):'error';
  const row={
    kind,
    page:String(input.page||'/').split('?')[0].split('#')[0].slice(0,100)||'/',
    message:safeText(input.message||kind,180),
    durationMs:Number.isFinite(Number(input.durationMs))?Math.max(0,Math.min(60000,Math.round(Number(input.durationMs)))):null,
    device:['mobile','tablet','desktop','other'].includes(String(input.device))?String(input.device):'other',
    at:new Date().toISOString()
  };
  clientSamples.push(row);
  if(clientSamples.length>MAX_CLIENT_SAMPLES)clientSamples.splice(0,clientSamples.length-MAX_CLIENT_SAMPLES);
  return row;
}
function snapshot(){
  const collectors=[...collectorState.values()].sort((a,b)=>String(a.type).localeCompare(String(b.type)));
  const samples=clientSamples.slice().reverse();
  return{
    collectorHealth:{retention:'warm-instance-memory',items:collectors,checkedAt:new Date().toISOString()},
    clientHealth:{
      retention:'warm-instance-memory',samplingRate:CLIENT_SAMPLE_RATE,count:samples.length,
      errors:samples.filter(row=>row.kind==='error'||row.kind==='promise').length,
      slow:samples.filter(row=>row.kind==='slow').length,
      latestAt:samples[0]?.at||null,
      samples:samples.slice(0,30)
    }
  };
}
function sameOrigin(req){
  const origin=String(req?.headers?.origin||'').trim();
  if(!origin)return true;
  const host=String(req?.headers?.host||'').trim();
  try{return new URL(origin).host===host}catch{return false}
}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  try{return JSON.parse(String(body||'{}'))}catch{return null}
}
function handleClientHealth(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return res.status(405).json({error:'method_not_allowed'});
  if(!sameOrigin(req))return res.status(403).json({error:'origin_not_allowed'});
  const length=Number(req?.headers?.['content-length']||0);
  if(length>4096)return res.status(413).json({error:'payload_too_large'});
  const body=parseBody(req?.body);
  if(!body)return res.status(400).json({error:'invalid_request'});
  recordClientHealth(body);
  res.setHeader('Cache-Control','no-store');
  return res.status(202).json({ok:true,stored:'warm-instance-sample'});
}

module.exports={CLIENT_SAMPLE_RATE,recordCollectorResult,recordCollectorFailure,recordClientHealth,snapshot,handleClientHealth,_internals:{safeText,newestDataAt}};
