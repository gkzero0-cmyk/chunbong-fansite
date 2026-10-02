'use strict';
const contentArchive=require('./chunbong-content-archive-api');
const operatorCenter=require('./operator-center-api');

const {redisCommand,hasRedis,SOOP_DIAGNOSTIC_PREFIX,SOOP_DIAGNOSTIC_INDEX,BROWSER_IMPORT_PREFIX,normalizeBrowserImportPayload}=contentArchive._internals;
const {requireOwner}=operatorCenter._internals;

function parseJson(value){try{return value?JSON.parse(value):null}catch{return null}}
function count(value){return Math.max(0,Math.min(1000000,Math.floor(Number(value)||0)))}
function cleanMap(value={}){const out={};for(const [key,raw] of Object.entries(value||{})){const name=String(key||'').replace(/[^a-z0-9_-]/gi,'').slice(0,32);if(name)out[name]=count(raw)}return out}
function safeDiagnostic(raw={},importRecord=null){
  const postId=String(raw?.postId||'');if(!/^\d+$/.test(postId))return null;
  const payload=normalizeBrowserImportPayload(importRecord||{}),sameImport=payload?.source==='soop-authenticated-browser'&&String(payload.postId||'')===postId;
  return{
    postId,
    phase:['captured','restricted','body-empty','capture-error'].includes(String(raw.phase||''))?String(raw.phase):'capture-error',
    access:String(raw.access||'').slice(0,40),collectorVersion:count(raw.collectorVersion),
    candidateCount:count(raw.candidateCount),acceptedCount:count(raw.acceptedCount),fallbackCount:count(raw.fallbackCount),
    imageCount:sameImport&&Array.isArray(payload.images)?payload.images.length:0,
    hasImport:Boolean(sameImport),importStoredAt:sameImport?String(importRecord?.storedAt||payload.capturedAt||'').slice(0,40):'',
    rejectedByReason:cleanMap(raw.rejectedByReason),sourceCounts:cleanMap(raw.sourceCounts),
    samples:(Array.isArray(raw.samples)?raw.samples:[]).map(value=>String(value||'').replace(/[?#].*$/,'').slice(0,240)).filter(Boolean).slice(0,8),
    capturedAt:String(raw.capturedAt||'').slice(0,40),storedAt:String(raw.storedAt||'').slice(0,40)
  };
}
async function readDiagnosticRows(){
  const ids=await redisCommand('ZREVRANGE',SOOP_DIAGNOSTIC_INDEX,0,39).catch(()=>[]);
  const postIds=(Array.isArray(ids)?ids:[]).map(String).filter(id=>/^\d+$/.test(id)).slice(0,40);
  if(!postIds.length)return[];
  const [diagnosticValues,importValues]=await Promise.all([
    redisCommand('MGET',...postIds.map(id=>SOOP_DIAGNOSTIC_PREFIX+id)).catch(()=>[]),
    redisCommand('MGET',...postIds.map(id=>BROWSER_IMPORT_PREFIX+id)).catch(()=>[])
  ]);
  return postIds.map((postId,index)=>safeDiagnostic(parseJson(diagnosticValues?.[index]),parseJson(importValues?.[index]))).filter(Boolean);
}
function json(res,status,payload){
  if(typeof res.setHeader==='function'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0')}
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
async function handleOperatorSoopDiagnostics(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return json(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  try{return json(res,200,{ok:true,rows:await readDiagnosticRows()})}
  catch(error){return json(res,503,{error:String(error?.message||'soop_diagnostics_unavailable')})}
}
module.exports={handleOperatorSoopDiagnostics,_internals:{readDiagnosticRows,safeDiagnostic}};
