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
document.addEventListener('click',event=>{
 const target=event.target.closest('a,button');if(!target)return;
 const nav=target.closest('.main-nav,.pwa-app-tabbar,.pwa-app-more-grid');
 if(nav){const label=(target.dataset.nav||target.dataset.morePage||target.textContent||'').trim().slice(0,80);if(label)add({type:'menu_click',target:label})}
 const feedback=target.closest('[data-feedback-open]');if(feedback)add({type:'feedback_open'});
},{passive:true});
document.addEventListener('chunbong:game-start',event=>add({type:'game_start',target:String(event.detail?.game||document.body.dataset.game||'game').slice(0,80)}));
document.addEventListener('chunbong:game-finish',event=>add({type:'game_finish',target:String(event.detail?.game||document.body.dataset.game||'game').slice(0,80)}));
document.addEventListener('chunbong:tarot-start',()=>add({type:'tarot_start'}));
document.addEventListener('chunbong:tarot-result',()=>add({type:'tarot_result'}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){activeTick();visibleAt=0;void flush({beacon:true})}else visibleAt=performance.now()});
window.addEventListener('pagehide',()=>{void flush({beacon:true})});
setInterval(()=>{if(document.visibilityState==='visible'){activeTick();void flush()}},15000);
setTimeout(flush,1200);
window.ChunbongAnalytics={track:(type,target='')=>add({type,target})};
})();