'use strict';
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,validateArchiveRelationships,toPublicArchiveItem}=require('./chunbong-content-archive-core');
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
function groupPublicRows(rows=[]){
  const clean=(Array.isArray(rows)?rows:[]).map(row=>({...row}));
  const editions=clean.filter(row=>row.archiveType==='edition'&&row.parentId);
  const parents=clean.filter(row=>row.archiveType!=='edition');
  const editionsByParent={};
  for(const edition of editions){
    (editionsByParent[edition.parentId]||(editionsByParent[edition.parentId]=[])).push(edition);
  }
  for(const list of Object.values(editionsByParent)){
    list.sort((a,b)=>(Number(a.editionOrder)||0)-(Number(b.editionOrder)||0)||String(a.startDate||'').localeCompare(String(b.startDate||''))||String(a.title||'').localeCompare(String(b.title||''),'ko'));
  }
  const series=parents.map(parent=>{
    const children=editionsByParent[parent.id]||[];
    const latest=[...children].sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||'')))[0]||null;
    return {
      ...parent,
      editionCount:children.length,
      editionLabels:children.map(row=>row.editionLabel||row.title).filter(Boolean),
      totalMedia:children.reduce((sum,row)=>sum+(row.media?.length||0),parent.media?.length||0),
      totalImages:children.reduce((sum,row)=>sum+(row.gallery?.length||0),parent.gallery?.length||0),
      latestEditionId:latest?.id||'',
      latestStartDate:latest?.startDate||parent.startDate||''
    };
  });
  return{series,editionsByParent};
}
function mergeArchiveRows(seedRows=[],storedRows=[]){
  const merged=new Map();
  for(const raw of [...(Array.isArray(seedRows)?seedRows:[]),...(Array.isArray(storedRows)?storedRows:[])]){
    const item=normalizeArchiveItem(raw);
    if(item.id)merged.set(item.id,item);
  }
  return [...merged.values()];
}
function parseJson(raw){try{return raw?JSON.parse(raw):null}catch{return null}}
function withoutHidden(rows=[],hiddenIds=[]){const hidden=new Set((Array.isArray(hiddenIds)?hiddenIds:[]).map(String));return (Array.isArray(rows)?rows:[]).filter(row=>!hidden.has(String(row?.id||'')))}
async function readIndexedRows(indexKey,prefix,{reverse=false}={}){
  const ids=await redisCommand(reverse?'ZREVRANGE':'ZRANGE',indexKey,0,199);
  if(!Array.isArray(ids)||!ids.length)return[];
  const rows=await Promise.all(ids.map(async id=>parseJson(await redisCommand('GET',prefix+id))));
  return rows.filter(Boolean);
}
async function storedRows(){
  if(!hasRedis())return publicRows(seed.items||[]);
  try{
    const [stored,hidden]=await Promise.all([
      readIndexedRows(INDEX_KEY,ITEM_PREFIX),
      redisCommand('SMEMBERS',HIDDEN_KEY).catch(()=>[])
    ]);
    return publicRows(withoutHidden(mergeArchiveRows(seed.items||[],stored),hidden));
  }catch{return publicRows(seed.items||[])}
}
function send(res,status,payload){
  if(typeof res.setHeader==='function')res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;res.body=payload;if(typeof res.end==='function')res.end(JSON.stringify(payload));return res;
}
async function handlePublicList(req,res){
  const rows=await storedRows();
  const grouped=groupPublicRows(rows);
  const items=grouped.series.sort((a,b)=>String(b.latestStartDate||b.startDate||'').localeCompare(String(a.latestStartDate||a.startDate||''))||a.title.localeCompare(b.title,'ko'));
  const editionCount=Object.values(grouped.editionsByParent).reduce((sum,list)=>sum+list.length,0);
  const materialCount=rows.reduce((sum,row)=>sum+(row.timeline?.length||0)+(row.media?.length||0)+(row.gallery?.length||0),0);
  return send(res,200,{items,seriesCount:items.length,editionCount,materialCount,source:'chunbong-contents',fallback:!hasRedis()});
}
async function handlePublicDetail(req,res){
  const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';
  const rows=await storedRows();
  const target=rows.find(row=>row.id===id);
  if(!target)return send(res,404,{error:'content_not_found'});
  const parent=target.archiveType==='edition'?rows.find(row=>row.id===target.parentId):target;
  if(!parent)return send(res,404,{error:'content_parent_not_found'});
  const editions=rows.filter(row=>row.archiveType==='edition'&&row.parentId===parent.id)
    .sort((a,b)=>(Number(a.editionOrder)||0)-(Number(b.editionOrder)||0)||String(a.startDate||'').localeCompare(String(b.startDate||'')));
  return send(res,200,{item:parent,editions,selectedEditionId:target.archiveType==='edition'?target.id:'',source:'chunbong-content'});
}
async function adminRows(){
  if(!hasRedis())throw new Error('archive_storage_unavailable');
  const [published,drafts,hidden]=await Promise.all([
    readIndexedRows(INDEX_KEY,ITEM_PREFIX,{reverse:true}),
    readIndexedRows(DRAFT_INDEX,DRAFT_PREFIX,{reverse:true}),
    redisCommand('SMEMBERS',HIDDEN_KEY).catch(()=>[])
  ]);
  return mergeArchiveRows(withoutHidden(seed.items||[],hidden),withoutHidden(published,hidden).concat(drafts));
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
    if(publish&&item.archiveType==='edition'){
      const rows=await adminRows();
      const relationErrors=validateArchiveRelationships([...rows.filter(row=>row.id!==item.id),item]);
      if(relationErrors.includes('unknown_parent_id'))return json(res,400,{error:'unknown_parent_id'});
    }
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
    const invalid=['id_required','title_required','invalid_date_precision','invalid_archive_type','edition_parent_required','series_parent_not_allowed','unknown_parent_id','invalid_start_date','invalid_end_date','end_before_start','invalid_material_date','duplicate_material_url','duplicate_source_id','unknown_source_id','published_source_required','published_source_url_required','unresolved_conflict'].includes(name);
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
  _internals:{publicRows,groupPublicRows,mergeArchiveRows,withoutHidden,storedRows,adminRows,prepareForSave,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX,DRAFT_INDEX,DRAFT_PREFIX,HIDDEN_KEY}
};
