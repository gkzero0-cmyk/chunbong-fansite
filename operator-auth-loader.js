(()=>{
  'use strict';
  const host=document.getElementById('operator-dashboard-host');
  if(!host)return;
  const dashboardUrl='/api/image?operator=dashboard';
  const ensureEmptyDashboard=()=>{
    let node=document.getElementById('operator-dashboard');
    if(node)return node;
    node=document.createElement('section');
    node.id='operator-dashboard';
    node.className='operator-dashboard';
    node.hidden=true;
    host.replaceChildren(node);
    return node;
  };
  const loadPrivateMarkup=async()=>{
    try{
      const response=await fetch(dashboardUrl,{headers:{accept:'text/html'},cache:'no-store'});
      if(response.status===401){ensureEmptyDashboard();return false}
      if(!response.ok)throw new Error('HTTP '+response.status);
      const html=await response.text();
      if(!html.includes('id="operator-dashboard"'))throw new Error('invalid_dashboard_markup');
      host.innerHTML=html;
      return true;
    }catch(_){ensureEmptyDashboard();return false}
  };
  const watchLogout=()=>{
    const login=document.getElementById('operator-login');
    if(!login||typeof MutationObserver!=='function')return;
    new MutationObserver(()=>{
      if(login.hidden)return;
      const dashboard=document.getElementById('operator-dashboard');
      if(!dashboard||!dashboard.hidden||!dashboard.children.length)return;
      dashboard.replaceChildren();
      dashboard.hidden=true;
    }).observe(login,{attributes:true,attributeFilter:['hidden']});
  };
  const interceptEmailCompletion=()=>{
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(...args)=>{
      const response=await nativeFetch(...args);
      try{
        const raw=typeof args[0]==='string'?args[0]:args[0]?.url||'';
        const url=new URL(raw,location.href);
        if(response.ok&&url.pathname==='/api/content'&&url.searchParams.get('type')==='operator-email-complete'){
          setTimeout(()=>location.replace('/operator.html?auth=success'),0);
        }
      }catch(_){}
      return response;
    };
  };
  (async()=>{
    interceptEmailCompletion();
    const authenticated=await loadPrivateMarkup();
    await import('./operator.js?v=9');
    if(authenticated)await import('./operator-redis-diagnostics.js?v=3');
    watchLogout();
  })();
})();
