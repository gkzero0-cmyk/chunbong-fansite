(()=>{
'use strict';
if(document.body?.dataset?.page==='operator'||navigator.doNotTrack==='1')return;
const ENDPOINT='/api/content?type=site-analytics-event';
const VISITOR_KEY='chunbong:analytics:visitor:v1',FIRST_KEY='chunbong:analytics:first:v1',SESSION_KEY='chunbong:analytics:session:v1';
const uuid=()=>crypto.randomUUID?.()||('a'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
function stored(store,key,make){try{let v=store.getItem(key);if(!v){v=make();store.setItem(key,v)}return v}catch{return make()}}
const visitorId=stored(localStorage,VISITOR_KEY,uuid),sessionId=stored(sessionStorage,SESSION_KEY,uuid);
let visitorState='returning';try{if(!localStorage.getItem(FIRST_KEY)){localStorage.setItem(FIRST_KEY,String(Date.now()));visitorState='new'}}catch{}
const device=()=>{const w=Math.min(innerWidth,screen.width||innerWidth);return w<=760?'mobile':w<=1100?'tablet':'desktop'};
const pwa=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const theme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
const page=()=>location.pathname||'/';
let queue=[],visibleAt=document.visibilityState==='visible'?performance.now():0,activePending=0,sending=false;
function add(event){queue.push({...event,page:page()});if(queue.length>=8)flush()}
function activeTick(){
 if(!visibleAt)return;
 const now=performance.now(),delta=Math.max(0,now-visibleAt);visibleAt=now;activePending+=delta;
 while(activePending>=15000){add({type:'active_time',activeMs:15000});activePending-=15000}
}
async function flush({beacon=false}={}){
 activeTick();if(activePending>=1000){queue.push({type:'active_time',page:page(),activeMs:Math.round(activePending)});activePending=0}
 if(!queue.length||sending)return;
 const events=queue.splice(0,20),payload=JSON.stringify({visitorId,sessionId,events});
 if(beacon&&navigator.sendBeacon){try{navigator.sendBeacon(ENDPOINT,new Blob([payload],{type:'application/json'}));return}catch{}}
 sending=true;try{await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true})}catch{}finally{sending=false;if(queue.length)setTimeout(flush,500)}
}
add({type:'page_view',device:device(),pwa:pwa(),theme:theme(),visitorState});
function reportNavigationTiming(){
 const entry=performance.getEntriesByType?.('navigation')?.[0];
 const ms=Math.round(Number(entry?.domContentLoadedEventEnd||entry?.duration||0));
 if(ms>0&&ms<=15000)add({type:'navigation_timing',durationMs:ms});
}
if(document.readyState==='complete')setTimeout(reportNavigationTiming,0);
else window.addEventListener('load',()=>setTimeout(reportNavigationTiming,0),{once:true});

const vitalState={lcp:0,cls:0,clsWindow:0,clsWindowStart:0,clsWindowLast:0,inp:new Map(),supported:{lcp:false,cls:false,inp:false},sent:false};
function observeWebVitals(){
 if(typeof PerformanceObserver!=='function')return;
 const supported=PerformanceObserver.supportedEntryTypes||[];
 if(supported.includes('largest-contentful-paint')){
  vitalState.supported.lcp=true;
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())vitalState.lcp=Math.max(vitalState.lcp,Number(entry.startTime)||0)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}
 }
 if(supported.includes('layout-shift')){
  vitalState.supported.cls=true;
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){
   if(entry.hadRecentInput)continue;
   const at=Number(entry.startTime)||0,value=Number(entry.value)||0;
   if(vitalState.clsWindowStart&&at-vitalState.clsWindowLast<1000&&at-vitalState.clsWindowStart<5000)vitalState.clsWindow+=value;
   else{vitalState.clsWindow=value;vitalState.clsWindowStart=at}
   vitalState.clsWindowLast=at;vitalState.cls=Math.max(vitalState.cls,vitalState.clsWindow);
  }}).observe({type:'layout-shift',buffered:true})}catch{}
 }
 if(supported.includes('event')){
  vitalState.supported.inp=true;
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){
   const id=Number(entry.interactionId)||0,duration=Number(entry.duration)||0;if(!id||!duration)continue;
   vitalState.inp.set(id,Math.max(vitalState.inp.get(id)||0,duration));
   if(vitalState.inp.size>250){const rows=[...vitalState.inp.entries()].sort((a,b)=>b[1]-a[1]).slice(0,200);vitalState.inp=new Map(rows)}
  }}).observe({type:'event',buffered:true,durationThreshold:40})}catch{}
 }
}
function reportWebVitals(){
 if(vitalState.sent)return;vitalState.sent=true;
 if(vitalState.supported.lcp&&vitalState.lcp>0)add({type:'web_vital',metric:'lcp',value:Math.round(vitalState.lcp)});
 if(vitalState.supported.cls)add({type:'web_vital',metric:'cls',value:Math.round(vitalState.cls*10000)/10000});
 if(vitalState.supported.inp&&vitalState.inp.size){
  const values=[...vitalState.inp.values()].sort((a,b)=>b-a),index=Math.min(values.length-1,Math.floor(values.length/50));
  add({type:'web_vital',metric:'inp',value:Math.round(values[index]||0)});
 }
}
observeWebVitals();
document.addEventListener('click',event=>{
 const target=event.target.closest('a,button');if(!target)return;
 const nav=target.closest('.main-nav,.pwa-app-tabbar,.pwa-app-more-grid');
 if(nav){const label=(target.dataset.nav||target.dataset.morePage||target.textContent||'').trim().slice(0,80);if(label)add({type:'menu_click',target:label})}
 const feedback=target.closest('[data-feedback-open]');if(feedback)add({type:'feedback_open'});
},{passive:true});
const gameRoot=document.querySelector('[data-game-status]');
if(gameRoot){
 let previousGameStatus=gameRoot.dataset.gameStatus||'';
 new MutationObserver(()=>{
   const next=gameRoot.dataset.gameStatus||'';
   if(next===previousGameStatus)return;
   if(next==='playing'&&previousGameStatus!=='paused')add({type:'game_start',target:document.body.dataset.game||'game'});
   if(next==='gameover')add({type:'game_finish',target:document.body.dataset.game||'game'});
   previousGameStatus=next;
 }).observe(gameRoot,{attributes:true,attributeFilter:['data-game-status']});
}
const tarotSetup=document.querySelector('#tarot-setup');
tarotSetup?.addEventListener('submit',()=>add({type:'tarot_start'}),{passive:true});
const tarotReading=document.querySelector('#tarot-reading-grid');
if(tarotReading){
 let tarotResultSent=false;
 new MutationObserver(()=>{if(!tarotResultSent&&tarotReading.querySelector('.tarot-card-result')){tarotResultSent=true;add({type:'tarot_result'})}}).observe(tarotReading,{childList:true,subtree:true});
}
document.addEventListener('chunbong:game-start',event=>add({type:'game_start',target:String(event.detail?.game||document.body.dataset.game||'game').slice(0,80)}));
document.addEventListener('chunbong:game-finish',event=>add({type:'game_finish',target:String(event.detail?.game||document.body.dataset.game||'game').slice(0,80)}));
document.addEventListener('chunbong:tarot-start',()=>add({type:'tarot_start'}));
document.addEventListener('chunbong:tarot-result',()=>add({type:'tarot_result'}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){activeTick();visibleAt=0;reportWebVitals();void flush({beacon:true})}else visibleAt=performance.now()});
window.addEventListener('pagehide',()=>{reportWebVitals();void flush({beacon:true})});
setInterval(()=>{if(document.visibilityState==='visible'){activeTick();void flush()}},15000);
setTimeout(flush,1200);
const pending=Array.isArray(window.__ChunbongAnalyticsQueue)?window.__ChunbongAnalyticsQueue.splice(0):[];
for(const event of pending){if(event&&typeof event==='object'&&event.type)add(event)}
window.ChunbongAnalytics={track:(type,target='',extra={})=>add({type,target,...(extra&&typeof extra==='object'?extra:{})})};
})();