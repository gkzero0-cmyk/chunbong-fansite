'use strict';
const fs=require('node:fs');
const path=require('node:path');
const operatorCenter=require('./operator-center-api');
const {requireOwner}=operatorCenter._internals;

let cachedMarkup='';
function dashboardMarkup(){
  if(cachedMarkup)return cachedMarkup;
  const source=fs.readFileSync(path.join(process.cwd(),'lib','operator-dashboard-source.html'),'utf8');
  const start=source.indexOf('<section id="operator-dashboard"');
  const endMarker='</section>\n</main>';
  const end=source.lastIndexOf(endMarker);
  if(start<0||end<start)throw new Error('operator_dashboard_markup_missing');
  cachedMarkup=source.slice(start,end+'</section>'.length);
  return cachedMarkup;
}

async function handleOperatorDashboardMarkup(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'GET').toUpperCase()!=='GET')return res.status(405).json({error:'method_not_allowed'});
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(dashboardMarkup());
}

module.exports={handleOperatorDashboardMarkup,_internals:{dashboardMarkup}};
