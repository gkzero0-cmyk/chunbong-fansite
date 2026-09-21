'use strict';
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem}=require('./chunbong-content-archive-core');

const INDEX_KEY='content-archive:index:v1';
const ITEM_PREFIX='content-archive:item:v1:';

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
async function storedRows(){
  if(!hasRedis())return publicRows(seed.items||[]);
  try{
    const ids=await redisCommand('ZRANGE',INDEX_KEY,0,-1);
    if(!Array.isArray(ids)||!ids.length)return publicRows(seed.items||[]);
    const rows=await Promise.all(ids.map(async id=>{const raw=await redisCommand('GET',ITEM_PREFIX+id);try{return raw?JSON.parse(raw):null}catch{return null}}));
    const valid=publicRows(rows.filter(Boolean));return valid.length?valid:publicRows(seed.items||[]);
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
module.exports={handlePublicList,handlePublicDetail,_internals:{publicRows,storedRows,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX}};
