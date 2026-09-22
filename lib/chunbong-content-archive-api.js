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
const SOURCE_META_HOSTS=new Set([
  'www.sooplive.com','sooplive.com','vod.sooplive.com','pick.sooplive.com',
  'bngts.com','www.bngts.com','fmkorea.com','www.fmkorea.com',
  'namu.wiki','www.namu.wiki','namu.moe','www.namu.moe','m.namu.moe','d.namu.moe','dark.namu.moe',
  'streamscharts.com','www.streamscharts.com','youtube.com','www.youtube.com','youtu.be'
]);
function allowedSourceMetaUrl(raw){
  try{
    const url=new URL(String(raw||''));
    if(url.protocol!=='https:')return null;
    if(SOURCE_META_HOSTS.has(url.hostname)||url.hostname==='notion.site'||url.hostname.endsWith('.notion.site'))return url;
  }catch{}
  return null;
}
function decodeHtml(value=''){return String(value).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function readMeta(html,key){
  const tags=String(html||'').match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    const prop=(tag.match(/(?:property|name)=["']([^"']+)["']/i)||[])[1]||'';
    if(prop.toLowerCase()!==String(key).toLowerCase())continue;
    const content=(tag.match(/content=["']([^"']*)["']/i)||[])[1]||'';
    if(content)return decodeHtml(content.trim());
  }
  return '';
}
function readTitle(html){
  const social=readMeta(html,'og:title')||readMeta(html,'twitter:title');
  if(social)return social;
  const match=String(html||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml((match?.[1]||'').replace(/\s+/g,' ').trim());
}
async function fetchSourceMeta(rawUrl){
  const url=allowedSourceMetaUrl(rawUrl);if(!url)throw new Error('source_meta_host_not_allowed');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; ChunbongArchive/1.0)','Accept':'text/html,application/xhtml+xml'}});
    if(!response.ok)throw new Error('source_meta_fetch_'+response.status);
    const contentType=String(response.headers.get('content-type')||'');
    if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))throw new Error('source_meta_not_html');
    const html=(await response.text()).slice(0,1500000);
    const finalUrl=new URL(response.url||url.toString());
    const imageRaw=readMeta(html,'og:image')||readMeta(html,'twitter:image')||readMeta(html,'twitter:image:src');
    let image='';if(imageRaw){try{image=new URL(imageRaw,finalUrl).toString()}catch{}}
    const description=readMeta(html,'og:description')||readMeta(html,'description');
    return{url:finalUrl.toString(),title:readTitle(html).slice(0,200),description:description.slice(0,500),image};
  }finally{clearTimeout(timer)}
}

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
function isGenericArchiveTitle(value=''){
  return /공식 게시글\s*\d+$|다시보기\s*\d{2}$|SOOP VOD\s*·\s*\d{8,}$|관련 YouTube 영상\s*\d+$/i.test(String(value||'').trim());
}
function enrichMaterialRows(storedRows=[],seedRows=[]){
  const seedById=new Map((seedRows||[]).filter(row=>row?.id).map(row=>[row.id,row]));
  return (storedRows||[]).map(row=>{
    const seedRow=seedById.get(row?.id);if(!seedRow)return row;
    const next={...row};
    if(seedRow.visibility==='internal')next.visibility='internal';
    if(seedRow.date&&seedRow.datePrecision!=='unknown'&&(!next.date||next.datePrecision==='unknown')){next.date=seedRow.date;next.datePrecision=seedRow.datePrecision}
    if(seedRow.thumbnail&&(!next.thumbnail||String(next.thumbnail).includes('/assets/chunbong-contents/')))next.thumbnail=seedRow.thumbnail;
    if(seedRow.title&&isGenericArchiveTitle(next.title)&&!isGenericArchiveTitle(seedRow.title))next.title=seedRow.title;
    if(seedRow.note&&(/공식 기록입니다|확인되는 순서대로 보강/.test(String(next.note||''))||!next.note))next.note=seedRow.note;
    return next;
  });
}
function enrichStoredFromSeed(item,seeded){
  if(!item||!seeded)return item;
  if(seeded.participantGroups?.length&&!item.participantGroups.length)item.participantGroups=seeded.participantGroups;
  if(seeded.heroImage?.src&&seeded.heroImage?.sourceId&&(!item.heroImage?.src||!item.heroImage?.sourceId||String(item.heroImage.src).includes('/assets/chunbong-contents/')))item.heroImage=seeded.heroImage;
  const galleryIds=new Set((item.gallery||[]).map(row=>row.id).filter(Boolean));
  item.gallery=[...(seeded.gallery||[]).filter(row=>row.id&&!galleryIds.has(row.id)),...(item.gallery||[])];
  const resultTitles=new Set((item.results||[]).map(row=>String(row.title||'')).filter(Boolean));
  item.results=[...(item.results||[]),...(seeded.results||[]).filter(row=>row.title&&!resultTitles.has(String(row.title)))];
  item.timeline=enrichMaterialRows(item.timeline,seeded.timeline);
  item.media=enrichMaterialRows(item.media,seeded.media);
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
    enrichStoredFromSeed(item,seeded);
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
async function handleOperatorSourceMeta(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  try{return json(res,200,{ok:true,meta:await fetchSourceMeta(body.url)})}
  catch(error){const code=String(error?.message||'source_meta_unavailable');return json(res,code==='source_meta_host_not_allowed'?400:502,{error:code})}
}
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
  handlePublicList,handlePublicDetail,handleOperatorList,handleOperatorSave,handleOperatorPublish,handleOperatorSourceMeta,handleOperatorDelete,
  _internals:{publicRows,mergeArchiveRows,applyCuratedVisibility,enrichStoredFromSeed,enrichMaterialRows,isGenericArchiveTitle,allowedSourceMetaUrl,fetchSourceMeta,withoutHidden,curatedHiddenIds,storedRows,adminRows,prepareForSave,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX,DRAFT_INDEX,DRAFT_PREFIX,HIDDEN_KEY}
};
