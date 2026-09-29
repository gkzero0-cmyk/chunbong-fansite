(()=>{
'use strict';
if(document.body?.dataset?.page==='operator'||navigator.doNotTrack==='1')return;
const ENDPOINT='/api/content?type=site-analytics-event';
const VISITOR_KEY='chunbong:analytics:visitor:v1',FIRST_KEY='chunbong:analytics:first:v1',SESSION_KEY='chunbong:analytics:session:v1';
const uuid=()=>crypto.randomUUID?.()||('a'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
function stored(store,key,make){try{let v=store.getItem(key);if(!v){v=make();store.setItem(key,v)}return v}catch{return make()}}
const visitorId=stored(localStorage,VISITOR_KEY,uuid),sessionId=stored(sessionStorage,SESSION_KEY,uuid);
const PERF_SAMPLE_RATE=.2,API_SAMPLE_RATE=.1;
const visitorBucket=(()=>{let hash=0;for(let i=0;i<visitorId.length;i++)hash=(hash*31+visitorId.charCodeAt(i))>>>0;return hash%1000})();
const perfSample=(()=>{
 return visitorBucket<PERF_SAMPLE_RATE*1000;
})();
const apiSample=visitorBucket<API_SAMPLE_RATE*1000;
const apiNetworkCounts=new Map();
let visitorState='returning';try{if(!localStorage.getItem(FIRST_KEY)){localStorage.setItem(FIRST_KEY,String(Date.now()));visitorState='new'}}catch{}
const device=()=>{const w=Math.min(innerWidth,screen.width||innerWidth);return w<=760?'mobile':w<=1100?'tablet':'desktop'};
const pwa=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const theme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
const page=()=>location.pathname||'/';
const BUDGET_PAUSE_KEY='chunbong:analytics:budget-pause:v1';
const DEFERRED_KEY='chunbong:analytics:deferred:v1';
const DEFERRED_TTL_MS=48*60*60*1000,DEFERRED_MAX_EVENTS=120,DEFERRED_MAX_BATCHES=12,DEFERRED_BATCH_SIZE=20;
let budgetPausedUntil=0;
try{budgetPausedUntil=Number(localStorage.getItem(BUDGET_PAUSE_KEY)||0)||0}catch{}
const analyticsPaused=()=>budgetPausedUntil>Date.now();
function pauseAnalytics(seconds=21600){
 budgetPausedUntil=Date.now()+Math.max(300,Number(seconds)||21600)*1000;
 try{localStorage.setItem(BUDGET_PAUSE_KEY,String(budgetPausedUntil))}catch{}
}
function prepareEvent(event={}){
 const occurredAt=Number(event.occurredAt);
 return{...event,page:String(event.page||page()).slice(0,160),occurredAt:Number.isFinite(occurredAt)?occurredAt:Date.now()};
}
function deferredSafeEvent(event={}){
 const row=prepareEvent(event),type=String(row.type||'').slice(0,32);
 if(!type)return null;
 const out={type,page:String(row.page||'/').slice(0,160),occurredAt:Math.round(Number(row.occurredAt)||Date.now())};
 if(row.target!==undefined){
  const target=String(row.target||'').slice(0,80);
  if((type==='search_query'||type==='search_result_click')&&(/https?:\/\/|www\.|@/i.test(target)||/\d{7,}/.test(target)))return null;
  out.target=target;
 }
 for(const key of ['device','theme','visitorState','metric','resultKind','resultLabel'])if(row[key]!==undefined)out[key]=String(row[key]).slice(0,key==='resultLabel'?80:40);
 for(const key of ['activeMs','durationMs','value','resultCount','count'])if(Number.isFinite(Number(row[key])))out[key]=Number(row[key]);
 if(row.pwa!==undefined)out.pwa=Boolean(row.pwa);
 return out;
}
function readDeferred(){
 try{
  const parsed=JSON.parse(localStorage.getItem(DEFERRED_KEY)||'[]');
  const cutoff=Date.now()-DEFERRED_TTL_MS,source=Array.isArray(parsed)?parsed:[];
  const batches=source.map(batch=>{
   const createdAt=Number(batch?.createdAt)||0,session=String(batch?.sessionId||'');
   if(createdAt<cutoff||!/^[A-Za-z0-9_-]{12,96}$/.test(session))return null;
   const events=(Array.isArray(batch?.events)?batch.events:[]).map(deferredSafeEvent).filter(Boolean).slice(0,DEFERRED_BATCH_SIZE);
   return events.length?{id:String(batch?.id||uuid()),sessionId:session,createdAt,events}:null;
  }).filter(Boolean).slice(-DEFERRED_MAX_BATCHES);
  let total=batches.reduce((sum,batch)=>sum+batch.events.length,0);
  while(total>DEFERRED_MAX_EVENTS&&batches.length){
   const overflow=total-DEFERRED_MAX_EVENTS,first=batches[0];
   if(first.events.length<=overflow){total-=first.events.length;batches.shift()}
   else{first.events.splice(0,overflow);total-=overflow}
  }
  return batches;
 }catch{return[]}
}
function writeDeferred(batches=[]){
 try{
  if(!batches.length)localStorage.removeItem(DEFERRED_KEY);
  else localStorage.setItem(DEFERRED_KEY,JSON.stringify(batches));
 }catch{}
}
function deferEvents(events=[],sourceSessionId=sessionId){
 const safe=(Array.isArray(events)?events:[]).map(deferredSafeEvent).filter(Boolean);
 if(!safe.length)return;
 const batches=readDeferred();
 while(safe.length){
  const last=batches[batches.length-1],room=last&&last.sessionId===sourceSessionId?DEFERRED_BATCH_SIZE-last.events.length:0;
  if(room>0)last.events.push(...safe.splice(0,room));
  else batches.push({id:uuid(),sessionId:sourceSessionId,createdAt:Date.now(),events:safe.splice(0,DEFERRED_BATCH_SIZE)});
 }
 while(batches.length>DEFERRED_MAX_BATCHES)batches.shift();
 let total=batches.reduce((sum,batch)=>sum+batch.events.length,0);
 while(total>DEFERRED_MAX_EVENTS&&batches.length){
  const overflow=total-DEFERRED_MAX_EVENTS,first=batches[0];
  if(first.events.length<=overflow){total-=first.events.length;batches.shift()}
  else{first.events.splice(0,overflow);total-=overflow}
 }
 writeDeferred(batches);
}
function removeDeferred(id){
 const batches=readDeferred().filter(batch=>batch.id!==id);
 writeDeferred(batches);
}
let queue=[],visibleAt=document.visibilityState==='visible'?performance.now():0,activePending=0,sending=false;
function enqueue(event,{autoFlush=true}={}){
 const row=prepareEvent(event);
 if(analyticsPaused()){deferEvents([row],sessionId);return}
 queue.push(row);if(autoFlush&&queue.length>=8)flush();
}
function add(event){enqueue(event)}
function activeTick(){
 if(!visibleAt)return;
 const now=performance.now(),delta=Math.max(0,now-visibleAt);visibleAt=now;activePending+=delta;
 while(activePending>=300000){add({type:'active_time',activeMs:300000});activePending-=300000}
}
function flushApiNetworkCounts(){
 if(!apiSample||!apiNetworkCounts.size)return;
 for(const [target,count] of apiNetworkCounts)enqueue({type:'api_network',target,count:Math.max(1,Math.min(100,Math.round(count)))},{autoFlush:false});
 apiNetworkCounts.clear();
}
async function flush({beacon=false}={}){
 activeTick();if(activePending>=120000){enqueue({type:'active_time',page:page(),activeMs:Math.round(activePending)},{autoFlush:false});activePending=0}
 flushApiNetworkCounts();
 if(analyticsPaused()){
  if(queue.length)deferEvents(queue.splice(0),sessionId);
  return;
 }
 if(sending)return;
 const deferred=!beacon?readDeferred()[0]:null;
 if(!deferred&&!queue.length)return;
 const events=deferred?deferred.events.slice(0,DEFERRED_BATCH_SIZE):queue.splice(0,DEFERRED_BATCH_SIZE);
 const payloadSessionId=deferred?.sessionId||sessionId,payload=JSON.stringify({visitorId,sessionId:payloadSessionId,events});
 if(beacon&&navigator.sendBeacon){try{navigator.sendBeacon(ENDPOINT,new Blob([payload],{type:'application/json'}));return}catch{}}
 sending=true;
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true});
  if(response.status===202){
   const data=await response.json().catch(()=>null);
   if(!deferred)deferEvents(events,payloadSessionId);
   pauseAnalytics(data?.retryAfterSeconds||21600);
  }else if(response.ok){
   if(deferred)removeDeferred(deferred.id);
  }else if(!deferred)queue.unshift(...events);
 }catch{
  if(!deferred)queue.unshift(...events);
 }finally{
  sending=false;
  if(!analyticsPaused()&&(queue.length||readDeferred().length))setTimeout(flush,500);
 }
}
add({type:'page_view',device:device(),pwa:pwa(),theme:theme(),visitorState});
function reportNavigationTiming(){
 if(!perfSample)return;
 const entry=performance.getEntriesByType?.('navigation')?.[0];
 const ms=Math.round(Number(entry?.domContentLoadedEventEnd||entry?.duration||0));
 if(ms>0&&ms<=15000)add({type:'navigation_timing',durationMs:ms});
}
if(document.readyState==='complete')setTimeout(reportNavigationTiming,0);
else window.addEventListener('load',()=>setTimeout(reportNavigationTiming,0),{once:true});

const vitalState={lcp:0,cls:0,clsWindow:0,clsWindowStart:0,clsWindowLast:0,inp:new Map(),supported:{lcp:false,cls:false,inp:false},sent:false};
function observeWebVitals(){
 if(!perfSample||typeof PerformanceObserver!=='function')return;
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
 if(vitalState.sent||!perfSample)return;vitalState.sent=true;
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
function recordApiNetwork(target='',count=1){
 if(!apiSample)return;
 const key=String(target||'').slice(0,60);if(!key)return;
 apiNetworkCounts.set(key,(apiNetworkCounts.get(key)||0)+Math.max(1,Math.min(20,Number(count)||1)));
}
const pendingApi=Array.isArray(window.__ChunbongApiNetworkQueue)?window.__ChunbongApiNetworkQueue.splice(0):[];
for(const target of pendingApi)recordApiNetwork(target,1);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){activeTick();visibleAt=0;reportWebVitals();void flush({beacon:true})}else visibleAt=performance.now()});
window.addEventListener('pagehide',()=>{reportWebVitals();void flush({beacon:true})});
setInterval(()=>{if(document.visibilityState==='visible'){activeTick();void flush()}},120000);
setTimeout(flush,1200);
const pending=Array.isArray(window.__ChunbongAnalyticsQueue)?window.__ChunbongAnalyticsQueue.splice(0):[];
for(const event of pending){if(event&&typeof event==='object'&&event.type)add(event)}
window.ChunbongAnalytics={track:(type,target='',extra={})=>{
 if(type==='api_network'){recordApiNetwork(target,extra?.count||1);return}
 add({type,target,...(extra&&typeof extra==='object'?extra:{})})
}};
})();