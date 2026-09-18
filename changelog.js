(() => {
  'use strict';

  const root=document.getElementById('changelog-timeline');
  const indexRoot=document.getElementById('changelog-index-list');
  if(!root||!indexRoot) return;

  const staticGroups=Array.isArray(window.CHUNBONG_CHANGELOG)?[...window.CHUNBONG_CHANGELOG]:[];
  const labels={new:'NEW',improved:'IMPROVED',fixed:'FIXED'};
  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const validDate=value=>/^20\d{2}-\d{2}-\d{2}$/.test(String(value||''));
  const normalizeTitle=value=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/g,' ').trim();
  const formatDate=date=>{
    const parsed=new Date(date+'T00:00:00+09:00');
    if(Number.isNaN(parsed.getTime())) return {main:date,sub:''};
    return {
      main:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(parsed),
      sub:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'long'}).format(parsed)
    };
  };

  function mergeGroups(archiveGroups=[]){
    const map=new Map();
    const ensure=date=>{
      if(!map.has(date))map.set(date,{date,items:[],seen:new Set()});
      return map.get(date);
    };
    staticGroups
      .filter(group=>group&&validDate(group.date))
      .forEach(group=>{
        const row=ensure(group.date);
        (Array.isArray(group.items)?group.items:[]).forEach(item=>{
          const key=normalizeTitle(item?.title);
          if(key)row.seen.add(key);
          row.items.push({...item,source:'curated'});
        });
      });

    (Array.isArray(archiveGroups)?archiveGroups:[]).forEach(group=>{
      if(!validDate(group?.date))return;
      const row=ensure(group.date);
      (Array.isArray(group.items)?group.items:[]).forEach(item=>{
        const key=normalizeTitle(item?.title);
        if(!key||row.seen.has(key))return;
        row.seen.add(key);
        row.items.push({
          type:['new','improved','fixed'].includes(item?.type)?item.type:'improved',
          title:item?.title||'업데이트',
          description:'',
          source:'commit',
          sha:item?.shortSha||String(item?.sha||'').slice(0,7),
          url:item?.url||''
        });
      });
    });

    return [...map.values()]
      .map(({date,items})=>({date,items}))
      .sort((a,b)=>b.date.localeCompare(a.date));
  }

  function cardHtml(item){
    const kind=['new','improved','fixed'].includes(item?.type)?item.type:'improved';
    const title=esc(item?.title||'업데이트');
    if(item?.source==='commit'){
      const sha=esc(item?.sha||'');
      const link=item?.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noreferrer">GitHub 기록 ↗</a>':'개발 기록';
      return '<article class="changelog-card is-commit">'+
        '<div class="changelog-card-top"><span class="changelog-kind" data-kind="'+kind+'">'+labels[kind]+'</span><h3>'+title+'</h3></div>'+
        '<div class="changelog-commit-meta">'+(sha?'<code>'+sha+'</code>':'')+link+'</div>'+
      '</article>';
    }
    return '<article class="changelog-card">'+
      '<div class="changelog-card-top"><span class="changelog-kind" data-kind="'+kind+'">'+labels[kind]+'</span><h3>'+title+'</h3></div>'+
      '<p>'+esc(item?.description||'')+'</p>'+
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
      const visible=rows
        .filter(row=>row.isIntersecting)
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

  function render(groups,{latestKey='',synced=false}={}){
    const total=groups.reduce((sum,group)=>sum+(Array.isArray(group.items)?group.items.length:0),0);
    const latest=document.getElementById('changelog-latest');
    const count=document.getElementById('changelog-count');
    const status=document.getElementById('changelog-sync-status');
    if(latest)latest.textContent=groups[0]?.date||'LATEST';
    if(count)count.textContent=total+'개의 업데이트 · '+groups.length+'일 기록';
    if(status){
      status.textContent=synced
        ? 'GitHub 개발 기록과 자동 동기화되었습니다. 새 변경은 최신 날짜에 자동으로 추가됩니다.'
        : '저장된 업데이트를 표시 중입니다. 개발 기록 동기화를 확인하고 있습니다.';
      status.className='changelog-sync-status '+(synced?'is-live':'');
    }

    indexRoot.innerHTML=groups.map(group=>
      '<a href="#changelog-'+esc(group.date)+'" data-changelog-index-date="'+esc(group.date)+'"><span>'+esc(group.date)+'</span><small>'+group.items.length+'</small></a>'
    ).join('');

    root.innerHTML=groups.length?groups.map(group=>{
      const date=formatDate(group.date);
      const items=Array.isArray(group.items)?group.items:[];
      return '<section class="changelog-day reveal" id="changelog-'+esc(group.date)+'" data-changelog-date="'+esc(group.date)+'">'+
        '<div class="changelog-date"><time datetime="'+esc(group.date)+'">'+esc(date.main)+'</time><small>'+esc(date.sub)+' · '+items.length+'개</small></div>'+
        '<div class="changelog-entries">'+items.map(cardHtml).join('')+'</div>'+
      '</section>';
    }).join(''):'<div class="changelog-empty">등록된 업데이트가 없습니다.</div>';

    if(groups[0])setActiveDate(groups[0].date);
    setupDateObserver();
    setupReveal();

    const resolvedKey=latestKey||('date:'+String(groups[0]?.date||'none')+':'+total);
    try{localStorage.setItem('chunbong-changelog-seen-v2',resolvedKey);}catch(_){}
    document.dispatchEvent(new CustomEvent('chunbong:changelog-ready',{detail:{latestKey:resolvedKey,latestDate:groups[0]?.date||''}}));
  }

  const initial=mergeGroups([]);
  render(initial,{synced:false});

  (async()=>{
    try{
      const response=await fetch('/api/content?type=changelog-history',{headers:{accept:'application/json'}});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const payload=await response.json();
      const groups=mergeGroups(payload.groups);
      const latestKey=payload.latest?.sha||payload.latest?.shortSha||'';
      render(groups,{latestKey,synced:true});
    }catch(_){
      const status=document.getElementById('changelog-sync-status');
      if(status){
        status.textContent='현재 저장된 업데이트 전체를 표시 중입니다. 자동 개발 기록 동기화는 잠시 후 다시 시도됩니다.';
        status.className='changelog-sync-status is-fallback';
      }
    }
  })();
})();
