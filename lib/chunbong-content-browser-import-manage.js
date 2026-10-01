'use strict';

const contentArchive=require('./chunbong-content-archive-api');
const operatorCenter=require('./operator-center-api');
const {mergeSoopBrowserMetadata,repairPublicArchiveItem,KNOWN_SOOP_TITLE_FIXES}=require('./chunbong-content-browser-meta');

const {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;
const {
  redisCommand,
  hasRedis,
  BROWSER_IMPORT_PREFIX,
  normalizeBrowserImportPayload,
  fetchSourceMeta
}=contentArchive._internals;

const KNOWN_TITLE_FIXES=KNOWN_SOOP_TITLE_FIXES;
const PUBLIC_DETAIL_REPAIR=Symbol.for('chunbong.contentArchive.publicDetailRepair.v1');

function json(res,status,payload){
  if(typeof res.setHeader==='function')res.setHeader('Cache-Control','no-store, max-age=0');
  return res.status(status).json(payload);
}
function parseJson(value){
  if(!value)return null;
  if(typeof value==='object')return value;
  try{return JSON.parse(value)}catch{return null}
}
function recordPostId(record={},payload={}){
  const direct=String(payload.postId||record.postId||'').trim();
  if(/^\d+$/.test(direct))return direct;
  return (String(payload.url||record.url||'').match(/\/post\/(\d+)/)||[])[1]||'';
}
function applyKnownTitleFallback(payload={}){
  const postId=recordPostId({},payload),known=KNOWN_TITLE_FIXES[postId]||'';
  return known?{...payload,title:known}:payload;
}
async function enrichSoopRecord(record={}){
  const payload=normalizeBrowserImportPayload(record||{});
  if(!payload||payload.source!=='soop-authenticated-browser')return record;
  let sourceMeta={};
  try{sourceMeta=await fetchSourceMeta(payload.url)}catch{}
  const enriched=applyKnownTitleFallback(mergeSoopBrowserMetadata(payload,sourceMeta||{}));
  return{
    ...record,
    title:enriched.title,
    date:enriched.date,
    images:enriched.images,
    metadataEnrichedAt:new Date().toISOString(),
    metadataEnrichment:'soop-browser-v2'
  };
}
function changedMetadata(before={},after={}){
  return String(before.title||'')!==String(after.title||'')||
    String(before.date||'')!==String(after.date||'')||
    JSON.stringify(Array.isArray(before.images)?before.images:[])!==JSON.stringify(Array.isArray(after.images)?after.images:[]);
}
function publicDetailResponse(res){
  let statusCode=200;
  const proxy={
    setHeader(name,value){res.setHeader(name,value);return proxy},
    status(code){statusCode=code;return proxy},
    json(payload){
      const output=statusCode===200&&payload?.item?{...payload,item:repairPublicArchiveItem(payload.item)}:payload;
      return res.status(statusCode).json(output);
    },
    send(payload){return res.status(statusCode).send(payload)},
    end(payload){return res.status(statusCode).end(payload)}
  };
  return proxy;
}
function installPublicDetailRepair(){
  if(contentArchive[PUBLIC_DETAIL_REPAIR])return;
  const original=contentArchive.handlePublicDetail;
  if(typeof original!=='function')return;
  contentArchive.handlePublicDetail=(req,res)=>original(req,publicDetailResponse(res));
  Object.defineProperty(contentArchive,PUBLIC_DETAIL_REPAIR,{value:true,enumerable:false});
}
installPublicDetailRepair();

async function handleOperatorBrowserImportManage(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const recordId=safeText(body.recordId,120),action=String(body.action||'');
  if(!recordId||!['connect','public','internal','ignore','restore'].includes(action))return contentArchive.handleOperatorBrowserImportManage(req,res);

  if(['connect','public','internal'].includes(action)){
    try{
      const key=BROWSER_IMPORT_PREFIX+recordId;
      const raw=await redisCommand('GET',key);
      const record=parseJson(raw);
      if(record){
        const enriched=await enrichSoopRecord(record);
        if(changedMetadata(record,enriched))await redisCommand('SET',key,JSON.stringify(enriched));
      }
    }catch{
      // Metadata enrichment is best-effort. The original management flow remains authoritative.
    }
  }
  return contentArchive.handleOperatorBrowserImportManage(req,res);
}

module.exports={handleOperatorBrowserImportManage,_internals:{enrichSoopRecord,applyKnownTitleFallback,changedMetadata,publicDetailResponse,installPublicDetailRepair,KNOWN_TITLE_FIXES}};
