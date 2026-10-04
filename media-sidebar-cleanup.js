(()=>{
  'use strict';
  const page=document.body?.dataset?.page||'';
  if(!['vod','clips','youtube'].includes(page))return;

  function clean(){
    document.querySelectorAll('.media-section-switcher,[data-content-filter]').forEach(node=>node.remove());
    const sidebar=document.querySelector('.media-sidebar');
    const navs=[...document.querySelectorAll('.media-local-nav')];
    if(!navs.length)return;
    const primary=sidebar?.querySelector('.media-local-nav')||navs[0];
    navs.forEach(nav=>{if(nav!==primary)nav.remove()});
  }

  clean();
  const root=document.querySelector('.media-sidebar')||document.querySelector('.video-layout')||document.body;
  const observer=new MutationObserver(clean);
  observer.observe(root,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
