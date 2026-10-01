(() => {
  'use strict';
  const KEY='chunbong-site-health-v1';
  const MAX=30;
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'[]')}catch(_){return[]}};
  const write=rows=>{try{sessionStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}};
  const record=(type,message,extra={})=>{
    const rows=read();
    rows.push({type,message:String(message||'unknown error').slice(0,500),page:location.pathname,at:new Date().toISOString(),...extra});
    write(rows);
  };
  window.addEventListener('error',event=>record('error',event.message,{source:event.filename||'',line:event.lineno||0}));
  window.addEventListener('unhandledrejection',event=>record('promise',event.reason?.message||event.reason||'unhandled rejection'));
  window.ChunbongHealth={
    report:()=>({page:location.href,errors:read(),userAgent:navigator.userAgent}),
    clear:()=>{try{sessionStorage.removeItem(KEY)}catch(_){}}
  };

  // Header controls must exist before the idle phase so navigation never paints
  // a short shell and then expands. Heavy search/notification data still loads
  // only when those features are used.
  const head=document.head;
  if(head&&document.querySelector('.site-header')){
    if(!document.querySelector('link[data-site-improvements]')){
      const style=document.createElement('link');
      style.rel='stylesheet';style.href='site-improvements.css';style.dataset.siteImprovements='true';head.appendChild(style);
    }
    if(!document.querySelector('link[data-personal-hub-styles]')){
      const style=document.createElement('link');
      style.rel='stylesheet';style.href='personal-hub.css';style.dataset.personalHubStyles='true';head.appendChild(style);
    }
    const loadNow=(src,marker)=>{
      if(document.querySelector('script[src="'+src+'"],script['+marker+']'))return;
      const script=document.createElement('script');script.src=src;script.defer=true;script.setAttribute(marker,'true');head.appendChild(script);
    };
    loadNow('site-improvements.js?v=2','data-header-improvements-critical');
    loadNow('personal-hub.js','data-personal-hub-critical');
  }
})();