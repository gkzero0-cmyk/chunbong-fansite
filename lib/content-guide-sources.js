'use strict';
const crypto=require('node:crypto');

const SURVIVAL_WIKI_ORIGIN='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';
const SURVIVAL_WIKI_HOST='server1.wiki.xn--9i1bk7xhlfi8hzzf.com';
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
  return (Array.isArray(index?.pages)?index.pages:[]).filter(page=>{
    const category=String(page?.category||'').trim().toUpperCase();
    if(HIDDEN_CATEGORIES.has(category))return false;
    if(page?.visibility==='internal'||page?.private===true||page?.published===false)return false;
    return Boolean(cleanText(page?.title||page?.slug,180));
  }).sort((a,b)=>(Number(a?.order)||9999)-(Number(b?.order)||9999)||String(a?.title||'').localeCompare(String(b?.title||''),'ko'));
}
function imageRow(value='',source={},pageTitle=''){
  const src=absoluteWikiAsset(value,source);if(!src)return null;
  return{src,alt:cleanText(pageTitle||'적자생존 가이드',220),caption:'',filename:'',sourceUrl:src,provider:'official-wiki',assetState:'remote',permanent:false};
}
function officialWikiGuideRows(index={},source={}){
  const rows=[];const sourceId=String(source.id||SURVIVAL_WIKI_SOURCE.id);
  for(const page of publicWikiPages(index)){
    const pageTitle=cleanText(page.title||page.slug||'가이드',180)||'가이드';
    const pageId=String(page.id||page.slug||pageTitle).slice(0,120);
    const hero=imageRow(page.hero||page.thumbnail||page.cover||'',source,pageTitle);
    const sections=Array.isArray(page.sections)?page.sections:[];
    if(!sections.length){
      const text=cleanText(page.description||'',6000);if(!text&&!hero)continue;
      const images=hero?[hero]:[];const content=[];if(text)content.push({type:'text',text});if(hero)content.push({type:'image',image:hero});
      rows.push({id:`official-wiki-${safeId(pageId)}-summary`,sourceId,pageId,pageTitle,title:pageTitle,text,images,content,provider:'official-wiki',depth:0});
      continue;
    }
    sections.forEach((section,indexInPage)=>{
      const title=cleanText(section?.heading||section?.title||pageTitle,180)||pageTitle;
      const text=cleanText(section?.text||section?.description||'',6000);
      const images=[];const content=[];
      if(indexInPage===0&&hero){images.push(hero);content.push({type:'image',image:hero})}
      for(const raw of (Array.isArray(section?.images)?section.images:[]).slice(0,17)){
        const image=imageRow(typeof raw==='string'?raw:(raw?.src||raw?.url||''),source,pageTitle);if(image){images.push(image);content.push({type:'image',image})}
      }
      if(text)content.unshift({type:'text',text});
      if(!text&&!images.length)return;
      rows.push({id:`official-wiki-${safeId(pageId)}-${safeId(section?.id||section?.anchor||indexInPage+1)}`,sourceId,pageId,pageTitle,title,text,images,content,provider:'official-wiki',depth:0});
    });
    if(rows.length>=180)break;
  }
  return rows.slice(0,180);
}
function guideHydrationPlan(item={}){
  const sources=Array.isArray(item.sources)?item.sources:[];const out=[];
  const official=sources.filter(source=>isOfficialWikiSourceUrl(source?.url));
  if(!official.length&&String(item.id||'')==='justserver-survival')official.push({...SURVIVAL_WIKI_SOURCE});
  for(const source of official)out.push({kind:'official-wiki',source});
  const notions=sources.filter(source=>isNotionSourceUrl(source?.url));
  if(!notions.length&&String(item.id||'')==='justserver-moneygame')notions.push({...MONEYGAME_NOTION_SOURCE});
  for(const source of notions)out.push({kind:'notion',source});
  for(const source of sources.filter(source=>source?.visibility!=='internal'&&isNamuSourceUrl(source?.url)))out.push({kind:'namuwiki',source});
  return out;
}
function guideFingerprint(index={}){
  const compact={generatedAt:String(index?.generatedAt||''),pages:publicWikiPages(index).map(page=>({id:page.id,title:page.title,slug:page.slug,category:page.category,order:page.order,hero:page.hero,thumbnail:page.thumbnail,cover:page.cover,description:page.description,sections:page.sections}))};
  return crypto.createHash('sha256').update(JSON.stringify(compact)).digest('hex');
}
async function fetchOfficialWikiIndex(source={},options={}){
  const url=officialWikiIndexUrl(source);if(!url)throw new Error('official_wiki_source_invalid');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs)||12000));
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 ChunbongArchive/1.0'}});
    if(!response.ok)throw new Error('official_wiki_fetch_'+response.status);
    const payload=await response.json();if(!payload||!Array.isArray(payload.pages))throw new Error('official_wiki_invalid_index');
    return{payload,url,fingerprint:guideFingerprint(payload),generatedAt:String(payload.generatedAt||'')};
  }catch(error){if(error?.name==='AbortError')throw new Error('official_wiki_timeout');throw error}finally{clearTimeout(timer)}
}

module.exports={SURVIVAL_WIKI_ORIGIN,SURVIVAL_WIKI_HOST,SURVIVAL_WIKI_SOURCE,MONEYGAME_NOTION_SOURCE,OFFICIAL_WIKI_INDEX_PATH,isOfficialWikiSourceUrl,isNotionSourceUrl,isNamuSourceUrl,officialWikiIndexUrl,officialWikiGuideRows,guideHydrationPlan,guideFingerprint,fetchOfficialWikiIndex,publicWikiPages};
