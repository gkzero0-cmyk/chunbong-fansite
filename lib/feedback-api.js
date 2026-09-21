'use strict';

const crypto=require('node:crypto');
const {hasRedis,redisCommand,getJson,setJson}=require('./operator-store');
const {requireOperator}=require('./operator-auth-api');

const INDEX_KEY='feedback:index:v1';
const CATEGORIES=new Set(['bug','inconvenience','feature','design','content','other']);
const STATUSES=new Set(['new','reviewing','planned','done']);
const RETENTION_SECONDS=2*365*24*60*60;

function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function sameOrigin(req){
  const origin=String(header(req,'origin')||'').trim();if(!origin)return true;
  try{return new URL(origin).host.toLowerCase()===requestHost(req);}catch{return false;}
}
function sendJson(res,status,payload){
  if(typeof res.setHeader==='function'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');}
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  if(typeof body==='string'&&body.length<=24576){try{return JSON.parse(body);}catch{return null;}}
  return null;
}
function cleanText(value,max){return String(value||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max);}
function cleanPath(value){const p=String(value||'/').split('?')[0].split('#')[0].slice(0,160);return p.startsWith('/')?p:'/';}
function hash(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex').slice(0,24);}
function kstDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(now).reduce((o,p)=>{if(p.type!=='literal')o[p.type]=p.value;return o;},{});
  return `${parts.year}${parts.month}${parts.day}`;
}
function sanitizeContext(value={}){
  const viewport=value?.viewport&&typeof value.viewport==='object'?value.viewport:{};
  return {
    path:cleanPath(value.path),
    device:['mobile','desktop','tablet'].includes(value.device)?value.device:'unknown',
    viewport:{width:Math.max(0,Math.min(10000,Number(viewport.width)||0)),height:Math.max(0,Math.min(10000,Number(viewport.height)||0))},
    pwa:value.pwa===true,
    theme:['dark','light'].includes(value.theme)?value.theme:'unknown',
    siteVersion:cleanText(value.siteVersion,80)
  };
}
async function createFeedback(body,now=new Date()){
  if(!hasRedis())throw new Error('feedback_unavailable');
  const category=String(body?.category||'');
  if(!CATEGORIES.has(category))throw new Error('invalid_category');
  const nickname=cleanText(body?.nickname,24);
  const content=cleanText(body?.content,2000);
  if(content.length<4)throw new Error('content_too_short');

  const visitorHash=hash(body?.visitorId||'anonymous');
  const bucket=Math.floor(now.getTime()/(10*60*1000));
  const rateKey='feedback:rate:v1:'+visitorHash+':'+bucket;
  const count=Number(await redisCommand('INCR',rateKey)||0);
  if(count===1)await redisCommand('EXPIRE',rateKey,15*60);
  if(count>5)throw new Error('rate_limited');

  const date=kstDate(now);
  const seq=Number(await redisCommand('INCR','feedback:seq:'+date)||1);
  const id='FB-'+date.slice(0,4)+date.slice(4,6)+date.slice(6,8)+'-'+String(seq).padStart(3,'0');
  const row={
    id,createdAt:now.toISOString(),updatedAt:now.toISOString(),category,
    nickname,anonymous:!nickname,content,status:'new',context:sanitizeContext(body?.context||{})
  };
  await setJson('feedback:item:v1:'+id,row,'EX',RETENTION_SECONDS);
  await redisCommand('ZADD',INDEX_KEY,now.getTime(),id);
  return row;
}
async function listFeedback(limit=100){
  const ids=await redisCommand('ZREVRANGE',INDEX_KEY,0,Math.max(0,Math.min(300,limit)-1));
  const rows=await Promise.all((Array.isArray(ids)?ids:[]).map(id=>getJson('feedback:item:v1:'+id,null).catch(()=>null)));
  return rows.filter(Boolean);
}
async function publicHandler(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});
  try{
    const row=await createFeedback(body);
    return sendJson(res,201,{ok:true,id:row.id});
  }catch(error){
    const code=error?.message==='rate_limited'?429:['invalid_category','content_too_short'].includes(error?.message)?400:503;
    return sendJson(res,code,{error:error?.message||'feedback_unavailable'});
  }
}
async function operatorHandler(req,res){
  const operator=await requireOperator(req,res);if(!operator)return;
  if(!hasRedis())return sendJson(res,503,{error:'feedback_unavailable'});
  const method=String(req?.method||'GET').toUpperCase();
  const url=new URL(req?.url||'/','https://chunbong.local');
  if(method==='GET'){
    const id=cleanText(url.searchParams.get('id'),32);
    if(id){const row=await getJson('feedback:item:v1:'+id,null);return row?sendJson(res,200,{item:row}):sendJson(res,404,{error:'not_found'});}
    const items=await listFeedback(Number(url.searchParams.get('limit'))||100);
    const counts=Object.fromEntries([...STATUSES].map(status=>[status,items.filter(item=>item.status===status).length]));
    return sendJson(res,200,{items,counts});
  }
  if(method==='POST'){
    const body=parseBody(req?.body)||{},id=cleanText(body.id,32),status=String(body.status||'');
    if(!/^FB-20\d{6}-\d{3,}$/.test(id)||!STATUSES.has(status))return sendJson(res,400,{error:'invalid_update'});
    const key='feedback:item:v1:'+id,row=await getJson(key,null);
    if(!row)return sendJson(res,404,{error:'not_found'});
    const updated={...row,status,updatedAt:new Date().toISOString()};
    await setJson(key,updated,'EX',RETENTION_SECONDS);
    return sendJson(res,200,{ok:true,item:updated});
  }
  return sendJson(res,405,{error:'method_not_allowed'});
}
module.exports={handlePublicFeedback:publicHandler,handleOperatorFeedback:operatorHandler,_internals:{createFeedback,listFeedback,sanitizeContext,CATEGORIES,STATUSES}};
