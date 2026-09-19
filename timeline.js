(()=>{
  'use strict';
  const root=document.querySelector('[data-chunbong-timeline]');if(!root)return;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const base=[
    {date:'2020-07-03',label:'FIRST BROADCAST',title:'춘봉 첫 방송',desc:'춘봉 방송 기록의 시작점입니다.',href:'history.html'},
    {date:'2023-11-30',label:'SOOP',title:'SOOP 첫 방송',desc:'SOOP에서의 첫 방송 기록입니다.',href:'history.html'},
    {date:'2026-08-30',label:'FAN HUB',title:'춘봉 팬사이트 프로젝트 시작',desc:'방송 일정·콘텐츠·타로·데이터를 한곳에 모으는 팬허브가 시작됐습니다.',href:'changelog.html'}
  ];
  const curated=Array.isArray(window.CHUNBONG_CHANGELOG)?window.CHUNBONG_CHANGELOG:[];
  const recent=curated.flatMap(group=>(group.items||[]).filter(item=>item.type==='new'||/추가|시작|모드/.test(item.title||'')).slice(0,4).map(item=>({date:group.date,label:item.type==='new'?'NEW':'MILESTONE',title:item.title,desc:item.description,href:'changelog.html'}))).slice(0,18);
  const rows=[...base,...recent].sort((a,b)=>b.date.localeCompare(a.date));
  root.innerHTML=rows.map((row,index)=>`<article class="timeline-row"><div class="timeline-date"><time datetime="${esc(row.date)}">${esc(row.date.replaceAll('-','.'))}</time><span>${esc(row.label)}</span></div><i aria-hidden="true"></i><a href="${esc(row.href||'#')}"><small>${String(rows.length-index).padStart(2,'0')}</small><strong>${esc(row.title)}</strong><p>${esc(row.desc||'')}</p></a></article>`).join('');
})();