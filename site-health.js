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
})();