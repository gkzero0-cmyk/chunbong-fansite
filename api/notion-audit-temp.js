'use strict';
const archive=require('../lib/chunbong-content-archive-api.js');
const URLS=[
  'https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d',
  'https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975',
  'https://sdmv.notion.site/what'
];
module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;return res.end('method_not_allowed')}
  const rows=[];
  for(const url of URLS){
    try{
      const meta=await archive._internals.fetchSourceMeta(url);
      rows.push({
        url,
        ok:true,
        title:meta.title||'',
        strategy:meta.strategy||'',
        pageId:meta.pageId||'',
        pageCount:meta.pageCount||0,
        sectionCount:meta.sectionCount||0,
        outline:Array.isArray(meta.outline)?meta.outline:[],
        sections:Array.isArray(meta.sections)?meta.sections.map(s=>({
          id:s.id,title:s.title,depth:s.depth,headings:s.headings,lineCount:s.lineCount,text:s.text
        })):[]
      });
    }catch(error){rows.push({url,ok:false,error:String(error&&error.message||error)})}
  }
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.statusCode=200;
  res.end(JSON.stringify({rows}));
};
