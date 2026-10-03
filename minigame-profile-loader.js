(()=>{
'use strict';
const root=document.querySelector('[data-minigame-profile]');if(!root)return;
let loaded=false;
const load=()=>{if(loaded||document.querySelector('script[data-minigame-profile-runtime]'))return;loaded=true;const s=document.createElement('script');s.src='minigame-profile.js';s.defer=true;s.dataset.minigameProfileRuntime='true';document.head.appendChild(s)};
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load()}},{rootMargin:'600px 0px',threshold:0.01});observer.observe(root)}
if('requestIdleCallback'in window)requestIdleCallback(load,{timeout:1500});else setTimeout(load,700);
})();
