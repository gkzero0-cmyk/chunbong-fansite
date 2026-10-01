(()=>{
'use strict';
const API='/api/content?type=';
const root=document.getElementById('operator-protected-root');
const dashboard=document.getElementById('operator-dashboard');
async function authenticated(){
  try{const response=await fetch(API+'operator-session',{headers:{accept:'application/json'},cache:'no-store'});return response.ok}catch{return false}
}
function extractDashboard(html=''){
  const template=document.createElement('template');template.innerHTML=String(html).trim();
  return template.content.querySelector('#operator-dashboard');
}
async function localTestMarkup(){
  if(!['localhost','127.0.0.1'].includes(location.hostname))return null;
  try{const response=await fetch('/lib/operator-dashboard-source.html',{cache:'no-store'});return response.ok?extractDashboard(await response.text()):null}catch{return null}
}
async function hydrate(){
  if(!root||!dashboard||!await authenticated())return false;
  let source=null;
  try{
    const response=await fetch(API+'operator-dashboard-markup',{headers:{accept:'text/html'},cache:'no-store'});
    if(response.ok)source=extractDashboard(await response.text());
  }catch{}
  if(!source)source=await localTestMarkup();
  if(!source)return false;
  dashboard.innerHTML=source.innerHTML;
  window.__operatorDashboardHydrated=true;
  return true;
}
function loadScript(src,{module=false}={}){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;if(module)script.type='module';
    script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
  });
}
async function loadApp(){
  await loadScript('history-data.js?v=6').catch(()=>{});
  await loadScript('operator.js?v=9',{module:true});
  await loadScript('operator-redis-diagnostics.js?v=2',{module:true}).catch(()=>{});
}
hydrate().finally(()=>void loadApp());
})();
