'use strict';

const contentArchive=require('../lib/chunbong-content-archive-api');
const {storedRows}=contentArchive._internals;

function canonicalSoopPost(raw=''){
  try{
    const url=new URL(String(raw||''));
    if(!/(^|\.)sooplive\.com$/i.test(url.hostname))return null;
    const match=url.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);
    if(!match)return null;
    return{id:match[1],url:`https://www.sooplive.com/station/chunbongtv/post/${match[1]}`};
  }catch{return null}
}

function publicMaterialRows(item={}){
  return [
    ...(Array.isArray(item.timeline)?item.timeline:[]),
    ...(Array.isArray(item.media)?item.media:[]),
    ...(Array.isArray(item.sources)?item.sources:[])
  ].filter(row=>row&&row.visibility!=='internal'&&row.url);
}

async function handler(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  try{
    const rows=await storedRows();
    const targets=new Map();
    for(const item of Array.isArray(rows)?rows:[]){
      for(const row of publicMaterialRows(item)){
        const target=canonicalSoopPost(row.url);
        if(target&&!targets.has(target.id))targets.set(target.id,target);
      }
    }
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','public, max-age=60, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({targets:[...targets.values()],count:targets.size});
  }catch{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'archive_targets_unavailable'});
  }
}

module.exports=handler;
module.exports._internals={canonicalSoopPost,publicMaterialRows};
