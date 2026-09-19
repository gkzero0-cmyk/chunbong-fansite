(() => {
  'use strict';

  const root=document.getElementById('changelog-timeline');
  const indexRoot=document.getElementById('changelog-index-list');
  if(!root||!indexRoot) return;

  let groups=(Array.isArray(window.CHUNBONG_CHANGELOG)?window.CHUNBONG_CHANGELOG:[])
    .filter(group=>group&&/^20\d{2}-\d{2}-\d{2}$/.test(String(group.date||'')))
    .map(group=>({date:group.date,items:Array.isArray(group.items)?group.items:[]}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  const titleKey=(value='')=>String(value)
    .toLowerCase()
    .replace(/\s*\(#\d+\)\s*$/,'')
    .replace(/[^0-9a-z가-힣]+/g,'')
    .trim();

  function mergeAutomaticGroups(automaticGroups=[]){
    const byDate=new Map(groups.map(group=>[group.date,{date:group.date,items:[...group.items]}]));
    const seenTitles=new Set(groups.flatMap(group=>group.items.map(item=>titleKey(item?.title||''))).filter(Boolean));

    for(const automaticGroup of Array.isArray(automaticGroups)?automaticGroups:[]){
      const date=String(automaticGroup?.date||'');
      if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))continue;
      if(!byDate.has(date))byDate.set(date,{date,items:[]});
      const target=byDate.get(date);
      for(const item of Array.isArray(automaticGroup?.items)?automaticGroup.items:[]){
        const title=String(item?.title||'').trim();
        const key=titleKey(title);
        if(!title||!key||seenTitles.has(key))continue;
        seenTitles.add(key);
        target.items.push({
          type:['new','improved','fixed'].includes(item?.type)?item.type:'improved',
          title,
          description:String(item?.description||'').trim(),
          auto:true
        });
      }
    }

    groups=[...byDate.values()]
      .filter(group=>group.items.length)
      .sort((a,b)=>b.date.localeCompare(a.date));
  }

  const labels={new:'신규',improved:'개선',fixed:'수정'};
  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const formatDate=date=>{
    const parsed=new Date(date+'T00:00:00+09:00');
    if(Number.isNaN(parsed.getTime())) return {main:date,sub:''};
    return {
      main:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(parsed),
      sub:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'long'}).format(parsed)
    };
  };

  function cardHtml(item){
    const kind=['new','improved','fixed'].includes(item?.type)?item.type:'improved';
    const description=String(item?.description||'').trim();
    return '<article class="changelog-card">'+
      '<div class="changelog-card-top"><span class="changelog-kind" data-kind="'+kind+'">'+labels[kind]+'</span><h3>'+esc(item?.title||'업데이트')+'</h3></div>'+
      (description?'<p>'+esc(description)+'</p>':'')+
    '</article>';
  }

  let dateObserver=null;
  function setActiveDate(date){
    indexRoot.querySelectorAll('a').forEach(link=>{
      const active=link.dataset.changelogIndexDate===date;
      link.classList.toggle('active',active);
      if(active){
        link.setAttribute('aria-current','true');
        if(window.innerWidth<=760)link.scrollIntoView({block:'nearest',inline:'center'});
      }else link.removeAttribute('aria-current');
    });
  }

  function setupDateObserver(){
    dateObserver?.disconnect();
    if(!('IntersectionObserver' in window))return;
    dateObserver=new IntersectionObserver(rows=>{
      const visible=rows.filter(row=>row.isIntersecting)
        .sort((a,b)=>Math.abs(a.boundingClientRect.top)-Math.abs(b.boundingClientRect.top));
      if(visible[0])setActiveDate(visible[0].target.dataset.changelogDate||'');
    },{rootMargin:'-92px 0px -62% 0px',threshold:[0,.01,.1]});
    root.querySelectorAll('.changelog-day').forEach(node=>dateObserver.observe(node));
  }

  function setupReveal(){
    const observer=('IntersectionObserver' in window)?new IntersectionObserver(rows=>{
      rows.forEach(row=>{
        if(row.isIntersecting){row.target.classList.add('visible');observer.unobserve(row.target);}
      });
    },{threshold:.03}):null;
    root.querySelectorAll('.reveal').forEach(node=>{
      if(observer)observer.observe(node);
      else node.classList.add('visible');
    });
  }

  function render(latestKey=''){
    const total=groups.reduce((sum,group)=>sum+group.items.length,0);
    const latest=document.getElementById('changelog-latest');
    const count=document.getElementById('changelog-count');
    const status=document.getElementById('changelog-sync-status');

    if(latest)latest.textContent=groups[0]?.date||'LATEST';
    if(count)count.textContent=total+'개의 주요 업데이트 · '+groups.length+'일 기록';
    if(status){
      const automaticCount=groups.reduce((sum,group)=>sum+group.items.filter(item=>item?.auto).length,0);
      status.textContent=automaticCount
        ? `직접 정리한 주요 업데이트를 우선 표시하고, main의 새 변경사항 ${automaticCount}개를 자동 동기화했습니다.`
        : '사용자에게 중요한 변경사항만 한글로 간단하게 정리했습니다.';
      status.className='changelog-sync-status is-live';
    }

    indexRoot.innerHTML=groups.map(group=>
      '<a href="#changelog-'+esc(group.date)+'" data-changelog-index-date="'+esc(group.date)+'"><span>'+esc(group.date)+'</span><small>'+group.items.length+'</small></a>'
    ).join('');

    root.innerHTML=groups.length?groups.map(group=>{
      const date=formatDate(group.date);
      return '<section class="changelog-day reveal" id="changelog-'+esc(group.date)+'" data-changelog-date="'+esc(group.date)+'">'+
        '<div class="changelog-date"><time datetime="'+esc(group.date)+'">'+esc(date.main)+'</time><small>'+esc(date.sub)+' · '+group.items.length+'개</small></div>'+
        '<div class="changelog-entries">'+group.items.map(cardHtml).join('')+'</div>'+
      '</section>';
    }).join(''):'<div class="changelog-empty">등록된 업데이트가 없습니다.</div>';

    if(groups[0])setActiveDate(groups[0].date);
    setupDateObserver();
    setupReveal();

    const resolvedKey=latestKey||('date:'+String(groups[0]?.date||'none')+':'+total);
    try{localStorage.setItem('chunbong-changelog-seen-v2',resolvedKey);}catch(_){}
    document.dispatchEvent(new CustomEvent('chunbong:changelog-ready',{detail:{latestKey:resolvedKey,latestDate:groups[0]?.date||''}}));
  }

  render();

  // 수동 한글 요약을 먼저 보여준 뒤 GitHub main의 새 유효 변경사항만 자동으로 합칩니다.
  (async()=>{
    try{
      const response=await fetch('/api/content?type=changelog-history',{headers:{accept:'application/json'}});
      if(!response.ok)throw new Error('changelog_history_unavailable');
      const payload=await response.json();
      mergeAutomaticGroups(payload.groups);
      const latestKey=payload.latest?.sha||payload.latest?.shortSha||'';
      render(latestKey);
    }catch(_){
      try{
        const response=await fetch('/api/content?type=changelog-history&summary=1',{headers:{accept:'application/json'}});
        if(!response.ok)return;
        const payload=await response.json();
        const latestKey=payload.latest?.sha||payload.latest?.shortSha||'';
        if(latestKey)render(latestKey);
      }catch(_){}
    }
  })();
})();