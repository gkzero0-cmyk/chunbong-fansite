'use strict';
const contentArchive=require('./chunbong-content-archive-api');
const operatorCenter=require('./operator-center-api');

const {redisCommand,hasRedis,BROWSER_IMPORT_PREFIX,SOOP_DIAGNOSTIC_PREFIX,normalizeBrowserImportPayload}=contentArchive._internals;
const {requireOwner}=operatorCenter._internals;
const MAX_POST_IDS=80;

function parseJson(value){try{return value?JSON.parse(value):null}catch{return null}}
function parsePostIds(req){
  let raw='';
  try{const url=new URL(req?.url||'', 'https://local.invalid');raw=url.searchParams.get('postIds')||url.searchParams.get('ids')||''}catch{}
  const values=String(raw||'').split(',').map(value=>value.trim()).filter(value=>/^\d+$/.test(value));
  return [...new Set(values)].slice(0,MAX_POST_IDS);
}
function safeRow(postId,importRecord=null,diagnosticRecord=null){
  const payload=normalizeBrowserImportPayload(importRecord||{}),sameImport=payload?.source==='soop-authenticated-browser'&&String(payload.postId||'')===String(postId);
  return{
    postId:String(postId),
    hasImport:Boolean(sameImport),
    imageCount:sameImport&&Array.isArray(payload.images)?payload.images.length:0,
    importStoredAt:sameImport?String(importRecord?.storedAt||payload.capturedAt||'').slice(0,40):'',
    diagnosticPhase:String(diagnosticRecord?.phase||'').slice(0,40),
    diagnosticAcceptedCount:Math.max(0,Math.min(1000000,Math.floor(Number(diagnosticRecord?.acceptedCount)||0))),
    diagnosticStoredAt:String(diagnosticRecord?.storedAt||diagnosticRecord?.capturedAt||'').slice(0,40)
  };
}
async function readRows(postIds=[]){
  const ids=[...new Set((Array.isArray(postIds)?postIds:[]).map(String).filter(id=>/^\d+$/.test(id)))].slice(0,MAX_POST_IDS);
  if(!ids.length)return[];
  const [imports,diagnostics]=await Promise.all([
    redisCommand('MGET',...ids.map(id=>BROWSER_IMPORT_PREFIX+id)),
    redisCommand('MGET',...ids.map(id=>SOOP_DIAGNOSTIC_PREFIX+id))
  ]);
  return ids.map((id,index)=>safeRow(id,parseJson(imports?.[index]),parseJson(diagnostics?.[index])));
}
function json(res,status,payload){
  if(typeof res.setHeader==='function'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0')}
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
async function handleOperatorSoopRecaptureStatus(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return json(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const postIds=parsePostIds(req);if(!postIds.length)return json(res,200,{ok:true,rows:[]});
  try{return json(res,200,{ok:true,rows:await readRows(postIds)})}
  catch(error){return json(res,503,{error:String(error?.message||'soop_recap_status_unavailable')})}
}
module.exports={MAX_POST_IDS,handleOperatorSoopRecaptureStatus,_internals:{parsePostIds,readRows,safeRow}};
