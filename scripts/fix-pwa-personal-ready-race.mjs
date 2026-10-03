import fs from 'node:fs';
const file='mobile-site.js';
let source=fs.readFileSync(file,'utf8');
const from=`  async function renderInstalledHome(){
    if(!mobile.matches||body.dataset.page!=='home')return;
    const root=document.querySelector('[data-app-home-panel]');
    if(!root)return;
    body.classList.add('mobile-home-dashboard-mode');
    if(appMode)body.classList.add('pwa-home-dashboard-mode');
    const personal=window.ChunbongPersonal?.read?.()||{};
    const challenge=window.ChunbongPersonal?.dailyChallenge?.();
    const recent=personal.recent||null;
    root.setAttribute('aria-live','polite');
    root.innerHTML='<div class="pwa-dashboard-loading">오늘의 팬허브를 준비하고 있어요.</div>';
`;
const to=`  async function renderInstalledHome(){
    if(!mobile.matches||body.dataset.page!=='home')return;
    const root=document.querySelector('[data-app-home-panel]');
    if(!root)return;
    body.classList.add('mobile-home-dashboard-mode');
    if(appMode)body.classList.add('pwa-home-dashboard-mode');
    root.setAttribute('aria-live','polite');
    root.innerHTML='<div class="pwa-dashboard-loading">오늘의 팬허브를 준비하고 있어요.</div>';
    if(appMode&&!window.ChunbongPersonal){
      await new Promise(resolve=>{
        let settled=false;
        const done=()=>{if(settled)return;settled=true;clearTimeout(timer);document.removeEventListener('chunbong:personal-updated',done);resolve()};
        const timer=setTimeout(done,1400);
        document.addEventListener('chunbong:personal-updated',done,{once:true});
      });
    }
    const personal=window.ChunbongPersonal?.read?.()||{};
    const challenge=window.ChunbongPersonal?.dailyChallenge?.();
    const recent=personal.recent||null;
`;
if(!source.includes(from))throw new Error('mobile-site PWA dashboard patch target missing');
source=source.replace(from,to);
fs.writeFileSync(file,source);
console.log('PWA personal readiness race fixed');
