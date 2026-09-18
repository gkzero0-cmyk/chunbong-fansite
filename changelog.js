(() => {
  'use strict';

  const root=document.getElementById('changelog-timeline');
  if(!root) return;

  const entries=Array.isArray(window.CHUNBONG_CHANGELOG)?[...window.CHUNBONG_CHANGELOG]:[];
  const labels={new:'NEW',improved:'IMPROVED',fixed:'FIXED'};
  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const sorted=entries
    .filter(group=>group&&/^20\d{2}-\d{2}-\d{2}$/.test(String(group.date||'')))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  const total=sorted.reduce((sum,group)=>sum+(Array.isArray(group.items)?group.items.length:0),0);
  const latest=document.getElementById('changelog-latest');
  const count=document.getElementById('changelog-count');
  if(latest) latest.textContent=sorted[0]?.date||'LATEST';
  if(count) count.textContent=total+'개의 업데이트';

  const formatDate=date=>{
    const parsed=new Date(date+'T00:00:00+09:00');
    if(Number.isNaN(parsed.getTime())) return {main:date,sub:''};
    return {
      main:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(parsed),
      sub:new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'long'}).format(parsed)
    };
  };

  root.innerHTML=sorted.length?sorted.map((group,index)=>{
    const date=formatDate(group.date);
    const items=Array.isArray(group.items)?group.items:[];
    return '<section class="changelog-day reveal" data-changelog-date="'+esc(group.date)+'">'+
      '<div class="changelog-date"><time datetime="'+esc(group.date)+'">'+esc(date.main)+'</time><small>'+esc(date.sub)+'</small></div>'+
      '<div class="changelog-entries">'+items.map(item=>{
        const kind=['new','improved','fixed'].includes(item?.type)?item.type:'improved';
        return '<article class="changelog-card">'+
          '<div class="changelog-card-top"><span class="changelog-kind" data-kind="'+kind+'">'+labels[kind]+'</span><h3>'+esc(item?.title||'업데이트')+'</h3></div>'+
          '<p>'+esc(item?.description||'')+'</p>'+
        '</article>';
      }).join('')+'</div>'+
    '</section>';
  }).join(''):'<div class="changelog-empty">등록된 업데이트가 없습니다.</div>';

  const observer=('IntersectionObserver' in window)?new IntersectionObserver(rows=>{
    rows.forEach(row=>{
      if(row.isIntersecting){row.target.classList.add('visible');observer.unobserve(row.target);}
    });
  },{threshold:.05}):null;
  root.querySelectorAll('.reveal').forEach(node=>{
    if(observer) observer.observe(node);
    else node.classList.add('visible');
  });
})();
