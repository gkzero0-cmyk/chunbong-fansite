import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {normalizePostRows,postCanonicalKey}=require('../chunbong-contents.js');

export const BASE_URL=process.env.BASE_URL||'http://127.0.0.1:4173';
const POST_TYPES=new Set(['notice','post','article','reference']);

function rawPostRows(item={}){
  return [...(Array.isArray(item.timeline)?item.timeline:[]),...(Array.isArray(item.media)?item.media:[])]
    .filter(row=>row&&POST_TYPES.has(String(row.type||'')));
}

function dateQuality(row={}){
  const date=String(row.date||'').trim(),precision=String(row.datePrecision||'unknown');
  if(precision==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(date))return 3;
  if(precision==='month'&&/^\d{4}-\d{2}$/.test(date))return 2;
  if(precision==='year'&&/^\d{4}$/.test(date))return 1;
  return 0;
}

function comparableDate(row={}){
  const date=String(row.date||'').trim(),quality=dateQuality(row);
  if(quality===3)return date;
  if(quality===2)return date+'-00';
  if(quality===1)return date+'-00-00';
  return'';
}

function placeholderTitle(value=''){
  const title=String(value||'').replace(/\s+/g,' ').trim();
  if(!title)return true;
  if(/^\d+$/.test(title))return true;
  return /^(?:.*\s)?공식\s*게시글(?:\s*[·#:\-]?\s*\d+)?$/i.test(title)
    || /^게시글(?:\s*[·#:\-]?\s*\d+)?$/i.test(title);
}

export function auditItem(item={},options={}){
  const normalize=typeof options.normalize==='function'?options.normalize:normalizePostRows;
  const keyOf=typeof options.keyOf==='function'?options.keyOf:postCanonicalKey;
  const raw=rawPostRows(item),rows=normalize(item),violations=[];
  const seen=new Set();
  let unknownSeen=false,previousKnown='';

  for(let index=0;index<rows.length;index++){
    const row=rows[index]||{},key=keyOf(row);
    if(seen.has(key))violations.push({code:'duplicate_canonical_key',index,key,title:String(row.title||'')});
    else seen.add(key);

    const current=comparableDate(row);
    if(!current){unknownSeen=true;continue}
    if(unknownSeen)violations.push({code:'unknown_before_known',index,key,date:String(row.date||'')});
    if(previousKnown&&previousKnown<current)violations.push({code:'date_order',index,key,previousDate:previousKnown,date:String(row.date||'')});
    previousKnown=current;
  }

  const rawByKey=new Map();
  for(const row of raw){
    const key=keyOf(row);
    if(!rawByKey.has(key))rawByKey.set(key,[]);
    rawByKey.get(key).push(row);
  }
  for(let index=0;index<rows.length;index++){
    const row=rows[index]||{},key=keyOf(row),candidates=rawByKey.get(key)||[];
    if(placeholderTitle(row.title)&&candidates.some(candidate=>!placeholderTitle(candidate.title))){
      violations.push({code:'placeholder_title_won',index,key,title:String(row.title||'')});
    }
  }

  return{
    id:String(item.id||''),
    title:String(item.title||''),
    rawCandidateCount:raw.length,
    rowCount:rows.length,
    rows,
    violations
  };
}

function normalizeBaseUrl(value=''){
  const raw=String(value||'').trim()||BASE_URL;
  return raw.replace(/\/+$/,'');
}

async function fetchJson(fetchImpl,url){
  const response=await fetchImpl(url,{headers:{accept:'application/json'}});
  if(!response?.ok)throw new Error(`audit_fetch_${response?.status||'failed'}:${url}`);
  return response.json();
}

export async function auditPublicArchive({baseUrl=BASE_URL,fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=='function')throw new Error('audit_fetch_unavailable');
  const base=normalizeBaseUrl(baseUrl);
  const list=await fetchJson(fetchImpl,base+'/api/content?type=chunbong-contents');
  const items=Array.isArray(list?.items)?list.items:[];
  const reports=[];

  for(const summary of items){
    const id=String(summary?.id||'').trim();
    if(!id)continue;
    const payload=await fetchJson(fetchImpl,base+'/api/content?type=chunbong-content&id='+encodeURIComponent(id));
    const report=auditItem(payload?.item||{});
    reports.push(report);
  }

  const violations=reports.flatMap(report=>report.violations.map(row=>({contentId:report.id,contentTitle:report.title,...row})));
  return{
    baseUrl:base,
    itemCount:reports.length,
    postCount:reports.reduce((sum,report)=>sum+report.rowCount,0),
    reports,
    violations
  };
}

async function main(){
  const report=await auditPublicArchive();
  const summary={
    baseUrl:report.baseUrl,
    itemCount:report.itemCount,
    postCount:report.postCount,
    violationCount:report.violations.length,
    violations:report.violations
  };
  console.log(JSON.stringify(summary,null,2));
  if(report.violations.length)process.exitCode=1;
}

const entry=process.argv[1]?pathToFileURL(process.argv[1]).href:'';
if(entry&&import.meta.url===entry){
  main().catch(error=>{
    console.error(error?.stack||error);
    process.exitCode=1;
  });
}
