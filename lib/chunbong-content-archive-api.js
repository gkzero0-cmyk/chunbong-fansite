'use strict';
const crypto=require('node:crypto');
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem,cleanGuideText}=require('./chunbong-content-archive-core');
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
const AUTO_FULL_MIGRATION_KEY='content-archive:auto-sync:full-migration:v8-moneygame-participant-count-reference-image-assets';
const AUTO_GUIDE_MEDIA_MIGRATION_KEY='content-archive:auto-sync:guide-media-migration:v10-canonical-namuwiki-purge-mirrors';
const BROWSER_IMPORT_PREFIX='content-archive:browser-import:v1:';
const BROWSER_IMPORT_INDEX='content-archive:browser-import-index:v1';
const SOURCE_META_HOSTS=new Set([
  'www.sooplive.com','sooplive.com','vod.sooplive.com','pick.sooplive.com',
  'bngts.com','www.bngts.com',
  'naver.me','cafe.naver.com','m.cafe.naver.com',
  'namu.wiki','www.namu.wiki',
  'fmkorea.com','www.fmkorea.com','m.fmkorea.com',
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
function normalizePublishedDate(value=''){
  const match=decodeHtml(String(value||'')).trim().match(/(\d{4})-(\d{2})-(\d{2})/);
  if(!match)return '';
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}
function readJsonLdPublishedDate(html){
  const scripts=String(html||'').match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[];
  const findDate=value=>{
    if(!value)return '';
    if(Array.isArray(value)){for(const row of value){const found=findDate(row);if(found)return found}return ''}
    if(typeof value!=='object')return '';
    for(const key of ['datePublished','uploadDate','dateCreated']){
      const found=normalizePublishedDate(value[key]);if(found)return found;
    }
    for(const nested of Object.values(value)){const found=findDate(nested);if(found)return found}
    return '';
  };
  for(const script of scripts){
    const raw=(script.match(/>([\s\S]*?)<\/script>/i)||[])[1]||'';
    try{const found=findDate(JSON.parse(decodeHtml(raw).trim()));if(found)return found}catch{}
  }
  return '';
}
function readPublishedDate(html){
  for(const key of ['article:published_time','og:published_time','datePublished','publish-date','pubdate','date']){
    const found=normalizePublishedDate(readMeta(html,key));if(found)return found;
  }
  const jsonLd=readJsonLdPublishedDate(html);if(jsonLd)return jsonLd;
  const time=(String(html||'').match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)||[])[1]||'';
  return normalizePublishedDate(time);
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
function notionFirstUrl(value){
  if(!value)return'';
  if(typeof value==='string')return /^https?:\/\//i.test(value)?value:'';
  if(Array.isArray(value)){
    for(const part of value){
      const candidate=notionFirstUrl(part);
      if(candidate)return candidate;
    }
    return'';
  }
  if(typeof value==='object'){
    for(const key of ['url','source','display_source','signed_url']){
      const candidate=notionFirstUrl(value[key]);
      if(candidate)return candidate;
    }
    for(const nested of Object.values(value)){
      const candidate=notionFirstUrl(nested);
      if(candidate)return candidate;
    }
  }
  return'';
}
function notionIdKeys(value=''){
  const raw=String(value||'').trim(),compact=raw.replace(/-/g,'').toLowerCase(),keys=[raw,compact];
  if(/^[0-9a-f]{32}$/i.test(compact))keys.push(compact.replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5'));
  return [...new Set(keys.filter(Boolean))];
}
function notionSignedUrl(recordMap={},blockId=''){
  const maps=[recordMap?.signed_urls,recordMap?.signedUrls,recordMap?.signed_url,recordMap?.signedUrlMap].filter(Boolean);
  const keys=notionIdKeys(blockId);
  for(const map of maps){
    if(Array.isArray(map)){
      for(const row of map){
        const rowId=String(row?.id||row?.block_id||row?.blockId||'');
        if(rowId&&notionIdKeys(rowId).some(key=>keys.includes(key))){
          const url=notionFirstUrl(row);if(url)return url;
        }
      }
      continue;
    }
    if(!map||typeof map!=='object')continue;
    for(const key of keys){
      const direct=notionFirstUrl(map[key]);if(direct)return direct;
    }
    for(const [key,value] of Object.entries(map)){
      if(notionIdKeys(key).some(candidate=>keys.includes(candidate))){
        const url=notionFirstUrl(value);if(url)return url;
      }
    }
  }
  return'';
}
function notionBlockMedia(block={},signedUrl=''){
  const type=String(block.type||'');
  if(!['image','file'].includes(type))return null;
  const props=block.properties||{},format=block.format||{};
  const src=notionFirstUrl(signedUrl)||notionFirstUrl(format.display_source)||notionFirstUrl(props.source)||notionFirstUrl(props.file)||notionFirstUrl(format.source);
  if(!src)return null;
  const caption=notionRichText(props.caption||props.description||props.alt_text||'');
  const filename=notionRichText(props.title||props.name||'');
  return{
    src,sourceUrl:src,caption,filename,alt:caption||filename||'Notion 이미지',originalId:String(block.id||''),
    attachmentSource:notionAttachmentSource(block),spaceId:String(block.space_id||''),parentTable:String(block.parent_table||'block')
  };
}
function notionPageRows(recordMap={},pageId=''){
  const blocks=recordMap?.block||recordMap||{},rows=[],seen=new Set();
  const walk=(id,depth=0)=>{
    if(!id||seen.has(id)||depth>24)return;
    seen.add(id);
    const block=notionBlockValue(blocks[id]);
    if(!block||typeof block!=='object')return;
    const props=block.properties||{};
    const media=notionBlockMedia(block,notionSignedUrl(recordMap,id)||notionSignedUrl(recordMap,block.id));
    const text=notionRichText(props.title||props.caption||props.description||'');
    rows.push({id:String(id),type:String(block.type||''),text,media,depth,contentCount:Array.isArray(block.content)?block.content.length:0});
    for(const child of Array.isArray(block.content)?block.content:[])walk(child,depth+1);
  };
  walk(pageId,0);
  return rows;
}
function notionAttachmentSource(block={}){
  const props=block.properties||{},format=block.format||{};
  const source=notionRichText(props.source||'')||String(format.display_source||'').trim();
  return /^attachment:/i.test(source)?source:'';
}
async function populateNotionSignedUrls(recordMap={},signal){
  const blocks=recordMap?.block||{},requests=[],ids=[];
  for(const [recordId,entry] of Object.entries(blocks)){
    const block=notionBlockValue(entry);
    if(!block||!['image','file'].includes(String(block.type||'')))continue;
    const source=notionAttachmentSource(block);if(!source)continue;
    requests.push({url:source,permissionRecord:{id:String(block.id||recordId),table:String(block.parent_table||'block'),spaceId:String(block.space_id||'')}});
    ids.push(String(block.id||recordId));
  }
  if(!requests.length)return recordMap;
  const signedUrls={...(recordMap.signed_urls||recordMap.signedUrls||{})};
  for(let offset=0;offset<requests.length;offset+=20){
    const batch=requests.slice(offset,offset+20),batchIds=ids.slice(offset,offset+20);
    try{
      const response=await fetch('https://www.notion.so/api/v3/getSignedFileUrls',{
        method:'POST',signal,
        headers:{'User-Agent':SOURCE_BROWSER_HEADERS['User-Agent'],'Accept':'application/json','Content-Type':'application/json','Origin':'https://www.notion.so','Referer':'https://www.notion.so/'},
        body:JSON.stringify({urls:batch})
      });
      if(!response.ok)continue;
      const payload=await response.json().catch(()=>({})),urls=Array.isArray(payload?.signedUrls)?payload.signedUrls:[];
      for(let i=0;i<batchIds.length;i+=1)if(/^https?:\/\//i.test(String(urls[i]||'')))signedUrls[batchIds[i]]=String(urls[i]);
    }catch{}
  }
  if(Object.keys(signedUrls).length)recordMap.signed_urls=signedUrls;
  return recordMap;
}
function notionRecordMapDiagnostics(recordMap={}){
  const blocks=recordMap?.block||{};
  let imageBlocks=0,fileBlocks=0,attachmentSources=0,signedUrls=0,mediaRows=0,filenameTextRows=0;
  const filenameSamples=[];
  for(const [recordId,entry] of Object.entries(blocks)){
    const block=notionBlockValue(entry);if(!block||typeof block!=='object')continue;
    const type=String(block.type||'');
    if(type==='image')imageBlocks++;
    if(type==='file')fileBlocks++;
    if(notionAttachmentSource(block))attachmentSources++;
    const id=String(block.id||recordId);
    if(notionSignedUrl(recordMap,id))signedUrls++;
    if(notionBlockMedia(block,notionSignedUrl(recordMap,id)))mediaRows++;
    const props=block.properties||{};
    for(const raw of [notionRichText(props.title||''),notionRichText(props.name||''),notionRichText(props.caption||''),notionRichText(props.description||'')]){
      const key=imageFilenameKey(raw);
      if(!key)continue;
      filenameTextRows++;
      if(filenameSamples.length<12&&!filenameSamples.includes(raw))filenameSamples.push(raw);
    }
  }
  return{blockCount:Object.keys(blocks).length,imageBlocks,fileBlocks,attachmentSources,signedUrls,mediaRows,filenameTextRows,filenameSamples};
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
  await populateNotionSignedUrls(payload.recordMap,signal);
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
        return{node,rows:notionPageRows(payload.recordMap,node.id),diagnostics:notionRecordMapDiagnostics(payload.recordMap)};
      }catch(error){
        if(node.id===pageId)throw error;
        return{node,rows:[]};
      }
    }));
    for(const result of results){
      const rows=result.rows||[];
      if(!rows.length)continue;
      pages.push({id:result.node.id,depth:result.node.depth,rows,diagnostics:result.diagnostics||{}});
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
function imageFilenameKey(value=''){
  const raw=String(value||'').trim();
  if(!/\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?.*)?$/i.test(raw))return'';
  return raw.split(/[\\/]/).pop().replace(/\?.*$/,'').trim().toLowerCase();
}
function notionStructuredSections(pages=[]){
  const out=[];
  for(const page of pages){
    const rows=Array.isArray(page?.rows)?page.rows:[];if(!rows.length)continue;
    const root=rows[0]||{},blocks=[];
    const mediaByFilename=new Map();
    for(const row of rows){
      const key=imageFilenameKey(row?.media?.filename);
      if(key&&!mediaByFilename.has(key))mediaByFilename.set(key,row.media);
    }
    const usedMedia=new Set();
    let current={title:String(root.text||'').trim()||'본문',lines:[],images:[],content:[]};
    const addImage=image=>{
      if(!image)return;
      const id=String(image.originalId||image.src||image.filename||'');
      if(id&&usedMedia.has(id))return;
      if(id)usedMedia.add(id);
      const normalized={...image,provider:'notion'};
      current.images.push(normalized);
      current.content.push({type:'image',image:normalized});
    };
    const push=()=>{
      if(current.title||current.lines.length||current.images.length||current.content.length)blocks.push({
        title:current.title||'본문',
        lines:current.lines.slice(0,200),
        text:current.lines.join('\n').slice(0,12000),
        images:current.images.slice(0,18),
        content:current.content.slice(0,240)
      });
    };
    for(const row of rows.slice(1)){
      if(['header','sub_header','sub_sub_header'].includes(row.type)&&row?.text){
        push();current={title:String(row.text).trim(),lines:[],images:[],content:[]};continue;
      }
      if(row?.media){addImage(row.media);continue}
      const rowText=String(row?.text||'').trim();
      if(!rowText)continue;
      const filenameKey=imageFilenameKey(rowText);
      const matchedMedia=filenameKey?mediaByFilename.get(filenameKey):null;
      if(matchedMedia){addImage(matchedMedia);continue}
      current.lines.push(rowText);
      current.content.push({type:'text',text:rowText});
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
  const mediaDiagnostics=pages.reduce((acc,page)=>{
    const row=page.diagnostics||{};
    for(const key of ['blockCount','imageBlocks','fileBlocks','attachmentSources','signedUrls','mediaRows','filenameTextRows'])acc[key]=(acc[key]||0)+Number(row[key]||0);
    for(const value of row.filenameSamples||[])if(acc.filenameSamples.length<20&&!acc.filenameSamples.includes(value))acc.filenameSamples.push(value);
    return acc;
  },{blockCount:0,imageBlocks:0,fileBlocks:0,attachmentSources:0,signedUrls:0,mediaRows:0,filenameTextRows:0,filenameSamples:[]});
  return{
    url:url.toString(),title:String(root.text||readTitle(html)||'').slice(0,200),
    description:bodyText.slice(0,500),
    image:structuredSections.flatMap(section=>section.blocks||[]).flatMap(block=>block.images||[])[0]?.src||'',
    pageId,
    outline:outline.slice(0,300),contentText:bodyText,pageCount:pages.length,sectionCount:structuredSections.length,sections:structuredSections,
    mediaDiagnostics,strategy:'notion-record-map-recursive-with-media'
  };
}
function isNamuSourceUrl(value=''){
  try{const host=new URL(String(value||'')).hostname.toLowerCase();return host==='namu.wiki'||host==='www.namu.wiki'}catch{return false}
}
function htmlAbsoluteUrl(value='',base=''){
  try{return new URL(decodeHtml(String(value||'')),base).toString()}catch{return''}
}
function htmlPlainText(value=''){
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
function htmlAttr(tag='',name=''){
  const re=new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])([\\s\\S]*?)\\1","i");
  return decodeHtml((String(tag).match(re)||[])[2]||'').trim();
}
function cleanNamuHeading(value=''){
  return htmlPlainText(value).replace(/\[[0-9]+\]/g,'').replace(/\s*\[편집\]\s*$/,'').replace(/^\d+(?:\.\d+)*\.\s*/,'').trim().slice(0,180);
}
function namuImageFromTag(tag='',pageUrl=''){
  const raw=htmlAttr(tag,'data-src')||htmlAttr(tag,'src')||htmlAttr(tag,'data-original');
  if(!raw||/^data:/i.test(raw))return null;
  const alt=htmlAttr(tag,'alt').replace(/^파일:/,'').trim();
  const title=htmlAttr(tag,'title').replace(/^파일:/,'').trim();
  const filename=alt||title;
  if(/(?:상세 내용|관련 문서|상위 문서|편집|접기|펼치기|아이콘|favicon|logo|프로필 기본|external link)/i.test(filename))return null;
  try{
    const parsed=new URL(raw.startsWith('//')?'https:'+raw:raw,pageUrl);
    const host=parsed.hostname.toLowerCase();
    if(parsed.protocol!=='https:'||!['namu.wiki','www.namu.wiki','i.namu.wiki'].includes(host))return null;
    const src=parsed.toString();
    return{
      src,alt:filename||'나무위키 자료 이미지',caption:filename||'나무위키 자료 이미지',
      filename,provider:'namuwiki',assetState:'remote'
    };
  }catch{return null}
}
function extractNamuStructured(html='',sourceUrl=''){
  const source=String(html||'');
  const headingMatches=[...source.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const ranges=headingMatches.length?headingMatches.map((match,index)=>({
    title:cleanNamuHeading(match[2])||'본문',
    start:(match.index||0)+match[0].length,
    end:index+1<headingMatches.length?(headingMatches[index+1].index||source.length):source.length
  })):[{title:'본문',start:0,end:source.length}];
  const sections=[];
  for(const [index,range] of ranges.entries()){
    const segment=source.slice(range.start,range.end);
    const images=[],seen=new Set();
    for(const match of segment.matchAll(/<img\b[^>]*>/gi)){
      const image=namuImageFromTag(match[0],sourceUrl);
      if(!image||seen.has(image.src))continue;
      seen.add(image.src);images.push(image);
      if(images.length>=10)break;
    }
    const text=cleanGuideText(htmlPlainText(segment).replace(/최근 수정 시각\s*:\s*[^\n]+/g,''),'namuwiki').slice(0,6000);
    if(!text&&!images.length)continue;
    const content=[];
    if(text)content.push({type:'text',text});
    for(const image of images)content.push({type:'image',image});
    sections.push({
      id:'namuwiki-'+String(index+1).padStart(2,'0'),
      title:range.title||'본문',text,images,content,provider:'namuwiki',depth:0
    });
    if(sections.length>=64)break;
  }
  const allImages=sections.flatMap(row=>row.images||[]);
  return{sections,images:allImages.slice(0,100),contentText:sections.map(row=>[row.title,row.text].filter(Boolean).join('\n')).join('\n\n').slice(0,60000)};
}
function fetchNamuMeta(url,html){
  const structured=extractNamuStructured(html,url.toString());
  const imageRaw=readMeta(html,'og:image')||structured.images[0]?.src||'';
  return{
    url:url.toString(),title:readTitle(html).slice(0,200)||'나무위키 · 레오펠',
    description:(readMeta(html,'og:description')||structured.contentText).slice(0,500),
    image:imageRaw,sections:structured.sections,images:structured.images,contentText:structured.contentText,
    pageCount:1,sectionCount:structured.sections.length,strategy:'namuwiki-structured-with-media'
  };
}
function namuReadTransportUrl(){return null}
async function fetchNamuSourceMeta(sourceUrl,{signal}={}){
  const source=sourceUrl instanceof URL?sourceUrl:new URL(String(sourceUrl||''));
  const response=await fetch(source,{redirect:'follow',signal,headers:{...SOURCE_BROWSER_HEADERS,Referer:'https://namu.wiki/'}});
  const html=(await response.text()).slice(0,2000000);
  if(response.ok)return fetchNamuMeta(source,html);
  if([403,429].includes(response.status))throw new Error('source_meta_namuwiki_browser_required');
  throw new Error('source_meta_fetch_'+response.status);
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
    if(isNamuSourceUrl(url.toString()))return await fetchNamuSourceMeta(url,{signal:controller.signal});
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:SOURCE_BROWSER_HEADERS});
    const html=(await response.text()).slice(0,2000000);
    if(!response.ok)throw new Error('source_meta_fetch_'+response.status);
    const contentType=String(response.headers.get('content-type')||'');
    if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))throw new Error('source_meta_not_html');
    const finalUrl=new URL(response.url||url.toString());
    if(isNotionHost(finalUrl.hostname))return await fetchNotionMeta(finalUrl,html,{signal:controller.signal});
    if(isNamuSourceUrl(finalUrl.toString()))return fetchNamuMeta(finalUrl,html);
    const imageRaw=readMeta(html,'og:image')||readMeta(html,'twitter:image')||readMeta(html,'twitter:image:src');
    let image='';if(imageRaw){try{image=new URL(imageRaw,finalUrl).toString()}catch{}}
    const description=readMeta(html,'og:description')||readMeta(html,'description');
    const title=readTitle(html).slice(0,200);
    const publishedDate=readPublishedDate(html);
    if((isSoopStationPost(finalUrl)||/^(?:m\.)?cafe\.naver\.com$/.test(finalUrl.hostname))&&!title&&/(?:\/_next\/static\/|__next|__APOLLO_STATE__)/i.test(html))throw new Error('source_meta_client_render_required');
    return{url:finalUrl.toString(),title,description:description.slice(0,500),image,publishedDate,strategy:'html-meta'};
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
function syntheticArchiveVisual(src=''){
  const value=String(src||'');
  return /^\/assets\/chunbong-contents\//.test(value)||/\.svg(?:\?|$)/i.test(value);
}
function publicVisualSource(item={},sourceId=''){
  if(!sourceId)return true;
  const source=(item.sources||[]).find(row=>row.id===sourceId);
  return !source||source.visibility!=='internal';
}
function promoteOfficialHero(raw={}){
  const item=normalizeArchiveItem(raw);
  if(item.heroImage?.src&&!syntheticArchiveVisual(item.heroImage.src))return item;
  const gallery=(item.gallery||[]).find(row=>/^https:\/\//i.test(row.src||'')&&publicVisualSource(item,row.sourceId));
  const timeline=(item.timeline||[]).find(row=>row.visibility!=='internal'&&/^https:\/\//i.test(row.thumbnail||'')&&publicVisualSource(item,row.sourceId));
  const media=(item.media||[]).find(row=>row.visibility!=='internal'&&/^https:\/\//i.test(row.thumbnail||'')&&publicVisualSource(item,row.sourceId));
  const candidate=gallery?{src:gallery.src,alt:gallery.alt||gallery.caption||item.title,sourceId:gallery.sourceId||''}
    :timeline?{src:timeline.thumbnail,alt:timeline.title||item.title,sourceId:timeline.sourceId||''}
    :media?{src:media.thumbnail,alt:media.title||item.title,sourceId:media.sourceId||''}:null;
  if(candidate)item.heroImage=candidate;
  return item;
}
function publicRows(rows=[]){
  return rows.map(normalizeArchiveItem).map(promoteOfficialHero).map(applyArchivedNotionGuideAssets)
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
function rowIdentity(row={}){
  const url=String(row.url||row.src||'').replace(/\/$/,'').trim();
  if(url)return'url:'+url;
  if(row.id)return'id:'+String(row.id);
  if(row.number)return'number:'+String(row.number);
  if(row.title)return'title:'+String(row.title);
  return JSON.stringify(row);
}
function mergeCollections(seedRows=[],storedRows=[],mergeRow=(seedRow,storedRow)=>({...storedRow,...seedRow})){
  const storedByKey=new Map((storedRows||[]).map(row=>[rowIdentity(row),row]));
  const used=new Set(),out=[];
  for(const seedRow of seedRows||[]){
    const key=rowIdentity(seedRow),storedRow=storedByKey.get(key);
    out.push(storedRow?mergeRow(seedRow,storedRow):seedRow);used.add(key);
  }
  for(const storedRow of storedRows||[]){
    const key=rowIdentity(storedRow);if(used.has(key))continue;out.push(storedRow);used.add(key);
  }
  return out;
}
function mergeCollectionsByIdFirst(seedRows=[],storedRows=[],mergeRow=(seedRow,storedRow)=>({...storedRow,...seedRow})){
  const storedById=new Map((storedRows||[]).filter(row=>row?.id).map(row=>[String(row.id),row]));
  const storedByKey=new Map((storedRows||[]).map(row=>[rowIdentity(row),row]));
  const usedIds=new Set(),usedKeys=new Set(),out=[];
  for(const seedRow of seedRows||[]){
    const id=seedRow?.id?String(seedRow.id):'';
    const key=rowIdentity(seedRow);
    const storedRow=(id&&storedById.get(id))||storedByKey.get(key);
    out.push(storedRow?mergeRow(seedRow,storedRow):seedRow);
    if(id)usedIds.add(id);
    usedKeys.add(key);
    if(storedRow)usedKeys.add(rowIdentity(storedRow));
  }
  for(const storedRow of storedRows||[]){
    const id=storedRow?.id?String(storedRow.id):'';
    const key=rowIdentity(storedRow);
    if((id&&usedIds.has(id))||usedKeys.has(key))continue;
    out.push(storedRow);
    if(id)usedIds.add(id);
    usedKeys.add(key);
  }
  return out;
}
function mergeCuratedMaterial(seedRow={},storedRow={}){
  const seedTitle=String(seedRow.title||'');
  const useStoredTitle=!seedTitle||autoIngest.genericTitle(seedTitle);
  const date=seedRow.date||storedRow.date||'';
  return{
    ...storedRow,...seedRow,
    title:useStoredTitle?(storedRow.title||seedTitle):seedTitle,
    date,
    datePrecision:date?(seedRow.date?seedRow.datePrecision:(storedRow.datePrecision||seedRow.datePrecision||'day')):(seedRow.datePrecision||storedRow.datePrecision||'unknown'),
    thumbnail:seedRow.thumbnail||storedRow.thumbnail||'',
    note:seedRow.note||storedRow.note||'',
    url:seedRow.url||storedRow.url||'',
    sourceId:seedRow.sourceId||storedRow.sourceId||'',
    visibility:seedRow.visibility==='internal'?'internal':(storedRow.visibility||seedRow.visibility||'public')
  };
}
function mergeCuratedSource(seedRow={},storedRow={}){
  return{...storedRow,...seedRow,visibility:seedRow.visibility==='internal'?'internal':(storedRow.visibility||seedRow.visibility||'public')};
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
    if(seeded){
      if(seeded.seriesSessions?.length)item.seriesSessions=mergeCollections(seeded.seriesSessions,item.seriesSessions,(seedRow,storedRow)=>({...storedRow,...seedRow,poster:seedRow.poster?.src?seedRow.poster:(storedRow.poster||seedRow.poster)}));
      const groupTotal=groups=>(groups||[]).reduce((sum,row)=>sum+(Array.isArray(row?.participants)?row.participants.length:Number(row?.count)||0),0);
      if(seeded.participantGroups?.length&&(!item.participantGroups.length||groupTotal(seeded.participantGroups)>groupTotal(item.participantGroups)))item.participantGroups=seeded.participantGroups;
      if(Number(seeded.participantCount)>0&&!Number(item.participantCount))item.participantCount=Number(seeded.participantCount);
      if((seeded.participants||[]).length>(item.participants||[]).length)item.participants=seeded.participants;
      if((seeded.participantProfiles||[]).length)item.participantProfiles=seeded.participantProfiles;
      if(seeded.series?.id){
        const storedSeries=item.series||{};
        item.series={...storedSeries,...seeded.series,cover:seeded.series?.cover?.src?seeded.series.cover:(storedSeries.cover||seeded.series?.cover||null)};
      }
      item.sources=mergeCollections(seeded.sources,item.sources,mergeCuratedSource);
      const knownSourceIds=new Set((item.sources||[]).map(row=>String(row.id||'')).filter(Boolean));
      item.participantGroups=(item.participantGroups||[]).filter(row=>!row.sourceId||knownSourceIds.has(String(row.sourceId||'')));
      if(seeded.id==='justserver-moneygame')item.participants=[...(seeded.participants||[])];
      item.timeline=mergeCollections(seeded.timeline,item.timeline,mergeCuratedMaterial);
      item.media=mergeCollections(seeded.media,item.media,mergeCuratedMaterial);
      item.gallery=mergeCollectionsByIdFirst(seeded.gallery,item.gallery,(seedRow,storedRow)=>({...storedRow,...seedRow}));
      item.knowledgeSections=mergeCollectionsByIdFirst(seeded.knowledgeSections,item.knowledgeSections,(seedRow,storedRow)=>({...storedRow,...seedRow}));
      item.referenceSections=mergeCollectionsByIdFirst(seeded.referenceSections,item.referenceSections,(seedRow,storedRow)=>({
        ...storedRow,...seedRow,
        images:seedRow.images?.length?seedRow.images:(storedRow.images||[]),
        content:seedRow.content?.length?seedRow.content:(storedRow.content||[])
      }));
      const seededGalleryKeys=new Set((seeded.gallery||[]).map(rowIdentity));
      const hasCuratedExternalGallery=(seeded.gallery||[]).some(row=>/^https:\/\//i.test(String(row.src||'')));
      if(hasCuratedExternalGallery)item.gallery=item.gallery.filter(row=>!syntheticArchiveVisual(row.src)||seededGalleryKeys.has(rowIdentity(row)));
      item.results=mergeCollections(seeded.results,item.results,(seedRow,storedRow)=>({...storedRow,...seedRow}));
      if(['justserver-moneygame','leopel'].includes(seeded.id)){
        item.description=seeded.description||item.description;
        item.participantCount=Number(seeded.participantCount||item.participantCount||0);
        item.participants=[...(seeded.participants||[])];
        item.participantGroups=[...(seeded.participantGroups||[])];
        item.results=[...(seeded.results||[])];
      }
      if(seeded.id==='psy-emotion-song-contest-1'){
        item.startDate=seeded.startDate||item.startDate;
        item.endDate=seeded.endDate||item.endDate;
        item.datePrecision=seeded.datePrecision||item.datePrecision;
        item.summary=seeded.summary||item.summary;
        item.description=seeded.description||item.description;
        item.results=[...(seeded.results||[])];
      }
      const seededHero=String(seeded.heroImage?.src||''),storedHero=String(item.heroImage?.src||'');
      if(seededHero&&(!syntheticArchiveVisual(seededHero)||!storedHero||syntheticArchiveVisual(storedHero)))item.heroImage=seeded.heroImage;
    }
    applyCuratedVisibility(item,seeded);
    applyCuratedReferenceScope(item);
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
function compactPublicArchiveListItem(item={}){
  return {
    ...item,
    participantProfiles:(item.participantProfiles||[]).filter(row=>row?.rpName||(row?.aliases||[]).length)
  };
}
async function handlePublicList(req,res){
  const items=(await storedRows()).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate))||a.title.localeCompare(b.title,'ko')).map(compactPublicArchiveListItem);
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
  return mergeArchiveRows(withoutHidden(seed.items||[],allHidden),withoutHidden(published,allHidden).concat(withoutHidden(drafts,allHidden))).map(applyArchivedNotionGuideAssets);
}

async function autoSyncState(){
  if(!hasRedis())return{last:null,candidates:[]};
  const [lastRaw,candidateRaw]=await Promise.all([
    redisCommand('GET',AUTO_LAST_KEY).catch(()=>null),
    redisCommand('GET',AUTO_CANDIDATES_KEY).catch(()=>null)
  ]);
  return{last:parseJson(lastRaw),candidates:parseJson(candidateRaw)||[]};
}
function isNotionSourceUrl(value=''){
  try{return isNotionHost(new URL(String(value||'')).hostname)}catch{return false}
}
function isBngtsSourceUrl(value=''){
  try{
    const host=new URL(String(value||'')).hostname;
    return host==='bngts.com'||host==='www.bngts.com';
  }catch{return false}
}
function applyBngtsParticipantSnapshot(item={},source={},meta={}){
  const participants=[...new Set((Array.isArray(meta.participants)?meta.participants:[]).map(v=>String(v||'').trim()).filter(Boolean))];
  if(!participants.length)return false;
  // 머니게임의 방통실 659명에는 섭주 춘봉 1명이 포함된다.
  // 공개 참가자 수는 섭주를 제외한 658명을 기준으로 하며, 1차 입주 243명 그룹은 별도 기록으로 보존한다.
  if(item.id==='justserver-moneygame'){
    const sourceCount=Number(meta.participantCount||participants.length);
    const nextCount=Math.max(0,Math.floor(sourceCount)-1);
    if(!nextCount)return false;
    const changed=Number(item.participantCount||0)!==nextCount;
    item.participantCount=nextCount;
    return changed;
  }
  const groupId='internal-reference-'+String(source.id||'bngts').replace(/[^a-zA-Z0-9가-힣-]+/g,'-').slice(0,90);
  const groups=Array.isArray(item.participantGroups)?item.participantGroups:[];
  const index=groups.findIndex(row=>row.id===groupId||String(row.sourceId||'')===String(source.id||''));
  const next={id:groupId,title:'참가 스트리머',platform:'SOOP',participants,count:participants.length,sourceId:String(source.id||''),note:'자동 수집 참조 자료'};
  if(index>=0){
    const before=JSON.stringify(groups[index]);
    groups[index]=next;item.participantGroups=groups;
    return before!==JSON.stringify(next);
  }
  // 이미 더 직접적인 참가자 그룹이 있으면 중복 노출을 만들지 않고 수집/검증만 수행한다.
  if(groups.length)return false;
  item.participantGroups=[...groups,next];
  if(!(item.participants||[]).length)item.participants=[...participants];
  return true;
}
async function refreshInternalReferenceSources(rows=[]){
  const jobs=[];
  for(const item of rows){
    for(const source of item.sources||[]){
      if(isBngtsSourceUrl(source.url))jobs.push({item,source});
    }
  }
  const fetched=await Promise.all(jobs.map(async job=>{
    try{return{...job,ok:true,meta:await fetchSourceMeta(job.source.url)}}
    catch(error){return{...job,ok:false,error:String(error?.message||'reference_sync_failed')}}
  }));
  const changedIds=new Set(),details=[],failures=[];
  for(const row of fetched){
    if(!row.ok){failures.push({itemId:row.item.id,sourceId:row.source.id||'',error:row.error});continue}
    const meta=row.meta||{};
    const changed=applyBngtsParticipantSnapshot(row.item,row.source,meta);
    if(changed)changedIds.add(row.item.id);
    details.push({itemId:row.item.id,sourceId:row.source.id||'',sourceParticipantCount:Number(meta.participantCount||0),effectiveParticipantCount:Number(row.item.participantCount||0),strategy:meta.strategy||'html-meta'});
  }
  return{rows,changedIds:[...changedIds],details,failures};
}
function cloudinaryArchiveConfig(){
  const direct={cloudName:String(process.env.CLOUDINARY_CLOUD_NAME||''),apiKey:String(process.env.CLOUDINARY_API_KEY||''),apiSecret:String(process.env.CLOUDINARY_API_SECRET||'')};
  if(direct.cloudName&&direct.apiKey&&direct.apiSecret)return direct;
  const raw=String(process.env.CLOUDINARY_URL||'');
  const match=raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)\/?$/);
  return match?{apiKey:decodeURIComponent(match[1]),apiSecret:decodeURIComponent(match[2]),cloudName:decodeURIComponent(match[3])}:null;
}
function cloudinaryArchiveKey(media={}){
  if(media.originalId)return String(media.originalId).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  const raw=String(media.originUrl||media.sourceUrl||media.src||'');
  let canonical=raw;try{const u=new URL(raw);u.search='';u.hash='';canonical=u.toString()}catch{}
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0,32);
}
function cloudinarySign(params={},secret=''){
  const payload=Object.entries(params).filter(([,value])=>value!==''&&value!==undefined&&value!==null).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>key+'='+value).join('&');
  return crypto.createHash('sha1').update(payload+secret).digest('hex');
}
async function probeGuideSource(media={}){
  const src=String(media?.src||'');if(!src)return{ok:false,status:0,host:'',reason:'missing_src'};
  let parsed=null;try{parsed=new URL(src)}catch{return{ok:false,status:0,host:'',reason:'invalid_url'}}
  if(parsed.protocol!=='https:')return{ok:false,status:0,host:parsed.hostname||'',reason:'non_https'};
  const isNamuHost=parsed.hostname==='file.namu.moe'||parsed.hostname==='namu.moe'||parsed.hostname.endsWith('.namu.moe')||parsed.hostname==='namu.wiki'||parsed.hostname.endsWith('.namu.wiki');
  const isNotionHost=/notion|amazonaws\.com$|notionusercontent\.com$/.test(parsed.hostname);
  const headers={...SOURCE_BROWSER_HEADERS,Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',...(isNamuHost?{Referer:'https://namu.wiki/'}:isNotionHost?{Referer:'https://www.notion.so/'}:{})};
  try{
    const response=await fetch(src,{redirect:'follow',headers});
    const contentType=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    const contentLength=Number(response.headers.get('content-length')||0);
    let bytes=0;
    if(response.ok&&(!contentType||contentType.startsWith('image/'))&&contentLength<=12*1024*1024){
      const buffer=await response.arrayBuffer();bytes=buffer.byteLength;
    }else{try{await response.body?.cancel?.()}catch{}}
    return{ok:response.ok,status:response.status,host:parsed.hostname,contentType,contentLength,bytes,reason:response.ok?'':('http_'+response.status)};
  }catch(error){return{ok:false,status:0,host:parsed.hostname,contentType:'',contentLength:0,bytes:0,reason:String(error?.name||error?.message||'fetch_failed')}}
}
async function archiveGuideUploadFile(media={}){
  const src=String(media?.src||'');if(!src)return'';
  let parsed=null;try{parsed=new URL(src)}catch{return src}
  if(!/^https:$/.test(parsed.protocol))return src;
  try{
    const isNamuHost=parsed.hostname==='file.namu.moe'||parsed.hostname==='namu.moe'||parsed.hostname.endsWith('.namu.moe')||parsed.hostname==='namu.wiki'||parsed.hostname.endsWith('.namu.wiki');
    const isNotionHost=/notion|amazonaws\.com$|notionusercontent\.com$/.test(parsed.hostname);
    const headers={...SOURCE_BROWSER_HEADERS,Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',...(isNamuHost?{Referer:'https://namu.wiki/'}:isNotionHost?{Referer:'https://www.notion.so/'}:{})};
    const response=await fetch(src,{redirect:'follow',headers});
    if(!response.ok)return src;
    const contentType=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(contentType&&!contentType.startsWith('image/'))return src;
    const contentLength=Number(response.headers.get('content-length')||0);
    if(contentLength>12*1024*1024)return src;
    const bytes=await response.arrayBuffer();
    if(!bytes.byteLength||bytes.byteLength>12*1024*1024)return src;
    const fallbackName=parsed.pathname.split('/').filter(Boolean).pop()||'reference-image';
    const filename=String(media.filename||media.alt||fallbackName).replace(/[\\/:*?"<>|]+/g,'-').slice(0,120)||'reference-image';
    return new File([bytes],filename,{type:contentType||'application/octet-stream'});
  }catch{return src}
}
async function persistArchiveGuideImage(media={},itemId='content',namespace='notion'){
  const src=String(media?.src||'');if(!src||/res\.cloudinary\.com/i.test(src))return media;
  const config=cloudinaryArchiveConfig();if(!config)return media;
  const publicId=cloudinaryArchiveKey(media);if(!publicId)return media;
  const safeNamespace=String(namespace||'notion').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'notion';
  const safeItem=String(itemId||'content').toLowerCase().replace(/[^a-z0-9가-힣-]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'content';
  const folder='chunbong-fansite/'+safeNamespace+'/'+safeItem;
  const timestamp=Math.floor(Date.now()/1000);
  const signed={folder,overwrite:'true',public_id:publicId,timestamp:String(timestamp),unique_filename:'false'};
  const form=new FormData();
  form.set('file',await archiveGuideUploadFile(media));form.set('api_key',config.apiKey);
  for(const [key,value] of Object.entries(signed))form.set(key,String(value));
  form.set('signature',cloudinarySign(signed,config.apiSecret));
  try{
    const response=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(config.cloudName)+'/image/upload',{method:'POST',body:form});
    if(!response.ok)return media;
    const payload=await response.json();const permanent=String(payload?.secure_url||'');
    return permanent?{...media,src:permanent,originUrl:media.originUrl||src,sourceUrl:media.sourceUrl||'',provider:media.provider||namespace,permanent:true,assetState:'permanent',assetId:String(payload?.asset_id||''),publicId:String(payload?.public_id||'')} : media;
  }catch{return media}
}
function ephemeralNotionAssetUrl(value=''){
  try{
    const url=new URL(String(value||'')),host=url.hostname.toLowerCase();
    return host==='file.notion.so'||host.endsWith('.notionusercontent.com')||host.endsWith('.amazonaws.com')||(/notion\.so$/.test(host)&&/signature|expiration/i.test(url.search));
  }catch{return false}
}
const ARCHIVED_NOTION_GUIDE_BLOCKS=new Set([
  '388d57d6-a55c-80cb-aab5-c535acf7b750',
  '38dd57d6-a55c-8023-b780-fb02b0826d16',
  '38dd57d6-a55c-803d-b7c1-c77dd96d067e',
  '388d57d6-a55c-804e-8c15-ed8f5c4f85fe',
  '388d57d6-a55c-80a0-8ea9-dcaf545d5ebb',
  '388d57d6-a55c-8082-b222-dca8d0c4b504',
  '388d57d6-a55c-80e5-b0f1-f5dc13755a54',
  '388d57d6-a55c-8003-97b0-e1f92396d4e4',
  '388d57d6-a55c-80d3-b2d3-eaaafca2192e',
  '388d57d6-a55c-80af-94e7-e9370aa1cfe4',
  '388d57d6-a55c-8084-895b-ecaf0d25715c',
  '388d57d6-a55c-8012-b944-daf4f4c53861',
  '388d57d6-a55c-8088-abcb-d3ab75396014',
  '389d57d6-a55c-802e-a6ef-ce94de4de0e7',
  '38cd57d6-a55c-802f-a429-e2c032448839',
  '389d57d6-a55c-8063-a670-fca9a6b5b295',
  '389d57d6-a55c-801d-89c5-cb9e8fc06c4d',
  '389d57d6-a55c-80d1-a66a-ce5773532948',
  '38fd57d6-a55c-8004-8e47-cacb09601b4c',
  '38ed57d6-a55c-8052-9a20-e7b3db64e2b6',
  '389d57d6-a55c-8042-a813-caa67e7eefa4',
  '389d57d6-a55c-80b4-8036-fa6f27ad20b3',
  '38fd57d6-a55c-8014-b0f1-df14129cfad6',
  '3e0d57d6-a55c-801b-838f-e11ff9bec12e',
  '3e0d57d6-a55c-805f-95e6-fdb3e2874eff',
  '3e0d57d6-a55c-800d-b3fc-d0157cd64784',
  '3e0d57d6-a55c-80fc-85b4-fc83e8d76fb9',
  '3e2d57d6-a55c-802b-976b-e763cdb08e1d',
  '3e0d57d6-a55c-80d9-8a9d-e80e1e30c4e2',
  '3e0d57d6-a55c-80be-ba75-c17070d92e2b',
  '3e0d57d6-a55c-8027-8fbd-c1e3d04a52f5',
  '3e0d57d6-a55c-801f-ad27-c585cf040cf9',
  '3e0d57d6-a55c-80fe-a1d6-d48b68845729',
  '3e0d57d6-a55c-80b1-a908-ca79d9f68297',
  '3e0d57d6-a55c-8036-bba0-fd503200cbc4',
  '3e0d57d6-a55c-8035-8b1a-f165b89ccc36',
  '3e0d57d6-a55c-8080-92bb-f7fd4e436f85',
  '3e0d57d6-a55c-80f4-983e-d4a360077c63',
  '3e0d57d6-a55c-8000-8222-cce1c544f0cc',
  '3e0d57d6-a55c-803a-b40b-c5b3b7b32795',
  '3e0d57d6-a55c-8083-a827-d35b2ae5e320',
  '3e0d57d6-a55c-8012-ae17-cfe6b1a2d5d8',
  '3e0d57d6-a55c-8075-9992-dba3e362eb46'
]);
const ARCHIVED_NOTION_GUIDE_BASE='https://res.cloudinary.com/lyppgyei/image/upload/chunbong-fansite/notion-guides/';
function archivedNotionGuideAsset(media={}){
  const block=String(media?.originalId||'').trim();
  if(!ARCHIVED_NOTION_GUIDE_BLOCKS.has(block))return null;
  const publicId='chunbong-fansite/notion-guides/'+block;
  return{...media,src:ARCHIVED_NOTION_GUIDE_BASE+block,permanent:true,assetState:'permanent',assetId:'cloudinary:notion:'+block,publicId,provider:'notion'};
}
function applyArchivedNotionGuideAssets(item={}){
  const mapImage=image=>archivedNotionGuideAsset(image)||image;
  return{...item,notionSections:(Array.isArray(item.notionSections)?item.notionSections:[]).map(row=>({
    ...row,
    images:(row.images||[]).map(mapImage),
    content:(row.content||[]).map(block=>block?.type==='image'?{...block,image:mapImage(block.image||{})}:block)
  }))};
}
function notionGuideImageProxyUrl(media={}){
  const block=String(media.originalId||'').trim(),source=String(media.attachmentSource||'').trim();
  if(!/^[0-9a-f-]{32,36}$/i.test(block)||!/^attachment:/i.test(source))return'';
  const params=new URLSearchParams({block,source});
  const space=String(media.spaceId||'').trim(),table=String(media.parentTable||'block').trim();
  if(space)params.set('space',space);
  if(table)params.set('table',table);
  return'/api/content?type=notion-guide-image&'+params.toString();
}
async function notionSignedImageUrl({block='',source='',space='',table='block'}={}){
  if(!/^[0-9a-f-]{32,36}$/i.test(String(block))||!/^attachment:/i.test(String(source)))throw new Error('invalid_notion_image_ref');
  const response=await fetch('https://www.notion.so/api/v3/getSignedFileUrls',{
    method:'POST',
    headers:{'User-Agent':SOURCE_BROWSER_HEADERS['User-Agent'],'Accept':'application/json','Content-Type':'application/json','Origin':'https://www.notion.so','Referer':'https://www.notion.so/'},
    body:JSON.stringify({urls:[{url:String(source),permissionRecord:{id:String(block),table:String(table||'block').slice(0,30),spaceId:String(space||'').slice(0,80)}}]})
  });
  if(!response.ok)throw new Error('notion_image_sign_'+response.status);
  const payload=await response.json().catch(()=>({})),url=String((Array.isArray(payload?.signedUrls)?payload.signedUrls:[])[0]||'');
  if(!/^https:\/\//i.test(url))throw new Error('notion_image_sign_empty');
  return url;
}
async function handleNotionGuideImage(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET'){
    if(typeof res.status==='function')return res.status(405).json({error:'method_not_allowed'});
    res.statusCode=405;return res.end?.('method_not_allowed');
  }
  const requestUrl=new URL(req?.url||'/','https://archive.local');
  const block=String(requestUrl.searchParams.get('block')||''),source=String(requestUrl.searchParams.get('source')||'');
  const space=String(requestUrl.searchParams.get('space')||''),table=String(requestUrl.searchParams.get('table')||'block');
  if(!/^[0-9a-f-]{32,36}$/i.test(block)||!/^attachment:/i.test(source)||source.length>1800||space.length>120||table.length>30){
    if(typeof res.status==='function')return res.status(400).json({error:'invalid_notion_image_ref'});
    res.statusCode=400;return res.end?.('invalid_notion_image_ref');
  }
  try{
    const signedUrl=await notionSignedImageUrl({block,source,space,table});
    const response=await fetch(signedUrl,{
      redirect:'follow',
      headers:{...SOURCE_BROWSER_HEADERS,Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',Referer:'https://www.notion.so/'}
    });
    if(!response.ok)throw new Error('notion_image_fetch_'+response.status);
    const contentType=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!contentType.startsWith('image/'))throw new Error('notion_image_not_image');
    const contentLength=Number(response.headers.get('content-length')||0);
    if(contentLength>12*1024*1024)throw new Error('notion_image_too_large');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!bytes.length||bytes.length>12*1024*1024)throw new Error('notion_image_too_large');
    res.setHeader?.('Content-Type',contentType);
    res.setHeader?.('Content-Length',String(bytes.length));
    res.setHeader?.('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader?.('CDN-Cache-Control','public, max-age=604800, stale-while-revalidate=2592000');
    res.setHeader?.('Vercel-CDN-Cache-Control','public, max-age=604800, stale-while-revalidate=2592000');
    res.setHeader?.('X-Content-Type-Options','nosniff');
    if(typeof res.status==='function'&&typeof res.send==='function')return res.status(200).send(bytes);
    res.statusCode=200;return res.end?.(bytes);
  }catch(error){
    if(typeof res.status==='function')return res.status(502).json({error:String(error?.message||'notion_image_unavailable')});
    res.statusCode=502;return res.end?.('notion_image_unavailable');
  }
}
async function persistNotionImage(media={},itemId='content'){
  const archived=archivedNotionGuideAsset(media);if(archived)return archived;
  const persisted=await persistArchiveGuideImage(media,itemId,'notion');
  if(persisted?.permanent===true||/res\.cloudinary\.com/i.test(String(persisted?.src||'')))return persisted;
  if(ephemeralNotionAssetUrl(media?.src)){
    const proxy=notionGuideImageProxyUrl(media);
    return proxy?{...media,src:proxy,assetState:'proxy',permanent:false}:{...media,src:'',assetState:'remote',permanent:false};
  }
  return persisted;
}
function namuGuideImageProxyUrl(){return''}
async function handleNamuGuideImage(req,res){
  if(typeof res.status==='function')return res.status(410).json({error:'namuwiki_legacy_proxy_disabled'});
  res.statusCode=410;return res.end?.('namuwiki_legacy_proxy_disabled');
}
const CURATED_NAMU_GUIDE_ASSETS=new Map([
  ['레오펠_로고.png','https://res.cloudinary.com/lyppgyei/image/upload/v1790043451/chunbong-fansite/leopel/logo.webp']
]);
function curatedNamuGuideAsset(media={}){
  const key=String(media.filename||media.alt||media.caption||'').trim();
  const src=CURATED_NAMU_GUIDE_ASSETS.get(key)||'';
  return src?{...media,src,permanent:true,assetState:'permanent',provider:'namuwiki',assetId:'curated:'+key,publicId:''}:null;
}
async function persistReferenceImage(media={},itemId='content'){
  const curated=curatedNamuGuideAsset(media);if(curated)return curated;
  const persisted=await persistArchiveGuideImage(media,itemId,'reference');
  if(persisted?.permanent===true||/res\.cloudinary\.com/i.test(String(persisted?.src||'')))return persisted;
  try{
    const host=new URL(String(media?.src||'')).hostname.toLowerCase();
    if(host==='file.namu.moe'||host==='d.namu.moe'||host==='namu.moe'||host==='www.namu.moe')return{...media,src:'',assetState:'unavailable',permanent:false};
    if(host==='i.namu.wiki')return{...media,src:String(media.src),provider:'namuwiki',assetState:'remote',permanent:false};
  }catch{}
  return persisted;
}
function canonicalNamuGuideImage(image={}){
  const src=String(image?.src||'').trim();if(!src)return null;
  if(/res\.cloudinary\.com/i.test(src))return image;
  try{
    const url=new URL(src);
    if(url.protocol==='https:'&&url.hostname.toLowerCase()==='i.namu.wiki')return image;
  }catch{}
  return null;
}
function sanitizeStoredNamuGuideRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const images=(row.images||[]).map(canonicalNamuGuideImage).filter(Boolean);
    const content=(row.content||[]).map(block=>{
      if(block?.type!=='image')return block;
      const image=canonicalNamuGuideImage(block.image||{});return image?{...block,image}:null;
    }).filter(Boolean);
    return{...row,images,content};
  }).filter(row=>String(row?.text||'').trim()||row.images?.length||row.content?.length);
}
async function persistGuideMedia(rows=[],itemId='content',persistImage=persistNotionImage){
  const originals=new Map(),cache=new Map();
  const keyFor=media=>String(media?.originalId||media?.originUrl||media?.sourceUrl||media?.src||'');
  for(const row of rows){
    for(const media of row.images||[]){const key=keyFor(media);if(key&&media?.src&&!originals.has(key))originals.set(key,media)}
    for(const block of row.content||[]){const media=block?.type==='image'?block.image:null,key=keyFor(media);if(key&&media?.src&&!originals.has(key))originals.set(key,media)}
  }
  const entries=[...originals.entries()],workerCount=Math.min(4,entries.length);let cursor=0;
  const worker=async()=>{
    while(cursor<entries.length){
      const index=cursor++,entry=entries[index];if(!entry)continue;
      const [key,media]=entry;
      try{cache.set(key,await persistImage(media,itemId))}catch{cache.set(key,media)}
    }
  };
  if(workerCount)await Promise.all(Array.from({length:workerCount},()=>worker()));
  const persisted=media=>{if(!media||!media.src)return media;return cache.get(keyFor(media))||media};
  return rows.map(row=>({
    ...row,
    images:(row.images||[]).map(persisted),
    content:(row.content||[]).map(block=>block?.type==='image'&&block.image?{...block,image:persisted(block.image)}:block)
  }));
}
async function persistNotionGuideMedia(rows=[],itemId='content'){
  return persistGuideMedia(rows,itemId,persistNotionImage);
}
async function persistReferenceGuideMedia(rows=[],itemId='content'){
  return persistGuideMedia(rows,itemId,persistReferenceImage);
}
function decorateGuideImage(image={},source={},provider='guide'){
  const src=String(image?.src||'');
  return{
    ...image,provider,
    originUrl:String(image?.originUrl||image?.sourceUrl||src),
    sourceUrl:String(source?.url||''),
    sourceId:String(source?.id||'')
  };
}
function notionGuideRows(meta={},source={}){
  const out=[],seen=new Set();
  const sourceId=String(source.id||'');
  for(const page of Array.isArray(meta.sections)?meta.sections:[]){
    const pageId=String(page?.id||'');
    const pageTitle=String(page?.title||meta.title||'Notion 가이드').trim()||'Notion 가이드';
    const depth=Math.max(0,Number(page?.depth||0));
    for(const [index,block] of (Array.isArray(page?.blocks)?page.blocks:[]).entries()){
      const title=String(block?.title||pageTitle||'본문').replace(/\s+/g,' ').trim();
      const body=String(block?.text||'').trim().slice(0,6000);
      const images=(Array.isArray(block?.images)?block.images:[]).slice(0,18).map(image=>decorateGuideImage(image,source,'notion'));
      const content=(Array.isArray(block?.content)?block.content:[]).slice(0,240).map(entry=>entry?.type==='image'
        ?{type:'image',image:decorateGuideImage(entry.image||{},source,'notion')}
        :{type:'text',text:String(entry?.text||'').trim()}).filter(entry=>entry.type==='image'||entry.text);
      if(!title&&!body&&!images.length&&!content.length)continue;
      const key=(title+'\n'+body+'\n'+images.map(row=>row.originalId||row.originUrl||row.src||'').join('|')).toLowerCase();
      if(seen.has(key))continue;seen.add(key);
      out.push({
        id:['notion',sourceId||'source',pageId||'page',index].join('-').replace(/[^a-zA-Z0-9가-힣-]+/g,'-').slice(0,120),
        sourceId,pageId,pageTitle,title:title||'본문',text:body,images,content,provider:'notion',depth
      });
      if(out.length>=120)return out;
    }
  }
  if(!out.length&&meta.contentText){
    out.push({
      id:['notion',sourceId||'source','summary'].join('-'),
      sourceId,pageId:String(meta.pageId||''),pageTitle:String(meta.title||'Notion 가이드'),
      title:String(meta.title||'Notion 가이드'),text:String(meta.contentText||'').slice(0,6000),
      images:[],content:[],provider:'notion',depth:0
    });
  }
  return out;
}
async function refreshNotionGuides(rows=[]){
  const changedIds=new Set(),failures=[],details=[];
  for(const item of rows){
    const sources=(item.sources||[]).filter(source=>isNotionSourceUrl(source.url));
    if(!sources.length)continue;
    const previous=Array.isArray(item.notionSections)?item.notionSections:[];
    const previousBySource=new Map();
    for(const row of previous){
      const key=String(row.sourceId||'');
      if(!previousBySource.has(key))previousBySource.set(key,[]);
      previousBySource.get(key).push(row);
    }
    const next=[];
    let successCount=0;
    for(const source of sources){
      try{
        const meta=await fetchSourceMeta(source.url);
        const rawGuideRows=notionGuideRows(meta,source);
        const rawNotionImages=rawGuideRows.flatMap(row=>row.images||[]);
        const sourceProbe=rawNotionImages[0]?await probeGuideSource(rawNotionImages[0]):null;
        const guideRows=await persistNotionGuideMedia(rawGuideRows,item.id);
        next.push(...guideRows);successCount++;
        const notionImages=guideRows.flatMap(row=>row.images||[]);
        details.push({
          itemId:item.id,sourceId:source.id||'',title:meta.title||source.label||'',sectionCount:guideRows.length,pageCount:Number(meta.pageCount||0),
          imageCount:notionImages.length,
          permanentImageCount:notionImages.filter(image=>image?.permanent===true||/res\.cloudinary\.com/i.test(String(image?.src||''))).length,
          remoteImageCount:notionImages.filter(image=>image?.src&&image?.permanent!==true&&!/res\.cloudinary\.com/i.test(String(image.src))).length,
          cloudinaryConfigured:Boolean(cloudinaryArchiveConfig()),
          sourceProbe,
          mediaDiagnostics:meta.mediaDiagnostics||{}
        });
      }catch(error){
        next.push(...(previousBySource.get(String(source.id||''))||[]));
        failures.push({itemId:item.id,sourceId:source.id||'',error:String(error?.message||'notion_sync_failed')});
      }
    }
    const normalizedNext=next.slice(0,120);
    const before=JSON.stringify(previous.map(row=>({...row})));
    const after=JSON.stringify(normalizedNext);
    if(before!==after){
      item.notionSections=normalizedNext;
      item.notionSyncedAt=new Date().toISOString();
      changedIds.add(item.id);
    }else if(successCount&&normalizedNext.length&&!item.notionSyncedAt){
      item.notionSyncedAt=new Date().toISOString();
      changedIds.add(item.id);
    }
  }
  return{rows,changedIds:[...changedIds],failures,details};
}

function referenceGuideRows(meta={},source={},provider='namuwiki'){
  const sourceId=String(source.id||'');
  return (Array.isArray(meta.sections)?meta.sections:[]).slice(0,120).map((section,index)=>{
    const images=(Array.isArray(section.images)?section.images:[]).slice(0,18).map(image=>decorateGuideImage(image,source,provider));
    const content=(Array.isArray(section.content)?section.content:[]).slice(0,240).map(entry=>entry?.type==='image'
      ?{type:'image',image:decorateGuideImage(entry.image||{},source,provider)}
      :{type:'text',text:String(entry?.text||'').trim()}).filter(entry=>entry.type==='image'||entry.text);
    return{
      id:['reference',provider,sourceId||'source',section.id||index].join('-').replace(/[^a-zA-Z0-9가-힣-]+/g,'-').slice(0,120),
      sourceId,pageId:String(meta.url||source.url||''),pageTitle:String(meta.title||source.label||'참고 가이드').slice(0,180),
      title:String(section.title||'본문').slice(0,180),text:String(section.text||'').slice(0,6000),
      images,content,provider,depth:Math.max(0,Number(section.depth||0))
    };
  });
}
async function refreshReferenceGuides(rows=[]){
  const changedIds=new Set(),failures=[],details=[];
  for(const item of rows){
    const sources=(item.sources||[]).filter(source=>source.visibility!=='internal'&&isNamuSourceUrl(source.url));
    if(!sources.length)continue;
    const previous=Array.isArray(item.referenceSections)?item.referenceSections:[];
    const previousBySource=new Map();
    for(const row of previous){
      const key=String(row.sourceId||'');
      if(!previousBySource.has(key))previousBySource.set(key,[]);
      previousBySource.get(key).push(row);
    }
    const next=[];let successCount=0;
    for(const source of sources){
      try{
        const meta=await fetchSourceMeta(source.url);
        const rawGuideRows=referenceGuideRows(meta,source,'namuwiki');
        const rawReferenceImages=rawGuideRows.flatMap(row=>row.images||[]);
        const sourceProbe=rawReferenceImages[0]?await probeGuideSource(rawReferenceImages[0]):null;
        const guideRows=await persistReferenceGuideMedia(rawGuideRows,item.id);
        next.push(...guideRows);successCount++;
        const referenceImages=guideRows.flatMap(row=>row.images||[]);
        details.push({
          itemId:item.id,sourceId:source.id||'',title:meta.title||source.label||'',
          sectionCount:guideRows.length,imageCount:referenceImages.length,
          permanentImageCount:referenceImages.filter(image=>image?.permanent===true||/res\.cloudinary\.com/i.test(String(image?.src||''))).length,
          remoteImageCount:referenceImages.filter(image=>image?.src&&image?.permanent!==true&&!/res\.cloudinary\.com/i.test(String(image.src))).length,
          cloudinaryConfigured:Boolean(cloudinaryArchiveConfig()),
          sourceProbe,
          strategy:meta.strategy||'namuwiki-structured-with-media'
        });
      }catch(error){
        const errorCode=String(error?.message||'reference_guide_sync_failed');
        next.push(...sanitizeStoredNamuGuideRows(previousBySource.get(String(source.id||''))||[]));
        failures.push({itemId:item.id,sourceId:source.id||'',error:errorCode,browserRequired:errorCode==='source_meta_namuwiki_browser_required'});
      }
    }
    const normalizedNext=next.slice(0,160);
    const before=JSON.stringify(previous);
    const after=JSON.stringify(normalizedNext);
    if(before!==after){
      item.referenceSections=normalizedNext;
      item.referenceSyncedAt=new Date().toISOString();
      changedIds.add(item.id);
    }else if(successCount&&normalizedNext.length&&!item.referenceSyncedAt){
      item.referenceSyncedAt=new Date().toISOString();
      changedIds.add(item.id);
    }
  }
  return{rows,changedIds:[...changedIds],failures,details};
}

async function saveChangedArchiveRows(rows=[],changedIds=[],completedAt=new Date().toISOString(),score=Date.now()){
  const changed=new Set(changedIds);
  for(const raw of rows){
    if(!changed.has(raw.id))continue;
    const item=normalizeArchiveItem({...raw,updatedAt:completedAt});
    const key=item.published?ITEM_PREFIX:DRAFT_PREFIX;
    const index=item.published?INDEX_KEY:DRAFT_INDEX;
    await redisCommand('SET',key+item.id,JSON.stringify(item));
    await redisCommand('ZADD',index,score,item.id);
  }
}
async function refreshGuideDocumentsOnly(){
  if(!hasRedis())throw new Error('archive_storage_unavailable');
  const startedAt=new Date().toISOString(),startedMs=Date.now(),rows=await adminRows();
  const notion=await refreshNotionGuides(rows);
  const references=await refreshReferenceGuides(notion.rows);
  const changedIds=[...new Set([...notion.changedIds,...references.changedIds])];
  const completedAt=new Date().toISOString();
  await saveChangedArchiveRows(references.rows,changedIds,completedAt,startedMs);
  return{
    ok:true,status:'success',guideOnly:true,startedAt,completedAt,durationMs:Date.now()-startedMs,
    cloudinaryConfigured:Boolean(cloudinaryArchiveConfig()),
    changedItemCount:changedIds.length,
    notion:{changedItemCount:notion.changedIds.length,sourceCount:notion.details.length,failureCount:notion.failures.length,details:notion.details.slice(0,20),failures:notion.failures.slice(0,20)},
    references:{changedItemCount:references.changedIds.length,sourceCount:references.details.length,failureCount:references.failures.length,details:references.details.slice(0,20),failures:references.failures.slice(0,20)}
  };
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
    const notion=await refreshNotionGuides(applied.rows);
    const referenceGuides=await refreshReferenceGuides(notion.rows);
    const internalReferences=await refreshInternalReferenceSources(referenceGuides.rows);
    const changed=new Set([...applied.changedIds,...notion.changedIds,...referenceGuides.changedIds,...internalReferences.changedIds]);
    const completedAt=new Date().toISOString();
    await saveChangedArchiveRows(applied.rows,[...changed],completedAt,now);
    const candidates=autoIngest.mergeCandidates(state.candidates,applied.candidates);
    const summary={
      status:'success',startedAt,completedAt,lastSuccessAt:completedAt,durationMs:Date.now()-now,
      sourcePriority:['SOOP','YouTube','Notion','나무위키'],discovered:discovery.counts,scanMode:discovery.scanMode||'incremental',
      attachedCount:applied.attached.length,changedItemCount:changed.size,candidateCount:candidates.length,
      notion:{changedItemCount:notion.changedIds.length,sourceCount:notion.details.length,failureCount:notion.failures.length,details:notion.details.slice(0,20),failures:notion.failures.slice(0,20)},
      references:{changedItemCount:referenceGuides.changedIds.length,sourceCount:referenceGuides.details.length,failureCount:referenceGuides.failures.length,details:referenceGuides.details.slice(0,20),failures:referenceGuides.failures.slice(0,20)},
      internalReferences:{changedItemCount:internalReferences.changedIds.length,sourceCount:internalReferences.details.length,failureCount:internalReferences.failures.length},
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
      sourcePriority:['SOOP','YouTube','Notion','나무위키']
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
    const [auto,browserImports,liveIds]=await Promise.all([
      autoSyncState(),browserImportInboxRows(rows),redisCommand('ZRANGE',INDEX_KEY,0,199).catch(()=>[])
    ]);
    return json(res,200,{items:rows,autoSync:auto.last,candidates:auto.candidates,browserImports,liveIds:Array.isArray(liveIds)?liveIds.map(String):[]});
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
function shouldForcePublicAutoSync({githubOidc=false,migrationMarker=''}={}){
  return githubOidc===true&&String(migrationMarker||'')!=='done';
}
function explicitSameOrigin(req){
  const headers=req?.headers||{};
  const value=String(headers.origin??headers.Origin??'').trim();
  return Boolean(value)&&sameOrigin(req);
}
async function handlePublicAutoSync(req,res){
  const method=String(req?.method||'GET').toUpperCase();
  const requestUrl=new URL(req?.url||'/','https://archive.local');
  if(method==='GET'&&requestUrl.searchParams.get('migration')==='guide-media-v10'){
    if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
    const marker=String(await redisCommand('GET',AUTO_GUIDE_MEDIA_MIGRATION_KEY).catch(()=>''));
    if(marker==='done')return json(res,200,{ok:true,skipped:true,reason:'guide_media_migration_v10_complete',guideMediaMigration:true});
    const lockKey=AUTO_LOCK_KEY+':guide-media-v10',lockToken=Date.now()+'-'+Math.random().toString(36).slice(2);
    const locked=await redisCommand('SET',lockKey,lockToken,'NX','EX',180).catch(()=>null);
    if(locked!=='OK')return json(res,200,{ok:true,skipped:true,reason:'guide_media_migration_v10_locked',guideMediaMigration:true});
    try{
      const result=await refreshGuideDocumentsOnly();
      if(result?.ok&&!result?.skipped)await redisCommand('SET',AUTO_GUIDE_MEDIA_MIGRATION_KEY,'done').catch(()=>{});
      return json(res,200,{...result,guideMediaMigration:true});
    }catch(error){
      return json(res,503,{error:String(error?.message||'guide_media_migration_failed'),guideMediaMigration:true});
    }finally{
      await redisCommand('DEL',lockKey).catch(()=>{});
    }
  }
  if(method!=='POST')return json(res,405,{error:'method_not_allowed'});
  // GitHub Actions curl requests do not send Origin. Treat only an explicit
  // browser Origin as same-site so OIDC requests are actually authenticated.
  const sameSite=explicitSameOrigin(req);
  const githubOidc=sameSite?false:await pushNotifications._internals.authorizedGitHubOidc(req);
  if(!sameSite&&!githubOidc)return json(res,403,{error:'auto_sync_unauthorized'});
  const migrationMarker=githubOidc?String(await redisCommand('GET',AUTO_FULL_MIGRATION_KEY).catch(()=>'')):'done';
  const guideMigrationMarker=githubOidc?String(await redisCommand('GET',AUTO_GUIDE_MEDIA_MIGRATION_KEY).catch(()=>'')):'done';
  const force=shouldForcePublicAutoSync({githubOidc,migrationMarker});
  const refreshGuideMedia=githubOidc&&guideMigrationMarker!=='done'&&!force;
  try{
    const result=refreshGuideMedia?await refreshGuideDocumentsOnly():await autoSyncOfficialArchive({force});
    if(force&&result?.ok&&!result?.skipped)await redisCommand('SET',AUTO_FULL_MIGRATION_KEY,'done').catch(()=>{});
    if((refreshGuideMedia||force)&&result?.ok&&!result?.skipped)await redisCommand('SET',AUTO_GUIDE_MEDIA_MIGRATION_KEY,'done').catch(()=>{});
    return json(res,200,{...result,migrationFullSync:force,guideMediaMigration:refreshGuideMedia||force});
  }catch(error){return json(res,503,{error:String(error?.message||'auto_sync_unavailable')})}
}
async function handleOperatorAutoSync(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  try{return json(res,200,await autoSyncOfficialArchive({force:true}))}
  catch(error){return json(res,503,{error:String(error?.message||'auto_sync_unavailable')})}
}
function normalizeNamuBrowserImportPayload(raw={}){
  if(raw?.source!=='namuwiki-browser')return null;
  let url=null;try{url=new URL(String(raw.url||''))}catch{return null}
  if(!['namu.wiki','www.namu.wiki'].includes(url.hostname)||!url.pathname.startsWith('/w/'))return null;
  url.hash='';
  const sections=(Array.isArray(raw.sections)?raw.sections:[]).slice(0,64).map((row,index)=>{
    const title=safeText(row?.title||'본문',180)||'본문';
    const text=cleanGuideText(safeText(row?.text,12000),'namuwiki').slice(0,6000);
    const images=(Array.isArray(row?.images)?row.images:[]).slice(0,18).map(image=>{
      const value=typeof image==='string'?{src:image}:image||{};
      let parsed=null;try{parsed=new URL(String(value.src||''))}catch{return null}
      if(parsed.protocol!=='https:'||parsed.hostname!=='i.namu.wiki')return null;
      const label=safeText(value.alt||value.caption||'',220).replace(/^파일:/,'').trim();
      return{src:parsed.toString(),alt:label||'나무위키 자료 이미지',caption:label,filename:'',provider:'namuwiki',assetState:'remote',permanent:false};
    }).filter(Boolean);
    const content=[];if(text)content.push({type:'text',text});for(const image of images)content.push({type:'image',image});
    return{id:'namu-browser-'+String(index+1).padStart(2,'0'),title,text,images,content,provider:'namuwiki',depth:0};
  }).filter(row=>row.text||row.images.length);
  return{version:1,source:'namuwiki-browser',url:url.toString(),title:safeText(raw.title,200),sections,capturedAt:safeText(raw.capturedAt,40)||new Date().toISOString()};
}
function canonicalNamuUrl(value=''){
  try{const url=new URL(String(value||''));if(!['namu.wiki','www.namu.wiki'].includes(url.hostname))return'';url.hostname='namu.wiki';url.hash='';url.search='';return url.toString()}catch{return''}
}
function relevantExcerpt(text='',keywords=[]){
  const raw=String(text||''),pieces=[];
  for(const keyword of keywords){
    if(!keyword)continue;
    let start=0;
    while(start<raw.length){
      const index=raw.indexOf(keyword,start);if(index<0)break;
      pieces.push(raw.slice(Math.max(0,index-180),Math.min(raw.length,index+keyword.length+420)).replace(/\s+/g,' ').trim());
      start=index+keyword.length;
      if(pieces.length>=8)break;
    }
    if(pieces.length>=8)break;
  }
  return [...new Set(pieces.filter(Boolean))].join('\n').slice(0,2600);
}
function curatedNamuReferenceRows(item={},source={},rows=[]){
  if(item.id==='psy-emotion-song-contest-1'&&String(source.id||'')==='source-psy1-siroko'){
    const keywords=['싸이감성','노래자랑','신데렐라','시네_'];
    const excerpts=(rows||[]).map(row=>relevantExcerpt(row.text,keywords)).filter(Boolean);
    const result=(item.results||[]).find(row=>String(row?.title||'').includes('시로코'));
    const fallback=result?('시로코 참가 기록 · '+String(result.value||'')):'시로코는 싸이감성 노래자랑 제1회 참가 기록이 확인됩니다.';
    const text=[...new Set(excerpts)].join('\n').trim()||fallback;
    return[{
      id:'namu-browser-source-psy1-siroko-participation',title:'시로코 제1회 참가 기록',text,images:[],
      content:[{type:'text',text}],provider:'namuwiki',depth:0,sourceId:String(source.id||''),
      pageId:String(source.url||''),pageTitle:'시로코(인터넷 방송인)'
    }];
  }
  return rows;
}
function applyCuratedReferenceScope(item={}){
  if(item.id!=='psy-emotion-song-contest-1')return item;
  const source=(item.sources||[]).find(row=>String(row.id||'')==='source-psy1-siroko');
  if(!source)return item;
  const target=(item.referenceSections||[]).filter(row=>String(row.sourceId||'')==='source-psy1-siroko');
  if(!target.length)return item;
  const curated=curatedNamuReferenceRows(item,source,target);
  item.referenceSections=[...(item.referenceSections||[]).filter(row=>String(row.sourceId||'')!=='source-psy1-siroko'),...curated];
  return item;
}
function applyNamuBrowserImportToItem(rawItem,payload,source={}){
  const item=normalizeArchiveItem(rawItem),sourceId=String(source.id||'');
  if(!sourceId)throw new Error('namuwiki_source_not_found');
  const rawRows=(payload.sections||[]).map((row,index)=>({
    ...row,id:['namu-browser',sourceId,index+1].join('-').replace(/[^a-zA-Z0-9가-힣-]+/g,'-').slice(0,120),
    sourceId,pageId:payload.url,pageTitle:payload.title||source.label||'나무위키',
    images:(row.images||[]).map(image=>({...image,sourceId,sourceUrl:payload.url})),
    content:(row.content||[]).map(block=>block?.type==='image'&&block.image?{...block,image:{...block.image,sourceId,sourceUrl:payload.url}}:block)
  }));
  const rows=curatedNamuReferenceRows(item,source,rawRows);
  item.referenceSections=[...(item.referenceSections||[]).filter(row=>String(row.sourceId||'')!==sourceId),...rows].slice(0,160);
  item.referenceSyncedAt=new Date().toISOString();item.updatedAt=item.referenceSyncedAt;
  return applyCuratedReferenceScope(item);
}
async function handleNamuBrowserImport(body={}){
  const payload=normalizeNamuBrowserImportPayload(body.payload||{});if(!payload)return null;
  const action=String(body.action||'auto');if(!['auto','connect'].includes(action))throw new Error('invalid_namuwiki_browser_import');
  const rows=await adminRows(),canonical=canonicalNamuUrl(payload.url);
  let item=null;
  if(action==='connect')item=rows.find(row=>row.id===String(body.itemId||''));
  else item=rows.find(row=>(row.sources||[]).some(source=>canonicalNamuUrl(source.url)===canonical));
  if(!item)return{ok:true,action,matched:false,url:payload.url,imageCount:payload.sections.flatMap(row=>row.images||[]).length};
  const source=(item.sources||[]).find(row=>canonicalNamuUrl(row.url)===canonical);
  if(!source)throw new Error('namuwiki_source_not_found');
  const saved=await saveArchiveItemDirect(applyNamuBrowserImportToItem(item,payload,source));
  return{ok:true,action,matched:true,item:saved,sourceId:source.id||'',url:payload.url,sectionCount:payload.sections.length,imageCount:payload.sections.flatMap(row=>row.images||[]).length};
}
function browserImportDate(raw={}){
  const dateMatch=String(raw.date||'').match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  return dateMatch?dateMatch[1]+'-'+String(dateMatch[2]).padStart(2,'0')+'-'+String(dateMatch[3]).padStart(2,'0'):'';
}
function browserImportImages(raw={}){
  return(Array.isArray(raw.images)?raw.images:[]).map(value=>{
    try{const parsed=new URL(String(value||''));return parsed.protocol==='https:'?parsed.toString():''}catch{return''}
  }).filter(Boolean).filter((value,index,rows)=>rows.indexOf(value)===index).slice(0,24);
}
function normalizeBrowserImportPayload(raw={}){
  const source=String(raw.source||'').trim(),urlRaw=String(raw.url||'').trim();
  let url=null;try{url=new URL(urlRaw)}catch{return null}
  if(source==='fmkorea-public-browser'){
    if(!['fmkorea.com','www.fmkorea.com','m.fmkorea.com'].includes(url.hostname))return null;
    const direct=(url.pathname.match(/^\/(?:best\/)?(\d+)\/?$/)||[])[1]||'';
    const postId=String(raw.postId||direct||url.searchParams.get('document_srl')||'');
    if(!/^\d+$/.test(postId)||String(raw.access||'')!=='anonymous-verified')return null;
    return{
      version:1,source,platform:'fmkorea',public:true,postId,url:'https://www.fmkorea.com/'+postId,
      title:safeText(raw.title,240),author:safeText(raw.author,100),board:safeText(raw.board,120),
      date:browserImportDate(raw),body:safeText(raw.body,60000),images:browserImportImages(raw),
      capturedAt:safeText(raw.capturedAt,40)||new Date().toISOString()
    };
  }
  const match=['sooplive.com','www.sooplive.com'].includes(url.hostname)&&url.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);
  if(!match||source!=='soop-authenticated-browser')return null;
  url.protocol='https:';url.hostname='www.sooplive.com';url.hash='';
  const isPublic=String(raw.access||'')==='anonymous-verified';
  return{
    version:1,source,platform:'soop',public:isPublic,access:isPublic?'anonymous-verified':'authenticated',postId:match[1],url:url.toString(),
    title:safeText(raw.title,200),date:browserImportDate(raw),body:safeText(raw.body,60000),images:browserImportImages(raw),
    capturedAt:safeText(raw.capturedAt,40)||new Date().toISOString()
  };
}
function browserImportSource(payload){
  if(payload.source==='fmkorea-public-browser'){
    return{id:'source-fmk-'+payload.postId,kind:'reference',label:'FM코리아 자동 수집 내부 자료 · '+(payload.title||payload.postId),url:payload.url,visibility:'internal'};
  }
  if(payload.public)return{id:'source-soop-auth-'+payload.postId,kind:'official',label:'SOOP 공개 게시글 · '+(payload.title||payload.postId),url:payload.url,visibility:'public'};
  return{id:'source-soop-auth-'+payload.postId,kind:'official',label:'SOOP 로그인 브라우저 확인 글 · '+(payload.title||payload.postId),url:payload.url,visibility:'internal'};
}
function browserImportTimeline(payload){
  if(payload.source==='fmkorea-public-browser'){
    const source=browserImportSource(payload),meta=[payload.board,payload.author&&('작성자 '+payload.author)].filter(Boolean).join(' · ');
    return{
      id:'fmk-post-'+payload.postId,type:'post',title:payload.title||('FM코리아 공개 게시글 · '+payload.postId),
      date:payload.date,datePrecision:payload.date?'day':'unknown',url:payload.url,thumbnail:payload.images?.[0]||'',sourceId:source.id,
      note:'FM코리아 공개 게시글에서 자동 수집한 내부 검증 자료입니다.'+(meta?' · '+meta:''),
      visibility:'internal'
    };
  }
  if(payload.public){
    const source=browserImportSource(payload);
    return{id:'soop-auth-post-'+payload.postId,type:'post',title:payload.title||('SOOP 공개 게시글 · '+payload.postId),date:payload.date,datePrecision:payload.date?'day':'unknown',url:payload.url,thumbnail:payload.images?.[0]||'',sourceId:source.id,note:'SOOP에서 비로그인 상태로도 확인되는 공개 게시글입니다.',visibility:'public'};
  }
  return{
    id:'soop-auth-post-'+payload.postId,type:'post',title:payload.title||('SOOP 로그인 확인 글 · '+payload.postId),
    date:payload.date,datePrecision:payload.date?'day':'unknown',url:'',thumbnail:'',sourceId:'',
    note:'SOOP 로그인 브라우저에서 확인한 내부 검증 기록입니다. 팬사이트 일반 방문자에게는 노출하지 않습니다.',
    visibility:'internal'
  };
}
function applyBrowserImportToItem(rawItem,payload){
  const item=normalizeArchiveItem(rawItem),source=browserImportSource(payload),timeline=browserImportTimeline(payload);
  const sourceIndex=item.sources.findIndex(row=>row.id===source.id||row.url===source.url);
  if(sourceIndex<0)item.sources.push(source);else item.sources[sourceIndex]={...item.sources[sourceIndex],...source};
  const timelineIndex=item.timeline.findIndex(row=>row.id===timeline.id||String(row.url||'')===String(timeline.url||'')&&timeline.url);
  if(timelineIndex<0)item.timeline.push(timeline);
  else item.timeline[timelineIndex]={...item.timeline[timelineIndex],...timeline};
  item.updatedAt=new Date().toISOString();
  return item;
}
function browserImportRecordId(payload){
  return payload.source==='fmkorea-public-browser'?'fmkorea-'+payload.postId:payload.postId;
}
async function saveBrowserImportRecord(payload){
  const recordId=browserImportRecordId(payload),previous=parseJson(await redisCommand('GET',BROWSER_IMPORT_PREFIX+recordId).catch(()=>null))||{};
  const record={...previous,...payload,storedAt:new Date().toISOString()};
  await Promise.all([
    redisCommand('SET',BROWSER_IMPORT_PREFIX+recordId,JSON.stringify(record)),
    redisCommand('ZADD',BROWSER_IMPORT_INDEX,Date.now(),recordId)
  ]);
  return record;
}
function browserImportPublicEligible(payload={}){
  if(payload?.source==='fmkorea-public-browser')return false;
  return payload?.public===true||String(payload?.access||'')==='anonymous-verified';
}
function browserImportIdentity(payload={}){
  const source=browserImportSource(payload),timeline=browserImportTimeline(payload);
  return{sourceId:String(source?.id||''),timelineId:String(timeline?.id||'')};
}
function browserImportLinkedItem(payload={},rows=[]){
  const identity=browserImportIdentity(payload);
  return rows.find(item=>
    (item.sources||[]).some(row=>String(row.id||'')===identity.sourceId||String(row.url||'')===String(payload.url||''))||
    (item.timeline||[]).some(row=>String(row.id||'')===identity.timelineId)
  )||null;
}
function browserImportVisibility(item,payload={}){
  if(!item)return'';
  const identity=browserImportIdentity(payload);
  const source=(item.sources||[]).find(row=>String(row.id||'')===identity.sourceId||String(row.url||'')===String(payload.url||''));
  const timeline=(item.timeline||[]).find(row=>String(row.id||'')===identity.timelineId);
  return source?.visibility==='public'||timeline?.visibility==='public'?'public':'internal';
}
async function browserImportInboxRows(rows=[]){
  const ids=await redisCommand('ZREVRANGE',BROWSER_IMPORT_INDEX,0,249).catch(()=>[]);
  if(!Array.isArray(ids)||!ids.length)return[];
  const records=await Promise.all(ids.map(async recordId=>({recordId:String(recordId),record:parseJson(await redisCommand('GET',BROWSER_IMPORT_PREFIX+recordId).catch(()=>null))})));
  return records.map(({recordId,record})=>{
    const payload=normalizeBrowserImportPayload(record||{});
    if(!payload)return null;
    const linked=browserImportLinkedItem(payload,rows),visibility=browserImportVisibility(linked,payload),ignored=String(record?.managementStatus||'')==='ignored';
    const state=ignored?'ignored':linked?(visibility==='public'?'public':'internal'):'unlinked';
    return{
      recordId,source:payload.source,platform:payload.source==='fmkorea-public-browser'?'fmkorea':'soop',
      title:payload.title||'',date:payload.date||'',url:payload.url||'',storedAt:String(record?.storedAt||payload.capturedAt||''),
      access:String(payload.access||''),publicEligible:browserImportPublicEligible(payload),operatorPublicAllowed:payload.source==='soop-authenticated-browser',state,
      linkedItemId:linked?.id||'',linkedItemTitle:linked?.title||'',linkedItemPublished:linked?.published===true,
      imageCount:Array.isArray(payload.images)?payload.images.length:0,thumbnail:String(payload.images?.[0]||''),
      excerpt:safeText(payload.body,280),author:safeText(payload.author,80),board:safeText(payload.board,100),
      managedAt:String(record?.managedAt||''),managedAction:String(record?.managedAction||'')
    };
  }).filter(Boolean);
}
function applyBrowserImportWithVisibility(rawItem,payload,visibility='internal',{operatorOverride=false}={}){
  const publicAllowed=browserImportPublicEligible(payload)||(operatorOverride&&payload?.source==='soop-authenticated-browser');
  if(visibility==='public'&&!publicAllowed)throw new Error('browser_import_not_publicly_accessible');
  const item=applyBrowserImportToItem(rawItem,payload),identity=browserImportIdentity(payload);
  const source=item.sources.find(row=>String(row.id||'')===identity.sourceId||String(row.url||'')===String(payload.url||''));
  const timeline=item.timeline.find(row=>String(row.id||'')===identity.timelineId);
  if(source){
    source.visibility=visibility;
    source.url=payload.url;
    source.label=visibility==='public'?(payload.source==='fmkorea-public-browser'?'FM코리아 공개 게시글 · ':payload.public?'SOOP 공개 게시글 · ':'SOOP 애청자/로그인 제한 게시글 · ')+(payload.title||payload.postId):source.label;
  }
  if(timeline){
    timeline.visibility=visibility;
    if(visibility==='public'){
      timeline.url=payload.url;timeline.sourceId=identity.sourceId;timeline.thumbnail=payload.images?.[0]||timeline.thumbnail||'';
      timeline.note=payload.source==='fmkorea-public-browser'?'FM코리아 공개 게시글에서 자동 수집한 참고자료입니다.':payload.public?'SOOP에서 비로그인 상태로도 확인되는 공개 게시글입니다.':'SOOP 로그인 권한으로 수집된 게시글을 운영자 판단으로 공개 참고자료로 전환했습니다.';
    }else{
      timeline.url='';timeline.sourceId='';timeline.thumbnail='';
      timeline.note='로그인된 브라우저에서 확인한 내부 검증 기록입니다. 팬사이트 일반 방문자에게는 노출하지 않습니다.';
    }
  }
  item.updatedAt=new Date().toISOString();
  return item;
}
function detachBrowserImportFromItem(rawItem,payload={}){
  const item=normalizeArchiveItem(rawItem),identity=browserImportIdentity(payload);
  item.sources=(item.sources||[]).filter(row=>String(row.id||'')!==identity.sourceId&&String(row.url||'')!==String(payload.url||''));
  item.timeline=(item.timeline||[]).filter(row=>String(row.id||'')!==identity.timelineId);
  item.updatedAt=new Date().toISOString();return item;
}
async function updateBrowserImportManagement(recordId,patch={}){
  const key=BROWSER_IMPORT_PREFIX+recordId,record=parseJson(await redisCommand('GET',key).catch(()=>null));
  if(!record)throw new Error('browser_import_not_found');
  const next={...record,...patch,managedAt:new Date().toISOString()};
  await redisCommand('SET',key,JSON.stringify(next));return next;
}
async function handleOperatorBrowserImportManage(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const recordId=safeText(body.recordId,120),action=String(body.action||''),itemId=safeText(body.itemId,100);
  if(!recordId||!['connect','public','internal','ignore','restore'].includes(action))return json(res,400,{error:'invalid_browser_import_action'});
  try{
    const record=parseJson(await redisCommand('GET',BROWSER_IMPORT_PREFIX+recordId));
    const payload=normalizeBrowserImportPayload(record||{});
    if(!payload)return json(res,404,{error:'browser_import_not_found'});
    if(action==='ignore'){
      await updateBrowserImportManagement(recordId,{managementStatus:'ignored',managedAction:'ignore'});
      return json(res,200,{ok:true,action});
    }
    if(action==='restore'){
      await updateBrowserImportManagement(recordId,{managementStatus:'',managedAction:'restore'});
      return json(res,200,{ok:true,action});
    }
    const rows=await adminRows(),linked=browserImportLinkedItem(payload,rows);
    const targetId=itemId||linked?.id||'';
    if(!targetId)return json(res,400,{error:'content_target_required'});
    const target=rows.find(row=>row.id===targetId);if(!target)return json(res,404,{error:'content_not_found'});
    const visibility=action==='public'?'public':action==='internal'?'internal':browserImportPublicEligible(payload)?'public':'internal';
    const operatorOverride=action==='public'&&payload.source==='soop-authenticated-browser';
    if(linked&&linked.id!==target.id){
      await saveArchiveItemDirect(detachBrowserImportFromItem(linked,payload));
    }
    const saved=await saveArchiveItemDirect(applyBrowserImportWithVisibility(target,payload,visibility,{operatorOverride}));
    await updateBrowserImportManagement(recordId,{managementStatus:'',managedAction:action,linkedItemId:saved.id,visibility});
    return json(res,200,{ok:true,action,item:saved,visibility,publicEligible:browserImportPublicEligible(payload),operatorOverride});
  }catch(error){
    const name=String(error?.message||'browser_import_manage_failed');
    const bad=['browser_import_not_found','content_target_required','content_not_found','browser_import_not_publicly_accessible'].includes(name);
    return json(res,bad?400:503,{error:name});
  }
}
function matchBrowserImport(payload,rows=[]){
  let match=autoIngest.matchArchiveItem({type:'post',title:payload.title,date:payload.date,datePrecision:payload.date?'day':'unknown',platform:payload.platform},rows);
  if(!match&&payload.source==='fmkorea-public-browser'&&payload.body){
    const fallback=autoIngest.matchArchiveItem({type:'post',title:(payload.title+' '+payload.body.slice(0,700)),date:payload.date,datePrecision:payload.date?'day':'unknown',platform:'fmkorea'},rows);
    if(fallback?.score>=8)match=fallback;
  }
  return match;
}
async function handleOperatorBrowserImport(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  if(body?.payload?.source==='namuwiki-browser'){
    try{
      const result=await handleNamuBrowserImport(body);
      return result?json(res,200,result):json(res,400,{error:'invalid_namuwiki_browser_import'});
    }catch(error){return json(res,503,{error:String(error?.message||'namuwiki_browser_import_failed')})}
  }
  const action=String(body.action||''),payload=normalizeBrowserImportPayload(body.payload||{});
  if(!payload||!['auto','connect','draft'].includes(action))return json(res,400,{error:'invalid_browser_import'});
  try{
    await saveBrowserImportRecord(payload);
    let item=null,match=null;
    const rows=await adminRows(),source=browserImportSource(payload);
    const existing=rows.find(row=>(row.sources||[]).some(entry=>entry.id===source.id||entry.url===source.url));
    if(action==='auto'&&existing){
      if(payload.source==='soop-authenticated-browser'&&payload.public){
        item=await saveArchiveItemDirect(applyBrowserImportToItem(existing,payload));
        return json(res,200,{ok:true,action,matched:true,item,postId:payload.postId,storedRaw:true,duplicate:true,upgradedPublic:true,source:payload.source});
      }
      return json(res,200,{ok:true,action,matched:true,item:existing,postId:payload.postId,storedRaw:true,duplicate:true,source:payload.source});
    }
    if(action==='auto'){
      match=matchBrowserImport(payload,rows);
      if(!match)return json(res,200,{ok:true,action,matched:false,postId:payload.postId,storedRaw:true,source:payload.source});
      const currentItem=rows.find(row=>row.id===match.itemId);
      if(!currentItem)return json(res,200,{ok:true,action,matched:false,postId:payload.postId,storedRaw:true,source:payload.source});
      item=await saveArchiveItemDirect(applyBrowserImportToItem(currentItem,payload));
      return json(res,200,{ok:true,action,matched:true,match,item,postId:payload.postId,storedRaw:true,source:payload.source});
    }
    if(action==='connect'){
      const currentItem=rows.find(row=>row.id===String(body.itemId||''));
      if(!currentItem)return json(res,404,{error:'content_not_found'});
      item=await saveArchiveItemDirect(applyBrowserImportToItem(currentItem,payload));
    }else{
      const prefix=payload.source==='fmkorea-public-browser'?'fmk':'soop';
      const base=candidateSlug(payload.title||(prefix+'-'+payload.postId))||(prefix+'-'+payload.postId);
      let id=base,n=2;while(rows.some(row=>row.id===id)){id=base+'-'+n++}
      const isFmk=payload.source==='fmkorea-public-browser';
      item=await saveArchiveItemDirect(normalizeArchiveItem({
        id,title:payload.title||(isFmk?'FM코리아 공개글 '+payload.postId:'SOOP 애청자 공개글 '+payload.postId),aliases:[],category:'other',role:'주최',status:'ended',
        startDate:payload.date,endDate:payload.date,datePrecision:payload.date?'day':'unknown',
        summary:isFmk?'FM코리아 공개 게시글에서 수집한 새 콘텐츠 후보입니다.':'SOOP 로그인 브라우저에서 수집한 내부 검토용 새 콘텐츠 후보입니다.',
        description:isFmk?'공개 원문 링크를 기준으로 일정·참가자·규칙·결과를 구조화해 주세요.':'원문은 내부 검증 자료로 보관합니다. 공개 전 일정·참가자·규칙·결과를 확인해 구조화해 주세요.',
        heroImage:null,participants:[],participantGroups:[],results:[],seriesSessions:[],
        timeline:[browserImportTimeline(payload)],media:[],gallery:[],sources:[browserImportSource(payload)],
        verification:{state:'needs_review',verifiedAt:'',conflicts:[]},published:false,updatedAt:new Date().toISOString()
      }));
    }
    return json(res,200,{ok:true,action,item,postId:payload.postId,storedRaw:true,source:payload.source});
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
  handlePublicList,handlePublicDetail,handlePublicAutoSync,handleNotionGuideImage,handleNamuGuideImage,handleOperatorList,handleOperatorSave,handleOperatorPublish,handleOperatorAutoSync,handleOperatorCandidate,handleOperatorBrowserImport,handleOperatorBrowserImportManage,handleOperatorSourceMeta,handleOperatorDelete,
  _internals:{publicRows,compactPublicArchiveListItem,promoteOfficialHero,syntheticArchiveVisual,mergeArchiveRows,mergeCollections,mergeCuratedMaterial,applyCuratedVisibility,allowedSourceMetaUrl,fetchSourceMeta,normalizePublishedDate,readJsonLdPublishedDate,readPublishedDate,extractNotionPageId,notionAttachmentSource,populateNotionSignedUrls,notionSignedUrl,notionPageRows,fetchNotionTree,notionStructuredSections,notionGuideRows,notionGuideImageProxyUrl,notionSignedImageUrl,namuGuideImageProxyUrl,curatedNamuGuideAsset,canonicalNamuGuideImage,sanitizeStoredNamuGuideRows,cloudinaryArchiveConfig,cloudinaryArchiveKey,persistArchiveGuideImage,ephemeralNotionAssetUrl,persistNotionImage,persistReferenceImage,persistGuideMedia,persistNotionGuideMedia,persistReferenceGuideMedia,refreshNotionGuides,refreshGuideDocumentsOnly,saveChangedArchiveRows,isNotionSourceUrl,isNamuSourceUrl,extractNamuStructured,fetchNamuMeta,namuReadTransportUrl,fetchNamuSourceMeta,refreshReferenceGuides,isBngtsSourceUrl,applyBngtsParticipantSnapshot,refreshInternalReferenceSources,extractBngtsStreamerNames,extractSoopPostRef,parseSoopPostPayload,withoutHidden,curatedHiddenIds,storedRows,adminRows,autoSyncState,autoSyncOfficialArchive,prepareForSave,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX,DRAFT_INDEX,DRAFT_PREFIX,HIDDEN_KEY,AUTO_LAST_KEY,AUTO_CANDIDATES_KEY,BROWSER_IMPORT_PREFIX,BROWSER_IMPORT_INDEX,normalizeBrowserImportPayload,normalizeNamuBrowserImportPayload,canonicalNamuUrl,applyNamuBrowserImportToItem,applyCuratedReferenceScope,curatedNamuReferenceRows,applyBrowserImportToItem,browserImportInboxRows,browserImportPublicEligible,applyBrowserImportWithVisibility,handleOperatorCandidate,handleOperatorBrowserImport,handleOperatorBrowserImportManage,shouldForcePublicAutoSync,explicitSameOrigin,AUTO_FULL_MIGRATION_KEY,AUTO_GUIDE_MEDIA_MIGRATION_KEY}
};
