(()=>{
  'use strict';
  const ENDPOINT='/api/content?type=analytics-event';
  const VISITOR_KEY='chunbong-analytics-id-v1';
  const SESSION_KEY='chunbong-analytics-session-v1';
  const LAST_PATH_KEY='chunbong-analytics-last-path-v1';
  const SESSION_GAP=30*60*1000;
  const HEARTBEAT=60000;

  const uuid=()=>{
    try{return crypto.randomUUID();}catch{return String(Date.now())+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);}
  };
  const read=(store,key)=>{try{return store.getItem(key)||'';}catch{return'';}};
  const write=(store,key,value)=>{try{store.setItem(key,value);}catch{}};
  let visitorId=read(localStorage,VISITOR_KEY);
  if(!visitorId){visitorId=uuid();write(localStorage,VISITOR_KEY,visitorId);}

  let sessionId='';
  try{
    const row=JSON.parse(read(localStorage,SESSION_KEY)||'null');
    if(row?.id&&Date.now()-Number(row.lastSeen||0)<SESSION_GAP)sessionId=String(row.id);
  }catch{}
  if(!sessionId)sessionId=uuid();
  const touchSession=()=>write(localStorage,SESSION_KEY,JSON.stringify({id:sessionId,lastSeen:Date.now()}));
  touchSession();

  const path=location.pathname||'/';
  const fromPath=read(sessionStorage,LAST_PATH_KEY);
  write(sessionStorage,LAST_PATH_KEY,path);
  const device=()=>{
    const width=Math.min(window.innerWidth||9999,window.innerHeight||9999);
    if(width<=760)return'mobile';
    if(width<=1100&&navigator.maxTouchPoints>0)return'tablet';
    return'desktop';
  };
  const pwa=Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  const theme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
  const base=()=>({visitorId,sessionId,path,device:device(),pwa,theme:theme()});

  const send=(event,data={},preferBeacon=false)=>{
    touchSession();
    const payload={...base(),event,...data};
    const body=JSON.stringify(payload);
    if(preferBeacon&&navigator.sendBeacon){
      try{if(navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'application/json'})))return;}catch{}
    }
    fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body,keepalive:preferBeacon,credentials:'same-origin'}).catch(()=>{});
  };

  send('page_view',{fromPath});

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('a,button,[role="button"]');
    if(!target)return;
    const nav=target.dataset?.nav||target.dataset?.appTab||target.dataset?.mobileTab||'';
    if(nav){send('menu_click',{name:String(nav).slice(0,64)});return;}
    const id=target.id||target.dataset?.action||'';
    if(id)send('feature_click',{name:String(id).slice(0,64)});
  },{capture:true,passive:true});

  let activeSince=document.visibilityState==='visible'?performance.now():0;
  const flushActive=()=>{
    if(!activeSince)return;
    const now=performance.now(),delta=Math.max(0,Math.min(60000,now-activeSince));
    activeSince=document.visibilityState==='visible'?now:0;
    if(delta>=500)send('active_time',{deltaMs:Math.round(delta)},true);
  };
  const timer=setInterval(()=>{if(document.visibilityState==='visible')flushActive();},HEARTBEAT);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')flushActive();
    else if(!activeSince)activeSince=performance.now();
  });
  window.addEventListener('pagehide',()=>{flushActive();clearInterval(timer);},{once:true});
  window.ChunbongAnalytics=Object.freeze({track:(name,data={})=>send('feature_click',{name,...data}),visitorId:()=>visitorId});
})();