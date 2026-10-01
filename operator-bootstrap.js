(()=>{
'use strict';
const API='/api/content?type=';
const root=document.getElementById('operator-protected-root');
const dashboard=document.getElementById('operator-dashboard');
async function authenticated(){
  try{const response=await fetch(API+'operator-session',{headers:{accept:'application/json'},cache:'no-store'});return response.ok}catch{return false}
}
async function hydrate(){
  if(!root||!dashboard||!await authenticated())return;
  try{
    const response=await fetch(API+'operator-dashboard-markup',{headers:{accept:'text/html'},cache:'no-store'});
    if(!response.ok)return;
    const html=await response.text();
    const template=document.createElement('template');template.innerHTML=html.trim();
    const source=template.content.querySelector('#operator-dashboard');
    if(!source)return;
    dashboard.innerHTML=source.innerHTML;
    window.__operatorDashboardHydrated=true;
  }catch{}
}
function loadApp(){
  const script=document.createElement('script');
  script.src='operator.js?v=9';script.defer=true;document.body.appendChild(script);
}
hydrate().finally(loadApp);
})();
