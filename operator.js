(async()=>{
'use strict';
const API='/api/content?type=';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const login=$('#operator-login'),dashboard=$('#operator-dashboard'),status=$('#operator-login-status'),logout=$('#operator-logout');
let session=null,currentDays=7,currentAnalytics=null,currentSystem=null,feedbackItems=[],selectedFeedback=null;
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
function friendlyKey(key=''){
  const map={'device:mobile':'모바일','device:tablet':'태블릿','device:desktop':'PC','device:other':'기타 기기','pwa:yes':'설치 앱(PWA)','pwa:no':'브라우저','theme:light':'라이트 모드','theme:dark':'다크 모드'};
  return map[key]||key;
}
function renderRows(el,rows=[]){el.innerHTML=rows.length?rows.map((row,i)=>`<li><em>${i+1}</em><strong title="${escapeHtml(row.key)}">${escapeHtml(friendlyKey(row.key))}</strong><b>${fmt(row.value)}${Number.isFinite(row.averageActiveSeconds)?' · '+shortTime(row.averageActiveSeconds):''}</b></li>`).join(''):'<li><em>–</em><strong>아직 데이터가 없습니다.</strong><b>0</b></li>'}
function renderDaily(rows=[]){const el=$('#operator-daily'),max=Math.max(1,...rows.map(x=>Math.max(x.pageviews,x.visitors)));el.innerHTML=rows.length?rows.map(x=>`<div class="operator-day"><div class="operator-day-bars" title="${x.date} · 방문자 ${fmt(x.visitors)} · 페이지뷰 ${fmt(x.pageviews)}"><i style="height:${Math.max(3,x.pageviews/max*100)}%"></i><i style="height:${Math.max(3,x.visitors/max*100)}%"></i></div><small>${x.date.slice(5)}</small></div>`).join(''):'<p class="operator-empty">아직 일별 데이터가 없습니다.</p>'}
function renderHourly(rows=[]){
  const map=Object.fromEntries((rows||[]).map(row=>[String(row.key).padStart(2,'0'),Number(row.value)||0])),values=Array.from({length:24},(_,h)=>({hour:String(h).padStart(2,'0'),value:map[String(h).padStart(2,'0')]||0}));
  const max=Math.max(1,...values.map(x=>x.value)),el=$('#operator-hourly');
  el.innerHTML=values.map(x=>`<div class="operator-hour" title="${x.hour}시 · ${fmt(x.value)} 페이지뷰"><i style="height:${x.value?Math.max(6,x.value/max*100):2}%"></i><small>${Number(x.hour)%3===0?x.hour:''}</small></div>`).join('');
}
function completionRate(row){const start=Number(row?.start)||0,finish=Number(row?.finish)||0;return start?Math.min(100,Math.round(finish/start*100)):0}
function renderFunnel(funnel={}){
  const rows=[['미니게임',funnel.game],['춘봉 타로',funnel.tarot],['피드백',funnel.feedback]],el=$('#operator-funnel');
  el.innerHTML=rows.map(([label,row])=>{const rate=completionRate(row);return `<div class="operator-funnel-row"><div><strong>${label}</strong><span>${fmt(row?.start)} 시작 → ${fmt(row?.finish)} 완료</span></div><div class="operator-funnel-track"><i style="width:${rate}%"></i></div><b>${rate}%</b></div>`}).join('');
}
function renderDelta(id,value){
  const el=$(id);if(!el)return;
  if(value===null||value===undefined){el.textContent='이전 기간 비교 없음';el.className='is-neutral';return}
  const n=Number(value)||0;el.textContent=(n>0?'▲ ':n<0?'▼ ':'')+Math.abs(n).toFixed(1)+'% · 이전 기간 대비';el.className=n>0?'is-up':n<0?'is-down':'is-neutral';
}
async function loadAnalytics(){
  const data=await json(API+'operator-analytics&days='+currentDays);currentAnalytics=data;
  $('#metric-active').textContent=fmt(data.activeNow);$('#metric-visitors').textContent=fmt(data.visitors);$('#metric-sessions').textContent=fmt(data.sessions);
  $('#metric-average-daily').textContent=fmt(data.averageDailyVisitors);$('#metric-pageviews').textContent=fmt(data.pageviews);$('#metric-duration').textContent=shortTime(data.averageActiveSeconds);
  $('#metric-new').textContent=fmt(data.newVisitors);$('#metric-returning').textContent=fmt(data.returningVisits);
  renderDelta('#metric-visitors-delta',data.comparison?.visitorsPct);renderDelta('#metric-sessions-delta',data.comparison?.sessionsPct);renderDelta('#metric-pageviews-delta',data.comparison?.pageviewsPct);renderDelta('#metric-duration-delta',data.comparison?.averageActiveSecondsPct);
  renderRows($('#operator-pages'),data.topPages);renderRows($('#operator-menus'),data.topMenus);renderRows($('#operator-features'),data.topFeatures);renderRows($('#operator-devices'),data.devices);
  renderDaily(data.daily||[]);renderHourly(data.hourly||[]);renderFunnel(data.funnel||{});
  $('#operator-collection-note').textContent=data.collectionStartedAt?'실사용 분석 수집 시작: '+new Date(data.collectionStartedAt).toLocaleString('ko-KR'):'분석 데이터가 아직 수집되지 않았습니다.';
  const unread=Number(data.feedbackCounts?.new)||0,badge=$('#operator-feedback-badge');badge.textContent=unread;badge.hidden=!unread;
  renderOperatorAttention();
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
function filteredFeedback(){
  const q=String($('#operator-feedback-search')?.value||'').trim().toLowerCase(),statusFilter=$('#operator-feedback-status-filter')?.value||'all',categoryFilter=$('#operator-feedback-category-filter')?.value||'all',sort=$('#operator-feedback-sort')?.value||'newest';
  const rows=feedbackItems.filter(x=>(statusFilter==='all'||x.status===statusFilter)&&(categoryFilter==='all'||x.category===categoryFilter)&&(!q||[x.id,x.nickname,x.message,x.operatorMemo].some(v=>String(v||'').toLowerCase().includes(q))));
  rows.sort((a,b)=>(sort==='oldest'?1:-1)*String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  return rows;
}
function renderFeedbackList(){
  const rows=filteredFeedback(),list=$('#operator-feedback-list');
  list.innerHTML=rows.length?rows.map(x=>`<button class="operator-feedback-row ${selectedFeedback?.id===x.id?'active':''}" type="button" data-feedback-id="${x.id}"><span><i data-category="${x.category}">${escapeHtml(categoryLabel[x.category]||x.category)}</i><b data-status="${x.status}">${escapeHtml(statusLabel[x.status]||x.status)}</b></span><strong>${escapeHtml(x.nickname||'익명')}</strong><p>${escapeHtml(x.message)}</p></button>`).join(''):'<p class="operator-empty">조건에 맞는 피드백이 없습니다.</p>';
  list.querySelectorAll('[data-feedback-id]').forEach(btn=>btn.addEventListener('click',()=>selectFeedback(btn.dataset.feedbackId)));
}
async function loadFeedback(){const data=await json(API+'operator-feedback');feedbackItems=data.items||[];if(selectedFeedback)selectedFeedback=feedbackItems.find(x=>x.id===selectedFeedback.id)||null;renderFeedbackList();if(selectedFeedback)renderFeedbackDetail()}
function renderFeedbackDetail(){
  if(!selectedFeedback)return;
  $('#operator-feedback-empty').hidden=true;$('#operator-feedback-content').hidden=false;
  $('#feedback-category').textContent=categoryLabel[selectedFeedback.category]||selectedFeedback.category;$('#feedback-id').textContent=selectedFeedback.id;$('#feedback-message').textContent=selectedFeedback.message;$('#feedback-status').value=selectedFeedback.status;$('#feedback-memo').value=selectedFeedback.operatorMemo||'';
  const meta=[['닉네임',selectedFeedback.nickname||'익명'],['페이지',selectedFeedback.page],['기기',selectedFeedback.device],['화면',selectedFeedback.viewport],['PWA',selectedFeedback.pwa?'예':'아니오'],['테마',selectedFeedback.theme],['사이트 버전',selectedFeedback.siteSha?selectedFeedback.siteSha.slice(0,10):'-'],['접수',new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')],['마지막 변경',new Date(selectedFeedback.updatedAt||selectedFeedback.createdAt).toLocaleString('ko-KR')]];
  $('#feedback-meta').innerHTML=meta.map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('');
}
function selectFeedback(id){selectedFeedback=feedbackItems.find(x=>x.id===id)||null;if(!selectedFeedback)return;renderFeedbackList();renderFeedbackDetail()}
async function updateSelectedFeedback({statusValue,memoValue}={}){
  if(!selectedFeedback)return;
  const body={id:selectedFeedback.id};
  if(statusValue!==undefined)body.status=statusValue;if(memoValue!==undefined)body.memo=memoValue;
  const data=await json(API+'operator-feedback-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  selectedFeedback=data.item;feedbackItems=feedbackItems.map(x=>x.id===selectedFeedback.id?selectedFeedback:x);renderFeedbackList();renderFeedbackDetail();await loadAnalytics();
}
function renderOperatorAttention(){
  const root=$('#operator-attention-summary'),title=$('#operator-attention-title'),detail=$('#operator-attention-detail');
  if(!root||!title||!detail)return;
  const issues=[];let critical=false;
  const dep=currentSystem?.deployment||{},storage=currentSystem?.storage||{},services=currentSystem?.services||{};
  const endpoints=Array.isArray(currentSystem?.endpoints)?currentSystem.endpoints:[];
  if(currentSystem){
    if(!dep.sha){issues.push('Production 상태 확인 필요');critical=true}
    else if(dep.synced===false)issues.push('Production과 GitHub main SHA 불일치');
    else if(dep.synced!==true)issues.push('Git 동기화 확인 불가');
    if(storage.redisConfigured&&storage.redisOk===false){issues.push('Redis/KV 연결 확인 필요');critical=true}
    if(services.analytics===false){issues.push('실사용 분석 확인 필요');critical=true}
    if(services.feedback===false){issues.push('피드백 저장 확인 필요');critical=true}
    const failed=endpoints.filter(row=>!row.ok);
    if(failed.length){issues.push('핵심 API '+failed.length+'개 응답 확인 필요');critical=true}
  }
  const unread=Number(currentAnalytics?.feedbackCounts?.new)||0;
  if(unread>0)issues.push('새 피드백 '+fmt(unread)+'건');
  root.classList.toggle('is-attention',issues.length>0&&!critical);
  root.classList.toggle('is-critical',critical);
  if(!currentSystem){
    title.textContent='시스템 상태를 불러오는 중...';
    detail.textContent='Production · 저장소 · API · 새 피드백을 함께 확인합니다.';
    return;
  }
  if(!issues.length){
    title.textContent='핵심 운영 상태 정상';
    detail.textContent='Production · Git 동기화 · 저장소 · 핵심 API에서 즉시 확인할 문제가 없습니다.';
  }else{
    title.textContent='확인할 항목 '+fmt(issues.length)+'개';
    detail.textContent=issues.slice(0,4).join(' · ')+(issues.length>4?' 외 '+fmt(issues.length-4)+'개':'');
  }
}
function activateOperatorTab(name){
  const target=$('[data-operator-tab="'+name+'"]');if(!target)return;
  $('[data-operator-tab]').forEach(button=>{
    const active=button===target;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
  });
  $('[data-operator-panel]').forEach(panel=>panel.hidden=panel.dataset.operatorPanel!==name);
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
async function loadSystemStatus(){
  const data=await json(API+'operator-system-status');currentSystem=data;
  const dep=data.deployment||{},storage=data.storage||{},services=data.services||{},traffic=data.traffic||{};
  $('#system-production').innerHTML=dep.sha?'<span class="operator-health ok">● READY</span>':'<span class="operator-health bad">● 확인 필요</span>';$('#system-production-meta').textContent=(dep.environment||'-')+' · '+shortSha(dep.sha);
  $('#system-sync').innerHTML=dep.synced===true?'<span class="operator-health ok">● 동기화</span>':dep.synced===false?'<span class="operator-health warn">● SHA 불일치</span>':'<span class="operator-health warn">● 확인 불가</span>';$('#system-sync-meta').textContent=shortSha(dep.sha)+' / '+shortSha(dep.mainSha);
  $('#system-storage').innerHTML=healthLabel(Boolean(storage.redisOk));$('#system-storage-meta').textContent=storage.redisConfigured?'Redis/KV 연결 '+(storage.redisOk?'정상':'확인 필요'):'저장소 설정 없음';
  $('#system-push').innerHTML=healthLabel(Boolean(services.push));$('#system-push-meta').textContent=services.push?'VAPID 준비됨':'Push 설정 확인 필요';
  $('#system-active').textContent=fmt(traffic.activeNow);$('#system-visitors').textContent=fmt(traffic.visitors);$('#system-sessions').textContent=fmt(traffic.sessions);$('#system-pageviews').textContent=fmt(traffic.pageviews);
  $('#system-sha').textContent=shortSha(dep.sha);$('#system-main-sha').textContent=shortSha(dep.mainSha);$('#system-url').textContent=dep.url||'-';$('#system-repo-size').textContent=data.repository?.sizeKb?fmt(data.repository.sizeKb)+' KB':'-';$('#system-redis-keys').textContent=storage.keyCount===null||storage.keyCount===undefined?'제공되지 않음':fmt(storage.keyCount)+'개';$('#system-redis-memory').textContent=redisMemoryLabel(storage);$('#system-analytics-days').textContent=fmt(storage.analyticsRecordedDays)+'일';$('#system-feedback-total').textContent=fmt(storage.feedbackTotal)+'개';$('#system-checked-at').textContent=new Date(data.checkedAt).toLocaleString('ko-KR');
  const serviceRows=[['GitHub 운영자 인증',services.githubAuth],['이메일 운영자 인증',services.emailAuth],['Push 알림',services.push],['실사용 분석',services.analytics],['피드백 저장',services.feedback]];
  $('#operator-service-health').innerHTML=serviceRows.map(([label,ok])=>`<div><span>${label}</span>${healthLabel(Boolean(ok))}</div>`).join('');
  const endpoints=Array.isArray(data.endpoints)?data.endpoints:[];
  $('#operator-endpoint-health').innerHTML=endpoints.length?endpoints.map(row=>`<div><span>${escapeHtml(row.label||row.path||'API')} <small>${fmt(row.ms)}ms</small></span><span class="operator-endpoint-result ${row.ok?'ok':'bad'}">${row.ok?'HTTP '+fmt(row.status):row.status?'HTTP '+fmt(row.status):'응답 실패'}</span></div>`).join(''):'<p class="operator-empty">API 상태를 확인하지 못했습니다.</p>';
  renderOperatorAttention();
}
function renderSessions(){
  const el=$('#operator-session-list'),rows=session?.sessions||[];
  el.innerHTML=rows.length?rows.map(row=>`<article class="${row.current?'is-current':''}"><div><strong>${row.current?'현재 세션 · ':''}${escapeHtml(providerLabel(row.provider))}</strong><span>${row.createdAt?'로그인 '+new Date(row.createdAt).toLocaleString('ko-KR'):'기존 세션'}${row.lastSeen?' · 최근 활동 '+new Date(row.lastSeen).toLocaleString('ko-KR'):''} · 만료 ${new Date(row.expiresAt).toLocaleDateString('ko-KR')}</span></div>${row.current?'<b>현재 기기</b>':`<button type="button" data-revoke-session="${escapeHtml(row.id)}">세션 종료</button>`}</article>`).join(''):'<p class="operator-empty">세션 상세 정보가 아직 없습니다.</p>';
  el.querySelectorAll('[data-revoke-session]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('이 운영자 세션을 종료할까요?'))return;await json(API+'operator-session-revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.revokeSession})});await refreshSession()}));
}
async function refreshSession(){session=await json(API+'operator-session');$('#security-provider').textContent=providerLabel(session.provider);$('#security-expires').textContent=new Date(session.expiresAt).toLocaleString('ko-KR');$('#security-sessions').textContent=fmt(session.activeSessions||1)+'개';$('#security-github').textContent=session.owner?.githubLogin||'gkzero0-cmyk';renderSessions();return session}
async function setupFirebaseEmail(){
 const form=$('#operator-email-form');form.addEventListener('submit',async e=>{e.preventDefault();const email=$('#operator-email').value.trim().toLowerCase();status.textContent='인증 메일 요청 중…';try{await json(API+'operator-email-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});localStorage.setItem('chunbong:operator:email',email);status.textContent='등록된 운영자 계정이라면 인증 메일이 발송됩니다. 메일함을 확인해 주세요.'}catch(err){status.textContent=err.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 요청을 처리하지 못했습니다.'}})
 if(new URLSearchParams(location.search).get('email')==='complete'){try{const config=await json(API+'operator-auth-config');if(!config.providers.email||!config.firebase)return;const email=localStorage.getItem('chunbong:operator:email')||prompt('인증 메일을 받은 주소를 입력하세요')||'';if(!email)return;const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');const {getAuth,isSignInWithEmailLink,signInWithEmailLink}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const app=initializeApp(config.firebase,'operator-email-complete');const auth=getAuth(app);if(!isSignInWithEmailLink(auth,location.href))throw new Error('invalid_link');const credential=await signInWithEmailLink(auth,email,location.href);const idToken=await credential.user.getIdToken();await json(API+'operator-email-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});localStorage.removeItem('chunbong:operator:email');history.replaceState(null,'','/operator.html');await boot()}catch{status.textContent='이메일 인증 링크를 확인하지 못했습니다.'}}
}
async function boot(){
  try{
    await refreshSession();showDashboard();
    await Promise.all([loadAnalytics(),loadFeedback(),loadSystemStatus()]);
  }catch{showLogin()}
}
$('#operator-github-login')?.addEventListener('click',event=>{if(event.currentTarget.getAttribute('aria-disabled')==='true')event.preventDefault()});
document.querySelectorAll('[data-days]').forEach(btn=>btn.addEventListener('click',async()=>{document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===btn));currentDays=btn.dataset.days==='all'?'all':(Number(btn.dataset.days)||7);await loadAnalytics()}));
$('[data-operator-tab]').forEach(btn=>{btn.addEventListener('click',async()=>{activateOperatorTab(btn.dataset.operatorTab);if(btn.dataset.operatorTab==='system')await loadSystemStatus();if(btn.dataset.operatorTab==='security')await refreshSession()});btn.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=$('[data-operator-tab]');let index=tabs.indexOf(btn);if(event.key==='ArrowRight')index=(index+1)%tabs.length;if(event.key==='ArrowLeft')index=(index-1+tabs.length)%tabs.length;if(event.key==='Home')index=0;if(event.key==='End')index=tabs.length-1;event.preventDefault();tabs[index].focus();tabs[index].click()})});
$('#operator-export-json')?.addEventListener('click',exportAnalyticsJson);$('#operator-export-csv')?.addEventListener('click',exportAnalyticsCsv);
$('#operator-feedback-refresh')?.addEventListener('click',loadFeedback);
['#operator-feedback-search','#operator-feedback-status-filter','#operator-feedback-category-filter','#operator-feedback-sort'].forEach(selector=>$(selector)?.addEventListener(selector.includes('search')?'input':'change',renderFeedbackList));
$('#feedback-status')?.addEventListener('change',e=>void updateSelectedFeedback({statusValue:e.target.value}));
$('#feedback-memo-save')?.addEventListener('click',()=>void updateSelectedFeedback({memoValue:$('#feedback-memo').value}));
$('#operator-system-refresh')?.addEventListener('click',()=>void loadSystemStatus());
$('#operator-attention-action')?.addEventListener('click',()=>{$('[data-operator-tab="system"]')?.click()});
logout.addEventListener('click',async()=>{await json(API+'operator-logout',{method:'POST'});session=null;showLogin()});
$('#operator-logout-all')?.addEventListener('click',async()=>{if(!confirm('모든 기기에서 운영자 로그인을 해제할까요?'))return;await json(API+'operator-logout-all',{method:'POST'});session=null;showLogin();status.textContent='모든 기기의 운영자 세션을 해제했습니다.'});
await loadAuthAvailability();await setupFirebaseEmail();await boot();
setInterval(()=>{if(!dashboard.hidden){void loadAnalytics();if(!document.querySelector('[data-operator-panel="system"]')?.hidden)void loadSystemStatus()}},60000);
})().catch(error=>{console.error('[operator-center]',error);});
