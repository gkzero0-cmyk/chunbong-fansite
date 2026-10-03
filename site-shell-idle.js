(()=>{
'use strict';
if(window.__chunbongIdleShellInstalled)return;
window.__chunbongIdleShellInstalled=true;
const schedule=(fn,{timeout=1800}={})=>'requestIdleCallback'in window?requestIdleCallback(()=>fn(),{timeout}):setTimeout(fn,Math.min(timeout,700));
window.ChunbongIdle={schedule};
const loadScript=(src,attr='data-idle-runtime')=>{if(document.querySelector(`script[src="${src}"]`))return;const n=document.createElement('script');n.src=src;n.defer=true;n.setAttribute(attr,'true');document.head.appendChild(n)};
const loadStyle=(href,attr)=>{if(document.querySelector(`link[${attr}]`))return;const n=document.createElement('link');n.rel='stylesheet';n.href=href;n.setAttribute(attr,'true');document.head.appendChild(n)};

const warmed=new Set();
const timers=new WeakMap();
function shouldPrefetch(connection=navigator.connection){const type=String(connection?.effectiveType||'').toLowerCase();return connection?.saveData!==true&&!['slow-2g','2g'].includes(type)}
function prefetch(value){
  if(!shouldPrefetch()||warmed.size>=4)return false;
  let url;try{url=new URL(value,location.href)}catch{return false}
  // same-origin navigation only; never prefetch API/operator/external resources.
  if(url.origin!==location.origin||!/^https?:$/.test(url.protocol)||url.pathname.startsWith('/api/')||url.pathname.startsWith('/operator'))return false;
  if(!(url.pathname==='/'||/\.html$/.test(url.pathname)))return false;
  url.hash='';const key=url.pathname+url.search;
  if(key===location.pathname+location.search||warmed.has(key))return false;
  warmed.add(key);const link=document.createElement('link');link.rel='prefetch';link.href=key;link.dataset.navigationPrefetch='true';document.head.appendChild(link);return true;
}
window.ChunbongNavigationPrefetch={shouldPrefetch,prefetch};
function anchorFor(target){const a=target?.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return null;return a}
function intent(event){const a=anchorFor(event.target);if(!a)return;clearTimeout(timers.get(a));timers.set(a,setTimeout(()=>prefetch(a.href),120))}
document.addEventListener('pointerenter',intent,true);
document.addEventListener('focusin',intent,true);
document.addEventListener('touchstart',event=>{const a=anchorFor(event.target);if(a)prefetch(a.href)},{passive:true,capture:true});
document.addEventListener('click',event=>{const a=anchorFor(event.target);if(!a)return;let url;try{url=new URL(a.href,location.href)}catch{return}if(url.origin===location.origin)document.documentElement.classList.add('is-navigating')},true);
window.addEventListener('pageshow',()=>document.documentElement.classList.remove('is-navigating'));

schedule(()=>loadScript('site-health.js'),{timeout:2200});
schedule(()=>loadScript('site-improvements.js?v=2'),{timeout:1800});
schedule(()=>loadScript('site-meta.js'),{timeout:2600});
const page=document.body?.dataset?.page||'';
const loadPersonal=()=>{loadStyle('personal-hub.css','data-personal-hub-styles');loadScript('personal-hub.js','data-personal-hub-runtime')};
schedule(loadPersonal,{timeout:['home','myhub','tarot'].includes(page)?900:2600});

const changelogLink=document.querySelector('.changelog-button');
if(changelogLink){
  const KEY='chunbong-changelog-seen-v2',dot=changelogLink.querySelector('.changelog-unread-dot'),REFRESH=60000;
  let at=0,pending=null;
  const setUnread=value=>{if(dot)dot.hidden=!value;changelogLink.classList.toggle('has-unread',!!value);const text=value?'업데이트 일지 · 새 업데이트 있음':'업데이트 일지';changelogLink.setAttribute('aria-label',text);changelogLink.title=text};
  const markSeen=key=>{if(key)try{localStorage.setItem(KEY,String(key))}catch{};setUnread(false)};
  document.addEventListener('chunbong:changelog-ready',event=>markSeen(event.detail?.latestKey||''));
  const check=({force=false}={})=>{const now=Date.now();if(!force&&at&&now-at<REFRESH)return pending||Promise.resolve();if(pending)return pending;at=now;pending=(async()=>{try{const payload=window.ChunbongCache?await window.ChunbongCache.fetchJson('changelog-summary','/api/content?type=changelog-history&summary=1',{ttl:REFRESH,force,staleIfError:true}):await fetch('/api/content?type=changelog-history&summary=1',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject());const key=payload.latest?.sha||payload.latest?.shortSha||'';if(!key)return setUnread(false);if(page==='changelog')return markSeen(key);let seen='';try{seen=localStorage.getItem(KEY)||''}catch{}setUnread(seen!==key)}catch{setUnread(false)}finally{pending=null}})();return pending};
  schedule(()=>void check(),{timeout:2000});
  window.addEventListener('focus',()=>void check());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check()});
}

schedule(()=>{
 const h=document.querySelector('.site-header');if(!h)return;
 h.querySelectorAll('.header-live[href*="sooplive.com"]').forEach(n=>n.remove());
 loadStyle('activity-center.css','data-activity-center-styles');loadScript('activity-center.js','data-activity-center-runtime');
},{timeout:1800});
})();
