'use strict';
const crypto=require('node:crypto');

// Canonical source of truth for the survival guide. The Vercel hostname below is
// only a delivery fallback for the same published structured asset.
const SURVIVAL_WIKI_ORIGIN='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';
const SURVIVAL_WIKI_HOST='server1.wiki.xn--9i1bk7xhlfi8hzzf.com';
const SURVIVAL_WIKI_TRANSPORT_ORIGIN='https://justserver3.vercel.app/';
const OFFICIAL_WIKI_INDEX_PATH='notion-assets/index.json';
const SURVIVAL_WIKI_SOURCE={id:'source-survival-wiki',kind:'reference',label:'그냥서버 적자생존 공식 위키',url:SURVIVAL_WIKI_ORIGIN,visibility:'public'};
const MONEYGAME_NOTION_SOURCE={id:'source-moneygame-notion',kind:'reference',label:'그냥서버 : 머니게임 공개 Notion 원본',url:'https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d',visibility:'internal'};
const HIDDEN_CATEGORIES=new Set(['ADMIN','INTERNAL','DEV','DEVELOPER','SYSTEM','PRIVATE']);

function sourceUrl(source={}){try{return new URL(String(source.url||''))}catch{return null}}
function isOfficialWikiSourceUrl(value=''){
  try{const url=new URL(String(value||''));return url.protocol==='https:'&&url.hostname.toLowerCase()===SURVIVAL_WIKI_HOST}catch{return false}
}
function isNotionSourceUrl(value=''){
  try{const host=new URL(String(value||'')).hostname.toLowerCase();return host==='notion.so'||host==='www.notion.so'||host==='app.notion.com'||host==='notion.site'||host.endsWith('.notion.site')}catch{return false}
}
function isNamuSourceUrl(value=''){
  try{const host=new URL(String(value||'')).hostname.toLowerCase();return host==='namu.wiki'||host==='www.namu.wiki'||host==='i.namu.wiki'}catch{return false}
}
function officialWikiIndexUrl(source={}){
  const base=sourceUrl(source)||new URL(SURVIVAL_WIKI_ORIGIN);
  if(!isOfficialWikiSourceUrl(base.toString()))return'';
  return new URL(OFFICIAL_WIKI_INDEX_PATH,base).toString();
}
function officialWikiTransportUrl(){return new URL(OFFICIAL_WIKI_INDEX_PATH,SURVIVAL_WIKI_TRANSPORT_ORIGIN).toString()}
function absoluteWikiAsset(value='',source={}){
  const raw=String(value||'').trim();if(!raw)return'';
  try{
    const base=sourceUrl(source)||new URL(SURVIVAL_WIKI_ORIGIN);
    const url=new URL(raw,base);
    return url.protocol==='https:'&&url.hostname.toLowerCase()===SURVIVAL_WIKI_HOST?url.toString():'';
  }catch{return''}
}
function safeId(value=''){return String(value||'').normalize('NFKC').replace(/[^a-zA-Z0-9가-힣_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,100)}
function cleanText(value='',max=6000){return String(value||'').replace(/\u0000/g,'').replace(/\r/g,'').trim().slice(0,max)}
function publicWikiPages(index={}){
  const pages=Array.isArray(index?.pages)?index.pages:[];
  return pages.filter(page=>{
    const category=String(page?.category||'').trim().toUpperCase();
    if(HIDDEN_CATEGORIES.has(category))return false;
    if(page?.visibility==='internal'||page?.private===true||page?.published===false)return false;
    return Boolean(cleanText(page?.title||page?.slug,180));
  });
}
function imageRow(value='',source={},pageTitle=''){
  const src=absoluteWikiAsset(value,source);if(!src)return null;
  return{src,alt:cleanText(pageTitle||'적자생존 가이드',220),caption:'',filename:'',sourceUrl:src,provider:'official-wiki',assetState:'remote',permanent:false};
}
function officialWikiGuideRows(index={},source={}){
  const rows=[];const sourceId=String(source.id||SURVIVAL_WIKI_SOURCE.id);
  for(const page of publicWikiPages(index)){
    const pageTitle=cleanText(page.title||page.slug||'가이드',180)||'가이드';
    const pageId=String(page.pageId||page.id||page.slug||pageTitle).slice(0,120);
    const hero=imageRow(page.hero||page.thumbnail||page.cover||'',source,pageTitle);
    const sections=Array.isArray(page.sections)?page.sections:[];
    if(!sections.length){
      const text=cleanText(page.description||'',6000);if(!text&&!hero)continue;
      const images=hero?[hero]:[];const content=[];if(text)content.push({type:'text',text});if(hero)content.push({type:'image',image:hero});
      rows.push({id:`official-wiki-${safeId(pageId)}-summary`,sourceId,pageId,pageTitle,title:pageTitle,text,images,content,provider:'official-wiki',depth:0});
      continue;
    }
    sections.forEach((section,indexInPage)=>{
      const title=cleanText(section?.heading||section?.title||pageTitle,600)||pageTitle;
      const text=cleanText(section?.text||section?.description||'',6000);
      const images=[];const content=[];
      if(indexInPage===0&&hero){images.push(hero);content.push({type:'image',image:hero})}
      for(const raw of (Array.isArray(section?.images)?section.images:[]).slice(0,17)){
        const image=imageRow(typeof raw==='string'?raw:(raw?.src||raw?.url||''),source,pageTitle);if(image){images.push(image);content.push({type:'image',image})}
      }
      if(text)content.unshift({type:'text',text});
      if(!title&&!text&&!images.length)return;
      rows.push({id:`official-wiki-${safeId(pageId)}-${safeId(section?.id||section?.anchor||indexInPage+1)}`,sourceId,pageId,pageTitle,title,text,images,content,provider:'official-wiki',depth:0});
    });
    if(rows.length>=360)break;
  }
  return rows.slice(0,360);
}
function guideHydrationPlan(item={}){
  const sources=Array.isArray(item.sources)?item.sources:[];
  if(String(item.id||'')==='justserver-survival'){
    const official=sources.find(source=>isOfficialWikiSourceUrl(source?.url))||SURVIVAL_WIKI_SOURCE;
    return[{kind:'official-wiki',source:{...official,id:'source-survival-wiki',kind:'reference',label:'그냥서버 적자생존 공식 위키',url:SURVIVAL_WIKI_ORIGIN,visibility:'public'}}];
  }
  const out=[];
  for(const source of sources.filter(source=>isOfficialWikiSourceUrl(source?.url)))out.push({kind:'official-wiki',source});
  const notions=sources.filter(source=>isNotionSourceUrl(source?.url));
  if(!notions.length&&String(item.id||'')==='justserver-moneygame')notions.push({...MONEYGAME_NOTION_SOURCE});
  for(const source of notions)out.push({kind:'notion',source});
  for(const source of sources.filter(source=>source?.visibility!=='internal'&&isNamuSourceUrl(source?.url)))out.push({kind:'namuwiki',source});
  return out;
}
function guideFingerprint(index={}){
  const compact={generatedAt:String(index?.generatedAt||''),pages:publicWikiPages(index).map(page=>({pageId:page.pageId,id:page.id,title:page.title,slug:page.slug,category:page.category,order:page.order,hero:page.hero,thumbnail:page.thumbnail,cover:page.cover,description:page.description,sections:page.sections}))};
  return crypto.createHash('sha256').update(JSON.stringify(compact)).digest('hex');
}
async function fetchOfficialWikiIndexAttempt(url,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1,Number(timeoutMs)||12000));
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 ChunbongArchive/1.0'}});
    if(!response.ok)throw new Error('official_wiki_fetch_'+response.status);
    const payload=await response.json();
    if(!payload||!Array.isArray(payload.pages))throw new Error('official_wiki_invalid_index');
    return payload;
  }catch(error){
    if(error?.name==='AbortError')throw new Error('official_wiki_timeout');
    throw error;
  }finally{clearTimeout(timer)}
}
async function fetchOfficialWikiIndex(source={},options={}){
  const url=officialWikiIndexUrl(source);if(!url)throw new Error('official_wiki_source_invalid');
  const fallbackUrl=officialWikiTransportUrl();
  const timeoutMs=Math.max(1000,Number(options.timeoutMs)||12000);
  const requestedPrimary=Number(options.primaryTimeoutMs);
  const primaryTimeoutMs=Math.max(1,Math.min(timeoutMs,Number.isFinite(requestedPrimary)&&requestedPrimary>0?requestedPrimary:2500));
  let payload,transportUrl=url,primaryError=null;
  try{payload=await fetchOfficialWikiIndexAttempt(url,primaryTimeoutMs)}
  catch(error){
    primaryError=error;
    if(fallbackUrl===url)throw error;
    transportUrl=fallbackUrl;
    try{payload=await fetchOfficialWikiIndexAttempt(fallbackUrl,timeoutMs)}
    catch(fallbackError){
      fallbackError.primaryCause=String(primaryError?.message||primaryError||'');
      throw fallbackError;
    }
  }
  return{payload,url,transportUrl,fingerprint:guideFingerprint(payload),generatedAt:String(payload.generatedAt||'')};
}

module.exports={SURVIVAL_WIKI_ORIGIN,SURVIVAL_WIKI_HOST,SURVIVAL_WIKI_TRANSPORT_ORIGIN,SURVIVAL_WIKI_SOURCE,MONEYGAME_NOTION_SOURCE,OFFICIAL_WIKI_INDEX_PATH,isOfficialWikiSourceUrl,isNotionSourceUrl,isNamuSourceUrl,officialWikiIndexUrl,officialWikiTransportUrl,officialWikiGuideRows,guideHydrationPlan,guideFingerprint,fetchOfficialWikiIndex,publicWikiPages};
