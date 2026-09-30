(()=>{
  'use strict';
  const mobile=window.matchMedia('(max-width:760px)');

  function installPublicTabKeyboardUX(){
    if(globalThis.__chunbongPublicTabKeyboardUXV1)return;
    globalThis.__chunbongPublicTabKeyboardUXV1=true;
    document.querySelectorAll('[role="tablist"]').forEach(tablist=>{
      const tabs=[...tablist.querySelectorAll(':scope > [role="tab"], :scope > button')];
      if(tabs.length<2)return;
      tabs.forEach(tab=>{if(!tab.hasAttribute('role'))tab.setAttribute('role','tab')});
      const selected=()=>tabs.find(tab=>tab.getAttribute('aria-selected')==='true'||tab.classList.contains('active')||tab.classList.contains('is-active'))||tabs[0];
      const sync=()=>{const active=selected();tabs.forEach(tab=>tab.setAttribute('tabindex',tab===active?'0':'-1'));return active};
      const activate=tab=>{
        if(!tab)return;
        try{tab.focus({preventScroll:true})}catch{tab.focus()}
        tab.click();
        queueMicrotask(sync);
      };
      tablist.addEventListener('keydown',event=>{
        const current=event.target?.closest?.('[role="tab"],button');
        const index=tabs.indexOf(current);
        if(index<0)return;
        let next=null;
        if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];
        else if(event.key==='ArrowLeft')next=tabs[(index-1+tabs.length)%tabs.length];
        else if(event.key==='Home')next=tabs[0];
        else if(event.key==='End')next=tabs[tabs.length-1];
        else return;
        event.preventDefault();
        activate(next);
      });
      tablist.addEventListener('click',()=>queueMicrotask(sync));
      sync();
    });
  }

  function installArchiveMobileFilters(){
    if(!mobile.matches||document.body?.dataset?.page!=='contents')return;
    const toolbar=document.querySelector('.archive-toolbar');
    if(!toolbar||toolbar.dataset.mobileFilterReady==='true')return;
    const labels=[...toolbar.querySelectorAll(':scope > label')];
    if(labels.length<3)return;
    toolbar.dataset.mobileFilterReady='true';
    const advanced=document.createElement('div');
    advanced.className='archive-filter-advanced';
    advanced.id='archive-filter-advanced';
    advanced.hidden=true;
    labels.slice(1).forEach(label=>advanced.appendChild(label));
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='archive-filter-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls',advanced.id);
    toggle.innerHTML='<span>상세 필터</span><small>카테고리 · 상태 · 연도 · 미디어 · 정렬</small><b aria-hidden="true">＋</b>';
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      toggle.setAttribute('aria-expanded',String(open));
      advanced.hidden=!open;
      toggle.querySelector('b').textContent=open?'−':'＋';
    });
    toolbar.append(toggle,advanced);
  }

  const boot=()=>{installPublicTabKeyboardUX();installArchiveMobileFilters()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  mobile.addEventListener?.('change',event=>{if(event.matches)installArchiveMobileFilters()});
})();
