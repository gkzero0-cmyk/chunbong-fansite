(() => {
  'use strict';

  function installStylesheetRecovery(){
    window.addEventListener('error',event=>{
      const link=event.target;
      if(!link||String(link.tagName||'').toUpperCase()!=='LINK')return;
      if(String(link.rel||'').toLowerCase()!=='stylesheet')return;
      if(link.dataset.styleRetry==='1')return;
      const raw=link.getAttribute('href');
      if(!raw)return;
      let url;
      try{url=new URL(raw,location.href)}catch{return}
      if(url.origin!==location.origin)return;
      link.dataset.styleRetry='1';
      url.searchParams.set('style-retry',String(Date.now()));
      link.href=url.toString();
    },true);
  }

  installStylesheetRecovery();

  let theme = 'dark';
  try {
    const stored = localStorage.getItem('chunbong-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
