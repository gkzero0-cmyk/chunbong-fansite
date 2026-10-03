(() => {
  'use strict';
  const card=document.querySelector('[data-home-smart-status]');if(!card)return;
  const STATION_URL='https://www.sooplive.com/station/chunbongtv',LIVE_URL='https://play.sooplive.com/chunbongtv';
  const label=card.querySelector('[data-status-label]'),action=card.querySelector('[data-status-action]');
  const isHttp=value=>/^https?:\/\//i.test(String(value||''));
  async function fetchJson(key,url,ttl){if(window.ChunbongCache)return window.ChunbongCache.fetchJson(key,url,{ttl,force:false,staleIfError:true});const response=await fetch(url,{headers:{accept:'application/json'}});if(!response.ok)throw new Error('HTTP '+response.status);return response.json()}
  function apply({live=false,href=STATION_URL,actionText='SOOP 방송국',title=''}={}){card.classList.remove('is-loading','is-live','is-offline');card.classList.add(live?'is-live':'is-offline');card.href=isHttp(href)?href:STATION_URL;card.dataset.broadcastState=live?'live':'offline';if(label)label.textContent=live?'LIVE':'OFFLINE';if(action)action.textContent=actionText;const accessibleTitle=live?['춘봉 LIVE',title,'지금 방송 보러가기'].filter(Boolean).join(' · '):['춘봉 OFFLINE',actionText].filter(Boolean).join(' · ');card.setAttribute('aria-label',accessibleTitle);card.title=accessibleTitle}
  let lastRefreshAt=0,lastKnownLive=false,sharedAt=0;
  async function applyPayload(livePayload,{allowVod=true}={}){if(livePayload?.live===true){lastKnownLive=true;apply({live:true,href:isHttp(livePayload.source)?livePayload.source:LIVE_URL,title:String(livePayload.title||''),actionText:'지금 방송 보러가기'});return}lastKnownLive=false;if(!allowVod){apply({live:false,href:STATION_URL,actionText:'SOOP 방송국'});return}try{const vodPayload=await fetchJson('home:smart-vod','/api/content?type=vod',120000),latest=Array.isArray(vodPayload?.items)?vodPayload.items.find(item=>isHttp(item?.link)):null;if(latest){apply({live:false,href:latest.link,actionText:'최근 방송 다시보기',title:String(latest.title||'')});return}}catch{}apply({live:false,href:STATION_URL,actionText:'SOOP 방송국'})}
  async function refresh({force=false}={}){if(document.visibilityState==='hidden')return;const minGap=lastKnownLive?40000:120000;if(!force&&Date.now()-lastRefreshAt<minGap)return;lastRefreshAt=Date.now();let livePayload=null;try{livePayload=await fetchJson('home-overview:live','/api/content?type=live',30000)}catch{}await applyPayload(livePayload)}
  document.addEventListener('chunbong:home-live',event=>{sharedAt=Date.now();lastRefreshAt=sharedAt;void applyPayload(event.detail||{live:false})});
  const cached=window.ChunbongCache?.peek?.('home-overview:live');
  if(cached){sharedAt=Date.now();lastRefreshAt=sharedAt;void applyPayload(cached)}
  const bootstrap=()=>{if(Date.now()-sharedAt<1500)return;void refresh({force:true})};
  if('requestIdleCallback'in window)requestIdleCallback(bootstrap,{timeout:1600});else setTimeout(bootstrap,700);
  let timer=window.setInterval(()=>void refresh(),60000);
  window.addEventListener('pagehide',()=>{if(timer)window.clearInterval(timer);timer=null},{once:true});
  window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh()});
})();