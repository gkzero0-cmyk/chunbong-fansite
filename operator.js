(async()=>{
'use strict';
const API='/api/content?type=';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const login=$('#operator-login'),dashboard=$('#operator-dashboard'),status=$('#operator-login-status'),logout=$('#operator-logout');
let session=null,currentDays=7,currentAnalytics=null,currentSystem=null,currentArchiveHealth=null,currentImageHealth=null,feedbackItems=[],selectedFeedback=null;
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Number(n)||0);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortSha=value=>String(value||'').slice(0,10)||'-';
async function json(url,options){const r=await fetch(url,options);let data={};try{data=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(data.error||('HTTP '+r.status)),{status:r.status,data});return data}
function showLogin(){login.hidden=false;dashboard.hidden=true;logout.hidden=true}
function showDashboard(){login.hidden=true;dashboard.hidden=false;logout.hidden=false}
function providerLabel(value){return value==='github'?'GitHub':value==='email'?'이메일':'알 수 없음'}
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function loadAuthAvailability(){
  const github=$('#operator-github-login'),form=$('#operator-email-form'),input=$('#operator-email'),submit=form?.querySelector('button[type="submit"]');
  try{
    const config=await json(API+'operator-auth-config');
    const githubReady=Boolean(config.providers?.github),emailReady=Boolean(config.providers?.email);
    github?.classList.toggle('is-unavailable',!githubReady);
    github?.setAttribute('aria-disabled',String(!githubReady));
    github?.setAttribute('title',githubReady?'GitHub로 운영자 인증':'GitHub OAuth 설정 필요');
    if(input)input.disabled=!emailReady;if(submit)submit.disabled=!emailReady;
    const helper=form?.querySelector('small');
    if(helper)helper.textContent=emailReady?'등록된 소유주 이메일로만 인증할 수 있습니다.':'이메일 인증 설정이 아직 필요합니다.';
    const auth=new URLSearchParams(location.search).get('auth');
    if(auth==='github-not-configured')status.textContent='GitHub 운영자 인증 설정이 아직 완료되지 않았습니다.';
    else if(auth==='denied')status.textContent='GitHub 운영자 인증을 완료하지 못했습니다.';
    else if(auth==='success')status.textContent='GitHub 운영자 인증이 완료되었습니다.';
    if(!githubReady&&!emailReady&&!auth)status.textContent='운영자 인증 제공자 설정이 필요합니다. 분석·피드백 수집은 배포 후 별도로 시작됩니다.';
    return config;
  }catch{
    status.textContent='운영자 인증 상태를 불러오지 못했습니다.';
    return null;
  }
}
function shortTime(seconds){const n=Math.max(0,Number(seconds)||0);return n>=60?Math.floor(n/60)+'분 '+Math.round(n%60)+'초':Math.round(n)+'초'}
const PAGE_LABELS={
  '/':'홈','/index.html':'홈','/schedule.html':'방송 일정','/notice.html':'공지','/vod.html':'다시보기','/clips.html':'핫클립',
  '/fanart.html':'팬아트','/youtube.html':'유튜브','/tarot.html':'춘봉 타로','/minigames.html':'미니게임','/history.html':'방송 이력',
  '/chunbong-contents.html':'춘봉 콘텐츠','/data.html':'춘봉 데이터','/changelog.html':'업데이트 일지','/myhub.html':'MY','/chuntris.html':'춘트리스','/chunbak.html':'춘박게임',
  '/chungwagame.html':'춘과게임','/chuncortile.html':'춘컬타일'
};
const MENU_LABELS={
  home:'홈',schedule:'방송 일정',notice:'공지',vod:'다시보기',clips:'핫클립',fanart:'팬아트',youtube:'유튜브',tarot:'춘봉 타로',
  minigames:'미니게임',contents:'춘봉 콘텐츠',history:'방송 이력',data:'춘봉 데이터',changelog:'업데이트 일지',myhub:'MY',more:'더보기',
  '팬존':'팬존','영상':'영상','일정':'방송 일정','더보기':'더보기','춘과게임SUM 10':'춘과게임','춘박게임MERGE':'춘박게임'
};
function friendlyKey(key=''){
  const map={'device:mobile':'모바일','device:tablet':'태블릿','device:desktop':'PC','device:other':'기타 기기','pwa:yes':'설치 앱(PWA)','pwa:no':'브라우저','theme:light':'라이트 모드','theme:dark':'다크 모드'};
  const raw=String(key||'');
  if(PAGE_LABELS[raw])return PAGE_LABELS[raw];
  if(MENU_LABELS[raw])return MENU_LABELS[raw];
  if(/^contents$/i.test(raw))return '춘봉 콘텐츠';
  if(/춘박게임\s*merge/i.test(raw))return '춘박게임';
  if(map[raw])return map[raw];
  const game=raw.match(/^game_(?:start|finish):(.+)$/);
  if(game){const names={chuntris:'춘트리스',chunbak:'춘박게임',chungwagame:'춘과게임',chuncortile:'춘컬타일'};return '미니게임 · '+(names[game[1]]||game[1])}
  if(/^tarot_(start|result)$/.test(raw))return '춘봉 타로';
  if(/^feedback_(open|submit)$/.test(raw))return '피드백';
  return raw;
}
function periodTitle(){
  return currentDays==='all'?'전체 이용 추이':currentDays===1?'오늘 이용 추이':`최근 ${currentDays}일 이용 추이`;
}
function compareLabel(){return currentDays==='all'?'전체 기간':currentDays===1?'어제 대비':`이전 ${currentDays}일 대비`}
function renderRows(el,rows=[]){el.innerHTML=rows.length?rows.map((row,i)=>`<li><em>${i+1}</em><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><b>${fmt(row.value)}${Number.isFinite(row.averageActiveSeconds)?' · '+shortTime(row.averageActiveSeconds):''}</b></li>`).join(''):'<li><em>–</em><strong>아직 데이터가 없습니다.</strong><b>0</b></li>'}
function sharePercent(value,total){return total>0?Math.max(0,Number(value)||0)/total*100:0}
function shareLabel(value,total){const pct=sharePercent(value,total);return pct>0&&pct<1?pct.toFixed(1)+'%':Math.round(pct)+'%'}
function rowCompareMarkup(row={}){
  if(currentDays==='all')return '';
  const previous=Number(row.previousValue)||0,change=row.changePct;
  if(!previous&&Number(row.value)>0)return '<small class="operator-row-compare is-new">이전 기간 0회</small>';
  if(change===null||change===undefined)return '<small class="operator-row-compare is-flat">비교 데이터 없음</small>';
  const n=Number(change)||0,symbol=n>0?'▲ ':n<0?'▼ ':'';
  return `<small class="operator-row-compare ${n>0?'is-up':n<0?'is-down':'is-flat'}">${symbol}${Math.abs(n).toFixed(1)}% · ${escapeHtml(compareLabel())}</small>`;
}
function renderPageRows(rows=[],total=0){
  const el=$('#operator-pages'),denominator=Math.max(Number(total)||0,rows.reduce((sum,row)=>sum+(Number(row.value)||0),0),1);
  el.innerHTML=rows.length?rows.map((row,i)=>{const pct=sharePercent(row.value,denominator);return `<li class="operator-rank-rich"><em>${i+1}</em><div><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><span>조회 ${fmt(row.value)}회 · 평균 활동 ${shortTime(row.averageActiveSeconds||0)} · 전체의 ${shareLabel(row.value,denominator)}</span>${rowCompareMarkup(row)}<i aria-hidden="true"><b style="width:${Math.max(2,pct)}%"></b></i></div><b title="전체 페이지뷰 중 비중">${shareLabel(row.value,denominator)}</b></li>`}).join(''):'<li><em>–</em><strong>아직 페이지 이용 데이터가 없습니다.</strong><b>0</b></li>';
}
function renderMenuRows(rows=[],total=0){
  const el=$('#operator-menus'),denominator=Math.max(Number(total)||0,rows.reduce((sum,row)=>sum+(Number(row.value)||0),0),1);
  el.innerHTML=rows.length?rows.map((row,i)=>{const pct=sharePercent(row.value,denominator);return `<li class="operator-rank-rich"><em>${i+1}</em><div><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><span>메뉴 클릭 ${fmt(row.value)}회 · 전체 메뉴 클릭의 ${shareLabel(row.value,denominator)}</span>${rowCompareMarkup(row)}<i aria-hidden="true"><b style="width:${Math.max(2,pct)}%"></b></i></div><b title="전체 메뉴 클릭 중 비중">${shareLabel(row.value,denominator)}</b></li>`}).join(''):'<li><em>–</em><strong>아직 메뉴 이용 데이터가 없습니다.</strong><b>0</b></li>';
}
function featureMeta(key=''){
  const raw=String(key||''),game=raw.match(/^game_(start|finish):(.+)$/);
  const gameNames={chuntris:'춘트리스',chunbak:'춘박게임',chungwagame:'춘과게임',chuncortile:'춘컬타일'};
  if(game)return{category:'미니게임',label:gameNames[game[2]]||game[2],action:game[1]==='start'?'게임 시작':'게임 종료'};
  if(raw==='tarot_start')return{category:'타로',label:'춘봉 타로',action:'리딩 시작'};
  if(raw==='tarot_result')return{category:'타로',label:'춘봉 타로',action:'결과 확인'};
  if(raw==='feedback_open')return{category:'피드백',label:'피드백',action:'작성창 열기'};
  if(raw==='feedback_submit')return{category:'피드백',label:'피드백',action:'제출 완료'};
  if(raw==='schedule_open')return{category:'일정',label:'방송 일정',action:'상세 열기'};
  if(raw.startsWith('data_tab_open'))return{category:'데이터',label:'춘봉 데이터',action:raw.includes(':')?raw.split(':').slice(1).join(':')+' 탭 열기':'탭 열기'};
  return{category:'기타',label:friendlyKey(raw),action:'이용'};
}
function renderFeatureRows(rows=[],total=0){
  const el=$('#operator-features'),denominator=Math.max(Number(total)||0,rows.reduce((sum,row)=>sum+(Number(row.value)||0),0),1);
  el.innerHTML=rows.length?rows.map((row,i)=>{const meta=featureMeta(row.key),pct=sharePercent(row.value,denominator);return `<li class="operator-rank-rich operator-feature-row"><em>${i+1}</em><div><div class="operator-feature-title"><strong title="${escapeHtml(row.key)}">${escapeHtml(meta.label)}</strong><span data-category="${escapeHtml(meta.category)}">${escapeHtml(meta.action)}</span></div><small>${escapeHtml(meta.category)} · 이용 ${fmt(row.value)}회 · 전체 기능 이용의 ${shareLabel(row.value,denominator)}</small>${rowCompareMarkup(row)}<i aria-hidden="true"><b style="width:${Math.max(2,pct)}%"></b></i></div><b>${fmt(row.value)}회</b></li>`}).join(''):'<li><em>–</em><strong>아직 기능 이용 데이터가 없습니다.</strong><b>0</b></li>';
}
function renderEnvironmentRows(rows=[]){
  const el=$('#operator-devices');
  const groups=[
    {prefix:'device:',title:'기기',labels:{mobile:'모바일',tablet:'태블릿',desktop:'PC',other:'기타 기기'}},
    {prefix:'pwa:',title:'실행 방식',labels:{yes:'설치 앱(PWA)',no:'브라우저'}},
    {prefix:'theme:',title:'테마',labels:{light:'라이트 모드',dark:'다크 모드'}}
  ];
  const map=Object.fromEntries((rows||[]).map(row=>[String(row.key),Number(row.value)||0]));
  el.innerHTML=groups.map(group=>{
    const values=Object.entries(map).filter(([key])=>key.startsWith(group.prefix)).map(([key,value])=>({key:key.slice(group.prefix.length),value})).sort((a,b)=>b.value-a.value);
    const total=values.reduce((sum,row)=>sum+row.value,0);
    const body=values.length?values.map(row=>{const pct=sharePercent(row.value,total);return `<div class="operator-environment-row"><span>${escapeHtml(group.labels[row.key]||row.key)}</span><div><i aria-hidden="true"><b style="width:${Math.max(2,pct)}%"></b></i><small>${fmt(row.value)}회 · ${shareLabel(row.value,total)}</small></div></div>`}).join(''):'<p class="operator-empty">데이터 없음</p>';
    return `<section class="operator-environment-group"><header><strong>${group.title}</strong><small>${total?fmt(total)+'회 기준':'측정 대기'}</small></header>${body}</section>`;
  }).join('');
}
function renderSearchInsights(search={}){
  const total=Number(search.total)||0,zero=Number(search.zeroTotal)||0,clicks=Number(search.clickTotal)||0,rate=Number(search.clickThroughPct)||0;
  $('#search-total').textContent=fmt(total)+'회';
  $('#search-zero-total').textContent=fmt(zero)+'회';
  $('#search-zero-total').className=zero?'is-warn':'is-ok';
  $('#search-zero-meta').textContent=total?(zero?('전체 검색의 '+Math.round(zero/total*100)+'%'):'결과 없음 검색이 없습니다.'):'검색 데이터 대기 중';
  $('#search-click-total').textContent=fmt(clicks)+'회';
  $('#search-click-rate').textContent=total?rate+'%':'-';
  const queries=Array.isArray(search.topQueries)?search.topQueries:[],queryEl=$('#operator-search-queries');
  queryEl.innerHTML=queries.length?queries.map((row,i)=>`<li class="operator-rank-rich operator-search-row"><em>${i+1}</em><div><strong>${escapeHtml(row.key)}</strong><span>검색 ${fmt(row.value)}회${Number(row.zeroCount)?' · 결과 없음 '+fmt(row.zeroCount)+'회':''}</span><i aria-hidden="true"><b style="width:${Math.max(3,sharePercent(row.value,total))}%"></b></i></div><b>${shareLabel(row.value,total)}</b></li>`).join(''):'<li><em>–</em><strong>아직 검색 데이터가 없습니다.</strong><b>0</b></li>';
  const zeroRows=Array.isArray(search.zeroQueries)?search.zeroQueries:[],zeroEl=$('#operator-search-zero'),zeroMax=Math.max(1,...zeroRows.map(row=>Number(row.value)||0));
  zeroEl.innerHTML=zeroRows.length?zeroRows.map((row,i)=>`<li class="operator-rank-rich operator-search-row is-zero"><em>${i+1}</em><div><strong>${escapeHtml(row.key)}</strong><span>결과 없음 ${fmt(row.value)}회 · 콘텐츠/별칭 보강 후보</span><i aria-hidden="true"><b style="width:${Math.max(4,(Number(row.value)||0)/zeroMax*100)}%"></b></i></div><b>${fmt(row.value)}회</b></li>`).join(''):'<li><em>✓</em><strong>선택 기간에는 결과 없음 검색이 없습니다.</strong><b>0</b></li>';
  const clickRows=Array.isArray(search.topClicks)?search.topClicks:[],clickEl=$('#operator-search-clicks');
  clickEl.innerHTML=clickRows.length?clickRows.map(row=>`<article class="operator-search-click-row"><span>${escapeHtml(row.kind||'결과')}</span><div><small>“${escapeHtml(row.query)}” 검색 후</small><strong>${escapeHtml(row.label||'콘텐츠')}</strong></div><b>${fmt(row.value)}회</b></article>`).join(''):'<p class="operator-empty">아직 검색 결과 클릭 데이터가 없습니다.</p>';
}
function renderDaily(rows=[]){
  const el=$('#operator-daily'),max=Math.max(1,...rows.map(x=>Math.max(Number(x.pageviews)||0,Number(x.visitors)||0)));
  el.innerHTML=rows.length?rows.map(x=>`<div class="operator-day"><div class="operator-day-values"><b>${fmt(x.pageviews)}</b><span>${fmt(x.visitors)}</span></div><div class="operator-day-bars" title="${x.date} · 페이지뷰 ${fmt(x.pageviews)}회 · 방문자 ${fmt(x.visitors)}명"><i style="height:${x.pageviews?Math.max(4,x.pageviews/max*100):0}%"></i><i style="height:${x.visitors?Math.max(4,x.visitors/max*100):0}%"></i></div><small>${x.date.slice(5)}</small></div>`).join(''):'<p class="operator-empty">아직 기간별 데이터가 없습니다.</p>';
  const peak=rows.reduce((best,row)=>(Number(row.pageviews)||0)>(Number(best?.pageviews)||0)?row:best,null);
  $('#operator-daily-title').textContent=periodTitle();
  $('#operator-daily-summary').textContent=peak?`최고 ${peak.date.slice(5)} · 페이지뷰 ${fmt(peak.pageviews)}회 · 방문자 ${fmt(peak.visitors)}명`:'아직 비교할 데이터가 없습니다.';
  el.setAttribute('role','img');el.setAttribute('aria-label',peak?`${periodTitle()}. 가장 많은 페이지뷰는 ${peak.date} ${fmt(peak.pageviews)}회입니다.`:'기간별 이용 데이터가 아직 없습니다.');
}
function renderHourly(rows=[]){
  const map=Object.fromEntries((rows||[]).map(row=>[String(row.key).padStart(2,'0'),Number(row.value)||0])),values=Array.from({length:24},(_,h)=>({hour:String(h).padStart(2,'0'),value:map[String(h).padStart(2,'0')]||0}));
  const max=Math.max(1,...values.map(x=>x.value)),el=$('#operator-hourly'),total=values.reduce((sum,row)=>sum+row.value,0);
  const peak=values.reduce((best,row)=>row.value>(best?.value||0)?row:best,{hour:'00',value:0});
  el.innerHTML=values.map(x=>`<div class="operator-hour ${x.hour===peak.hour&&x.value?'is-peak':''}" title="${Number(x.hour)}시 · ${fmt(x.value)} 페이지뷰">${x.value?`<b>${fmt(x.value)}</b>`:''}<i style="height:${x.value?Math.max(6,x.value/max*100):0}%"></i><small>${Number(x.hour)%3===0?x.hour:''}</small></div>`).join('');
  const share=peak.value&&total?Math.round(peak.value/total*100):0;
  $('#operator-hourly-summary').textContent=peak.value?`가장 활발한 시간 ${Number(peak.hour)}시 · ${fmt(peak.value)}회 · 전체의 ${share}%`:'아직 시간대별 데이터가 없습니다.';
  el.setAttribute('role','img');el.setAttribute('aria-label',peak.value?`시간대별 페이지뷰. 가장 많은 시간대는 ${Number(peak.hour)}시, ${fmt(peak.value)}회입니다.`:'시간대별 페이지뷰 데이터가 아직 없습니다.');
}
function vitalValue(metric,value){
  const n=Number(value)||0;
  if(metric==='cls')return n?n.toFixed(n<0.1?3:2):'0.000';
  if(metric==='lcp')return n?(n/1000).toFixed(n>=1000?1:2)+'초':'-';
  return n?fmt(n)+'ms':'-';
}
function renderVital(metric,row={}){
  const strong=$('#performance-'+metric),meta=$('#performance-'+metric+'-meta');if(!strong||!meta)return;
  const samples=Number(row.samples)||0,poor=Number(row.poorPct)||0,needs=Number(row.needsPct)||0,good=Number(row.goodPct)||0;
  strong.textContent=samples?vitalValue(metric,row.average):'-';
  strong.className=!samples?'':poor>=25?'is-bad':needs+poor>=25?'is-warn':'is-ok';
  meta.textContent=samples?`권장 구간 표본 ${good}% · 총 ${fmt(samples)}회`:'지원 브라우저 표본을 기다리고 있습니다.';
}
function renderPerformance(performance={}){
  const average=Number(performance.averageMs)||0,samples=Number(performance.samples)||0,pages=Array.isArray(performance.pages)?performance.pages:[];
  $('#performance-average').textContent=samples?fmt(average)+'ms':'-';$('#performance-samples').textContent=fmt(samples)+'회';
  const slow=pages[0]||null;$('#performance-slowest').textContent=slow?friendlyKey(slow.key):'-';$('#performance-slowest-meta').textContent=slow?`평균 ${fmt(slow.averageMs)}ms · 표본 ${fmt(slow.samples)}회`:'측정 대기 중';
  const state=average<=0?'측정 대기':average<=500?'빠름':average<=1000?'보통':'느림';
  $('#performance-state').textContent=state;$('#performance-state').className=average>1000?'is-bad':average>500?'is-warn':average>0?'is-ok':'';
  $('#performance-state-meta').textContent=!samples?'최신 배포 후 실제 사용자 데이터가 쌓이면 표시됩니다.':average<=500?'전반적인 페이지 표시 속도가 빠른 편입니다.':average<=1000?'일부 환경에서 짧은 지연이 느껴질 수 있습니다.':'느린 페이지와 공통 자산을 우선 점검하세요.';
  const vitals=performance.webVitals||{};renderVital('lcp',vitals.lcp||{});renderVital('inp',vitals.inp||{});renderVital('cls',vitals.cls||{});
  const el=$('#operator-performance-pages'),max=Math.max(1,...pages.map(row=>Number(row.averageMs)||0));
  el.innerHTML=pages.length?pages.map((row,i)=>`<li class="operator-rank-rich"><em>${i+1}</em><div><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><span>평균 ${fmt(row.averageMs)}ms · 표본 ${fmt(row.samples)}회</span><i><b style="width:${Math.max(4,(Number(row.averageMs)||0)/max*100)}%"></b></i></div><b>${fmt(row.averageMs)}ms</b></li>`).join(''):'<li><em>–</em><strong>아직 성능 측정 데이터가 없습니다.</strong><b>-</b></li>';
  const vitalLabels={lcp:'LCP',inp:'INP',cls:'CLS'},issueMap=new Map();
  for(const metric of ['lcp','inp','cls']){
    for(const row of Array.isArray(vitals?.[metric]?.pages)?vitals[metric].pages:[]){
      const key=String(row.key||'');if(!key)continue;
      const issue={metric,key,samples:Number(row.samples)||0,average:Number(row.average)||0,goodPct:Number(row.goodPct)||0,needsPct:Number(row.needsPct)||0,poorPct:Number(row.poorPct)||0};
      const score=issue.poorPct*1000+(issue.needsPct+issue.poorPct)*10+issue.average;
      const current=issueMap.get(key);
      if(!current||score>current.score)issueMap.set(key,{...issue,score});
    }
  }
  const issueRows=[...issueMap.values()].filter(row=>row.samples>0).sort((a,b)=>b.poorPct-a.poorPct||(b.needsPct+b.poorPct)-(a.needsPct+a.poorPct)||b.samples-a.samples).slice(0,12);
  const vitalList=$('#operator-vitals-pages');
  if(vitalList)vitalList.innerHTML=issueRows.length?issueRows.map((row,i)=>{
    const severity=row.poorPct>=25?'나쁨':row.needsPct+row.poorPct>=25?'개선 필요':'양호';
    return `<li class="operator-rank-rich"><em>${i+1}</em><div><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><span>${vitalLabels[row.metric]} ${vitalValue(row.metric,row.average)} · ${severity} · 나쁨 ${row.poorPct}% · 표본 ${fmt(row.samples)}회</span><i><b style="width:${Math.max(4,Math.min(100,row.poorPct+row.needsPct))}%"></b></i></div><b>${row.poorPct}%</b></li>`;
  }).join(''):'<li><em>–</em><strong>아직 페이지별 웹 바이탈 표본이 없습니다.</strong><b>-</b></li>';
}
function completionRate(row){const start=Number(row?.start)||0,finish=Number(row?.finish)||0;return start?Math.min(100,Math.round(finish/start*100)):0}
function renderFunnel(funnel={}){
  const rows=[['미니게임',funnel.game],['춘봉 타로',funnel.tarot],['피드백',funnel.feedback]],el=$('#operator-funnel');
  el.innerHTML=rows.map(([label,row])=>{const rate=completionRate(row);return `<div class="operator-funnel-row"><div><strong>${label}</strong><span>${fmt(row?.start)} 시작 → ${fmt(row?.finish)} 완료</span></div><div class="operator-funnel-track"><i style="width:${rate}%"></i></div><b>${rate}%</b></div>`}).join('');
}
function renderDeploymentBanner(){
  const box=$('#operator-deployment-banner'),title=$('#operator-deployment-banner-title'),detail=$('#operator-deployment-banner-detail');if(!box||!title||!detail)return;
  const dep=currentSystem?.deployment||{};
  if(!currentSystem){box.dataset.state='loading';title.textContent='Production 상태 확인 중';detail.textContent='GitHub main과 실제 배포 버전을 비교하고 있습니다.';return}
  const pending=deploymentGap(currentSystem?.repository?.recentCommits||[],dep.sha,dep.synced);
  if(dep.synced===true){
    box.dataset.state='ok';
    if(dep.internalOnlyGap&&dep.exactSynced===false){
      title.textContent='Production 사이트 코드 최신 상태';
      detail.textContent='배포본 '+shortSha(dep.sha)+' · main '+shortSha(dep.mainSha)+' · CI/테스트/문서 변경만 배포를 생략했습니다.';
    }else{
      title.textContent='Production 최신 상태';
      detail.textContent='main '+shortSha(dep.mainSha)+' · 실제 배포본과 일치합니다.';
    }
    return;
  }
  if(dep.rateLimited){
    box.dataset.state='bad';title.textContent='Production 업데이트 대기 · Vercel 배포 제한';
    detail.textContent='배포본 '+shortSha(dep.sha)+' · main '+shortSha(dep.mainSha)+' · 미반영 '+(pending.known?fmt(pending.count)+'건':fmt(pending.count)+'건 이상')+(dep.retryAfter?' · 재시도 기준 '+new Date(dep.retryAfter).toLocaleString('ko-KR'):'');
    return;
  }
  if(dep.synced===false){
    box.dataset.state='warn';title.textContent='Production 업데이트 대기';
    detail.textContent='배포본 '+shortSha(dep.sha)+' · main '+shortSha(dep.mainSha)+' · 미반영 '+(pending.known?fmt(pending.count)+'건':fmt(pending.count)+'건 이상');
    return;
  }
  box.dataset.state='warn';title.textContent='Production 동기화 확인 필요';detail.textContent='현재 배포 SHA와 GitHub main 비교 정보를 확인하지 못했습니다.';
}
function renderOperatorAttention(){
  const root=$('#operator-attention-list'),state=$('#operator-attention-state');if(!root||!state)return;
  const rows=[],dep=currentSystem?.deployment||{},endpoints=Array.isArray(currentSystem?.endpoints)?currentSystem.endpoints:[],services=currentSystem?.services||{};
  if(dep.synced===false)rows.push({level:'warn',title:'Production 동기화 필요',detail:'배포본 '+shortSha(dep.sha)+' · main '+shortSha(dep.mainSha),tab:'system'});
  if(dep.rateLimited)rows.push({level:'warn',title:'Vercel 배포 제한',detail:dep.retryAfter?'안전 재시도 기준 '+new Date(dep.retryAfter).toLocaleString('ko-KR'):'새 배포가 제한되어 있습니다.',tab:'system'});
  const perfAverage=Number(currentAnalytics?.performance?.averageMs)||0;if(perfAverage>1000)rows.push({level:'warn',title:'페이지 표시 속도 확인',detail:'선택 기간 평균 '+fmt(perfAverage)+'ms',tab:'performance'});
  const slowestPage=currentAnalytics?.performance?.pages?.[0];if(Number(slowestPage?.averageMs)>=1500)rows.push({level:'warn',title:'느린 페이지 감지',detail:friendlyKey(slowestPage.key)+' · 평균 '+fmt(slowestPage.averageMs)+'ms · 표본 '+fmt(slowestPage.samples)+'회',tab:'performance'});
  const vitals=currentAnalytics?.performance?.webVitals||{};
  for(const [metric,label] of [['lcp','LCP'],['inp','INP'],['cls','CLS']]){
    const row=vitals[metric]||{},samples=Number(row.samples)||0,poor=Number(row.poorPct)||0;
    if(samples>=5&&poor>=25)rows.push({level:poor>=50?'bad':'warn',title:label+' 체감 성능 확인',detail:'나쁨 구간 표본 '+poor+'% · '+fmt(samples)+'회',tab:'performance'});
  }
  const archive=currentArchiveHealth||{};
  if(archive.syncFailed)rows.push({level:'bad',title:'콘텐츠 자동수집 실패',detail:archive.syncError||'최근 공식 자료 동기화를 확인해 주세요.',tab:'contents'});
  if(Number(archive.issueItemCount)>0){
    const names=(archive.topIssues||[]).slice(0,3).map(row=>row.title).filter(Boolean);
    rows.push({level:'warn',title:'콘텐츠 자료 보강 '+fmt(archive.issueItemCount)+'개',detail:'보강 항목 '+fmt(archive.totalIssues)+'건 · 이미지/썸네일 '+fmt(archive.visualIssueItemCount)+'개'+(names.length?' · '+names.join(', '):''),tab:'contents'});
  }
  if(Number(archive.candidateCount)>0)rows.push({level:'info',title:'자동수집 검토 후보 '+fmt(archive.candidateCount)+'건',detail:'새로 발견된 자료를 기존 콘텐츠에 연결하거나 초안으로 만들 수 있습니다.',tab:'contents'});
  const imageHealth=currentImageHealth||{};
  if(imageHealth.failed)rows.push({level:'bad',title:'이미지 상태 검사 실패',detail:imageHealth.error||'콘텐츠 이미지 검사를 다시 실행해 주세요.',tab:'contents'});
  else if(Number(imageHealth.failedCount)>0)rows.push({level:'bad',title:'깨진 콘텐츠 이미지 '+fmt(imageHealth.failedCount)+'개',detail:'대표 이미지·갤러리·영상 썸네일 실제 로딩에 실패한 항목이 있습니다.',tab:'contents'});
  if(Number(imageHealth.large)>0||Number(imageHealth.slow)>0)rows.push({level:'warn',title:'이미지 최적화 확인',detail:'대용량 '+fmt(imageHealth.large)+'개 · 느린 표시 '+fmt(imageHealth.slow)+'개',tab:'contents'});
  if(Number(imageHealth.lowResolution)>0)rows.push({level:'warn',title:'대표 이미지 해상도 확인',detail:'권장 해상도보다 작은 대표 이미지 '+fmt(imageHealth.lowResolution)+'개',tab:'contents'});
  if(currentSystem?.changelog?.ok===false)rows.push({level:'warn',title:'업데이트 일지 자동 기록 확인',detail:'GitHub main 변경사항을 읽는 자동 기록 API가 응답하지 않습니다.',tab:'system'});
  const search=currentAnalytics?.search||{},zeroTotal=Number(search.zeroTotal)||0;
  if(zeroTotal>0){
    const terms=(search.zeroQueries||[]).slice(0,3).map(row=>'“'+row.key+'”').join(', ');
    rows.push({level:'info',title:'검색 결과 없음 '+fmt(zeroTotal)+'회',detail:(terms?terms+' · ':'')+'콘텐츠명·별칭·검색 키워드 보강을 검토하세요.',tab:'search'});
  }
  const badEndpoints=endpoints.filter(row=>!row.ok);if(badEndpoints.length)rows.push({level:'bad',title:'API 응답 확인 필요',detail:badEndpoints.map(row=>row.label||row.path||'API').join(' · '),tab:'system'});
  const slow=endpoints.filter(row=>row.ok&&Number(row.ms)>=1500);if(slow.length)rows.push({level:'warn',title:'느린 API 감지',detail:slow.map(row=>(row.label||row.path||'API')+' '+fmt(row.ms)+'ms').join(' · '),tab:'system'});
  if(currentSystem&&(!services.analytics||!services.feedback||services.push===false))rows.push({level:'warn',title:'서비스 설정 확인',detail:[!services.analytics&&'실사용 분석',!services.feedback&&'피드백 저장',services.push===false&&'Push'].filter(Boolean).join(' · '),tab:'system'});
  const unread=feedbackItems.filter(item=>item.status==='new').length||Number(currentAnalytics?.feedbackCounts?.new)||0;if(unread)rows.push({level:'info',title:'새 피드백 '+fmt(unread)+'건',detail:'확인하지 않은 사용자 의견이 있습니다.',tab:'feedback'});
  const highPriority=feedbackItems.filter(item=>item.priority==='high'&&!['done','archived'].includes(item.status)).length;if(highPriority)rows.push({level:'warn',title:'높은 우선순위 피드백 '+fmt(highPriority)+'건',detail:'완료되지 않은 높은 우선순위 의견이 있습니다.',tab:'feedback'});
  const duplicateFeedback=feedbackDuplicateSummary();if(duplicateFeedback.groupCount)rows.push({level:'info',title:'반복 피드백 '+fmt(duplicateFeedback.groupCount)+'묶음',detail:'유사 제보 '+fmt(duplicateFeedback.itemCount)+'건을 함께 확인할 수 있습니다.',tab:'feedback'});
  if(!rows.length){state.textContent=currentSystem?'정상':'확인 중';state.className=currentSystem?'is-ok':'is-neutral';root.innerHTML=currentSystem?'<div class="operator-attention-item is-ok"><span>✓</span><div><strong>현재 확인할 이상 신호가 없습니다.</strong><small>Production · API · 저장소 · Push · 피드백 상태를 기준으로 확인했습니다.</small></div></div>':'<p class="operator-empty">운영 상태를 확인하고 있습니다.</p>';return}
  state.textContent=rows.some(row=>row.level==='bad')?'확인 필요':rows.some(row=>row.level==='warn')?'주의':'새 항목';state.className=rows.some(row=>row.level==='bad')?'is-bad':rows.some(row=>row.level==='warn')?'is-warn':'is-info';
  root.innerHTML=rows.map(row=>`<button type="button" class="operator-attention-item is-${row.level}" data-operator-jump="${row.tab}"><span aria-hidden="true">${row.level==='bad'?'!':row.level==='warn'?'△':'•'}</span><div><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.detail)}</small></div><b aria-hidden="true">→</b></button>`).join('');
  root.querySelectorAll('[data-operator-jump]').forEach(button=>button.addEventListener('click',()=>void activateOperatorTab(button.dataset.operatorJump)));
}
function renderDelta(id,value){
  const el=$(id);if(!el)return;
  if(value===null||value===undefined){el.textContent=currentDays==='all'?'전체 기간':'비교 데이터 없음';el.className='is-neutral';return}
  const n=Number(value)||0;el.textContent=(n>0?'▲ ':n<0?'▼ ':'')+Math.abs(n).toFixed(1)+'% · '+compareLabel();el.className=n>0?'is-up':n<0?'is-down':'is-neutral';
}
function renderPeriodSummary(data={}){
  $('#operator-period-summary-title').textContent=currentDays==='all'?'전체 기간 요약':currentDays===1?'오늘 요약':`최근 ${currentDays}일 요약`;
  $('#operator-period-compare-label').textContent=compareLabel();
  const top=data.topPages?.[0],cmp=data.comparison;
  if(currentDays==='all'||!cmp){
    $('#operator-period-summary-text').textContent=top?`현재까지 페이지뷰 ${fmt(data.pageviews)}회, 방문자 ${fmt(data.visitors)}명입니다. 가장 많이 본 페이지는 ${friendlyKey(top.key)}입니다.`:'아직 요약할 이용 데이터가 없습니다.';
    return;
  }
  const phrase=(name,value)=>value===null||value===undefined?`${name} 비교 데이터 없음`:`${name} ${Math.abs(Number(value)||0).toFixed(1)}% ${Number(value)>0?'증가':Number(value)<0?'감소':'변화 없음'}`;
  $('#operator-period-summary-text').textContent=`${compareLabel()} ${phrase('방문자',cmp.visitorsPct)}, ${phrase('페이지뷰',cmp.pageviewsPct)}입니다.${top?' 가장 많이 본 페이지는 '+friendlyKey(top.key)+'입니다.':''}`;
}
const ANALYTICS_SNAPSHOT_PREFIX='chunbong:operator:analytics-snapshot:v2:';
const ANALYTICS_AUTO_REFRESH_MAX_AGE_MS=12*60*60*1000;
function analyticsSnapshotKey(){return ANALYTICS_SNAPSHOT_PREFIX+String(currentDays)}
function readAnalyticsSnapshot(){
  try{
    const parsed=JSON.parse(localStorage.getItem(analyticsSnapshotKey())||'null');
    if(!parsed||!parsed.data||!Number(parsed.at))return null;
    return parsed;
  }catch{return null}
}
function writeAnalyticsSnapshot(data={},at=Date.now()){
  try{localStorage.setItem(analyticsSnapshotKey(),JSON.stringify({at:Number(at)||Date.now(),data}))}catch{}
}
function renderAnalytics(data,meta={}){

  currentAnalytics=data;
  const apiRoot=$('#system-budget-api-types');
  if(apiRoot){
    const rows=Array.isArray(data.apiNetwork?.rows)?data.apiNetwork.rows:[];
    const max=Math.max(1,...rows.map(row=>Number(row.sampledCount)||0));
    apiRoot.innerHTML=rows.length?rows.slice(0,8).map(row=>{
      const count=Number(row.sampledCount)||0,pct=Math.max(4,Math.round(count/max*100));
      return '<div class="operator-api-budget-row"><span>'+escapeHtml(row.type||'unknown')+'</span><i><b style="width:'+pct+'%"></b></i><strong>'+fmt(count)+'</strong></div>';
    }).join(''):'<p class="operator-empty">아직 API 네트워크 표본이 없습니다.</p>';
  }
  $('#metric-active').textContent=fmt(data.activeNow);$('#metric-visitors').textContent=fmt(data.visitors);$('#metric-sessions').textContent=fmt(data.sessions);
  $('#metric-average-daily').textContent=fmt(data.averageDailyVisitors);$('#metric-pageviews').textContent=fmt(data.pageviews);$('#metric-duration').textContent=shortTime(data.averageActiveSeconds);
  $('#metric-new').textContent=fmt(data.newVisitors);$('#metric-returning').textContent=fmt(data.returningVisits);
  renderDelta('#metric-visitors-delta',data.comparison?.visitorsPct);renderDelta('#metric-sessions-delta',data.comparison?.sessionsPct);renderDelta('#metric-pageviews-delta',data.comparison?.pageviewsPct);renderDelta('#metric-duration-delta',data.comparison?.averageActiveSecondsPct);
  renderPeriodSummary(data);renderPageRows(data.topPages||[],data.pageviews);renderMenuRows(data.topMenus||[],data.menuTotal);renderFeatureRows(data.topFeatures||[],data.featureTotal);renderEnvironmentRows(data.devices||[]);
  renderDaily(data.daily||[]);renderHourly(data.hourly||[]);renderFunnel(data.funnel||{});renderPerformance(data.performance||{});renderSearchInsights(data.search||{});
  const note=$('#operator-collection-note'),stamp=meta.snapshotAt?new Date(meta.snapshotAt).toLocaleString('ko-KR'):null;
  if(note)note.textContent=meta.stale&&stamp?'Redis 제한/절약 모드 · 마지막 정상 분석 '+stamp:stamp?'분석 스냅샷 '+stamp+(meta.cached?' · 브라우저 캐시 사용':' · 최신 조회'):data.collectionStartedAt?'실사용 분석 수집 시작: '+new Date(data.collectionStartedAt).toLocaleString('ko-KR'):'분석 데이터가 아직 수집되지 않았습니다.';
  const unread=Number(data.feedbackCounts?.new)||0,badge=$('#operator-feedback-badge');badge.textContent=unread;badge.hidden=!unread;renderOperatorAttention();

}
async function loadAnalytics({force=false}={}){
  const snapshot=readAnalyticsSnapshot(),age=snapshot?Date.now()-Number(snapshot.at):Infinity;
  if(snapshot&&!force){
    renderAnalytics(snapshot.data,{snapshotAt:snapshot.at,cached:true,stale:age>ANALYTICS_AUTO_REFRESH_MAX_AGE_MS});
    if(age<=ANALYTICS_AUTO_REFRESH_MAX_AGE_MS)return snapshot.data;
  }
  try{
    const data=await json(API+'operator-analytics&days='+currentDays);
    const sourceAt=Date.parse(data.cachedAt||'')||Date.now();
    writeAnalyticsSnapshot(data,sourceAt);
    renderAnalytics(data,{snapshotAt:sourceAt,cached:false,stale:Boolean(data.stale||data.storageDegraded)});
    return data;
  }catch(error){
    if(snapshot){
      renderAnalytics(snapshot.data,{snapshotAt:snapshot.at,cached:true,stale:true});
      return snapshot.data;
    }
    const note=$('#operator-collection-note');if(note)note.textContent='Redis 제한으로 분석 데이터를 새로 읽을 수 없습니다. 마지막 정상 스냅샷이 생기면 이 화면에서 계속 확인할 수 있습니다.';
    throw error;
  }
}
function exportAnalyticsJson(){if(!currentAnalytics)return;download('chunbong-analytics-'+String(currentDays)+'d.json',JSON.stringify({exportedAt:new Date().toISOString(),period:currentDays,data:currentAnalytics},null,2),'application/json')}
function exportAnalyticsCsv(){
  if(!currentAnalytics)return;
  const rows=[['구분','항목','값'],['요약','방문자',currentAnalytics.visitors],['요약','세션',currentAnalytics.sessions],['요약','페이지뷰',currentAnalytics.pageviews],['요약','평균 활동시간(초)',currentAnalytics.averageActiveSeconds],['요약','현재 활성',currentAnalytics.activeNow]];
  (currentAnalytics.daily||[]).forEach(x=>rows.push(['일별 '+x.date,'방문자',x.visitors],['일별 '+x.date,'세션',x.sessions],['일별 '+x.date,'페이지뷰',x.pageviews]));
  (currentAnalytics.topPages||[]).forEach(x=>rows.push(['페이지',x.key,x.value]));
  (currentAnalytics.topFeatures||[]).forEach(x=>rows.push(['기능',x.key,x.value]));
  (currentAnalytics.search?.topQueries||[]).forEach(x=>rows.push(['검색어',x.key,x.value],['검색 결과 없음',x.key,x.zeroCount||0]));
  (currentAnalytics.search?.topClicks||[]).forEach(x=>rows.push(['검색 후 클릭',x.query+' → '+x.label,x.value]));
  const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  download('chunbong-analytics-'+String(currentDays)+'d.csv',csv,'text/csv;charset=utf-8');
}
const categoryLabel={bug:'버그 신고',inconvenience:'불편한 점',feature:'기능 제안',design:'디자인 의견',content:'콘텐츠 요청',other:'기타'};
const statusLabel={new:'새로 들어옴',reviewing:'확인 중',planned:'반영 예정',done:'완료',archived:'보관'};
const priorityLabel={high:'높음',normal:'보통',low:'낮음'};
function feedbackFeatures(item={}){
  const normalized=String(item.message||'').toLowerCase().replace(/https?:\/\/\S+/g,' ').replace(/[^0-9a-z가-힣\s]/g,' ').replace(/\s+/g,' ').trim();
  const words=normalized.split(' ').filter(token=>token.length>=2);
  const compact=normalized.replace(/\s+/g,'');
  const grams=[];for(let i=0;i<compact.length-1&&i<120;i+=1)grams.push(compact.slice(i,i+2));
  return new Set([...words,...grams]);
}
function feedbackSimilarity(a={},b={}){
  if(!a.message||!b.message)return 0;
  const left=feedbackFeatures(a),right=feedbackFeatures(b);if(left.size<4||right.size<4)return 0;
  let same=0;for(const token of left)if(right.has(token))same+=1;
  const union=left.size+right.size-same,base=union?same/union:0;
  const context=(a.category===b.category?0.08:0)+(a.page===b.page?0.07:0);
  return Math.min(1,base+context);
}
function similarFeedback(item={},limit=8){
  return feedbackItems.filter(row=>row.id!==item.id).map(row=>({row,score:feedbackSimilarity(item,row)})).filter(entry=>entry.score>=0.48).sort((a,b)=>b.score-a.score||String(b.row.createdAt||'').localeCompare(String(a.row.createdAt||''))).slice(0,limit);
}
function feedbackDuplicateSummary(){
  const active=feedbackItems.filter(row=>!['done','archived'].includes(row.status)),parent=new Map(active.map(row=>[row.id,row.id]));
  const find=id=>{let root=parent.get(id)||id;while(parent.get(root)&&parent.get(root)!==root)root=parent.get(root);let cur=id;while(parent.get(cur)&&parent.get(cur)!==root){const next=parent.get(cur);parent.set(cur,root);cur=next}return root};
  const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra)};
  for(let i=0;i<active.length;i+=1)for(let j=i+1;j<active.length;j+=1)if(feedbackSimilarity(active[i],active[j])>=0.48)union(active[i].id,active[j].id);
  const groups=new Map();for(const row of active){const root=find(row.id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(row)}
  const repeated=[...groups.values()].filter(rows=>rows.length>1).sort((a,b)=>b.length-a.length);
  return{groups:repeated,groupCount:repeated.length,itemCount:repeated.reduce((sum,rows)=>sum+rows.length,0)};
}
function renderFeedbackSummary(){
  const duplicate=feedbackDuplicateSummary(),fresh=feedbackItems.filter(row=>row.status==='new').length,active=feedbackItems.filter(row=>['reviewing','planned'].includes(row.status)).length,high=feedbackItems.filter(row=>row.priority==='high'&&!['done','archived'].includes(row.status)).length;
  $('#feedback-summary-new').textContent=fmt(fresh)+'건';$('#feedback-summary-new').className=fresh?'is-warn':'is-ok';
  $('#feedback-summary-active').textContent=fmt(active)+'건';
  $('#feedback-summary-high').textContent=fmt(high)+'건';$('#feedback-summary-high').className=high?'is-bad':'is-ok';
  $('#feedback-summary-duplicates').textContent=fmt(duplicate.groupCount)+'묶음';$('#feedback-summary-duplicates').className=duplicate.groupCount?'is-warn':'is-ok';
  $('#feedback-summary-duplicates-meta').textContent=duplicate.groupCount?'유사 제보 '+fmt(duplicate.itemCount)+'건':'반복 제보 없음';
  return duplicate;
}
function filteredFeedback(){
  const q=String($('#operator-feedback-search')?.value||'').trim().toLowerCase(),statusFilter=$('#operator-feedback-status-filter')?.value||'all',categoryFilter=$('#operator-feedback-category-filter')?.value||'all',priorityFilter=$('#operator-feedback-priority-filter')?.value||'all',sort=$('#operator-feedback-sort')?.value||'newest';
  const rows=feedbackItems.filter(x=>(statusFilter==='all'||x.status===statusFilter)&&(categoryFilter==='all'||x.category===categoryFilter)&&(priorityFilter==='all'||(x.priority||'normal')===priorityFilter)&&(!q||[x.id,x.nickname,x.message,x.operatorMemo,x.relatedUpdate,...(x.tags||[])].some(v=>String(v||'').toLowerCase().includes(q))));
  rows.sort((a,b)=>(sort==='oldest'?1:-1)*String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  return rows;
}
function renderFeedbackList(){
  const rows=filteredFeedback(),list=$('#operator-feedback-list');
  list.innerHTML=rows.length?rows.map(x=>`<button class="operator-feedback-row ${selectedFeedback?.id===x.id?'active':''}" type="button" data-feedback-id="${x.id}"><span><i data-category="${x.category}">${escapeHtml(categoryLabel[x.category]||x.category)}</i><u data-priority="${x.priority||'normal'}">우선 ${escapeHtml(priorityLabel[x.priority||'normal'])}</u><b data-status="${x.status}">${escapeHtml(statusLabel[x.status]||x.status)}</b></span><strong>${escapeHtml(x.nickname||'익명')}</strong><p>${escapeHtml(x.message)}</p></button>`).join(''):'<p class="operator-empty">조건에 맞는 피드백이 없습니다.</p>';
  list.querySelectorAll('[data-feedback-id]').forEach(btn=>btn.addEventListener('click',()=>selectFeedback(btn.dataset.feedbackId)));
}
async function loadFeedback(){const data=await json(API+'operator-feedback');feedbackItems=data.items||[];if(selectedFeedback)selectedFeedback=feedbackItems.find(x=>x.id===selectedFeedback.id)||null;renderFeedbackSummary();renderFeedbackList();if(selectedFeedback)renderFeedbackDetail();renderOperatorAttention()}
function renderFeedbackDetail(){
  if(!selectedFeedback)return;
  $('#operator-feedback-empty').hidden=true;$('#operator-feedback-content').hidden=false;
  $('#feedback-category').textContent=categoryLabel[selectedFeedback.category]||selectedFeedback.category;$('#feedback-id').textContent=selectedFeedback.id;$('#feedback-message').textContent=selectedFeedback.message;$('#feedback-status').value=selectedFeedback.status;$('#feedback-priority').value=selectedFeedback.priority||'normal';$('#feedback-tags').value=(selectedFeedback.tags||[]).join(', ');$('#feedback-related-update').value=selectedFeedback.relatedUpdate||'';$('#feedback-memo').value=selectedFeedback.operatorMemo||'';
  const meta=[['닉네임',selectedFeedback.nickname||'익명'],['페이지',friendlyKey(selectedFeedback.page)],['기기',selectedFeedback.device],['화면',selectedFeedback.viewport],['PWA',selectedFeedback.pwa?'예':'아니오'],['테마',selectedFeedback.theme],['사이트 버전',selectedFeedback.siteSha?selectedFeedback.siteSha.slice(0,10):'-'],['접수',new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')],['마지막 변경',new Date(selectedFeedback.updatedAt||selectedFeedback.createdAt).toLocaleString('ko-KR')]];
  $('#feedback-meta').innerHTML=meta.map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('');
  const similar=similarFeedback(selectedFeedback),similarList=$('#feedback-similar-list'),similarCount=$('#feedback-similar-count');
  if(similarCount)similarCount.textContent=fmt(similar.length)+'건';
  if(similarList){similarList.innerHTML=similar.length?similar.map(({row,score})=>`<button type="button" data-similar-feedback="${escapeHtml(row.id)}"><span><b>${escapeHtml(categoryLabel[row.category]||row.category)}</b><i>${Math.round(score*100)}% 유사</i></span><strong>${escapeHtml(row.message)}</strong><small>${escapeHtml(statusLabel[row.status]||row.status)} · ${new Date(row.createdAt).toLocaleDateString('ko-KR')}</small></button>`).join(''):'<p class="operator-empty">비슷한 제보가 없습니다.</p>';similarList.querySelectorAll('[data-similar-feedback]').forEach(button=>button.addEventListener('click',()=>selectFeedback(button.dataset.similarFeedback)))}
}
function selectFeedback(id){selectedFeedback=feedbackItems.find(x=>x.id===id)||null;if(!selectedFeedback)return;renderFeedbackList();renderFeedbackDetail()}
async function updateSelectedFeedback({statusValue,memoValue,priorityValue,tagsValue,relatedUpdateValue}={}){
  if(!selectedFeedback)return;
  const body={id:selectedFeedback.id};
  if(statusValue!==undefined)body.status=statusValue;if(memoValue!==undefined)body.memo=memoValue;if(priorityValue!==undefined)body.priority=priorityValue;if(tagsValue!==undefined)body.tags=tagsValue;if(relatedUpdateValue!==undefined)body.relatedUpdate=relatedUpdateValue;
  const data=await json(API+'operator-feedback-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  selectedFeedback=data.item;feedbackItems=feedbackItems.map(x=>x.id===selectedFeedback.id?selectedFeedback:x);renderFeedbackSummary();renderFeedbackList();renderFeedbackDetail();renderOperatorAttention();await loadAnalytics();
}
function healthLabel(ok){if(ok===null||ok===undefined)return'<span class="operator-health warn">● 미조회</span>';return ok?'<span class="operator-health ok">● 정상</span>':'<span class="operator-health bad">● 확인 필요</span>'}
function redisMemoryLabel(storage={}){
  if(storage.usedMemoryHuman){
    const max=storage.maxMemoryHuman?' / '+storage.maxMemoryHuman:'';
    return storage.usedMemoryHuman+max;
  }
  if(Number.isFinite(Number(storage.usedMemory))&&Number(storage.usedMemory)>0)return fmt(Math.round(Number(storage.usedMemory)/1024))+' KB';
  return '제공되지 않음';
}
function bytesLabel(value){
  const n=Number(value);if(!Number.isFinite(n)||n<0)return'-';
  if(n>=1024*1024*1024)return(n/(1024*1024*1024)).toFixed(2)+' GB';
  if(n>=1024*1024)return(n/(1024*1024)).toFixed(1)+' MB';
  if(n>=1024)return(n/1024).toFixed(1)+' KB';
  return fmt(n)+' B';
}
function renderHealthHistory(rows=[]){
  const el=$('#operator-health-history');if(!el)return;
  el.innerHTML=rows.length?rows.map(row=>`<article class="operator-event-row is-${escapeHtml(row.level||'ok')}"><span></span><div><strong>${row.level==='ok'?'정상 상태':row.level==='bad'?'장애 신호':'주의 상태'}</strong><p>${escapeHtml((row.issues||[]).join(' · ')||'이상 신호가 해소되었습니다.')}</p><small>${new Date(row.at).toLocaleString('ko-KR')}</small></div></article>`).join(''):'<p class="operator-empty">아직 상태 변경 이력이 없습니다.</p>';
}
function deploymentGap(rows=[],deploymentSha='',synced=null){
  const normalized=Array.isArray(rows)?rows:[];if(synced===true)return{count:0,known:true,pending:[]};
  const index=normalized.findIndex(row=>String(row.sha||'')===String(deploymentSha||''));
  if(index>=0)return{count:index,known:true,pending:normalized.slice(0,index)};
  return{count:normalized.length,known:false,pending:normalized};
}
function renderCommitHistory(rows=[],deploymentSha='',synced=null){
  const el=$('#operator-commit-history');if(!el)return;
  const normalized=Array.isArray(rows)?rows:[],gap=deploymentGap(normalized,deploymentSha,synced),pendingIds=new Set(gap.pending.map(row=>String(row.sha||'')));
  el.innerHTML=normalized.length?normalized.map(row=>{
    const production=deploymentSha&&String(row.sha||'')===String(deploymentSha),pending=pendingIds.has(String(row.sha||''));
    const when=row.date?new Date(row.date).toLocaleString('ko-KR'):'날짜 확인 중';
    const author=row.author||'작성자 확인 중';
    const href=row.url||('https://github.com/gkzero0-cmyk/chunbong-fansite/commit/'+encodeURIComponent(row.sha||''));
    return `<a class="operator-commit-row ${production?'is-production':pending?'is-pending':''}" href="${escapeHtml(href)}" target="_blank" rel="noopener"><span class="operator-commit-sha">${escapeHtml(row.shortSha||shortSha(row.sha))}</span><div><strong>${escapeHtml(row.message||'변경사항')}</strong><small>${escapeHtml(author)} · ${escapeHtml(when)}</small></div>${production?'<b>Production</b>':pending?'<b class="is-pending">배포 대기</b>':'<i aria-hidden="true">↗</i>'}</a>`;
  }).join(''):'<p class="operator-empty">최근 GitHub 변경 이력을 확인하지 못했습니다.</p>';
  return gap;
}
function renderChangelogHealth(changelog={}){
  const box=$('#operator-changelog-health'),title=$('#system-changelog-title'),date=$('#system-changelog-date'),sha=$('#system-changelog-sha');if(!box)return;
  const latest=changelog?.latest||null;
  box.className='operator-changelog-health '+(changelog?.ok?'is-ok':'is-bad');
  box.innerHTML=changelog?.ok
    ?'<strong>자동 기록 정상</strong><span>GitHub main의 사용자용 변경사항을 업데이트 일지에 자동으로 합치는 경로가 응답하고 있습니다.</span>'
    :'<strong>확인 필요</strong><span>업데이트 일지 자동 기록 API가 정상 응답하지 않았습니다.</span>';
  if(title)title.textContent=latest?.title||'-';
  if(date)date.textContent=latest?.date||'-';
  if(sha)sha.textContent=latest?.shortSha||shortSha(latest?.sha);
}
async function loadSystemStatus({storage:deepStorage=false}={}){
  const data=await json(API+'operator-system-status'+(deepStorage?'&storage=1':''));currentSystem=data;
  const dep=data.deployment||{},storage=data.storage||{},services=data.services||{},traffic=data.traffic||currentAnalytics||{},redisUsage=data.redisUsage||{},realtimeRedisUsage=data.realtimeRedisUsage||{};
  $('#system-production').innerHTML=dep.sha?'<span class="operator-health ok">● READY</span>':'<span class="operator-health bad">● 확인 필요</span>';$('#system-production-meta').textContent=(dep.environment||'-')+' · '+shortSha(dep.sha);
  const internalOnlySync=dep.synced===true&&dep.internalOnlyGap&&dep.exactSynced===false;
  $('#system-sync').innerHTML=dep.synced===true?(internalOnlySync?'<span class="operator-health ok">● 사이트 코드 동기화</span>':'<span class="operator-health ok">● 동기화</span>'):dep.synced===false?'<span class="operator-health warn">● 코드 배포 지연</span>':'<span class="operator-health warn">● 확인 불가</span>';$('#system-sync-meta').textContent=shortSha(dep.sha)+' / '+shortSha(dep.mainSha)+(internalOnlySync?' · CI/테스트 변경만 생략':'');
  const storageHealth=$('#system-storage');
  if(storageHealth){
    if(storage.limited||storage.redisOk===false)storageHealth.innerHTML='<span class="operator-health bad">● 제한/확인 필요</span>';
    else if(storage.liveChecked&&storage.redisOk===true)storageHealth.innerHTML='<span class="operator-health ok">● 정상</span>';
    else if(storage.redisConfigured)storageHealth.innerHTML='<span class="operator-health warn">● 저비용 모드</span>';
    else storageHealth.innerHTML='<span class="operator-health warn">● 설정 없음</span>';
  }
  $('#system-storage-meta').textContent=!storage.redisConfigured?'저장소 설정 없음':storage.limited?'Redis 제한 감지 · 운영자 센터는 계속 사용 가능':storage.liveChecked?(storage.redisOk?'수동 상세 확인 정상':'수동 상세 확인 실패'):'기본 화면은 Redis를 조회하지 않습니다.';
  $('#system-push').innerHTML=services.push===true?'<span class="operator-health ok">● 준비됨</span>':services.push===false?'<span class="operator-health bad">● 확인 필요</span>':'<span class="operator-health warn">● 상세 미조회</span>';$('#system-push-meta').textContent=services.push===true?'Realtime Redis의 VAPID 준비됨':services.push===false?'Realtime Redis의 Push 설정 확인 필요':'Redis 절약을 위해 기본 화면에서는 저장형 Push 설정을 읽지 않습니다.';
  $('#system-active').textContent=traffic.activeNow===null||traffic.activeNow===undefined?'-':fmt(traffic.activeNow);$('#system-visitors').textContent=traffic.visitors===null||traffic.visitors===undefined?'-':fmt(traffic.visitors);$('#system-sessions').textContent=traffic.sessions===null||traffic.sessions===undefined?'-':fmt(traffic.sessions);$('#system-pageviews').textContent=traffic.pageviews===null||traffic.pageviews===undefined?'-':fmt(traffic.pageviews);
  $('#system-sha').textContent=shortSha(dep.sha);$('#system-main-sha').textContent=shortSha(dep.mainSha);$('#system-url').textContent=dep.url||'-';
  $('#system-vercel-status').textContent=dep.rateLimited?'배포 제한 · '+(dep.vercel?.description||'rate limited'):dep.vercel?.description||dep.vercel?.state||'상태 정보 없음';
  $('#system-retry-at').textContent=dep.retryAfter?'안전 재시도 기준 '+new Date(dep.retryAfter).toLocaleString('ko-KR'):dep.synced===true?'재시도 불필요':'자동 재시도 조건 확인 중';
  const commitRows=data.repository?.recentCommits||[],gap=deploymentGap(commitRows,dep.sha,dep.synced);$('#system-pending-commits').textContent=dep.synced===true?'0건':gap.known?fmt(gap.count)+'건':fmt(gap.count)+'건 이상';
  $('#system-repo-size').textContent=data.repository?.sizeKb?fmt(data.repository.sizeKb)+' KB':'-';$('#system-redis-keys').textContent=storage.keyCount===null||storage.keyCount===undefined?'상세 확인 시 표시':fmt(storage.keyCount)+'개';$('#system-redis-memory').textContent=redisMemoryLabel(storage);$('#system-analytics-days').textContent=storage.analyticsRecordedDays===null||storage.analyticsRecordedDays===undefined?'-':fmt(storage.analyticsRecordedDays)+'일';$('#system-feedback-total').textContent=storage.feedbackTotal===null||storage.feedbackTotal===undefined?'-':fmt(storage.feedbackTotal)+'개';$('#system-checked-at').textContent=new Date(data.checkedAt).toLocaleString('ko-KR');
  const usageUsed=$('#system-redis-monthly-used'),usageRemaining=$('#system-redis-monthly-remaining'),usagePct=$('#system-redis-monthly-pct'),usageSource=$('#system-redis-usage-source'),usageRead=$('#system-redis-monthly-read'),usageWrite=$('#system-redis-monthly-write'),usageDaily=$('#system-redis-daily-commands'),usageStorage=$('#system-redis-current-storage');
  if(usageUsed)usageUsed.textContent=redisUsage.exact?fmt(redisUsage.used)+' / '+fmt(redisUsage.monthlyLimit):'실측 연결 대기';
  if(usageRemaining)usageRemaining.textContent=redisUsage.exact?fmt(redisUsage.remaining)+'회':'Free 참고 '+fmt(redisUsage.monthlyLimit||500000)+'회';
  if(usagePct){usagePct.textContent=redisUsage.exact?Number(redisUsage.usedPct).toFixed(1)+'%':'-';usagePct.className=redisUsage.exact&&Number(redisUsage.usedPct)>=95?'is-bad':redisUsage.exact&&Number(redisUsage.usedPct)>=75?'is-warn':redisUsage.exact?'is-ok':''}
  if(usageSource)usageSource.textContent=redisUsage.exact?'Upstash 관리 API 실측 · Redis command 소모 없음':redisUsage.source==='developer_api_not_configured'?'Upstash Developer API 미연결 · Redis를 조회하지 않고 표시 중':'관리 API에서 실측값을 가져오지 못했습니다.';
  if(usageRead)usageRead.textContent=redisUsage.reads===null||redisUsage.reads===undefined?'-':fmt(redisUsage.reads);
  if(usageWrite)usageWrite.textContent=redisUsage.writes===null||redisUsage.writes===undefined?'-':fmt(redisUsage.writes);
  if(usageDaily)usageDaily.textContent=redisUsage.dailyCommands===null||redisUsage.dailyCommands===undefined?'-':fmt(redisUsage.dailyCommands);
  if(usageStorage)usageStorage.textContent=bytesLabel(redisUsage.currentStorageBytes);
  const rtUsageUsed=$('#system-realtime-redis-monthly-used'),rtUsageRemaining=$('#system-realtime-redis-monthly-remaining'),rtUsagePct=$('#system-realtime-redis-monthly-pct'),rtUsageSource=$('#system-realtime-redis-usage-source'),rtUsageRead=$('#system-realtime-redis-monthly-read'),rtUsageWrite=$('#system-realtime-redis-monthly-write'),rtUsageDaily=$('#system-realtime-redis-daily-commands'),rtUsageStorage=$('#system-realtime-redis-current-storage');
  if(rtUsageUsed)rtUsageUsed.textContent=realtimeRedisUsage.exact?fmt(realtimeRedisUsage.used)+' / '+fmt(realtimeRedisUsage.monthlyLimit):'실측 연결 대기';
  if(rtUsageRemaining)rtUsageRemaining.textContent=realtimeRedisUsage.exact?fmt(realtimeRedisUsage.remaining)+'회':'-';
  if(rtUsagePct){rtUsagePct.textContent=realtimeRedisUsage.exact?Number(realtimeRedisUsage.usedPct).toFixed(1)+'%':'-';rtUsagePct.className=realtimeRedisUsage.exact&&Number(realtimeRedisUsage.usedPct)>=95?'is-bad':realtimeRedisUsage.exact&&Number(realtimeRedisUsage.usedPct)>=75?'is-warn':realtimeRedisUsage.exact?'is-ok':''}
  if(rtUsageSource)rtUsageSource.textContent=realtimeRedisUsage.exact?'별도 Upstash 관리 API 실측 · Redis command 소모 없음':realtimeRedisUsage.source==='developer_api_not_configured'?'실측 연결 대기 · Realtime Developer API 미연결':'Realtime 관리 API에서 실측값을 가져오지 못했습니다.';
  if(rtUsageRead)rtUsageRead.textContent=realtimeRedisUsage.reads===null||realtimeRedisUsage.reads===undefined?'-':fmt(realtimeRedisUsage.reads);
  if(rtUsageWrite)rtUsageWrite.textContent=realtimeRedisUsage.writes===null||realtimeRedisUsage.writes===undefined?'-':fmt(realtimeRedisUsage.writes);
  if(rtUsageDaily)rtUsageDaily.textContent=realtimeRedisUsage.dailyCommands===null||realtimeRedisUsage.dailyCommands===undefined?'-':fmt(realtimeRedisUsage.dailyCommands);
  if(rtUsageStorage)rtUsageStorage.textContent=bytesLabel(realtimeRedisUsage.currentStorageBytes);
  const serviceRows=[['GitHub 운영자 인증',services.githubAuth],['이메일 운영자 인증',services.emailAuth],['Push 알림',services.push],['실사용 분석',services.analytics],['피드백 저장',services.feedback]];
  $('#operator-service-health').innerHTML=serviceRows.map(([label,ok])=>`<div><span>${label}</span>${healthLabel(ok)}</div>`).join('');
  const endpoints=Array.isArray(data.endpoints)?data.endpoints:[];
  $('#operator-endpoint-health').innerHTML=endpoints.length?endpoints.map(row=>`<div><span>${escapeHtml(row.label||row.path||'API')} <small>${fmt(row.ms)}ms</small></span><span class="operator-endpoint-result ${row.ok?'ok':'bad'}">${row.ok?'HTTP '+fmt(row.status):row.status?'HTTP '+fmt(row.status):'응답 실패'}</span></div>`).join(''):'<p class="operator-empty">API 상태를 확인하지 못했습니다.</p>';
  const multiplayer=data.multiplayer||{};
  const quota=data.quota||{},quotaSignals=Array.isArray(quota.signals)?quota.signals:[],quotaEvents=Array.isArray(quota.recentEvents)?quota.recentEvents:[],quotaHistory=Array.isArray(quota.history)?quota.history:[];
  const recovery=data.recovery||{};
  const budget=data.resourceBudget||{},mode=budget.mode||'saving';
  const budgetMode=$('#system-budget-mode');
  if(budgetMode){budgetMode.textContent=mode==='limit'?'● 제한 모드':'● 절약 모드';budgetMode.className='operator-health '+(mode==='limit'?'bad':'ok')}
  if($('#system-budget-sample'))$('#system-budget-sample').textContent=Math.round((Number(budget.analyticsSampleRate)||0)*100)+'%';
  if($('#system-budget-retention'))$('#system-budget-retention').textContent=fmt(budget.analyticsRetentionDays||0)+'일';
  if($('#system-budget-polling'))$('#system-budget-polling').textContent=Number(budget.operatorPollingSeconds)>0?fmt(budget.operatorPollingSeconds)+'초':'자동 갱신 없음';
  if($('#system-budget-redis'))$('#system-budget-redis').textContent=budget.redisCircuitOpen?'호출 중지 중':data.readMode==='redis-zero'?'기본 화면 0-read':'수동 상세 조회';
  const protections=budget.protections||{};
  const protectionRows=[
    ['운영자 센터 기본 열기 · Redis 직접 조회 없음',protections.operatorCenterRedisReadOnOpen===false],
    ['분석 자동 갱신 없음 · 12시간 브라우저 스냅샷',protections.operatorAnalyticsAutoRefresh===false],
    ['세션 인덱스 상시 조회 제거',protections.operatorSessionIndexValidation===false],
    ['월간 사용량 관리 API · Redis command 0회',protections.upstashManagementStatsNoRedisCommands===true],
    ['중복 요청 합치기',protections.requestDedupe],
    ['콘텐츠 단일 요청 공유',protections.publicContentSingleFlight],
    ['아카이브 메타 캐시 '+fmt(protections.archiveSourceMetaCacheSeconds||0)+'초',protections.archiveSourceMetaSingleFlight&&Number(protections.archiveSourceMetaCacheSeconds)>0],
    ['외부 JSON 캐시 '+fmt(protections.upstreamJsonCacheSeconds||0)+'초',Number(protections.upstreamJsonCacheSeconds)>0],
    ['이미지 CDN 캐시 '+fmt(Math.round((protections.imageProxyCdnCacheSeconds||0)/86400))+'일',Number(protections.imageProxyCdnCacheSeconds)>0],
    ['Push 저장 '+String(protections.pushSubscriptionStore||'-'),protections.pushSubscriptionStore==='redis-hash-v2'],
    ['Push 백업 '+fmt(protections.pushFallbackMinutes||0)+'분',Number(protections.pushFallbackMinutes)>0],
    ['SOOP LIVE 확인 '+fmt(protections.soopTelemetryMinutes||0)+'분',Number(protections.soopTelemetryMinutes)>0],
    ['SOOP OFF 확장수집 '+fmt(protections.soopOfflineExtendedMinutes||0)+'분',Number(protections.soopOfflineExtendedMinutes)>=60],
    ['YouTube 증분 탐색',protections.youtubeIncrementalDiscovery===true],
    ['YouTube 일일 지표 '+fmt(protections.youtubeDailyRecentLimit||0)+'+'+fmt(protections.youtubeStaleRefreshLimit||0)+'개',Number(protections.youtubeDailyRecentLimit)>0],
    ['Notion 백업 '+fmt(protections.notionFallbackMinutes||0)+'분',Number(protections.notionFallbackMinutes)>=360],
    ['멀티플레이 대기 polling '+fmt(multiplayer.backgroundPollSeconds||0)+'초',Number(multiplayer.backgroundPollSeconds)>=5],
    ['멀티플레이 delta sync '+fmt(Math.round((multiplayer.progressHeartbeatMilliseconds||0)/1000))+'초 heartbeat',multiplayer.progressDeltaSync===true],
    ['멀티플레이 room_busy '+fmt(multiplayer.roomBusy||0)+'회',Number(multiplayer.roomBusy||0)===0],
    ['멀티플레이 lock 재시도 '+fmt(multiplayer.lockRetries||0)+'회',Number(multiplayer.lockRetries||0)<20],
    ['멀티플레이 Redis circuit '+(Number(multiplayer.redisCircuitOpenUntil||0)>Date.now()?'열림':'정상'),Number(multiplayer.redisCircuitOpenUntil||0)<=Date.now()],
    ['마지막 정상 데이터',protections.lastGoodSnapshot],
    ['일일 검증 복구본',protections.validatedDailySnapshot],
    ['외부 장애 캐시 보존',protections.providerOutagePreservesCache],
    ['분석 임시 보관 '+fmt(protections.analyticsDeferredBufferHours||0)+'시간 · 최대 '+fmt(protections.analyticsDeferredMaxEvents||0)+'건',Number(protections.analyticsDeferredBufferHours)>=48&&Number(protections.analyticsDeferredMaxEvents)>=120],
    ['지연 분석 원래 시각 보존',protections.analyticsReplayPreservesEventTime===true],
    ['크루 소식 캐시',protections.crewNewsCache],
    ['랭킹 제한 완화',protections.rankingGracefulFallback],
    ['24시간 제한 이벤트 '+fmt(quotaEvents.length)+'건',quotaEvents.length===0],
    ['화면 검증',protections.visualCheck==='playwright']
  ];
  const quotaRows=quotaSignals.map(row=>[
    String(row.label||row.id||'외부 서비스')+' · '+String(row.detail||''),
    row.level==='ok',
    row.level
  ]);
  if($('#system-recovery-status'))$('#system-recovery-status').textContent=!recovery.available?'복구본 생성 대기':recovery.active?'last-known-good 사용 중':'현재 데이터 사용 중';
  const recoveryButton=$('#operator-recovery-toggle');
  if(recoveryButton){recoveryButton.textContent=recovery.active?'현재 데이터로 복귀':'last-known-good 사용';recoveryButton.dataset.active=recovery.active?'1':'0';recoveryButton.disabled=!recovery.available}
  if($('#system-quota-history'))$('#system-quota-history').innerHTML=quotaHistory.length?quotaHistory.slice(-14).reverse().map(row=>`<div><span>${escapeHtml(row.day||'-')}</span><b>${fmt(row.total||0)}건</b></div>`).join(''):'<p class="operator-empty">최근 저장된 제한 이벤트가 없습니다.</p>';
  const quotaCauseCounts={};
  for(const row of quotaHistory){
    for(const [type,count] of Object.entries(row?.counts||{}))quotaCauseCounts[type]=(quotaCauseCounts[type]||0)+(Number(count)||0);
  }
  const quotaCauseLabels={
    'redis-circuit':'Redis circuit',
    'vercel-rate-limit':'Vercel 제한',
    'vercel-rate-limit-recovered':'Vercel 회복',
    'endpoint-failure':'외부/API 실패',
    'analytics-saving':'분석 절약모드',
    'recovery-mode':'복구 모드'
  };
  const quotaCauseRows=Object.entries(quotaCauseCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if($('#system-quota-breakdown'))$('#system-quota-breakdown').innerHTML=quotaCauseRows.length?quotaCauseRows.map(([type,count])=>`<div><span>${escapeHtml(quotaCauseLabels[type]||type)}</span><b>${fmt(count)}건</b></div>`).join(''):'<p class="operator-empty">최근 저장된 원인별 이벤트가 없습니다.</p>';
  if($('#system-budget-protections'))$('#system-budget-protections').innerHTML=[
    ...quotaRows.map(([label,ok,level])=>`<div><span>${escapeHtml(label)}</span><span class="operator-health ${level==='limit'?'bad':level==='warn'?'warn':'ok'}">${level==='limit'?'제한':level==='warn'?'절약':'정상'}</span></div>`),
    ...protectionRows.map(([label,ok])=>`<div><span>${label}</span>${healthLabel(Boolean(ok))}</div>`)
  ].join('');
  const isolated=budget.isolatedStores||{},isolatedCount=Object.values(isolated).filter(Boolean).length;
  if($('#system-budget-isolation'))$('#system-budget-isolation').innerHTML=`<strong>Redis 기능 격리</strong><span>${isolatedCount?fmt(isolatedCount)+'개 기능이 별도 저장소 사용 중':'현재는 공용 Redis 사용 · 필요 시 기능별 분리 가능'}</span>`;
  renderCommitHistory(commitRows,dep.sha,dep.synced);renderChangelogHealth(data.changelog||{});
  renderHealthHistory(data.health?.history||[]);renderDeploymentBanner();renderOperatorAttention();
}
const securityActionLabel={
  login_success:'로그인 성공',login_failed:'로그인 실패',login_email_requested:'이메일 인증 요청',session_revoked:'세션 종료',logout:'로그아웃',logout_all:'모든 기기 로그아웃'
};
function renderSecurityLog(rows=[]){
  const el=$('#operator-security-log');if(!el)return;
  el.innerHTML=rows.length?rows.map(row=>`<article class="operator-event-row"><span></span><div><strong>${escapeHtml(securityActionLabel[row.action]||row.action||'보안 활동')}</strong><p>${escapeHtml(providerLabel(row.provider))}${row.detail?' · '+escapeHtml(row.detail):''}</p><small>${new Date(row.at).toLocaleString('ko-KR')}</small></div></article>`).join(''):'<p class="operator-empty">기록된 보안 활동이 없습니다.</p>';
}
async function loadSecurityLog(){
  try{const data=await json(API+'operator-security-log&limit=40');renderSecurityLog(data.items||[])}catch{renderSecurityLog([])}
}
function renderSessions(){
  const el=$('#operator-session-list'),rows=session?.sessions||[];
  el.innerHTML=rows.length?rows.map(row=>`<article class="${row.current?'is-current':''}"><div><strong>${row.current?'현재 세션 · ':''}${escapeHtml(providerLabel(row.provider))}</strong><span>${row.createdAt?'로그인 '+new Date(row.createdAt).toLocaleString('ko-KR'):'기존 세션'}${row.lastSeen?' · 최근 활동 '+new Date(row.lastSeen).toLocaleString('ko-KR'):''} · 만료 ${new Date(row.expiresAt).toLocaleDateString('ko-KR')}</span></div>${row.current?'<b>현재 기기</b>':`<button type="button" data-revoke-session="${escapeHtml(row.id)}">세션 종료</button>`}</article>`).join(''):'<p class="operator-empty">세션 상세 정보가 아직 없습니다.</p>';
  el.querySelectorAll('[data-revoke-session]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('이 운영자 세션을 종료할까요?'))return;await json(API+'operator-session-revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.revokeSession})});await refreshSession()}));
}
async function refreshSession({details=false}={}){session=await json(API+'operator-session'+(details?'&details=1':''));try{localStorage.setItem('chunbong:operator:access-hint:v1','1')}catch(_){}$('#security-provider').textContent=providerLabel(session.provider);$('#security-expires').textContent=new Date(session.expiresAt).toLocaleString('ko-KR');$('#security-sessions').textContent=(session.storageDegraded?'현재 기기 · 저장소 제한':fmt(session.activeSessions||1)+'개');$('#security-github').textContent=session.owner?.githubLogin||'gkzero0-cmyk';renderSessions();return session}
async function setupFirebaseEmail(){
 const form=$('#operator-email-form');form.addEventListener('submit',async e=>{e.preventDefault();const email=$('#operator-email').value.trim().toLowerCase();status.textContent='인증 메일 요청 중…';try{await json(API+'operator-email-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});localStorage.setItem('chunbong:operator:email',email);status.textContent='등록된 운영자 계정이라면 인증 메일이 발송됩니다. 메일함을 확인해 주세요.'}catch(err){status.textContent=err.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 요청을 처리하지 못했습니다.'}})
 if(new URLSearchParams(location.search).get('email')==='complete'){try{const config=await json(API+'operator-auth-config');if(!config.providers.email||!config.firebase)return;const email=localStorage.getItem('chunbong:operator:email')||prompt('인증 메일을 받은 주소를 입력하세요')||'';if(!email)return;const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');const {getAuth,isSignInWithEmailLink,signInWithEmailLink}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const app=initializeApp(config.firebase,'operator-email-complete');const auth=getAuth(app);if(!isSignInWithEmailLink(auth,location.href))throw new Error('invalid_link');const credential=await signInWithEmailLink(auth,email,location.href);const idToken=await credential.user.getIdToken();await json(API+'operator-email-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});localStorage.removeItem('chunbong:operator:email');history.replaceState(null,'','/operator.html');await boot()}catch{status.textContent='이메일 인증 링크를 확인하지 못했습니다.'}}
}

const HISTORY_VERIFIED_PATTERNS=[
  /^레오펠(?:\s*:?.*)?$/i,/^그냥서버(?:\s*:?.*)?$/i,/^마병대\s*[34]$/i,
  /^홍창의 숲$/i,/^하루살이 서버$/i,/^충동서버$/i,/^린코레일\s*2$/i,/^픽크타\s*2$/i,
  /^꾸다방\s*2\.5$/i,/^감블러의 놀이터$/i,/^또오냥의 조까치수련회\s*2$/i,/^오함마\s*3/i,
  /^킹콩서버$/i,/^돌발서버$/i,/^원조 다이아게임$/i,/^니즈 좀비서버$/i,/^더켓몬 민원아저씨$/i,
  /^퍼켓몬(?:\s+w\.\s*조통박치기)?$/i,/^모징어게임$/i,/^청더일레븐(?:\s+w\.\s*춘밥즈)?$/i,
  /^염병서버$/i,/^챈나룽 서버$/i,/^밍친서버$/i,/^챈나의 경찰과 도둑(?:\s*2)?$/i,/^야구자의 왁업$/i,
  /^해리의 RE병대$/i,/^사자회 체력공유 엔더런$/i,/^춘앤룽 엔더런 원정대$/i,/^다이아랜딩 서버$/i,
  /^두둥투어 서버$/i,/^하요리 서버$/i,/^춘동아리 다이아서버$/i,/^수미랜드 다이아서버$/i,
  /^사자회 원블럭$/i,/^해초마을\s*2$/i,/^맹든링$/i,/^GTA 좀비서버/i,/^LAC 서버$/i,/^요양타운$/i,
  /^여우도시$/i,/^고래시티$/i,/^진보이드 서버$/i,/^담월드(?:2)?(?:\s+w\..*)?$/i,/^고세구의 세바버$/i,
  /^처니랜드\s*쪼이팀\s*뻐꾸기병$/i,/^버추얼 종합대회 시즌3\s*:\s*넥버워치 중계$/i,
  /^김멘탈의 랜버워치 대회 3등$/i,/^2025 SOOP 스트리머 대상(?: 참여)?$/i
];
function historyAuditCandidate(label=''){
  const text=String(label||'').trim();
  if(!text)return false;
  if(/설명회|모집|신청|면접|지원 영상|입주자 발표|무기한 연기/.test(text))return false;
  return /서버|월드|마병대|레오펠|다이아|VRC|VR쳇|배그|아르마|오버워치|버워치|대회|GTA|팰월드|좀보이드|원블럭|엔더런|타운|시티|마을|랜드|픽셀몬|퍼켓몬|더켓몬/i.test(text);
}
function historyAuditReason(label=''){
  const text=String(label||'');
  if(/서버|월드|타운|시티|마을|랜드/.test(text))return '게임 종류 확인';
  if(/대회|배그|아르마|오버워치|버워치/.test(text))return '콘텐츠 형태 확인';
  return '간단 보기 포함 기준 확인';
}
function isVerifiedHistoryLabel(label=''){
  return HISTORY_VERIFIED_PATTERNS.some(pattern=>pattern.test(String(label||'').trim()));
}
function normalizeHistoryAuditLabel(value=''){
  return String(value||'').toLowerCase().replace(/[\s:·<>\-_.]/g,'');
}
function historyArchiveMatch(row={},indexItems=[]){
  const label=normalizeHistoryAuditLabel(row.label);
  if(!label)return null;
  let best=null,bestScore=0;
  for(const item of indexItems){
    const names=[item?.title,...(Array.isArray(item?.aliases)?item.aliases:[])].filter(Boolean);
    for(const name of names){
      const normalized=normalizeHistoryAuditLabel(name);
      if(normalized.length<3)continue;
      let score=0;
      if(label===normalized)score=200+normalized.length;
      else if(label.includes(normalized))score=100+normalized.length;
      else if(normalized.includes(label)&&label.length>=5)score=70+label.length;
      if(score>bestScore){best=item;bestScore=score;}
    }
  }
  return bestScore>=80?best:null;
}
async function loadHistoryVerification(){
  const card=$('[data-history-audit-card]'),summary=$('[data-history-audit-summary]'),results=$('[data-history-audit-results]'),button=$('[data-history-audit-run]');
  if(!card||!summary||!results)return;
  if(button)button.disabled=true;
  summary.innerHTML='<strong>검증 중</strong><span>2025~2026 방송 이력의 분류와 대표 이미지를 함께 확인하고 있습니다.</span>';
  try{
    const [y2025,y2026,indexPayload]=await Promise.all([
      json('/api/history-sheet?sheet=2025'),
      json('/api/history-sheet?sheet=2026'),
      json('/api/content?type=chunbong-content-index')
    ]);
    const indexItems=Array.isArray(indexPayload?.items)?indexPayload.items:[];
    const rows=[
      ...(Array.isArray(y2025?.items)?y2025.items.map(item=>({...item,year:2025})):[]),
      ...(Array.isArray(y2026?.items)?y2026.items.map(item=>({...item,year:2026})):[])
    ];
    const legacyRows=(Array.isArray(window.CHUNBONG_HISTORY_RECORDS)?window.CHUNBONG_HISTORY_RECORDS:[])
      .filter(row=>String(row.start||'')<'2025-01-01')
      .map(row=>({...row,year:Number(String(row.start||'').slice(0,4))||0}));
    const majorRows=[...rows.filter(row=>historyAuditCandidate(row.label)),...legacyRows.filter(row=>historyAuditCandidate(row.label))];
    const issueMap=new Map();
    const addIssue=(row,reason)=>{
      const key=[row.start||'',row.label||''].join('|');
      const current=issueMap.get(key)||{...row,reasons:[]};
      if(!current.reasons.includes(reason))current.reasons.push(reason);
      issueMap.set(key,current);
    };
    for(const row of majorRows){
      if(!isVerifiedHistoryLabel(row.label))addIssue(row,historyAuditReason(row.label));
      const archive=historyArchiveMatch(row,indexItems);
      const hasArchiveHero=Boolean(archive?.heroImage?.src);
      const hasSheetImage=Boolean(row.thumb||row.image||row.imageUrl);
      if(!hasArchiveHero&&!hasSheetImage)addIssue(row,'대표 이미지 지정 없음');
      const hasSummary=Boolean(String(row.detail||archive?.summary||'').trim());
      if(!hasSummary)addIssue(row,'상세 요약 없음');
    }
    const classificationReasons=new Set(['게임 종류 확인','콘텐츠 형태 확인','간단 보기 포함 기준 확인']);
    const issuePriority=row=>{
      if(row.reasons.some(reason=>classificationReasons.has(reason))) return 0;
      if(row.reasons.includes('대표 이미지 지정 없음')) return 1;
      if(row.reasons.includes('상세 요약 없음')) return 2;
      return 3;
    };
    const issues=[...issueMap.values()].sort((a,b)=>issuePriority(a)-issuePriority(b)||String(b.start||'').localeCompare(String(a.start||'')));
    const classificationCount=issues.filter(row=>row.reasons.some(reason=>classificationReasons.has(reason))).length;
    const imageCount=issues.filter(row=>row.reasons.includes('대표 이미지 지정 없음')).length;
    const summaryCount=issues.filter(row=>row.reasons.includes('상세 요약 없음')).length;
    const total=Math.max(majorRows.length,1);
    const pct=count=>Math.max(0,Math.round((total-count)/total*100));
    const yearQuality=[...new Set(majorRows.map(row=>String(row.year||String(row.start||'').slice(0,4))).filter(Boolean))].sort((a,b)=>b.localeCompare(a)).map(year=>{
      const yearRows=majorRows.filter(row=>String(row.year||String(row.start||'').slice(0,4))===year);
      const yearKeys=new Set(yearRows.map(row=>[row.start||'',row.label||''].join('|')));
      const yearIssues=issues.filter(row=>yearKeys.has([row.start||'',row.label||''].join('|')));
      const denom=Math.max(yearRows.length,1);
      const countReason=predicate=>yearIssues.filter(predicate).length;
      const classificationMissing=countReason(row=>row.reasons.some(reason=>classificationReasons.has(reason)));
      const imageMissing=countReason(row=>row.reasons.includes('대표 이미지 지정 없음'));
      const summaryMissing=countReason(row=>row.reasons.includes('상세 요약 없음'));
      const rate=missing=>Math.max(0,Math.round((denom-missing)/denom*100));
      return {year,total:yearRows.length,classification:rate(classificationMissing),image:rate(imageMissing),summary:rate(summaryMissing)};
    });
    summary.innerHTML=`<div class="operator-history-audit-metrics"><span><b>${pct(classificationCount)}%</b>분류 완료</span><span><b>${pct(imageCount)}%</b>대표 이미지</span><span><b>${pct(summaryCount)}%</b>상세 요약</span><span><b>${fmt(majorRows.length)}</b>주요 기록 점검</span></div><div class="operator-history-year-quality">${yearQuality.map(row=>`<span><b>${escapeHtml(row.year)}</b><em>분류 ${row.classification}% · 이미지 ${row.image}% · 요약 ${row.summary}%</em></span>`).join('')}</div><small>${issues.length?'확인 필요한 항목만 아래에 표시합니다.':'현재 주요 기록에 추가 확인 항목이 없습니다.'}</small>`;
    results.innerHTML=issues.length
      ?issues.slice(0,40).map(row=>{const priority=issuePriority(row),label=priority===0?'분류 우선':priority===1?'이미지':priority===2?'요약':'확인';return `<article data-history-audit-priority="${priority}"><time>${escapeHtml(row.start||'')}</time><div><strong>${escapeHtml(row.label)}</strong><span><b class="operator-history-priority">[${label}]</b> ${escapeHtml(row.reasons.join(' · '))} · ${row.year}년</span></div><a href="history.html?q=${encodeURIComponent(row.label||'')}&view=detail" target="_blank" rel="noopener">이력 보기 ↗</a></article>`}).join('')
      :'<p class="operator-empty">추가로 확인할 주요 방송 이력이 없습니다.</p>';
  }catch(error){
    summary.innerHTML='<strong>검증 실패</strong><span>스프레드시트 또는 콘텐츠 아카이브를 불러오지 못했습니다.</span>';
    results.innerHTML='<p class="operator-empty">잠시 뒤 다시 실행해 주세요.</p>';
  }finally{
    if(button)button.disabled=false;
  }
}
let operatorContentsModulePromise=null,operatorContentsPromise=null;
function operatorContentsModule(){
  if(!operatorContentsModulePromise)operatorContentsModulePromise=import('./operator-contents.js?v=2');
  return operatorContentsModulePromise;
}
function loadOperatorContents(){
  if(operatorContentsPromise)return operatorContentsPromise;
  operatorContentsPromise=operatorContentsModule().then(module=>module.bootOperatorContents());
  return operatorContentsPromise;
}
async function loadArchiveHealth(){
  const module=await operatorContentsModule();
  currentArchiveHealth=await module.fetchOperatorContentHealth();
  renderOperatorAttention();
  return currentArchiveHealth;
}
async function activateOperatorTab(tab){
  const target=String(tab||'overview');
  $$('[data-operator-tab]').forEach(button=>{const active=button.dataset.operatorTab===target;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
  $$('[data-operator-panel]').forEach(panel=>panel.hidden=panel.dataset.operatorPanel!==target);
  if(target==='contents'){await loadOperatorContents();const state=$('[data-history-audit-summary] strong')?.textContent||'';if(/검사 대기/.test(state))void loadHistoryVerification();}
  if((target==='performance'||target==='search')&&!currentAnalytics)await loadAnalytics();
  if(target==='feedback'&&!feedbackItems.length)await loadFeedback().catch(()=>{const list=$('#operator-feedback-list');if(list)list.innerHTML='<p class="operator-empty">Redis 제한으로 새 피드백 목록을 읽을 수 없습니다.</p>'});
  if(target==='system'&&!currentSystem)await loadSystemStatus();
  if(target==='security')await Promise.allSettled([refreshSession({details:true}),loadSecurityLog()]);
}
async function boot(){
  try{
    await refreshSession();showDashboard();
    await Promise.allSettled([loadAnalytics(),loadSystemStatus(),loadArchiveHealth()]);
    renderOperatorAttention();
  }catch{showLogin()}
}
document.addEventListener('chunbong:operator-archive-health',event=>{currentArchiveHealth=event.detail||null;renderOperatorAttention()});
document.addEventListener('chunbong:operator-image-health',event=>{currentImageHealth=event.detail||null;renderOperatorAttention()});
$('#operator-github-login')?.addEventListener('click',event=>{if(event.currentTarget.getAttribute('aria-disabled')==='true')event.preventDefault()});
document.querySelectorAll('[data-days]').forEach(btn=>btn.addEventListener('click',async()=>{document.querySelectorAll('[data-days]').forEach(x=>{const active=x===btn;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});currentDays=btn.dataset.days==='all'?'all':(Number(btn.dataset.days)||7);await loadAnalytics()}));
$$('[data-operator-tab]').forEach((btn,index)=>{btn.tabIndex=index===0?0:-1;btn.addEventListener('click',()=>void activateOperatorTab(btn.dataset.operatorTab));btn.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[data-operator-tab]');let next=event.key==='Home'?0:event.key==='End'?tabs.length-1:Math.max(0,tabs.indexOf(btn)+(event.key==='ArrowRight'?1:-1));if(event.key==='ArrowLeft'&&tabs.indexOf(btn)===0)next=tabs.length-1;if(event.key==='ArrowRight'&&tabs.indexOf(btn)===tabs.length-1)next=0;tabs[next]?.focus();void activateOperatorTab(tabs[next]?.dataset.operatorTab)})});
$$('[data-operator-quick-tab]').forEach(button=>button.addEventListener('click',()=>void activateOperatorTab(button.dataset.operatorQuickTab)));
$('[data-history-audit-run]')?.addEventListener('click',()=>void loadHistoryVerification());
$('[data-operator-content-sync]')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await activateOperatorTab('contents');const module=await operatorContentsModule();await module.runOfficialSync()}finally{button.disabled=false}});
$('#operator-export-json')?.addEventListener('click',exportAnalyticsJson);$('#operator-export-csv')?.addEventListener('click',exportAnalyticsCsv);
$('#operator-analytics-refresh')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await loadAnalytics({force:true})}finally{button.disabled=false}});
$('#operator-feedback-refresh')?.addEventListener('click',loadFeedback);
['#operator-feedback-search','#operator-feedback-status-filter','#operator-feedback-category-filter','#operator-feedback-priority-filter','#operator-feedback-sort'].forEach(selector=>$(selector)?.addEventListener(selector.includes('search')?'input':'change',renderFeedbackList));
$('#feedback-status')?.addEventListener('change',e=>void updateSelectedFeedback({statusValue:e.target.value}));
$('#feedback-priority')?.addEventListener('change',e=>void updateSelectedFeedback({priorityValue:e.target.value}));
$('#feedback-memo-save')?.addEventListener('click',()=>void updateSelectedFeedback({memoValue:$('#feedback-memo').value,tagsValue:$('#feedback-tags').value,relatedUpdateValue:$('#feedback-related-update').value,priorityValue:$('#feedback-priority').value}));
$('#operator-system-refresh')?.addEventListener('click',()=>void loadSystemStatus());
$('#operator-redis-refresh')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await loadSystemStatus({storage:true})}finally{button.disabled=false}});
$('#operator-recovery-toggle')?.addEventListener('click',async()=>{
  const button=$('#operator-recovery-toggle'),active=button?.dataset?.active==='1',next=!active;
  const message=next?'검증된 last-known-good 데이터로 전환할까요? 원본 파일은 변경하지 않습니다.':'현재 데이터 사용으로 복귀할까요?';
  if(!confirm(message))return;
  try{
    button.disabled=true;
    await json(API+'operator-recovery-mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:next})});
    await loadSystemStatus();
  }catch(error){alert('복구 모드 전환에 실패했습니다. '+(error?.message||''))}
  finally{button.disabled=false}
});
$('#operator-security-refresh')?.addEventListener('click',()=>void loadSecurityLog());
logout.addEventListener('click',async()=>{await json(API+'operator-logout',{method:'POST'});try{localStorage.removeItem('chunbong:operator:access-hint:v1')}catch(_){}session=null;showLogin()});
$('#operator-logout-all')?.addEventListener('click',async()=>{if(!confirm('모든 기기에서 운영자 로그인을 해제할까요?'))return;await json(API+'operator-logout-all',{method:'POST'});try{localStorage.removeItem('chunbong:operator:access-hint:v1')}catch(_){}session=null;showLogin();status.textContent='모든 기기의 운영자 세션을 해제했습니다.'});
await loadAuthAvailability();await setupFirebaseEmail();await boot();
// Deliberately no operator-center polling loop: Redis-heavy data refreshes only on cache expiry or explicit user action.
})().catch(error=>{console.error('[operator-center]',error);});
