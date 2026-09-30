'use strict';

const FREE_MONTHLY_COMMAND_LIMIT=500000;
const CACHE_MS=15*60*1000;
let databaseCache={at:0,value:null};
let statsCache={at:0,value:null};

function config(){
  return{
    email:String(process.env.REALTIME_UPSTASH_EMAIL||'').trim(),
    apiKey:String(process.env.REALTIME_UPSTASH_API_KEY||'').trim(),
    databaseId:String(process.env.REALTIME_UPSTASH_DATABASE_ID||'').trim()
  };
}
function monthlyLimit(plan=''){
  const configured=Number(process.env.REALTIME_REDIS_MONTHLY_COMMAND_LIMIT);
  if(Number.isFinite(configured)&&configured>0)return{value:Math.round(configured),source:'configured'};
  if(String(plan||'').toLowerCase()==='free')return{value:FREE_MONTHLY_COMMAND_LIMIT,source:'upstash-free'};
  return{value:FREE_MONTHLY_COMMAND_LIMIT,source:'free-reference'};
}
function endpointName(){
  try{return new URL(String(process.env.REALTIME_REDIS_REST_URL||'')).hostname.split('.')[0].toLowerCase()}catch{return''}
}
function safeReason(value){return String(value||'realtime_upstash_unavailable').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80)}
function headersFor(cfg){return{Authorization:'Basic '+Buffer.from(cfg.email+':'+cfg.apiKey).toString('base64'),Accept:'application/json','User-Agent':'chunbong-fansite-realtime-usage'}}

async function databaseDescriptor(){
  if(databaseCache.value&&Date.now()-databaseCache.at<CACHE_MS)return databaseCache.value;
  const cfg=config(),endpoint=endpointName();
  if(!cfg.email||!cfg.apiKey){
    const value={available:false,reason:'developer_api_not_configured',databaseId:cfg.databaseId||null,plan:null,endpoint:endpoint||null};
    databaseCache={at:Date.now(),value};return value;
  }
  const headers=headersFor(cfg);
  try{
    let row=null,databaseId=cfg.databaseId;
    if(!databaseId){
      const response=await fetch('https://api.upstash.com/v2/redis/databases',{headers,signal:AbortSignal.timeout(3500)});
      if(!response.ok)throw new Error('realtime_upstash_databases_'+response.status);
      const payload=await response.json(),rows=Array.isArray(payload)?payload:Array.isArray(payload?.databases)?payload.databases:[];
      row=rows.find(item=>{
        const name=String(item?.endpoint||item?.rest_url||item?.rest_url_ro||'').toLowerCase();
        return endpoint&&name.includes(endpoint);
      })||null;
      databaseId=String(row?.database_id||row?.id||'');
    }
    if(!databaseId)throw new Error('realtime_upstash_database_not_found');
    if(!row){
      const response=await fetch('https://api.upstash.com/v2/redis/database/'+encodeURIComponent(databaseId),{headers,signal:AbortSignal.timeout(3500)});
      if(response.ok)row=await response.json();
    }
    const value={available:true,reason:null,databaseId,plan:String(row?.type||row?.plan||'').toLowerCase()||null,endpoint:String(row?.endpoint||endpoint||'')||null,headers};
    databaseCache={at:Date.now(),value};return value;
  }catch(error){
    const value={available:false,reason:safeReason(error?.message),databaseId:cfg.databaseId||null,plan:null,endpoint:endpoint||null};
    databaseCache={at:Date.now(),value};return value;
  }
}

async function status(){
  if(statsCache.value&&Date.now()-statsCache.at<CACHE_MS)return statsCache.value;
  const descriptor=await databaseDescriptor(),limitInfo=monthlyLimit(descriptor.plan);
  if(!descriptor.available||!descriptor.databaseId||!descriptor.headers){
    const value={available:false,exact:false,source:descriptor.reason||'developer_api_unavailable',plan:descriptor.plan,monthlyLimit:limitInfo.value,limitSource:limitInfo.source,used:null,remaining:null,usedPct:null,reads:null,writes:null,scripts:null,bandwidthBytes:null,currentStorageBytes:null,dailyCommands:null,checkedAt:new Date().toISOString()};
    statsCache={at:Date.now(),value};return value;
  }
  try{
    const response=await fetch('https://api.upstash.com/v2/redis/stats/'+encodeURIComponent(descriptor.databaseId),{headers:descriptor.headers,signal:AbortSignal.timeout(3500)});
    if(!response.ok)throw new Error('realtime_upstash_stats_'+response.status);
    const stats=await response.json(),used=Number(stats?.total_monthly_requests),limit=limitInfo.value;
    const remaining=Number.isFinite(used)&&limit?Math.max(0,limit-used):null;
    const value={
      available:true,exact:Number.isFinite(used),source:'upstash-developer-api',plan:descriptor.plan,
      monthlyLimit:limit,limitSource:limitInfo.source,used:Number.isFinite(used)?used:null,remaining,
      usedPct:Number.isFinite(used)&&limit?Math.min(1000,Math.round(used/limit*1000)/10):null,
      reads:Number.isFinite(Number(stats?.total_monthly_read_requests))?Number(stats.total_monthly_read_requests):null,
      writes:Number.isFinite(Number(stats?.total_monthly_write_requests))?Number(stats.total_monthly_write_requests):null,
      scripts:Number.isFinite(Number(stats?.total_monthly_script_requests))?Number(stats.total_monthly_script_requests):null,
      bandwidthBytes:Number.isFinite(Number(stats?.total_monthly_bandwidth))?Number(stats.total_monthly_bandwidth):null,
      currentStorageBytes:Number.isFinite(Number(stats?.current_storage))?Number(stats.current_storage):null,
      dailyCommands:Number.isFinite(Number(stats?.daily_net_commands))?Number(stats.daily_net_commands):null,
      checkedAt:new Date().toISOString()
    };
    statsCache={at:Date.now(),value};return value;
  }catch(error){
    const value={available:false,exact:false,source:safeReason(error?.message),plan:descriptor.plan,monthlyLimit:limitInfo.value,limitSource:limitInfo.source,used:null,remaining:null,usedPct:null,reads:null,writes:null,scripts:null,bandwidthBytes:null,currentStorageBytes:null,dailyCommands:null,checkedAt:new Date().toISOString()};
    statsCache={at:Date.now(),value};return value;
  }
}

module.exports={status,_internals:{config,monthlyLimit,endpointName,databaseDescriptor}};
