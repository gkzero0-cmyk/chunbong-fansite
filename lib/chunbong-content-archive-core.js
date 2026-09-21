'use strict';

const TYPES=new Set(['notice','post','vod','catch','clip','youtube','shorts','article','result','image','reference']);
const PRECISIONS=new Set(['day','month','year','unknown']);
const VERIFY_STATES=new Set(['official','cross_checked','needs_review']);
const STATUSES=new Set(['recruiting','ongoing','ended']);

function text(value,max=2000){return String(value??'').trim().slice(0,max)}
function list(value){return Array.isArray(value)?value:[]}
function normalizeUrl(value,{allowLocal=false}={}){
  const raw=text(value,1200);
  if(!raw)return'';
  if(allowLocal&&/^\/(?!\/)/.test(raw))return raw;
  try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.toString():''}catch{return''}
}
function normalizeSource(row={}){
  return {id:text(row.id,80),kind:text(row.kind,40)||'reference',label:text(row.label,120),url:normalizeUrl(row.url)};
}
function normalizeMaterial(row={}){
  const precision=PRECISIONS.has(row.datePrecision)?row.datePrecision:'unknown';
  return {
    id:text(row.id,80),type:TYPES.has(row.type)?row.type:'reference',title:text(row.title,200),
    date:text(row.date,10),datePrecision:precision,url:normalizeUrl(row.url),thumbnail:normalizeUrl(row.thumbnail,{allowLocal:true}),
    sourceId:text(row.sourceId,80),note:text(row.note,1000)
  };
}
function normalizeGallery(row={}){
  return {id:text(row.id,80),src:normalizeUrl(row.src||row.url,{allowLocal:true}),url:normalizeUrl(row.url),alt:text(row.alt,200),caption:text(row.caption,300),sourceId:text(row.sourceId,80)};
}
function normalizeArchiveItem(raw={}){
  const precision=PRECISIONS.has(raw.datePrecision)?raw.datePrecision:'unknown';
  return {
    id:text(raw.id,80).toLowerCase().replace(/[^a-z0-9가-힣-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''),
    title:text(raw.title,160),aliases:list(raw.aliases).map(v=>text(v,80)).filter(Boolean),category:text(raw.category,40),
    role:text(raw.role,40),status:STATUSES.has(raw.status)?raw.status:'ended',startDate:text(raw.startDate,10),endDate:text(raw.endDate,10),
    datePrecision:precision,summary:text(raw.summary,300),description:text(raw.description,6000),
    heroImage:raw.heroImage&&typeof raw.heroImage==='object'?{src:normalizeUrl(raw.heroImage.src,{allowLocal:true}),alt:text(raw.heroImage.alt,200),sourceId:text(raw.heroImage.sourceId,80)}:null,
    participants:list(raw.participants).map(v=>text(v,80)).filter(Boolean),results:list(raw.results),
    timeline:list(raw.timeline).map(normalizeMaterial),media:list(raw.media).map(normalizeMaterial),gallery:list(raw.gallery).map(normalizeGallery),
    sources:list(raw.sources).map(normalizeSource).filter(row=>row.id||row.url),
    verification:{state:VERIFY_STATES.has(raw.verification?.state)?raw.verification.state:'needs_review',verifiedAt:text(raw.verification?.verifiedAt,40),conflicts:list(raw.verification?.conflicts)},
    published:raw.published===true,updatedAt:text(raw.updatedAt,40)
  };
}
function validDateForPrecision(value,precision){
  const raw=String(value||'');
  if(precision==='unknown'){
    if(!raw)return true;
    if(/^\d{4}$/.test(raw))return validDateForPrecision(raw,'year');
    if(/^\d{4}-\d{2}$/.test(raw))return validDateForPrecision(raw,'month');
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return validDateForPrecision(raw,'day');
    return false;
  }
  if(precision==='year')return /^\d{4}$/.test(raw);
  if(precision==='month')return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw);
  if(!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(raw))return false;
  const [year,month,day]=raw.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}
function validateArchiveItem(item,{publishing=false}={}){
  const errors=[];
  if(!item.id)errors.push('id_required');
  if(!item.title)errors.push('title_required');
  if(!PRECISIONS.has(item.datePrecision))errors.push('invalid_date_precision');
  const startValid=validDateForPrecision(item.startDate,item.datePrecision);
  if(!startValid)errors.push('invalid_start_date');
  const endValid=!item.endDate||validDateForPrecision(item.endDate,item.datePrecision);
  if(!endValid)errors.push('invalid_end_date');
  if(startValid&&endValid&&item.startDate&&item.endDate&&item.datePrecision!=='unknown'&&item.endDate<item.startDate)errors.push('end_before_start');

  const materials=[...item.timeline,...item.media];
  if(materials.some(row=>!validDateForPrecision(row.date,row.datePrecision)))errors.push('invalid_material_date');
  const urls=materials.map(row=>String(row?.url||'').trim()).filter(Boolean);
  if(new Set(urls).size!==urls.length)errors.push('duplicate_material_url');

  const sourceIds=item.sources.map(row=>String(row?.id||'').trim()).filter(Boolean);
  if(new Set(sourceIds).size!==sourceIds.length)errors.push('duplicate_source_id');
  const knownSources=new Set(sourceIds);
  const referencedSourceIds=[
    item.heroImage?.sourceId,
    ...materials.map(row=>row?.sourceId),
    ...item.gallery.map(row=>row?.sourceId)
  ].map(value=>String(value||'').trim()).filter(Boolean);
  if(publishing&&referencedSourceIds.some(id=>!knownSources.has(id)))errors.push('unknown_source_id');

  if(publishing&&item.sources.length===0)errors.push('published_source_required');
  if(publishing&&item.sources.some(row=>!row.url))errors.push('published_source_url_required');
  if(publishing&&(item.verification.state==='needs_review'||item.verification.conflicts.length))errors.push('unresolved_conflict');
  return [...new Set(errors)];
}
function formatArchiveDate(value,precision='unknown'){
  if(precision==='unknown'||!value)return'날짜 확인 중';
  if(precision==='year')return`${value.slice(0,4)}년`;
  if(precision==='month')return`${value.slice(0,4)}년 ${Number(value.slice(5,7))}월`;
  const [y,m,d]=value.split('-').map(Number);return`${y}년 ${m}월 ${d}일`;
}
function toPublicArchiveItem(raw){
  const item=normalizeArchiveItem(raw);const {verification,...publicItem}=item;
  return {...publicItem,verifiedAt:verification.verifiedAt,sourceCount:item.sources.length};
}
module.exports={normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem,formatArchiveDate,TYPES,PRECISIONS,VERIFY_STATES};
