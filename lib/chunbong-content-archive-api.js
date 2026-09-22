'use strict';
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem}=require('./chunbong-content-archive-core');
const operatorCenter=require('./operator-center-api');
const {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;

const INDEX_KEY='content-archive:index:v1';
const ITEM_PREFIX='content-archive:item:v1:';
const DRAFT_INDEX='content-archive:draft-index:v1';
const DRAFT_PREFIX='content-archive:draft:v1:';
const HIDDEN_KEY='content-archive:hidden:v1';

function redisEnv(){return{url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''}}
function hasRedis(){const e=redisEnv();return Boolean(e.url&&e.token)}
async function redisCommand(command,...args){
  const env=redisEnv(),base=env.url.replace(/\/$/,'');
  if(!base||!env.token)throw new Error('archive_storage_unavailable');
  const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});
  if(!response.ok)throw new Error('redis_'+response.status);
  const payload=await response.json();if(payload.error)throw new Error(payload.error);return payload.result;
}
function publicRows(rows=[]){
  return rows.map(normalizeArchiveItem)
    .filter(row=>row.published&&validateArchiveItem(row,{publishing:true}).length===0)
    .map(toPublicArchiveItem);
}
function applyCuratedVisibility(item,seeded){
  if(!item||!seeded)return item;
  const sourceVisibility=new Map((seeded.sources||[]).map(row=>[row.id,row.visibility]));
  item.sources=(item.sources||[]).map(row=>sourceVisibility.get(row.id)==='internal'?{...row,visibility:'internal'}:row);
  const materialVisibility=new Map([...(seeded.timeline||[]),...(seeded.media||[])].map(row=>[row.id,row.visibility]));
  item.timeline=(item.timeline||[]).map(row=>materialVisibility.get(row.id)==='internal'?{...row,visibility:'internal'}:row);
  item.media=(item.media||[]).map(row=>materialVisibility.get(row.id)==='internal'?{...row,visibility:'internal'}:row);
  return item;
}
function mergeArchiveRows(seedRows=[],storedRows=[]){
  const merged=new Map();
  for(const raw of (Array.isArray(seedRows)?seedRows:[])){
    const item=normalizeArchiveItem(raw);
    if(item.id)merged.set(item.id,item);
  }
  for(const raw of (Array.isArray(storedRows)?storedRows:[])){
    const item=normalizeArchiveItem(raw);
    if(!item.id)continue;
    const seeded=merged.get(item.id);
    if(seeded?.seriesSessions?.length&&!item.seriesSessions.length)item.seriesSessions=seeded.seriesSessions;
    if(seeded?.series?.id&&!item.series?.id)item.series=seeded.series;
    applyCuratedVisibility(item,seeded);
    merged.set(item.id,item);
  }
  return [...merged.values()];
}
function parseJson(raw){try{return raw?JSON.parse(raw):null}catch{return null}}
function withoutHidden(rows=[],hiddenIds=[]){const hidden=new Set((Array.isArray(hiddenIds)?hiddenIds:[]).map(String));return (Array.isArray(rows)?rows:[]).filter(row=>!hidden.has(String(row?.id||'')))}
function curatedHiddenIds(){return Array.isArray(seed.hiddenIds)?seed.hiddenIds.map(String).filter(Boolean):[]}
async function readIndexedRows(indexKey,prefix,{reverse=false}={}){
  const ids=await redisCommand(reverse?'ZREVRANGE':'ZRANGE',indexKey,0,199);
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.map(async id=>parseJson(await redisCommand('GET',prefix+id))));
  return rows.filter(Boolean);
}
async function storedRows(){
  if(!hasRedis())return publicRows(withoutHidden(seed.items||[],curatedHiddenIds()));
  try{
    const [stored,hidden]=await Promise.all([
      readIndexedRows(INDEX_KEY,ITEM_PREFIX),
      redisCommand('SMEMBERS',HIDDEN_KEY).catch(()=>[])
    ]);
    return publicRows(withoutHidden(mergeArchiveRows(seed.items||[],stored),[...curatedHiddenIds(),...(Array.isArray(hidden)?hidden:[])]));
  }catch{return publicRows(seed.items||[])}
}
function send(res,status,payload){
  if(typeof res.setHeader==='function')res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;res.body=payload;if(typeof res.end==='function')res.end(JSON.stringify(payload));return res;
}
async function handlePublicList(req,res){
  const items=(await storedRows()).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate))||a.title.localeCompare(b.title,'ko'));
  return send(res,200,{items,source:'chunbong-contents',fallback:!hasRedis()});
}
async function handlePublicDetail(req,res){
  const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';
  const item=(await storedRows()).find(row=>row.id===id);
  return item?send(res,200,{item,source:'chunbong-content'}):send(res,404,{error:'content_not_found'});
}
async function adminRows(){
  if(!hasRedis())throw new Error('archive_storage_unavailable');
  const [published,drafts,hidden]=await Promise.all([
    readIndexedRows(INDEX_KEY,ITEM_PREFIX,{reverse:true}),
    readIndexedRows(DRAFT_INDEX,DRAFT_PREFIX,{reverse:true}),
    redisCommand('SMEMBERS',HIDDEN_KEY).catch(()=>[])
  ]);
  const allHidden=[...curatedHiddenIds(),...(Array.isArray(hidden)?hidden:[])];
  return mergeArchiveRows(withoutHidden(seed.items||[],allHidden),withoutHidden(published,allHidden).concat(withoutHidden(drafts,allHidden)));
}
function prepareForSave(raw,{publish=false}={}){
  const item=normalizeArchiveItem({...raw,published:publish===true});
  const errors=validateArchiveItem(item,{publishing:publish===true});
  if(errors.length)throw new Error(errors[0]);
  item.updatedAt=new Date().toISOString();
  return{item,errors};
}
function noStore(res){if(typeof res.setHeader==='function')res.setHeader('Cache-Control','no-store, max-age=0')}
function json(res,status,payload){noStore(res);if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);res.statusCode=status;res.body=payload;if(typeof res.end==='function')res.end(JSON.stringify(payload));return res}
async function handleOperatorList(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return json(res,405,{error:'method_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  try{
    const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';
    const rows=await adminRows();
    if(id){const item=rows.find(row=>row.id===id);return item?json(res,200,{item}):json(res,404,{error:'content_not_found'})}
    return json(res,200,{items:rows});
  }catch(error){return json(res,503,{error:String(error?.message||'archive_storage_unavailable')})}
}
async function writeItem(req,res,{publish=false}={}){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  try{
    const {item}=prepareForSave(body.item||body,{publish});
    if(!item.id)return json(res,400,{error:'id_required'});
    if(publish){
      await redisCommand('SET',ITEM_PREFIX+item.id,JSON.stringify(item));
      await redisCommand('ZADD',INDEX_KEY,Date.now(),item.id);
      await redisCommand('SREM',HIDDEN_KEY,item.id);
      await redisCommand('DEL',DRAFT_PREFIX+item.id);
      await redisCommand('ZREM',DRAFT_INDEX,item.id);
    }else{
      await redisCommand('SET',DRAFT_PREFIX+item.id,JSON.stringify(item));
      await redisCommand('ZADD',DRAFT_INDEX,Date.now(),item.id);
    }
    return json(res,200,{ok:true,item});
  }catch(error){
    const name=String(error?.message||'archive_storage_unavailable');
    const invalid=['id_required','title_required','invalid_date_precision','invalid_start_date','invalid_end_date','end_before_start','invalid_material_date','invalid_series_session_date','duplicate_series_session_number','duplicate_material_url','duplicate_source_id','unknown_source_id','published_source_required','published_source_url_required','unresolved_conflict'].includes(name);
    return json(res,invalid?400:503,{error:name});
  }
}
async function handleOperatorSave(req,res){return writeItem(req,res,{publish:false})}
async function handleOperatorPublish(req,res){return writeItem(req,res,{publish:true})}
async function handleOperatorDelete(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const id=safeText(body.id,80).toLowerCase();if(!/^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/.test(id))return json(res,400,{error:'invalid_id'});
  try{
    await redisCommand('SADD',HIDDEN_KEY,id);
    await redisCommand('DEL',ITEM_PREFIX+id);
    await redisCommand('ZREM',INDEX_KEY,id);
    await redisCommand('DEL',DRAFT_PREFIX+id);
    await redisCommand('ZREM',DRAFT_INDEX,id);
    return json(res,200,{ok:true,id});
  }catch{return json(res,503,{error:'archive_storage_unavailable'})}
}
module.exports={
  handlePublicList,handlePublicDetail,handleOperatorList,handleOperatorSave,handleOperatorPublish,handleOperatorDelete,
  _internals:{publicRows,mergeArchiveRows,applyCuratedVisibility,withoutHidden,curatedHiddenIds,storedRows,adminRows,prepareForSave,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX,DRAFT_INDEX,DRAFT_PREFIX,HIDDEN_KEY}
};
