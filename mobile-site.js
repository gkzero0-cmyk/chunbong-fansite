(()=>{
  'use strict';
  const body=document.body;
  if(!body?.dataset?.page||body.dataset.game)return;

  const mobile=window.matchMedia('(max-width:760px)');
  const header=document.querySelector('.site-header');
  const nav=document.getElementById('main-nav');
  const toggle=document.querySelector('.nav-toggle');

  function syncNavLock(){
    if(!mobile.matches){
      body.classList.remove('mobile-site-nav-open');
      return;
    }
    body.classList.toggle('mobile-site-nav-open',Boolean(nav?.classList.contains('open')));
  }

  function closeNav(){
    if(!nav?.classList.contains('open'))return;
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded','false');
    body.classList.remove('mobile-site-nav-open');
  }

  toggle?.addEventListener('click',()=>requestAnimationFrame(syncNavLock));
  nav?.addEventListener('click',event=>{
    if(event.target.closest('a'))requestAnimationFrame(syncNavLock);
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mobile.matches&&nav?.classList.contains('open')){
      closeNav();
      toggle?.focus();
    }
  });

  document.addEventListener('click',event=>{
    if(!mobile.matches||!nav?.classList.contains('open'))return;
    if(nav.contains(event.target)||toggle?.contains(event.target))return;
    closeNav();
  });

  function syncHeader(){
    if(!header)return;
    header.classList.toggle('is-mobile-scrolled',mobile.matches&&window.scrollY>16);
  }

  function syncViewport(){
    const height=window.visualViewport?.height||window.innerHeight;
    document.documentElement.style.setProperty('--mobile-visual-height',height+'px');
  }

  const horizontalSelectors=[
    '.schedule-view-toolbar','.schedule-week-nav','.schedule-calendar-scroll',
    '.clip-tabs','.youtube-tabs','.hero-tags','.footer-links',
    '.data-platform-tabs','.data-soop-view-tabs','.data-period-controls',
    '.data-detail-table','.data-calendar-wrap'
  ];
  function labelScrollable(){
    if(!mobile.matches)return;
    horizontalSelectors.forEach(selector=>{
      document.querySelectorAll(selector).forEach(node=>{
        node.dataset.mobileScrollable='true';
      });
    });
  }

  mobile.addEventListener?.('change',()=>{
    syncNavLock();
    syncHeader();
    syncViewport();
    labelScrollable();
  });
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  window.addEventListener('resize',()=>{syncViewport();labelScrollable()},{passive:true});
  window.addEventListener('scroll',syncHeader,{passive:true});

  syncNavLock();
  syncHeader();
  syncViewport();
  labelScrollable();
})();