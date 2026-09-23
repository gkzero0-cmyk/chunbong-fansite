'use strict';

const TYPES=new Set(['notice','post','vod','catch','clip','youtube','shorts','article','result','image','reference']);
const PRECISIONS=new Set(['day','month','year','unknown']);
const VERIFY_STATES=new Set(['official','cross_checked','needs_review']);
const STATUSES=new Set(['planned','recruiting','ongoing','ended']);

function text(value,max=2000){return String(value??'').trim().slice(0,max)}
function list(value){return Array.isArray(value)?value:[]}
function normalizeUrl(value,{allowLocal=false}={}){
  const raw=text(value,1200);
  if(!raw)return'';
  if(allowLocal&&/^\/(?!\/)/.test(raw))return raw;
  try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.toString():''}catch{return''}
}
function normalizeSourceUrl(value=''){
  const normalized=normalizeUrl(value);if(!normalized)return'';
  try{
    const url=new URL(normalized),host=url.hostname.toLowerCase();
    if(host==='namu.moe'||host==='www.namu.moe'||host==='m.namu.moe'){
      url.protocol='https:';url.hostname='namu.wiki';url.port='';
      return url.toString();
    }
  }catch{}
  return normalized;
}
function normalizeSource(row={}){
  const url=normalizeSourceUrl(row.url);
  let label=text(row.label,120).replace(/나무위키 계열/g,'나무위키').replace(/나무미러/g,'나무위키');
  return {id:text(row.id,80),kind:text(row.kind,40)||'reference',label,url,visibility:row.visibility==='internal'?'internal':'public'};
}
function normalizeMaterial(row={}){
  const precision=PRECISIONS.has(row.datePrecision)?row.datePrecision:'unknown';
  return {
    id:text(row.id,80),type:TYPES.has(row.type)?row.type:'reference',title:text(row.title,200),
    date:text(row.date,10),datePrecision:precision,url:normalizeUrl(row.url),thumbnail:normalizeUrl(row.thumbnail,{allowLocal:true}),
    sourceId:text(row.sourceId,80),note:text(row.note,1000),visibility:row.visibility==='internal'?'internal':'public'
  };
}
function normalizeGallery(row={}){
  return {id:text(row.id,80),src:normalizeUrl(row.src||row.url,{allowLocal:true}),url:normalizeUrl(row.url),alt:text(row.alt,200),caption:text(row.caption,300),sourceId:text(row.sourceId,80)};
}
function normalizeSeriesInfo(row={}){
  if(!row||typeof row!=='object')return null;
  const id=text(row.id,80).toLowerCase().replace(/[^a-z0-9가-힣-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  if(!id)return null;
  const order=Number(row.order);
  return {
    id,
    title:text(row.title,120),
    subtitle:text(row.subtitle,160),
    description:text(row.description,500),
    order:Number.isFinite(order)?Math.floor(order):0,
    cover:row.cover&&typeof row.cover==='object'?{
      src:normalizeUrl(row.cover.src,{allowLocal:true}),
      alt:text(row.cover.alt,200)
    }:null
  };
}
function normalizeParticipantGroup(row={}){
  const participants=list(row.participants).map(v=>text(v,80)).filter(Boolean);
  const count=Number(row.count);
  return {
    id:text(row.id,80),
    title:text(row.title,160),
    stage:text(row.stage,120),
    platform:text(row.platform,80),
    participants,
    count:Number.isFinite(count)&&count>=0?Math.floor(count):participants.length,
    sourceId:text(row.sourceId,80),
    note:text(row.note,500)
  };
}
function normalizeNotionImage(row={}){
  if(!row||typeof row!=='object')return null;
  const src=normalizeUrl(row.src||row.url);
  if(!src)return null;
  return {
    src,
    alt:text(row.alt||row.filename||row.caption,220),
    caption:text(row.caption,300),
    filename:text(row.filename,220),
    sourceUrl:normalizeUrl(row.sourceUrl||row.src||row.url),
    originalId:text(row.originalId,120),
    permanent:row.permanent===true,
    assetId:text(row.assetId,160),
    publicId:text(row.publicId,200),
    provider:text(row.provider,40),
    assetState:['permanent','remote'].includes(row.assetState)?row.assetState:'',
    assetHash:text(row.assetHash,80),
    width:Number(row.width)||0,
    height:Number(row.height)||0
  };
}
function normalizeNotionContentBlock(row={}){
  if(!row||typeof row!=='object')return null;
  if(row.type==='image'){
    const image=normalizeNotionImage(row.image||row);
    return image?{type:'image',image}:null;
  }
  const value=text(row.text||row.value,3000);
  return value?{type:'text',text:value}:null;
}
function normalizeNotionSection(row={}){
  const depth=Number(row.depth);
  return {
    id:text(row.id,120),
    sourceId:text(row.sourceId,80),
    pageId:text(row.pageId,80),
    pageTitle:text(row.pageTitle,180),
    title:text(row.title,180),
    text:text(row.text,3000),
    images:list(row.images).map(normalizeNotionImage).filter(Boolean).slice(0,12),
    content:list(row.content).map(normalizeNotionContentBlock).filter(Boolean).slice(0,240),
    provider:text(row.provider,40)||'notion',
    depth:Number.isFinite(depth)&&depth>=0?Math.min(12,Math.floor(depth)):0
  };
}
function normalizeReferenceSection(row={}){
  const depth=Number(row.depth);
  return {
    id:text(row.id,120),
    sourceId:text(row.sourceId,80),
    pageId:text(row.pageId,500),
    pageTitle:text(row.pageTitle,180),
    title:text(row.title,180),
    text:text(row.text,6000),
    images:list(row.images).map(normalizeNotionImage).filter(Boolean).slice(0,18),
    content:list(row.content).map(normalizeNotionContentBlock).filter(Boolean).slice(0,240),
    provider:text(row.provider,40)||'reference',
    depth:Number.isFinite(depth)&&depth>=0?Math.min(12,Math.floor(depth)):0
  };
}
function normalizeKnowledgeImage(row={}){
  if(!row||typeof row!=='object')return null;
  const src=normalizeUrl(row.src||row.url,{allowLocal:true});
  if(!src)return null;
  return {
    id:text(row.id,100),src,alt:text(row.alt||row.caption,220),caption:text(row.caption,400),
    sourceUrl:normalizeUrl(row.sourceUrl||row.originalUrl||row.url),sourceId:text(row.sourceId,80),
    layout:['full','wide','grid','auto'].includes(row.layout)?row.layout:'auto'
  };
}
function normalizeKnowledgeSection(row={}){
  if(!row||typeof row!=='object')return null;
  const cards=list(row.cards).map(card=>({
    eyebrow:text(card?.eyebrow,60),title:text(card?.title,180),text:text(card?.text,2200),
    value:text(card?.value,500),items:list(card?.items).map(v=>text(v,220)).filter(Boolean).slice(0,20)
  })).filter(card=>card.title||card.text||card.value||card.items.length).slice(0,24);
  const flow=list(row.flow).map(v=>typeof v==='object'?{title:text(v.title||v.label,160),text:text(v.text||v.description,700)}:{title:text(v,160),text:''}).filter(v=>v.title).slice(0,20);
  const chips=list(row.chips).map(v=>text(v,120)).filter(Boolean).slice(0,40);
  return {
    id:text(row.id,100),kind:text(row.kind,60)||'section',eyebrow:text(row.eyebrow,80),title:text(row.title,180),
    description:text(row.description,1800),sourceId:text(row.sourceId,80),cards,flow,chips,
    images:list(row.images).map(normalizeKnowledgeImage).filter(Boolean).slice(0,24)
  };
}
function normalizeSeriesSession(row={}){
  const number=Number(row.number);
  const participants=list(row.participants).map(v=>text(v,80)).filter(Boolean);
  const count=Number(row.participantCount);
  const precision=PRECISIONS.has(row.datePrecision)?row.datePrecision:'day';
  const status=['verified','pending'].includes(row.poster?.status)?row.poster.status:'pending';
  return {
    id:text(row.id,80),
    number:Number.isFinite(number)&&number>0?Math.floor(number):0,
    title:text(row.title,160),
    date:text(row.date,10),
    datePrecision:precision,
    time:text(row.time,20),
    venue:text(row.venue,80),
    participants,
    participantCount:Number.isFinite(count)&&count>=0?Math.floor(count):participants.length,
    poster:row.poster&&typeof row.poster==='object'?{
      src:normalizeUrl(row.poster.src,{allowLocal:true}),
      alt:text(row.poster.alt,200),
      status
    }:null,
    sourceId:text(row.sourceId,80),
    note:text(row.note,600)
  };
}
function normalizeArchiveItem(raw={}){
  const precision=PRECISIONS.has(raw.datePrecision)?raw.datePrecision:'unknown';
  const participantCount=Number(raw.participantCount);
  return {
    id:text(raw.id,80).toLowerCase().replace(/[^a-z0-9가-힣-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''),
    title:text(raw.title,160),aliases:list(raw.aliases).map(v=>text(v,80)).filter(Boolean),category:text(raw.category,40),series:normalizeSeriesInfo(raw.series),
    role:text(raw.role,40),status:STATUSES.has(raw.status)?raw.status:'ended',startDate:text(raw.startDate,10),endDate:text(raw.endDate,10),
    datePrecision:precision,summary:text(raw.summary,300),description:text(raw.description,6000),
    heroImage:raw.heroImage&&typeof raw.heroImage==='object'?{src:normalizeUrl(raw.heroImage.src,{allowLocal:true}),alt:text(raw.heroImage.alt,200),sourceId:text(raw.heroImage.sourceId,80)}:null,
    participantCount:Number.isFinite(participantCount)&&participantCount>=0?Math.floor(participantCount):0,
    participants:list(raw.participants).map(v=>text(v,80)).filter(Boolean),participantGroups:list(raw.participantGroups).map(normalizeParticipantGroup).filter(row=>row.id||row.title||row.participants.length),results:list(raw.results),
    seriesSessions:list(raw.seriesSessions).map(normalizeSeriesSession).filter(row=>row.number||row.id),
    timeline:list(raw.timeline).map(normalizeMaterial),media:list(raw.media).map(normalizeMaterial),gallery:list(raw.gallery).map(normalizeGallery),
    notionSections:list(raw.notionSections).map(normalizeNotionSection).filter(row=>row.id||row.title||row.text||row.images.length||row.content.length),
    notionSyncedAt:text(raw.notionSyncedAt,40),
    referenceSections:list(raw.referenceSections).map(normalizeReferenceSection).filter(row=>row.id||row.title||row.text||row.images.length||row.content.length),
    referenceSyncedAt:text(raw.referenceSyncedAt,40),
    knowledgeSections:list(raw.knowledgeSections).map(normalizeKnowledgeSection).filter(row=>row&&(row.id||row.title||row.description||row.cards.length||row.flow.length||row.chips.length||row.images.length)),
    knowledgeSyncedAt:text(raw.knowledgeSyncedAt,40),
    sources:list(raw.sources).map(normalizeSource).filter(row=>row&&(row.id||row.url)),
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
  if(item.seriesSessions.some(row=>!validDateForPrecision(row.date,row.datePrecision)))errors.push('invalid_series_session_date');
  const seriesNumbers=item.seriesSessions.map(row=>row.number).filter(Boolean);
  if(new Set(seriesNumbers).size!==seriesNumbers.length)errors.push('duplicate_series_session_number');
  const urls=materials.map(row=>String(row?.url||'').trim()).filter(Boolean);
  if(new Set(urls).size!==urls.length)errors.push('duplicate_material_url');

  const sourceIds=item.sources.map(row=>String(row?.id||'').trim()).filter(Boolean);
  if(new Set(sourceIds).size!==sourceIds.length)errors.push('duplicate_source_id');
  const knownSources=new Set(sourceIds);
  const referencedSourceIds=[
    item.heroImage?.sourceId,
    ...materials.map(row=>row?.sourceId),
    ...item.gallery.map(row=>row?.sourceId),
    ...item.seriesSessions.map(row=>row?.sourceId),
    ...item.participantGroups.map(row=>row?.sourceId),
    ...item.notionSections.map(row=>row?.sourceId),
    ...item.referenceSections.map(row=>row?.sourceId),
    ...item.referenceSections.flatMap(row=>(row.images||[]).map(image=>image?.sourceId)),
    ...item.knowledgeSections.map(row=>row?.sourceId),
    ...item.knowledgeSections.flatMap(row=>(row.images||[]).map(image=>image?.sourceId))
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
function publicSourceSafeText(value=''){
  return String(value||'')
    .replace(/방통실\s*(?:\(\s*BNGTS\s*\))?/gi,'')
    .replace(/BNGTS/gi,'')
    .replace(/Nemopix/gi,'')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .trim();
}
function imageFilenameOnly(value=''){
  const raw=String(value||'').trim();
  return raw.length>0&&raw.length<=240&&/^[^\n]+\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?.*)?$/i.test(raw);
}
function humanizeGuideImageLabel(value=''){
  let raw=String(value||'').trim();
  if(imageFilenameOnly(raw)){
    raw=raw.split(/[\\/]/).pop().replace(/\?.*$/,'').replace(/\.(?:png|jpe?g|webp|gif|svg|avif)$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    if(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(raw))raw='';
  }
  return publicSourceSafeText(raw);
}
function cleanNamuWikiText(value=''){
  return String(value||'')
    .replace(/#!if[\s\S]{0,1000}?(?=(?:\[\[파일:|<col|<row|<table|$))/gi,' ')
    .replace(/\[\[파일:[^\]]*\]\]/gi,' ')
    .replace(/Image:\s*파일:[^\n]+?\.(?:png|jpe?g|webp|gif|svg|avif)/gi,' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2')
    .replace(/\[\[([^\]]*)\]\]/g,'$1')
    .replace(/\{\{\{#!(?:wiki|folding|html|if)\b[^\n}]*/gi,' ')
    .replace(/\{\{\{|\}\}\}/g,' ')
    .replace(/<[^>\n]{1,220}>/g,' ')
    .replace(/\|\|+/g,'\n')
    .replace(/~~([^~]+)~~/g,'$1')
    .replace(/\^\{([^}]+)\}/g,'$1')
    .replace(/\[(\d+)\]/g,' ')
    .replace(/&nbsp;/gi,' ');
}
function cleanGuideText(value='',provider=''){
  const raw=provider==='namuwiki'?cleanNamuWikiText(value):String(value||'');
  const lines=raw.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!imageFilenameOnly(line)).map(line=>{
    let clean=line;
    if(provider==='namuwiki')clean=clean.replace(/(?:#!(?:if|wiki|folding|html)\b|<\/?(?:nopad|row|col|table)[^>]*>|\{\{\{|\}\}\}|\|\|)/gi,' ');
    return publicSourceSafeText(clean);
  }).filter(Boolean);
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function cleanGuideImage(image={},hiddenSourceIds=new Set()){
  const sourceId=hiddenSourceIds.has(String(image.sourceId||''))?'':image.sourceId;
  const alt=humanizeGuideImageLabel(image.alt||image.caption||image.filename)||'자료 이미지';
  const caption=humanizeGuideImageLabel(image.caption||image.alt||image.filename);
  return {...image,sourceId,alt,caption,filename:''};
}
function cleanPublicGuideSection(section={},hiddenSourceIds=new Set()){
  const provider=String(section.provider||'').toLowerCase();
  const textValue=cleanGuideText(section.text,provider);
  const title=cleanGuideText(section.title,provider)||publicSourceSafeText(section.title);
  const pageTitle=cleanGuideText(section.pageTitle,provider)||publicSourceSafeText(section.pageTitle);
  const images=(section.images||[]).map(image=>cleanGuideImage(image,hiddenSourceIds)).filter(image=>image.src);
  const content=(section.content||[]).map(block=>{
    if(block?.type==='image'&&block.image){
      const image=cleanGuideImage(block.image,hiddenSourceIds);return image.src?{type:'image',image}:null;
    }
    const textValue=cleanGuideText(block?.text||'',provider);
    return textValue?{type:'text',text:textValue}:null;
  }).filter(Boolean);
  const hasBody=Boolean(textValue||images.length||content.length);
  if(!hasBody)return null;
  return {...section,sourceId:hiddenSourceIds.has(String(section.sourceId||''))?'':section.sourceId,pageTitle,title,text:textValue,images,content};
}
function cleanPublicGuideSections(rows=[],hiddenSourceIds=new Set()){
  const seen=new Set(),out=[];
  for(const raw of rows||[]){
    const section=cleanPublicGuideSection(raw,hiddenSourceIds);if(!section)continue;
    const key=[section.provider,section.sourceId,section.pageTitle,section.title,section.text,(section.images||[]).map(image=>image.src).join('|')].join('\n').toLowerCase();
    if(seen.has(key))continue;seen.add(key);out.push(section);
  }
  return out;
}
function blockedArchiveSourceUrl(value=''){return /bngts\.com|namu\.moe|nemopix\.xyz/i.test(String(value||''))}
function toPublicArchiveItem(raw){
  const item=normalizeArchiveItem(raw);const {verification,...publicItem}=item;
  const hiddenSourceIds=new Set(item.sources.filter(row=>row.visibility==='internal'||blockedArchiveSourceUrl(row.url)).map(row=>String(row.id||'')).filter(Boolean));
  const sources=item.sources.filter(row=>row.visibility!=='internal'&&!blockedArchiveSourceUrl(row.url));
  const timeline=item.timeline.filter(row=>row.visibility!=='internal'&&!blockedArchiveSourceUrl(row.url));
  const media=item.media.filter(row=>row.visibility!=='internal'&&!blockedArchiveSourceUrl(row.url));
  const results=(item.results||[]).map(row=>({...row,title:publicSourceSafeText(row.title),label:publicSourceSafeText(row.label),value:publicSourceSafeText(row.value),name:publicSourceSafeText(row.name)}));
  const participantGroups=(item.participantGroups||[]).map(row=>hiddenSourceIds.has(String(row.sourceId||''))?{...row,sourceId:'',note:publicSourceSafeText(row.note)}:{...row,note:publicSourceSafeText(row.note)});
  const participants=item.id==='justserver-moneygame'?[]:item.participants;
  const notionSections=cleanPublicGuideSections(item.notionSections||[],hiddenSourceIds);
  const referenceSections=cleanPublicGuideSections(item.referenceSections||[],hiddenSourceIds);
  const knowledgeSections=(item.knowledgeSections||[]).map(section=>({
    ...section,
    sourceId:hiddenSourceIds.has(String(section.sourceId||''))?'':section.sourceId,
    description:publicSourceSafeText(section.description),
    cards:(section.cards||[]).map(card=>({...card,text:publicSourceSafeText(card.text),value:publicSourceSafeText(card.value)})),
    flow:(section.flow||[]).map(step=>({...step,text:publicSourceSafeText(step.text)})),
    images:(section.images||[]).map(image=>hiddenSourceIds.has(String(image.sourceId||''))?{...image,sourceId:''}:image)
  }));
  return {...publicItem,description:publicSourceSafeText(item.description),results,participantGroups,participants,sources,timeline,media,notionSections,referenceSections,knowledgeSections,verifiedAt:verification.verifiedAt,sourceCount:sources.length};
}
module.exports={normalizeArchiveItem,normalizeSeriesInfo,normalizeSeriesSession,normalizeParticipantGroup,validateArchiveItem,toPublicArchiveItem,blockedArchiveSourceUrl,formatArchiveDate,cleanGuideText,imageFilenameOnly,humanizeGuideImageLabel,TYPES,PRECISIONS,VERIFY_STATES};
