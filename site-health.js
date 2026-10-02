(() => {
  'use strict';
  const KEY='chunbong-site-health-v1';
  const SAMPLE_KEY='chunbong-site-health-sample-v1';
  const MAX=30;
  const SAMPLE_RATE=0.02;
  const ENDPOINT='/api/content?type=client-health';
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'[]')}catch(_){return[]}};
  const write=rows=>{try{sessionStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}};
  const sanitize=value=>String(value||'unknown error')
    .replace(/https?:\/\/\S+/gi,'[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]')
    .replace(/[?&](?:token|code|key|auth|session|id)=[^\s&#]*/gi,'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,180);
  const device=()=>innerWidth<=600?'mobile':innerWidth<=1024?'tablet':innerWidth>0?'desktop':'other';
  const sampled=()=>{
    try{
      const cached=sessionStorage.getItem(SAMPLE_KEY);
      if(cached==='1'||cached==='0')return cached==='1';
      const selected=Math.random()<SAMPLE_RATE;
      sessionStorage.setItem(SAMPLE_KEY,selected?'1':'0');
      return selected;
    }catch{return false}
  };
  const send=(kind,message,extra={})=>{
    if(!sampled())return;
    const payload=JSON.stringify({kind,page:location.pathname,message:sanitize(message),device:device(),...extra});
    try{
      if(typeof navigator.sendBeacon==='function'){
        navigator.sendBeacon(ENDPOINT,new Blob([payload],{type:'application/json'}));
        return;
      }
      void fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true,credentials:'same-origin'}).catch(()=>{});
    }catch(_){ }
  };
  const record=(type,message,extra={})=>{
    const rows=read();
    rows.push({type,message:sanitize(message),page:location.pathname,at:new Date().toISOString(),...extra});
    write(rows);
    if(type==='error'||type==='promise')send(type,message);
  };
  window.addEventListener('error',event=>record('error',event.message,{source:String(event.filename||'').split('?')[0].slice(-120),line:event.lineno||0}));
  window.addEventListener('unhandledrejection',event=>record('promise',event.reason?.message||event.reason||'unhandled rejection'));
  window.addEventListener('load',()=>{
    try{
      const nav=performance.getEntriesByType?.('navigation')?.[0];
      const duration=Math.round(Number(nav?.duration)||0);
      if(duration>=2500)send('slow','slow_navigation',{durationMs:Math.min(duration,60000)});
    }catch(_){ }
  },{once:true});
  window.ChunbongHealth={
    report:()=>({page:location.href,errors:read(),userAgent:navigator.userAgent}),
    clear:()=>{try{sessionStorage.removeItem(KEY)}catch(_){}}
  };
})();