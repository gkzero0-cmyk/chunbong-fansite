import {pathToFileURL} from 'node:url';
import runtime from '../chunbong-posts-runtime.js';

const {normalizePostRows,postCanonicalKey}=runtime;

function clean(value=''){return String(value??'').normalize('NFKC').trim()}
function isPlaceholderTitle(value=''){
  const title=clean(value);
  if(!title||/^\d+$/.test(title))return true;
  return /공식\s*(?:게시글|공지)\s*[·:#-]?\s*\d+\s*$/i.test(title)||/^(?:공식\s*)?(?:게시글|공지)(?:\s*[·:#-]?\s*\d+)?$/i.test(title)||/^(?:SOOP\s*)?(?:게시글|공지)$/i.test(title);
}
function knownDate(row={}){
  const value=clean(row.date||''),precision=clean(row.datePrecision||'unknown');
  if(precision==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  if(precision==='month'&&/^\d{4}-\d{2}$/.test(value))return value+'-00';
  if(precision==='year'&&/^\d{4}$/.test(value))return value+'-00-00';
  return'';
}
function postCandidates(item={}){
  return [...(Array.isArray(item.timeline)?item.timeline:[]),...(Array.isArray(item.media)?item.media:[])].filter(row=>['notice','post','article','reference'].includes(clean(row?.type||'post')));
}
function auditItem(item={}){
  const raw=postCandidates(item),rows=normalizePostRows(item),violations=[];
  const keys=rows.map(postCanonicalKey),unique=new Set(keys);
  if(unique.size!==keys.length)violations.push({code:'canonical_duplicate',contentId:item.id||'',detail:`${keys.length-unique.size} duplicate normalized keys`});
  let sawUnknown=false,previous='9999-99-99';
  for(const row of rows){
    const date=knownDate(row);
    if(!date){sawUnknown=true;continue}
    if(sawUnknown)violations.push({code:'dated_after_unknown',contentId:item.id||'',key:postCanonicalKey(row)});
    if(date>previous)violations.push({code:'date_order',contentId:item.id||'',key:postCanonicalKey(row),date,previous});
    previous=date;
  }
  const groups=new Map();
  for(const row of raw){const key=postCanonicalKey(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  for(const row of rows){
    const key=postCanonicalKey(row),candidates=groups.get(key)||[];
    if(isPlaceholderTitle(row.title)&&candidates.some(candidate=>!isPlaceholderTitle(candidate.title||candidate.label)))violations.push({code:'placeholder_won_merge',contentId:item.id||'',key,title:row.title||''});
  }
  return{contentId:item.id||'',title:item.title||'',postCount:rows.length,titles:rows.map(row=>row.title||''),violations};
}
export function auditItems(items=[]){
  const contents=(Array.isArray(items)?items:[]).map(auditItem),violations=contents.flatMap(row=>row.violations),postCount=contents.reduce((sum,row)=>sum+row.postCount,0);
  return{ok:violations.length===0,contentCount:contents.length,postCount,violations,contents};
}

async function fetchJson(url){const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status} ${url}`);return response.json()}
async function loadPublicItems(base){
  const root=String(base||'https://chunbong-fansite.vercel.app').replace(/\/+$/,'');
  const list=await fetchJson(`${root}/api/content?type=chunbong-contents`),summaries=Array.isArray(list?.items)?list.items:[];
  const items=[];
  for(const summary of summaries){
    const id=clean(summary?.id);if(!id)continue;
    const payload=await fetchJson(`${root}/api/content?type=chunbong-content&id=${encodeURIComponent(id)}`);
    if(payload?.item)items.push(payload.item);
  }
  return items;
}

async function main(){
  const base=process.env.CHUNBONG_BASE_URL||process.argv[2]||'https://chunbong-fansite.vercel.app';
  const items=await loadPublicItems(base),result=auditItems(items);
  console.log(JSON.stringify({base,ok:result.ok,contentCount:result.contentCount,postCount:result.postCount,violations:result.violations},null,2));
  if(!result.ok)process.exitCode=1;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error);process.exitCode=1});
