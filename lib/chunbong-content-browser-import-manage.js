'use strict';

const contentArchive=require('./chunbong-content-archive-api');
const operatorCenter=require('./operator-center-api');
const fetchNoticeDetail=require('./content-api/notice-detail');
const {mergeSoopBrowserMetadata,repairPublicArchiveItem,KNOWN_SOOP_TITLE_FIXES,isGenericSoopTitle,sanitizeSoopImages}=require('./chunbong-content-browser-meta');

const {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;
const {redisCommand,hasRedis,BROWSER_IMPORT_PREFIX,normalizeBrowserImportPayload,fetchSourceMeta}=contentArchive._internals;
const KNOWN_TITLE_FIXES=KNOWN_SOOP_TITLE_FIXES;
const PUBLIC_DETAIL_REPAIR=Symbol.for('chunbong.contentArchive.publicDetailRepair.v2');
const SOOP_CAPTURE_CONTAMINATION_MARKERS=['설정 메뉴','방송 목록','사이드바','LIVE 플레이어','VOD 플레이어','프로그램 설정','사이드바버튼','방송카드'];

function json(res,status,payload){if(typeof res.setHeader==='function')res.setHeader('Cache-Control','no-store, max-age=0');return res.status(status).json(payload)}
function parseJson(value){if(!value)return null;if(typeof value==='object')return value;try{return JSON.parse(value)}catch{return null}}
function recordPostId(record={},payload={}){const direct=String(payload.postId||record.postId||'').trim();if(/^\d+$/.test(direct))return direct;return(String(payload.url||record.url||'').match(/\/post\/(\d+)/)||[])[1]||''}
function applyKnownTitleFallback(payload={}){const postId=recordPostId({},payload),known=KNOWN_TITLE_FIXES[postId]||'';return known?{...payload,title:known}:payload}
async function enrichSoopRecord(record={}){const payload=normalizeBrowserImportPayload(record||{});if(!payload||payload.source!=='soop-authenticated-browser')return record;let sourceMeta={};try{sourceMeta=await fetchSourceMeta(payload.url)}catch{}const enriched=applyKnownTitleFallback(mergeSoopBrowserMetadata(payload,sourceMeta||{}));return{...record,title:enriched.title,date:enriched.date,images:enriched.images,metadataEnrichedAt:new Date().toISOString(),metadataEnrichment:'soop-browser-v2'}}
function changedMetadata(before={},after={}){return String(before.title||'')!==String(after.title||'')||String(before.date||'')!==String(after.date||'')||JSON.stringify(Array.isArray(before.images)?before.images:[])!==JSON.stringify(Array.isArray(after.images)?after.images:[])}
function requestUrl(req){try{return new URL(String(req?.url||'/'),'https://chunbong.local')}catch{return new URL('https://chunbong.local/')}}
function canonicalSourceUrl(value=''){try{const url=new URL(String(value||''));if(!['http:','https:'].includes(url.protocol))return'';url.hash='';if(url.hostname==='sooplive.com')url.hostname='www.sooplive.com';return url.toString().replace(/\/$/,'')}catch{return''}}
function publicSourceRows(item={}){return[...(Array.isArray(item.timeline)?item.timeline:[]),...(Array.isArray(item.media)?item.media:[]),...(Array.isArray(item.sources)?item.sources:[])].filter(row=>row&&row.visibility!=='internal'&&row.url)}
function findPublicSourceRow(item={},rawUrl=''){const target=canonicalSourceUrl(rawUrl);if(!target)return null;return publicSourceRows(item).find(row=>canonicalSourceUrl(row.url)===target)||null}
function previewRecordId(url=''){try{const parsed=new URL(url),soop=(parsed.pathname.match(/\/post\/(\d+)/)||[])[1];if(soop)return soop;if(/(^|\.)fmkorea\.com$/i.test(parsed.hostname)){const id=(parsed.pathname.match(/\/(?:best\/)?(\d+)\/?$/)||[])[1];if(id)return'fmkorea-'+id}}catch{}return''}
function soopPostId(url=''){try{const parsed=new URL(url);if(!/(^|\.)sooplive\.com$/i.test(parsed.hostname))return'';return(parsed.pathname.match(/\/station\/chunbongtv\/post\/(\d+)/i)||[])[1]||''}catch{return''}}
function uniqueImages(values=[]){const seen=new Set(),out=[];for(const value of values){const url=canonicalSourceUrl(value);if(!url||seen.has(url))continue;seen.add(url);out.push(url);if(out.length>=24)break}return out}
function cleanPreviewImages(values=[],rawUrl=''){const images=uniqueImages(values);return soopPostId(rawUrl)?sanitizeSoopImages(images):images}
function extractOfficialSoopImages(html=''){
  const values=[];
  for(const tagMatch of String(html||'').matchAll(/<(?:img|source)\b[^>]*>/gi)){
    const tag=tagMatch[0]||'';
    for(const attrMatch of tag.matchAll(/\b(src|data-src|data-original|data-lazy-src|srcset|data-srcset)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)){
      const attr=String(attrMatch[1]||'').toLowerCase(),value=attrMatch[2]||attrMatch[3]||attrMatch[4]||'';
      if(!value)continue;
      if(attr.includes('srcset')){for(const part of value.split(',')){const candidate=part.trim().split(/\s+/)[0];if(candidate)values.push(candidate)}}
      else values.push(value);
    }
  }
  return sanitizeSoopImages(uniqueImages(values));
}
function looksLikeContaminatedSoopCapture(body=''){
  const sample=String(body||'').slice(0,12000);
  if(!sample)return false;
  let hits=0;
  for(const marker of SOOP_CAPTURE_CONTAMINATION_MARKERS)if(sample.includes(marker))hits+=1;
  return hits>=3&&(sample.includes('설정 메뉴')||sample.includes('프로그램 설정'));
}
function sanitizeCapturedSoopBody(body='',meta={}){
  let text=String(body||'').replace(/\u00a0/g,' ').trim();
  if(!text)return'';
  const header=/20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[\d,]+(?:\s|$)/;
  const match=header.exec(text.slice(0,900));
  if(match){
    const prefix=text.slice(0,match.index+match[0].length);
    const expectedDate=String(meta?.date||'').slice(0,10);
    const capturedDate=(match[0].match(/20\d{2}-\d{2}-\d{2}/)||[])[0]||'';
    const hasSoopChrome=/(?:콘텐츠|컨텐츠|춘봉_)/.test(prefix);
    if(hasSoopChrome&&(!expectedDate||!capturedDate||expectedDate===capturedDate))text=text.slice(match.index+match[0].length).trim();
  }
  text=text.replace(/(?:\s|^)(?:시청자\s+)?댓글(?:\s+시\s+블랙)?(?:\s+[\d,]+)?\s+공유(?:\s+[\d,]+)?\s*$/i,'').trim();
  return text;
}
async function capturedPreview(rawUrl,row={}){if(!hasRedis())return null;const recordId=previewRecordId(rawUrl);if(!recordId)return null;try{const record=parseJson(await redisCommand('GET',BROWSER_IMPORT_PREFIX+recordId));const payload=normalizeBrowserImportPayload(record||{});if(!payload||canonicalSourceUrl(payload.url)!==canonicalSourceUrl(rawUrl))return null;let body=String(payload.body||'').trim().slice(0,30000);if(soopPostId(rawUrl)){if(looksLikeContaminatedSoopCapture(body))return null;body=sanitizeCapturedSoopBody(body,{title:payload.title||row.title||row.label,date:payload.date||row.date})}if(!body&&!Array.isArray(payload.images))return null;return{title:String(payload.title||row.title||row.label||'자료 보기').trim(),date:String(payload.date||row.date||'').slice(0,10),body,html:'',images:cleanPreviewImages([...(payload.images||[]),row.thumbnail],rawUrl),url:canonicalSourceUrl(rawUrl),kind:String(row.type||row.kind||'post'),source:'captured-browser'}}catch{return null}}
async function publicSoopPreview(rawUrl,row={}){const postId=soopPostId(rawUrl);if(!postId)return null;try{const detail=await fetchNoticeDetail(postId);const body=String(detail?.content||'').trim().slice(0,30000);const html=String(detail?.html||'').trim().slice(0,120000);const images=cleanPreviewImages([...extractOfficialSoopImages(html),...(detail?.images||[])],rawUrl);return{title:String(detail?.title||row.title||row.label||'SOOP 게시글').trim(),date:String(detail?.date||row.date||'').slice(0,10),body,html:String(detail?.html||'').trim().slice(0,120000),images,url:canonicalSourceUrl(rawUrl),kind:String(row.type||row.kind||'post'),source:'soop-public'}}catch{return null}}
function usefulTitle(value='',rawUrl=''){const id=soopPostId(rawUrl);return value&&!isGenericSoopTitle(value,id)?String(value).trim():''}
function mergeSourcePreviews(captured,publicPreview,row={},rawUrl=''){
  if(!captured&&!publicPreview)return null;
  const hasOfficial=Boolean(publicPreview?.body||publicPreview?.html);
  const title=usefulTitle(publicPreview?.title,rawUrl)||usefulTitle(captured?.title,rawUrl)||usefulTitle(row.title||row.label,rawUrl)||captured?.title||publicPreview?.title||'자료 보기';
  const authoritativeImages=publicPreview?.body?publicPreview.images:null;
  return{
    title,
    date:String(publicPreview?.date||captured?.date||row.date||'').slice(0,10),
    body:String(publicPreview?.body||captured?.body||row.note||row.description||row.summary||'').trim().slice(0,30000),
    html:hasOfficial?String(publicPreview?.html||'').trim().slice(0,120000):'',
    images:authoritativeImages!==null?cleanPreviewImages(authoritativeImages||[],rawUrl):cleanPreviewImages([...(captured?.images||[]),...(publicPreview?.images||[]),row.thumbnail,row.src,row?.image?.src],rawUrl),
    url:canonicalSourceUrl(rawUrl),kind:String(row.type||row.kind||captured?.kind||publicPreview?.kind||'reference'),
    source:hasOfficial?'soop-public':captured?.body?'captured-browser':publicPreview?.source||captured?.source||'archive-metadata'
  };
}
async function buildPublicSourcePreview(item={},rawUrl=''){
  const row=findPublicSourceRow(item,rawUrl);if(!row)return null;
  const isSoop=Boolean(soopPostId(rawUrl));
  const publicPreview=isSoop?await publicSoopPreview(rawUrl,row):null;
  if(publicPreview?.body||publicPreview?.html)return mergeSourcePreviews(null,publicPreview,row,rawUrl);
  const captured=await capturedPreview(rawUrl,row);
  const merged=mergeSourcePreviews(captured,publicPreview,row,rawUrl);
  if(merged&&(merged.body||merged.html||merged.images.length))return merged;
  return{title:String(row.title||row.label||'자료 보기').trim(),date:String(row.date||'').slice(0,10),body:String(row.note||row.description||row.summary||'').trim().slice(0,30000),html:'',images:cleanPreviewImages([row.thumbnail,row.src,row?.image?.src],rawUrl),url:canonicalSourceUrl(rawUrl),kind:String(row.type||row.kind||'reference'),source:'archive-metadata'};
}
function publicDetailResponse(req,res){let statusCode=200;const params=requestUrl(req).searchParams,previewRequested=params.get('sourcePreview')==='1',previewUrl=params.get('url')||'';const proxy={setHeader(name,value){res.setHeader(name,value);return proxy},status(code){statusCode=code;return proxy},async json(payload){if(statusCode===200&&payload?.item){const item=repairPublicArchiveItem(payload.item);if(previewRequested){const preview=await buildPublicSourcePreview(item,previewUrl);if(!preview)return res.status(404).json({error:'source_preview_not_found'});if(typeof res.setHeader==='function')res.setHeader('Cache-Control','public, max-age=60, s-maxage=300, stale-while-revalidate=900');return res.status(200).json({preview})}return res.status(statusCode).json({...payload,item})}return res.status(statusCode).json(payload)},send(payload){return res.status(statusCode).send(payload)},end(payload){return res.status(statusCode).end(payload)}};return proxy}
function installPublicDetailRepair(){if(contentArchive[PUBLIC_DETAIL_REPAIR])return;const original=contentArchive.handlePublicDetail;if(typeof original!=='function')return;contentArchive.handlePublicDetail=(req,res)=>original(req,publicDetailResponse(req,res));Object.defineProperty(contentArchive,PUBLIC_DETAIL_REPAIR,{value:true,enumerable:false})}
installPublicDetailRepair();

async function handleOperatorBrowserImportManage(req,res){const current=await requireOwner(req,res);if(!current)return;if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});const recordId=safeText(body.recordId,120),action=String(body.action||'');if(!recordId||!['connect','public','internal','ignore','restore'].includes(action))return contentArchive.handleOperatorBrowserImportManage(req,res);if(['connect','public','internal'].includes(action)){try{const key=BROWSER_IMPORT_PREFIX+recordId;const raw=await redisCommand('GET',key);const record=parseJson(raw);if(record){const enriched=await enrichSoopRecord(record);if(changedMetadata(record,enriched))await redisCommand('SET',key,JSON.stringify(enriched))}}catch{}}return contentArchive.handleOperatorBrowserImportManage(req,res)}

module.exports={handleOperatorBrowserImportManage,_internals:{enrichSoopRecord,applyKnownTitleFallback,changedMetadata,publicDetailResponse,installPublicDetailRepair,buildPublicSourcePreview,mergeSourcePreviews,findPublicSourceRow,capturedPreview,publicSoopPreview,looksLikeContaminatedSoopCapture,sanitizeCapturedSoopBody,cleanPreviewImages,extractOfficialSoopImages,KNOWN_TITLE_FIXES}};