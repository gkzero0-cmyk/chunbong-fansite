(async()=>{
'use strict';
const API='/api/content?type=';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const login=$('#operator-login'),dashboard=$('#operator-dashboard'),status=$('#operator-login-status'),logout=$('#operator-logout');
let session=null,currentDays=7,currentAnalytics=null,currentSystem=null,currentArchiveHealth=null,feedbackItems=[],selectedFeedback=null;
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
}
function completionRate(row){const start=Number(row?.start)||0,finish=Number(row?.finish)||0;return start?Math.min(100,Math.round(finish/start*100)):0}
function renderFunnel(funnel={}){
  const rows=[['미니게임',funnel.game],['춘봉 타로',funnel.tarot],['피드백',funnel.feedback]],el=$('#operator-funnel');
  el.innerHTML=rows.map(([label,row])=>{const rate=completionRate(row);return `<div class="operator-funnel-row"><div><strong>${label}</strong><span>${fmt(row?.start)} 시작 → ${fmt(row?.finish)} 완료</span></div><div class="operator-funnel-track"><i style="width:${rate}%"></i></div><b>${rate}%</b></div>`}).join('');
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
  const search=currentAnalytics?.search||{},zeroTotal=Number(search.zeroTotal)||0;
  if(zeroTotal>0){
    const terms=(search.zeroQueries||[]).slice(0,3).map(row=>'“'+row.key+'”').join(', ');
    rows.push({level:'info',title:'검색 결과 없음 '+fmt(zeroTotal)+'회',detail:(terms?terms+' · ':'')+'콘텐츠명·별칭·검색 키워드 보강을 검토하세요.',tab:'search'});
  }
  const badEndpoints=endpoints.filter(row=>!row.ok);if(badEndpoints.length)rows.push({level:'bad',title:'API 응답 확인 필요',detail:badEndpoints.map(row=>row.label||row.path||'API').join(' · '),tab:'system'});
  const slow=endpoints.filter(row=>row.ok&&Number(row.ms)>=1500);if(slow.length)rows.push({level:'warn',title:'느린 API 감지',detail:slow.map(row=>(row.label||row.path||'API')+' '+fmt(row.ms)+'ms').join(' · '),tab:'system'});
  if(currentSystem&&(!services.analytics||!services.feedback||!services.push))rows.push({level:'warn',title:'서비스 설정 확인',detail:[!services.analytics&&'실사용 분석',!services.feedback&&'피드백 저장',!services.push&&'Push'].filter(Boolean).join(' · '),tab:'system'});
  const unread=feedbackItems.filter(item=>item.status==='new').length||Number(currentAnalytics?.feedbackCounts?.new)||0;if(unread)rows.push({level:'info',title:'새 피드백 '+fmt(unread)+'건',detail:'확인하지 않은 사용자 의견이 있습니다.',tab:'feedback'});
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
async function loadAnalytics(){
  const data=await json(API+'operator-analytics&days='+currentDays);currentAnalytics=data;
  $('#metric-active').textContent=fmt(data.activeNow);$('#metric-visitors').textContent=fmt(data.visitors);$('#metric-sessions').textContent=fmt(data.sessions);
  $('#metric-average-daily').textContent=fmt(data.averageDailyVisitors);$('#metric-pageviews').textContent=fmt(data.pageviews);$('#metric-duration').textContent=shortTime(data.averageActiveSeconds);
  $('#metric-new').textContent=fmt(data.newVisitors);$('#metric-returning').textContent=fmt(data.returningVisits);
  renderDelta('#metric-visitors-delta',data.comparison?.visitorsPct);renderDelta('#metric-sessions-delta',data.comparison?.sessionsPct);renderDelta('#metric-pageviews-delta',data.comparison?.pageviewsPct);renderDelta('#metric-duration-delta',data.comparison?.averageActiveSecondsPct);
  renderPeriodSummary(data);renderPageRows(data.topPages||[],data.pageviews);renderMenuRows(data.topMenus||[],data.menuTotal);renderFeatureRows(data.topFeatures||[],data.featureTotal);renderEnvironmentRows(data.devices||[]);
  renderDaily(data.daily||[]);renderHourly(data.hourly||[]);renderFunnel(data.funnel||{});renderPerformance(data.performance||{});renderSearchInsights(data.search||{});
  $('#operator-collection-note').textContent=data.collectionStartedAt?'실사용 분석 수집 시작: '+new Date(data.collectionStartedAt).toLocaleString('ko-KR'):'분석 데이터가 아직 수집되지 않았습니다.';
  const unread=Number(data.feedbackCounts?.new)||0,badge=$('#operator-feedback-badge');badge.textContent=unread;badge.hidden=!unread;renderOperatorAttention();
}
function exportAnalyticsJson(){if(!currentAnalytics)return;download('chunbong-analytics-'+String(currentDays)+'d.json',JSON.stringify({exportedAt:new Date().toISOString(),period:currentDays,data:currentAnalytics},null,2),'application/json')}
function exportAnalyticsCsv(){
  if(!currentAnalytics)return;
  const rows=[['구분','항목','값'],['요약','방문자',currentAnalytics.visitors],['요약','세션',currentAnalytics.sessions],['요약','페이지뷰',currentAnalytics.pageviews],['요약','평균 활동시간(초)',currentAnalytics.averageActiveSeconds],['요약','현재 활성',currentAnalytics.activeNow]];
  (currentAnalytics.daily||[]).forEach(x=>rows.push(['일별 '+x.date,'방문자',x.visitors],['일별 '+x.date,'세션',x.sessions],['일별 '+x.date,'페이지뷰',x.pageviews]));
  (currentAnalytics.topPages||[]).forEach(x=>rows.push(['페이지',x.key,x.value]));
  (currentAnalytics.topFeatures||[]).forEach(x=>rows.push(['기능',x.key,x.value]));
  const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  download('chunbong-analytics-'+String(currentDays)+'d.csv',csv,'text/csv;charset=utf-8');
}
const categoryLabel={bug:'버그 신고',inconvenience:'불편한 점',feature:'기능 제안',design:'디자인 의견',content:'콘텐츠 요청',other:'기타'};
const statusLabel={new:'새로 들어옴',reviewing:'확인 중',planned:'반영 예정',done:'완료',archived:'보관'};
const priorityLabel={high:'높음',normal:'보통',low:'낮음'};
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
async function loadFeedback(){const data=await json(API+'operator-feedback');feedbackItems=data.items||[];if(selectedFeedback)selectedFeedback=feedbackItems.find(x=>x.id===selectedFeedback.id)||null;renderFeedbackList();if(selectedFeedback)renderFeedbackDetail();renderOperatorAttention()}
function renderFeedbackDetail(){
  if(!selectedFeedback)return;
  $('#operator-feedback-empty').hidden=true;$('#operator-feedback-content').hidden=false;
  $('#feedback-category').textContent=categoryLabel[selectedFeedback.category]||selectedFeedback.category;$('#feedback-id').textContent=selectedFeedback.id;$('#feedback-message').textContent=selectedFeedback.message;$('#feedback-status').value=selectedFeedback.status;$('#feedback-priority').value=selectedFeedback.priority||'normal';$('#feedback-tags').value=(selectedFeedback.tags||[]).join(', ');$('#feedback-related-update').value=selectedFeedback.relatedUpdate||'';$('#feedback-memo').value=selectedFeedback.operatorMemo||'';
  const meta=[['닉네임',selectedFeedback.nickname||'익명'],['페이지',friendlyKey(selectedFeedback.page)],['기기',selectedFeedback.device],['화면',selectedFeedback.viewport],['PWA',selectedFeedback.pwa?'예':'아니오'],['테마',selectedFeedback.theme],['사이트 버전',selectedFeedback.siteSha?selectedFeedback.siteSha.slice(0,10):'-'],['접수',new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')],['마지막 변경',new Date(selectedFeedback.updatedAt||selectedFeedback.createdAt).toLocaleString('ko-KR')]];
  $('#feedback-meta').innerHTML=meta.map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('');
}
function selectFeedback(id){selectedFeedback=feedbackItems.find(x=>x.id===id)||null;if(!selectedFeedback)return;renderFeedbackList();renderFeedbackDetail()}
async function updateSelectedFeedback({statusValue,memoValue,priorityValue,tagsValue,relatedUpdateValue}={}){
  if(!selectedFeedback)return;
  const body={id:selectedFeedback.id};
  if(statusValue!==undefined)body.status=statusValue;if(memoValue!==undefined)body.memo=memoValue;if(priorityValue!==undefined)body.priority=priorityValue;if(tagsValue!==undefined)body.tags=tagsValue;if(relatedUpdateValue!==undefined)body.relatedUpdate=relatedUpdateValue;
  const data=await json(API+'operator-feedback-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  selectedFeedback=data.item;feedbackItems=feedbackItems.map(x=>x.id===selectedFeedback.id?selectedFeedback:x);renderFeedbackList();renderFeedbackDetail();await loadAnalytics();
}
function healthLabel(ok){return ok?'<span class="operator-health ok">● 정상</span>':'<span class="operator-health bad">● 확인 필요</span>'}
function redisMemoryLabel(storage={}){
  if(storage.usedMemoryHuman){
    const max=storage.maxMemoryHuman?' / '+storage.maxMemoryHuman:'';
    return storage.usedMemoryHuman+max;
  }
  if(Number.isFinite(Number(storage.usedMemory))&&Number(storage.usedMemory)>0)return fmt(Math.round(Number(storage.usedMemory)/1024))+' KB';
  return '제공되지 않음';
}
function renderHealthHistory(rows=[]){
  const el=$('#operator-health-history');if(!el)return;
  el.innerHTML=rows.length?rows.map(row=>`<article class="operator-event-row is-${escapeHtml(row.level||'ok')}"><span></span><div><strong>${row.level==='ok'?'정상 상태':row.level==='bad'?'장애 신호':'주의 상태'}</strong><p>${escapeHtml((row.issues||[]).join(' · ')||'이상 신호가 해소되었습니다.')}</p><small>${new Date(row.at).toLocaleString('ko-KR')}</small></div></article>`).join(''):'<p class="operator-empty">아직 상태 변경 이력이 없습니다.</p>';
}
async function loadSystemStatus(){
  const data=await json(API+'operator-system-status');currentSystem=data;
  const dep=data.deployment||{},storage=data.storage||{},services=data.services||{},traffic=data.traffic||{};
  $('#system-production').innerHTML=dep.sha?'<span class="operator-health ok">● READY</span>':'<span class="operator-health bad">● 확인 필요</span>';$('#system-production-meta').textContent=(dep.environment||'-')+' · '+shortSha(dep.sha);
  $('#system-sync').innerHTML=dep.synced===true?'<span class="operator-health ok">● 동기화</span>':dep.synced===false?'<span class="operator-health warn">● SHA 불일치</span>':'<span class="operator-health warn">● 확인 불가</span>';$('#system-sync-meta').textContent=shortSha(dep.sha)+' / '+shortSha(dep.mainSha);
  $('#system-storage').innerHTML=healthLabel(Boolean(storage.redisOk));$('#system-storage-meta').textContent=storage.redisConfigured?'Redis/KV 연결 '+(storage.redisOk?'정상':'확인 필요'):'저장소 설정 없음';
  $('#system-push').innerHTML=healthLabel(Boolean(services.push));$('#system-push-meta').textContent=services.push?'VAPID 준비됨':'Push 설정 확인 필요';
  $('#system-active').textContent=fmt(traffic.activeNow);$('#system-visitors').textContent=fmt(traffic.visitors);$('#system-sessions').textContent=fmt(traffic.sessions);$('#system-pageviews').textContent=fmt(traffic.pageviews);
  $('#system-sha').textContent=shortSha(dep.sha);$('#system-main-sha').textContent=shortSha(dep.mainSha);$('#system-url').textContent=dep.url||'-';
  $('#system-vercel-status').textContent=dep.rateLimited?'배포 제한 · '+(dep.vercel?.description||'rate limited'):dep.vercel?.description||dep.vercel?.state||'상태 정보 없음';
  $('#system-retry-at').textContent=dep.retryAfter?'안전 재시도 기준 '+new Date(dep.retryAfter).toLocaleString('ko-KR'):dep.synced===true?'재시도 불필요':'자동 재시도 조건 확인 중';
  $('#system-repo-size').textContent=data.repository?.sizeKb?fmt(data.repository.sizeKb)+' KB':'-';$('#system-redis-keys').textContent=storage.keyCount===null||storage.keyCount===undefined?'제공되지 않음':fmt(storage.keyCount)+'개';$('#system-redis-memory').textContent=redisMemoryLabel(storage);$('#system-analytics-days').textContent=fmt(storage.analyticsRecordedDays)+'일';$('#system-feedback-total').textContent=fmt(storage.feedbackTotal)+'개';$('#system-checked-at').textContent=new Date(data.checkedAt).toLocaleString('ko-KR');
  const serviceRows=[['GitHub 운영자 인증',services.githubAuth],['이메일 운영자 인증',services.emailAuth],['Push 알림',services.push],['실사용 분석',services.analytics],['피드백 저장',services.feedback]];
  $('#operator-service-health').innerHTML=serviceRows.map(([label,ok])=>`<div><span>${label}</span>${healthLabel(Boolean(ok))}</div>`).join('');
  const endpoints=Array.isArray(data.endpoints)?data.endpoints:[];
  $('#operator-endpoint-health').innerHTML=endpoints.length?endpoints.map(row=>`<div><span>${escapeHtml(row.label||row.path||'API')} <small>${fmt(row.ms)}ms</small></span><span class="operator-endpoint-result ${row.ok?'ok':'bad'}">${row.ok?'HTTP '+fmt(row.status):row.status?'HTTP '+fmt(row.status):'응답 실패'}</span></div>`).join(''):'<p class="operator-empty">API 상태를 확인하지 못했습니다.</p>';
  renderHealthHistory(data.health?.history||[]);renderOperatorAttention();
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
async function refreshSession(){session=await json(API+'operator-session');try{localStorage.setItem('chunbong:operator:access-hint:v1','1')}catch(_){}$('#security-provider').textContent=providerLabel(session.provider);$('#security-expires').textContent=new Date(session.expiresAt).toLocaleString('ko-KR');$('#security-sessions').textContent=fmt(session.activeSessions||1)+'개';$('#security-github').textContent=session.owner?.githubLogin||'gkzero0-cmyk';renderSessions();return session}
async function setupFirebaseEmail(){
 const form=$('#operator-email-form');form.addEventListener('submit',async e=>{e.preventDefault();const email=$('#operator-email').value.trim().toLowerCase();status.textContent='인증 메일 요청 중…';try{await json(API+'operator-email-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});localStorage.setItem('chunbong:operator:email',email);status.textContent='등록된 운영자 계정이라면 인증 메일이 발송됩니다. 메일함을 확인해 주세요.'}catch(err){status.textContent=err.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 요청을 처리하지 못했습니다.'}})
 if(new URLSearchParams(location.search).get('email')==='complete'){try{const config=await json(API+'operator-auth-config');if(!config.providers.email||!config.firebase)return;const email=localStorage.getItem('chunbong:operator:email')||prompt('인증 메일을 받은 주소를 입력하세요')||'';if(!email)return;const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');const {getAuth,isSignInWithEmailLink,signInWithEmailLink}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const app=initializeApp(config.firebase,'operator-email-complete');const auth=getAuth(app);if(!isSignInWithEmailLink(auth,location.href))throw new Error('invalid_link');const credential=await signInWithEmailLink(auth,email,location.href);const idToken=await credential.user.getIdToken();await json(API+'operator-email-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});localStorage.removeItem('chunbong:operator:email');history.replaceState(null,'','/operator.html');await boot()}catch{status.textContent='이메일 인증 링크를 확인하지 못했습니다.'}}
}
let operatorContentsModulePromise=null,operatorContentsPromise=null;
function operatorContentsModule(){
  if(!operatorContentsModulePromise)operatorContentsModulePromise=import('./operator-contents.js');
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
  if(target==='contents')await loadOperatorContents();
  if((target==='performance'||target==='search')&&!currentAnalytics)await loadAnalytics();
  if(target==='system'&&!currentSystem)await loadSystemStatus();
  if(target==='security')await Promise.allSettled([refreshSession(),loadSecurityLog()]);
}
async function boot(){
  try{
    await refreshSession();showDashboard();
    await Promise.allSettled([loadAnalytics(),loadFeedback(),loadSystemStatus(),loadArchiveHealth()]);
    renderOperatorAttention();
  }catch{showLogin()}
}
document.addEventListener('chunbong:operator-archive-health',event=>{currentArchiveHealth=event.detail||null;renderOperatorAttention()});
$('#operator-github-login')?.addEventListener('click',event=>{if(event.currentTarget.getAttribute('aria-disabled')==='true')event.preventDefault()});
document.querySelectorAll('[data-days]').forEach(btn=>btn.addEventListener('click',async()=>{document.querySelectorAll('[data-days]').forEach(x=>{const active=x===btn;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});currentDays=btn.dataset.days==='all'?'all':(Number(btn.dataset.days)||7);await loadAnalytics()}));
$('[data-operator-tab]').forEach((btn,index)=>{btn.tabIndex=index===0?0:-1;btn.addEventListener('click',()=>void activateOperatorTab(btn.dataset.operatorTab));btn.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$('[data-operator-tab]');let next=event.key==='Home'?0:event.key==='End'?tabs.length-1:Math.max(0,tabs.indexOf(btn)+(event.key==='ArrowRight'?1:-1));if(event.key==='ArrowLeft'&&tabs.indexOf(btn)===0)next=tabs.length-1;if(event.key==='ArrowRight'&&tabs.indexOf(btn)===tabs.length-1)next=0;tabs[next]?.focus();void activateOperatorTab(tabs[next]?.dataset.operatorTab)})});
$('[data-operator-quick-tab]').forEach(button=>button.addEventListener('click',()=>void activateOperatorTab(button.dataset.operatorQuickTab)));
$('#operator-export-json')?.addEventListener('click',exportAnalyticsJson);$('#operator-export-csv')?.addEventListener('click',exportAnalyticsCsv);
$('#operator-feedback-refresh')?.addEventListener('click',loadFeedback);
['#operator-feedback-search','#operator-feedback-status-filter','#operator-feedback-category-filter','#operator-feedback-priority-filter','#operator-feedback-sort'].forEach(selector=>$(selector)?.addEventListener(selector.includes('search')?'input':'change',renderFeedbackList));
$('#feedback-status')?.addEventListener('change',e=>void updateSelectedFeedback({statusValue:e.target.value}));
$('#feedback-priority')?.addEventListener('change',e=>void updateSelectedFeedback({priorityValue:e.target.value}));
$('#feedback-memo-save')?.addEventListener('click',()=>void updateSelectedFeedback({memoValue:$('#feedback-memo').value,tagsValue:$('#feedback-tags').value,relatedUpdateValue:$('#feedback-related-update').value,priorityValue:$('#feedback-priority').value}));
$('#operator-system-refresh')?.addEventListener('click',()=>void loadSystemStatus());
$('#operator-security-refresh')?.addEventListener('click',()=>void loadSecurityLog());
logout.addEventListener('click',async()=>{await json(API+'operator-logout',{method:'POST'});try{localStorage.removeItem('chunbong:operator:access-hint:v1')}catch(_){}session=null;showLogin()});
$('#operator-logout-all')?.addEventListener('click',async()=>{if(!confirm('모든 기기에서 운영자 로그인을 해제할까요?'))return;await json(API+'operator-logout-all',{method:'POST'});try{localStorage.removeItem('chunbong:operator:access-hint:v1')}catch(_){}session=null;showLogin();status.textContent='모든 기기의 운영자 세션을 해제했습니다.'});
await loadAuthAvailability();await setupFirebaseEmail();await boot();
setInterval(()=>{if(!dashboard.hidden){void loadAnalytics();if(!document.querySelector('[data-operator-panel="system"]')?.hidden)void loadSystemStatus()}},60000);
})().catch(error=>{console.error('[operator-center]',error);});
