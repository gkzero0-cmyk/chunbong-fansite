'use strict';
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem}=require('./chunbong-content-archive-core');
const autoIngest=require('./chunbong-content-auto-ingest');
const operatorCenter=require('./operator-center-api');
const pushNotifications=require('./push-notifications-api');
const {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;

const INDEX_KEY='content-archive:index:v1';
const ITEM_PREFIX='content-archive:item:v1:';
const DRAFT_INDEX='content-archive:draft-index:v1';
const DRAFT_PREFIX='content-archive:draft:v1:';
const HIDDEN_KEY='content-archive:hidden:v1';
const AUTO_LAST_KEY='content-archive:auto-sync:last:v1';
const AUTO_CANDIDATES_KEY='content-archive:auto-sync:candidates:v1';
const AUTO_LOCK_KEY='content-archive:auto-sync:lock:v1';
const BROWSER_IMPORT_PREFIX='content-archive:browser-import:v1:';
const BROWSER_IMPORT_INDEX='content-archive:browser-import-index:v1';
const SOURCE_META_HOSTS=new Set([
  'www.sooplive.com','sooplive.com','vod.sooplive.com','pick.sooplive.com',
  'bngts.com','www.bngts.com','naver.me','cafe.naver.com','m.cafe.naver.com',
  'namu.wiki','www.namu.wiki','namu.moe','www.namu.moe','m.namu.moe','d.namu.moe','dark.namu.moe',
  'streamscharts.com','www.streamscharts.com','youtube.com','www.youtube.com','youtu.be',
  'notion.so','www.notion.so','app.notion.com'
]);
function allowedSourceMetaUrl(raw){
  try{
    const url=new URL(String(raw||''));
    if(url.protocol!=='https:')return null;
    if(SOURCE_META_HOSTS.has(url.hostname)||url.hostname==='notion.site'||url.hostname.endsWith('.notion.site'))return url;
  }catch{}
  return null;
}
function decodeHtml(value=''){
  return String(value)
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&#(\d+);/g,(_,n)=>{const code=Number(n);return Number.isFinite(code)?String.fromCodePoint(code):_})
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>{const code=parseInt(n,16);return Number.isFinite(code)?String.fromCodePoint(code):_});
}
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
const SOURCE_BROWSER_HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};
function uuidFromCompact(value=''){
  const hex=String(value||'').replace(/-/g,'');
  return /^[0-9a-f]{32}$/i.test(hex)?hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20):'';
}
function extractNotionPageId(html='',url=''){
  const source=String(html||'');
  const direct=(source.match(/requiredRedirectMetadata[\s\S]{0,500}?"pageId"\s*:\s*"([0-9a-f-]{32,36})"/i)||[])[1]||
    (source.match(/"pageId"\s*:\s*"([0-9a-f-]{32,36})"[\s\S]{0,300}?"requiresRedirect"/i)||[])[1]||'';
  if(direct)return uuidFromCompact(direct);
  try{
    const parsed=new URL(String(url||''));
    const compact=(parsed.pathname.match(/([0-9a-f]{32})(?:[/?#]|$)/i)||[])[1]||'';
    return uuidFromCompact(compact);
  }catch{return''}
}
function notionBlockValue(entry){
  const outer=entry?.value;
  return outer?.value&&typeof outer.value==='object'?outer.value:(outer&&typeof outer==='object'?outer:{});
}
function notionRichText(value){
  if(!Array.isArray(value))return String(value||'').replace(/\s+/g,' ').trim();
  return value.map(part=>Array.isArray(part)?String(part[0]??''):String(part??'')).join('').replace(/\s+/g,' ').trim();
}
function notionPageRows(recordMap={},pageId=''){
  const blocks=recordMap?.block||recordMap||{},rows=[],seen=new Set();
  const walk=(id,depth=0)=>{
    if(!id||seen.has(id)||depth>24)return;
    seen.add(id);
    const block=notionBlockValue(blocks[id]);
    if(!block||typeof block!=='object')return;
    const props=block.properties||{};
    const text=notionRichText(props.title||props.caption||props.description||'');
    rows.push({id:String(id),type:String(block.type||''),text,depth,contentCount:Array.isArray(block.content)?block.content.length:0});
    for(const child of Array.isArray(block.content)?block.content:[])walk(child,depth+1);
  };
  walk(pageId,0);
  return rows;
}
async function fetchNotionChunk(pageId,{signal}={}){
  const response=await fetch('https://www.notion.so/api/v3/loadCachedPageChunk',{
    method:'POST',signal,
    headers:{'User-Agent':SOURCE_BROWSER_HEADERS['User-Agent'],'Accept':'application/json','Content-Type':'application/json','Origin':'https://www.notion.so','Referer':'https://www.notion.so/'},
    body:JSON.stringify({pageId,limit:100,cursor:{stack:[]},chunkNumber:0,verticalColumns:false})
  });
  if(!response.ok)throw new Error('source_meta_notion_'+response.status);
  const payload=await response.json();
  if(!payload?.recordMap?.block)throw new Error('source_meta_notion_empty');
  return payload;
}
async function fetchNotionTree(pageId,{signal,maxPages=64,maxDepth=4}={}){
  const queue=[{id:pageId,depth:0}],queued=new Set([pageId]),seen=new Set(),pages=[];
  while(queue.length&&pages.length<maxPages){
    const batch=[];
    while(queue.length&&batch.length<4){
      const next=queue.shift();
      if(next&&!seen.has(next.id)){seen.add(next.id);batch.push(next)}
    }
    if(!batch.length)continue;
    const results=await Promise.all(batch.map(async node=>{
      try{
        const payload=await fetchNotionChunk(node.id,{signal});
        return{node,rows:notionPageRows(payload.recordMap,node.id)};
      }catch(error){
        if(node.id===pageId)throw error;
        return{node,rows:[]};
      }
    }));
    for(const result of results){
      const rows=result.rows||[];
      if(!rows.length)continue;
      pages.push({id:result.node.id,depth:result.node.depth,rows});
      if(result.node.depth>=maxDepth)continue;
      for(const row of rows){
        if(row.type!=='page'||row.id===result.node.id||queued.has(row.id))continue;
        queued.add(row.id);queue.push({id:row.id,depth:result.node.depth+1});
        if(queued.size>=maxPages)break;
      }
    }
  }
  return pages;
}
function notionStructuredSections(pages=[]){
  const out=[];
  for(const page of pages){
    const rows=Array.isArray(page?.rows)?page.rows:[];if(!rows.length)continue;
    const root=rows[0]||{},blocks=[];let current={title:String(root.text||'').trim()||'본문',lines:[]};
    const push=()=>{if(current.title||current.lines.length)blocks.push({title:current.title||'본문',lines:current.lines.slice(0,200),text:current.lines.join('\n').slice(0,12000)})};
    for(const row of rows.slice(1)){
      if(!row?.text)continue;
      if(['header','sub_header','sub_sub_header'].includes(row.type)){
        push();current={title:String(row.text).trim(),lines:[]};continue;
      }
      current.lines.push(String(row.text).trim());
    }
    push();
    const lines=rows.slice(1).map(row=>String(row?.text||'').trim()).filter(Boolean);
    out.push({
      id:String(page.id||''),title:String(root.text||'').trim()||'본문',depth:Number(page.depth||0),
      headings:blocks.map(block=>block.title).filter(Boolean).slice(0,80),
      blocks:blocks.slice(0,80),lineCount:lines.length,text:lines.join('\n').slice(0,20000)
    });
  }
  return out.slice(0,64);
}
async function fetchNotionMeta(url,html,{signal}={}){
  const pageId=extractNotionPageId(html,url);
  if(!pageId)throw new Error('source_meta_notion_page_id_missing');
  const pages=await fetchNotionTree(pageId,{signal});
  const root=pages[0]?.rows?.[0]||{};
  const structuredSections=notionStructuredSections(pages);
  const outline=[],outlineSeen=new Set(),sections=[];
  for(const page of pages){
    const rootRow=page.rows[0]||{};
    if(page.depth>0&&rootRow.text)sections.push('['+rootRow.text+']');
    for(const row of page.rows){
      if(row.text&&['page','header','sub_header','sub_sub_header'].includes(row.type)&&!outlineSeen.has(row.text)){
        outlineSeen.add(row.text);outline.push(row.text);
      }
      if(row.id!==page.id&&row.text)sections.push(row.text);
    }
  }
  const bodyText=sections.join('\n').slice(0,60000);
  return{
    url:url.toString(),title:String(root.text||readTitle(html)||'').slice(0,200),
    description:bodyText.slice(0,500),image:'',pageId,
    outline:outline.slice(0,300),contentText:bodyText,pageCount:pages.length,sectionCount:structuredSections.length,sections:structuredSections,strategy:'notion-record-map-recursive'
  };
}
function extractBngtsStreamerNames(html=''){
  const names=[...String(html||'').matchAll(/<div class=["'][^"']*\bstreamer-name\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map(match=>decodeHtml(match[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()))
    .filter(Boolean);
  return [...new Set(names)];
}
async function fetchBngtsParticipants(url,{signal}={}){
  const names=[],seen=new Set();
  let title='',lastPage=0;
  for(let page=1;page<=20;page++){
    const pageUrl=new URL(url.toString());pageUrl.searchParams.set('page',String(page));
    const response=await fetch(pageUrl,{redirect:'follow',signal,headers:SOURCE_BROWSER_HEADERS});
    if(!response.ok)throw new Error('source_meta_fetch_'+response.status);
    const html=(await response.text()).slice(0,2000000);
    if(!title)title=readTitle(html);
    const pageNames=extractBngtsStreamerNames(html);
    if(!pageNames.length)break;
    let added=0;
    for(const name of pageNames)if(!seen.has(name)){seen.add(name);names.push(name);added++}
    lastPage=page;
    if(pageNames.length<48||added===0)break;
  }
  return{url:url.toString(),title:title.slice(0,200),description:'',image:'',participants:names,participantCount:names.length,pages:lastPage,strategy:'bngts-pagination'};
}
function isNotionHost(host=''){return host==='notion.site'||host.endsWith('.notion.site')||host==='www.notion.so'||host==='notion.so'||host==='app.notion.com'}
function isSoopStationPost(url){return /(?:www\.)?sooplive\.com\/station\/[^/]+\/post\/\d+/i.test(url.toString())}
function extractSoopPostRef(rawUrl){
  try{
    const url=rawUrl instanceof URL?rawUrl:new URL(String(rawUrl||''));
    if(!['sooplive.com','www.sooplive.com'].includes(url.hostname))return null;
    const match=url.pathname.match(/^\/station\/([^/]+)\/post\/(\d+)\/?$/i);
    if(!match)return null;
    return{stationId:decodeURIComponent(match[1]),postId:match[2],url};
  }catch{return null}
}
function stripHtmlText(value=''){
  return decodeHtml(String(value||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim());
}
function parseSoopPostPayload(payload={},sourceUrl=''){
  const title=String(payload.titleName??payload.title_name??payload.title??payload.subject??'').trim();
  const regDate=String(payload.regDate??payload.reg_date??payload.createdAt??payload.created_at??'').trim();
  const content=payload.content&&typeof payload.content==='object'?payload.content:{};
  const body=String(content.textContent??content.summary??content.content??payload.textContent??payload.summary??payload.body??'');
  const photos=Array.isArray(payload.photos)?payload.photos:[];
  const image=String(photos[0]?.url??payload.fileUrl??payload.file_url??'').trim();
  return{
    url:String(sourceUrl||''),
    title:title.slice(0,200),
    description:stripHtmlText(body).slice(0,500),
    image,
    date:/^\d{4}-\d{2}-\d{2}/.test(regDate)?regDate.slice(0,10):'',
    dateTime:regDate.slice(0,40),
    strategy:'soop-channel-post-api'
  };
}
async function fetchSoopPostMeta(url,{signal}={}){
  const ref=extractSoopPostRef(url);if(!ref)throw new Error('source_meta_soop_post_invalid_url');
  const api='https://api-channel.sooplive.com/v1.1/channel/'+encodeURIComponent(ref.stationId)+'/post/'+encodeURIComponent(ref.postId);
  const response=await fetch(api,{
    signal,
    headers:{
      'User-Agent':SOURCE_BROWSER_HEADERS['User-Agent'],
      'Accept':'application/json, text/plain, */*',
      'Origin':'https://www.sooplive.com',
      'Referer':ref.url.toString()
    }
  });
  const raw=await response.text();
  let payload={};try{payload=raw?JSON.parse(raw):{}}catch{}
  const message=String(payload?.message||'');
  if(response.status===403&&(payload?.code==='CHA0020'||/애청자 공개|로그인|권한/.test(message)))throw new Error('source_meta_auth_required');
  if(!response.ok)throw new Error('source_meta_soop_post_'+response.status);
  const meta=parseSoopPostPayload(payload,ref.url.toString());
  if(!meta.title)throw new Error('source_meta_soop_post_empty');
  return meta;
}
async function fetchSourceMeta(rawUrl){
  const url=allowedSourceMetaUrl(rawUrl);if(!url)throw new Error('source_meta_host_not_allowed');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    if((url.hostname==='bngts.com'||url.hostname==='www.bngts.com')&&/\/streamers\/?$/.test(url.pathname))return await fetchBngtsParticipants(url,{signal:controller.signal});
    if(isSoopStationPost(url))return await fetchSoopPostMeta(url,{signal:controller.signal});
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:SOURCE_BROWSER_HEADERS});
    const html=(await response.text()).slice(0,2000000);
    if(!response.ok)throw new Error('source_meta_fetch_'+response.status);
    const contentType=String(response.headers.get('content-type')||'');
    if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))throw new Error('source_meta_not_html');
    const finalUrl=new URL(response.url||url.toString());
    if(isNotionHost(finalUrl.hostname))return await fetchNotionMeta(finalUrl,html,{signal:controller.signal});
    const imageRaw=readMeta(html,'og:image')||readMeta(html,'twitter:image')||readMeta(html,'twitter:image:src');
    let image='';if(imageRaw){try{image=new URL(imageRaw,finalUrl).toString()}catch{}}
    const description=readMeta(html,'og:description')||readMeta(html,'description');
    const title=readTitle(html).slice(0,200);
    if((isSoopStationPost(finalUrl)||/^(?:m\.)?cafe\.naver\.com$/.test(finalUrl.hostname))&&!title&&/(?:\/_next\/static\/|__next|__APOLLO_STATE__)/i.test(html))throw new Error('source_meta_client_render_required');
    return{url:finalUrl.toString(),title,description:description.slice(0,500),image,strategy:'html-meta'};
  }catch(error){
    if(error?.name==='AbortError')throw new Error('source_meta_timeout');
    throw error;
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
    const groupTotal=groups=>(groups||[]).reduce((sum,row)=>sum+(Array.isArray(row?.participants)?row.participants.length:Number(row?.count)||0),0);
    if(seeded?.participantGroups?.length&&(!item.participantGroups.length||groupTotal(seeded.participantGroups)>groupTotal(item.participantGroups)))item.participantGroups=seeded.participantGroups;
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

async function autoSyncState(){
  if(!hasRedis())return{last:null,candidates:[]};
  const [lastRaw,candidateRaw]=await Promise.all([
    redisCommand('GET',AUTO_LAST_KEY).catch(()=>null),
    redisCommand('GET',AUTO_CANDIDATES_KEY).catch(()=>null)
  ]);
  return{last:parseJson(lastRaw),candidates:parseJson(candidateRaw)||[]};
}
async function autoSyncOfficialArchive({force=false}={}){
  if(!hasRedis())throw new Error('archive_storage_unavailable');
  const now=Date.now(),startedAt=new Date(now).toISOString();
  const state=await autoSyncState();
  const lastMs=Date.parse(state.last?.completedAt||state.last?.lastSuccessAt||'');
  if(!force&&Number.isFinite(lastMs)&&now-lastMs<autoIngest.AUTO_SYNC_INTERVAL_MS){
    return{ok:true,skipped:true,reason:'fresh',...state.last,candidateCount:state.candidates.length};
  }
  const lockToken=String(now)+'-'+Math.random().toString(36).slice(2);
  const locked=await redisCommand('SET',AUTO_LOCK_KEY,lockToken,'NX','EX',120).catch(()=>null);
  if(locked!=='OK')return{ok:true,skipped:true,reason:'locked',...state.last,candidateCount:state.candidates.length};
  try{
    const [rows,discovery]=await Promise.all([adminRows(),autoIngest.discoverOfficialArchiveMaterials({full:force})]);
    const applied=autoIngest.attachOfficialDiscoveries(rows,discovery.materials);
    const changed=new Set(applied.changedIds);
    const completedAt=new Date().toISOString();
    for(const raw of applied.rows){
      if(!changed.has(raw.id))continue;
      const item=normalizeArchiveItem({...raw,updatedAt:completedAt});
      const key=item.published?ITEM_PREFIX:DRAFT_PREFIX;
      const index=item.published?INDEX_KEY:DRAFT_INDEX;
      await redisCommand('SET',key+item.id,JSON.stringify(item));
      await redisCommand('ZADD',index,now,item.id);
    }
    const candidates=autoIngest.mergeCandidates(state.candidates,applied.candidates);
    const summary={
      status:'success',startedAt,completedAt,lastSuccessAt:completedAt,durationMs:Date.now()-now,
      sourcePriority:['SOOP','YouTube'],discovered:discovery.counts,scanMode:discovery.scanMode||'incremental',
      attachedCount:applied.attached.length,changedItemCount:changed.size,candidateCount:candidates.length,
      scope:discovery.scope||{}
    };
    await Promise.all([
      redisCommand('SET',AUTO_CANDIDATES_KEY,JSON.stringify(candidates)),
      redisCommand('SET',AUTO_LAST_KEY,JSON.stringify(summary))
    ]);
    return{ok:true,skipped:false,...summary,attached:applied.attached.slice(0,60)};
  }catch(error){
    const failure={
      status:'failed',startedAt,failedAt:new Date().toISOString(),durationMs:Date.now()-now,
      error:String(error?.message||'auto_sync_unavailable'),
      lastSuccessAt:state.last?.lastSuccessAt||state.last?.completedAt||'',
      discovered:state.last?.discovered||{},attachedCount:0,changedItemCount:0,candidateCount:state.candidates.length,
      sourcePriority:['SOOP','YouTube']
    };
    await redisCommand('SET',AUTO_LAST_KEY,JSON.stringify(failure)).catch(()=>{});
    throw error;
  }finally{
    await redisCommand('DEL',AUTO_LOCK_KEY).catch(()=>{});
  }
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
    const auto=await autoSyncState();
    return json(res,200,{items:rows,autoSync:auto.last,candidates:auto.candidates});
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
async function handlePublicAutoSync(req,res){
  const method=String(req?.method||'GET').toUpperCase();
  if(method!=='POST')return json(res,405,{error:'method_not_allowed'});
  const sameSite=sameOrigin(req);
  const githubOidc=sameSite?false:await pushNotifications._internals.authorizedGitHubOidc(req);
  if(!sameSite&&!githubOidc)return json(res,403,{error:'auto_sync_unauthorized'});
  try{return json(res,200,await autoSyncOfficialArchive({force:false}))}
  catch(error){return json(res,503,{error:String(error?.message||'auto_sync_unavailable')})}
}
async function handleOperatorAutoSync(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  try{return json(res,200,await autoSyncOfficialArchive({force:true}))}
  catch(error){return json(res,503,{error:String(error?.message||'auto_sync_unavailable')})}
}
function normalizeBrowserImportPayload(raw={}){
  const urlRaw=String(raw.url||'').trim();
  let url=null;try{url=new URL(urlRaw)}catch{return null}
  const match=url.hostname==='www.sooplive.com'&&url.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);
  if(!match)return null;
  const dateMatch=String(raw.date||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  const date=dateMatch?dateMatch[1]+'-'+String(dateMatch[2]).padStart(2,'0')+'-'+String(dateMatch[3]).padStart(2,'0'):'';
  const images=(Array.isArray(raw.images)?raw.images:[]).map(value=>{
    try{const parsed=new URL(String(value||''));return parsed.protocol==='https:'?parsed.toString():''}catch{return''}
  }).filter(Boolean).slice(0,24);
  return{
    version:1,source:'soop-authenticated-browser',postId:match[1],url:url.toString(),
    title:safeText(raw.title,200),date,body:safeText(raw.body,60000),images,
    capturedAt:safeText(raw.capturedAt,40)||new Date().toISOString()
  };
}
function browserImportSource(payload){
  return{id:'source-soop-auth-'+payload.postId,kind:'official',label:'SOOP 애청자 공개글 · '+(payload.title||payload.postId),url:payload.url,visibility:'internal'};
}
function browserImportTimeline(payload){
  return{
    id:'soop-auth-post-'+payload.postId,type:'post',title:payload.title||('SOOP 애청자 공개글 · '+payload.postId),
    date:payload.date,datePrecision:payload.date?'day':'unknown',url:'',thumbnail:'',sourceId:'',
    note:'SOOP 애청자 공개글에서 로그인된 브라우저 수집으로 확인한 기록입니다. 원문과 인증정보는 공개하지 않습니다.',
    visibility:'public'
  };
}
function applyBrowserImportToItem(rawItem,payload){
  const item=normalizeArchiveItem(rawItem),source=browserImportSource(payload),timeline=browserImportTimeline(payload);
  if(!item.sources.some(row=>row.id===source.id||row.url===source.url))item.sources.push(source);
  if(!item.timeline.some(row=>row.id===timeline.id))item.timeline.push(timeline);
  item.updatedAt=new Date().toISOString();
  return item;
}
async function saveBrowserImportRecord(payload){
  const record={...payload,storedAt:new Date().toISOString()};
  await Promise.all([
    redisCommand('SET',BROWSER_IMPORT_PREFIX+payload.postId,JSON.stringify(record)),
    redisCommand('ZADD',BROWSER_IMPORT_INDEX,Date.now(),payload.postId)
  ]);
  return record;
}
async function handleOperatorBrowserImport(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const action=String(body.action||''),payload=normalizeBrowserImportPayload(body.payload||{});
  if(!payload||!['connect','draft'].includes(action))return json(res,400,{error:'invalid_browser_import'});
  try{
    await saveBrowserImportRecord(payload);
    let item=null;
    if(action==='connect'){
      const rows=await adminRows();
      const currentItem=rows.find(row=>row.id===String(body.itemId||''));
      if(!currentItem)return json(res,404,{error:'content_not_found'});
      item=await saveArchiveItemDirect(applyBrowserImportToItem(currentItem,payload));
    }else{
      const rows=await adminRows(),base=candidateSlug(payload.title||('soop-'+payload.postId))||('soop-'+payload.postId);
      let id=base,n=2;while(rows.some(row=>row.id===id)){id=base+'-'+n++}
      item=await saveArchiveItemDirect(normalizeArchiveItem({
        id,title:payload.title||('SOOP 애청자 공개글 '+payload.postId),aliases:[],category:'other',role:'주최',status:'ended',
        startDate:payload.date,endDate:payload.date,datePrecision:payload.date?'day':'unknown',
        summary:'SOOP 애청자 공개글에서 인증된 브라우저로 수집한 새 콘텐츠 후보입니다.',
        description:'원문은 내부 검증 자료로 보관합니다. 공개 전 일정·참가자·규칙·결과를 확인해 구조화해 주세요.',
        heroImage:null,participants:[],participantGroups:[],results:[],seriesSessions:[],
        timeline:[browserImportTimeline(payload)],media:[],gallery:[],sources:[browserImportSource(payload)],
        verification:{state:'needs_review',verifiedAt:'',conflicts:[]},published:false,updatedAt:new Date().toISOString()
      }));
    }
    return json(res,200,{ok:true,action,item,postId:payload.postId,storedRaw:true});
  }catch(error){return json(res,503,{error:String(error?.message||'browser_import_failed')})}
}
function candidateSlug(value=''){
  return String(value||'').toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60);
}
async function saveArchiveItemDirect(raw){
  const item=normalizeArchiveItem(raw),now=Date.now();
  const key=item.published?ITEM_PREFIX:DRAFT_PREFIX,index=item.published?INDEX_KEY:DRAFT_INDEX;
  await redisCommand('SET',key+item.id,JSON.stringify(item));
  await redisCommand('ZADD',index,now,item.id);
  return item;
}
async function updateCandidateStore(candidates,last){
  await redisCommand('SET',AUTO_CANDIDATES_KEY,JSON.stringify(candidates));
  if(last)await redisCommand('SET',AUTO_LAST_KEY,JSON.stringify({...last,candidateCount:candidates.length}));
}
async function handleOperatorCandidate(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const action=String(body.action||''),url=String(body.url||'');
  if(!['connect','ignore','draft'].includes(action)||!url)return json(res,400,{error:'invalid_candidate_action'});
  try{
    const state=await autoSyncState();
    const candidate=state.candidates.find(row=>String(row.url||'')===url);
    if(!candidate)return json(res,404,{error:'candidate_not_found'});
    let result=null;
    if(action==='connect'){
      const rows=await adminRows(),item=rows.find(row=>row.id===String(body.itemId||''));
      if(!item)return json(res,404,{error:'content_not_found'});
      const key=candidate.type==='post'?'timeline':'media';
      if(!Array.isArray(item[key]))item[key]=[];
      if(!item[key].some(row=>String(row.url||'').replace(/\/$/,'')===url.replace(/\/$/,''))){
        item[key].push(candidate);item.updatedAt=new Date().toISOString();result=await saveArchiveItemDirect(item);
      }else result=item;
    }
    if(action==='draft'){
      const rows=await adminRows(),base=candidateSlug(body.title||candidate.title||'새-콘텐츠')||'새-콘텐츠';
      let id=base,n=2;while(rows.some(row=>row.id===id)){id=base+'-'+n++}
      const sourceId='source-auto-'+Date.now().toString(36);
      const material={...candidate,sourceId,visibility:'public'};
      const isPost=material.type==='post';
      const draft=normalizeArchiveItem({
        id,title:String(body.title||candidate.title||'새 콘텐츠 후보'),aliases:[],category:String(body.category||'other'),
        role:'주최',status:'ended',startDate:candidate.date||'',endDate:candidate.date||'',datePrecision:candidate.date?'day':'unknown',
        summary:'춘봉 공식 채널에서 자동 발견된 새 콘텐츠 후보입니다. 운영자 검토 후 공개하세요.',
        description:'자동수집 자료를 기반으로 생성된 초안입니다. 일정·참가자·결과를 확인해 주세요.',
        heroImage:candidate.thumbnail?{src:candidate.thumbnail,alt:candidate.title||'콘텐츠 이미지',sourceId}:null,
        participants:[],results:[],participantGroups:[],seriesSessions:[],
        timeline:isPost?[material]:[],media:isPost?[]:[material],gallery:[],
        sources:[{id:sourceId,kind:'official',label:candidate.platform==='youtube'?'춘봉TV YouTube 공식 자료':'춘봉 SOOP 공식 자료',url:candidate.url,visibility:'public'}],
        verification:{state:'needs_review',verifiedAt:'',conflicts:[]},published:false,updatedAt:new Date().toISOString()
      });
      result=await saveArchiveItemDirect(draft);
    }
    const candidates=state.candidates.filter(row=>String(row.url||'')!==url);
    await updateCandidateStore(candidates,state.last);
    return json(res,200,{ok:true,action,item:result,candidateCount:candidates.length});
  }catch(error){return json(res,503,{error:String(error?.message||'candidate_update_failed')})}
}
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
  handlePublicList,handlePublicDetail,handlePublicAutoSync,handleOperatorList,handleOperatorSave,handleOperatorPublish,handleOperatorAutoSync,handleOperatorCandidate,handleOperatorBrowserImport,handleOperatorSourceMeta,handleOperatorDelete,
  _internals:{publicRows,mergeArchiveRows,applyCuratedVisibility,allowedSourceMetaUrl,fetchSourceMeta,extractNotionPageId,notionPageRows,fetchNotionTree,notionStructuredSections,extractBngtsStreamerNames,extractSoopPostRef,parseSoopPostPayload,withoutHidden,curatedHiddenIds,storedRows,adminRows,autoSyncState,autoSyncOfficialArchive,prepareForSave,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX,DRAFT_INDEX,DRAFT_PREFIX,HIDDEN_KEY,AUTO_LAST_KEY,AUTO_CANDIDATES_KEY,BROWSER_IMPORT_PREFIX,BROWSER_IMPORT_INDEX,normalizeBrowserImportPayload,applyBrowserImportToItem,handleOperatorCandidate,handleOperatorBrowserImport}
};
