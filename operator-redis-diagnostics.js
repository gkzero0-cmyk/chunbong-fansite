const API='/api/content?type=operator-system-status';
const SNAPSHOT_KEY='chunbong:operator:redis-diagnostics:v1';
const SECURITY_LOG_CACHE_MS=5*60*1000;
const DEFERRED_BOOT_TYPES=new Map([
  ['operator-system-status','system'],
  ['operator-content-archive','contents']
]);
const REDIS_DEPENDENT_MUTATIONS=new Set([
  'operator-feedback-update',
  'operator-recovery-mode',
  'operator-session-revoke',
  'operator-logout-all',
  'push-dispatch'
]);
const $=(selector,root=document)=>root.querySelector(selector);
const fmt=value=>new Intl.NumberFormat('ko-KR').format(Number(value)||0);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const commandLabel={GET:'GET',MGET:'MGET',ZRANGE:'ZRANGE',ZREVRANGE:'ZREVRANGE',ZSCORE:'ZSCORE',ZCARD:'ZCARD',SMEMBERS:'SMEMBERS',HGET:'HGET',HGETALL:'HGETALL',SET:'SET',HSET:'HSET',HINCRBY:'HINCRBY',ZADD:'ZADD',ZREM:'ZREM',SADD:'SADD',SREM:'SREM',DEL:'DEL',EXISTS:'EXISTS'};
const featureLabel={analytics:'분석',feedback:'피드백','auth-session':'인증·세션','operator-health':'운영 상태',push:'Push',ranking:'랭킹',multiplayer:'멀티플레이','content-archive':'콘텐츠 아카이브',other:'기타',unknown:'분류 대기'};
const categoryLabel={read:'읽기',write:'쓰기',script:'스크립트',other:'기타'};
let redisDegradedState={active:false,reason:'',retryAt:''};

function requestUrl(input){
  try{return new URL(typeof input==='string'?input:input?.url||String(input||''),location.href)}catch{return null}
}
function requestMethod(input,init){return String(init?.method||input?.method||'GET').toUpperCase()}
function operatorRequestType(input){
  const url=requestUrl(input);if(!url||url.origin!==location.origin||url.pathname!=='/api/content')return'';
  return String(url.searchParams.get('type')||'');
}
function installDegradedStyles(){
  if($('#operator-redis-degraded-styles'))return;
  const style=document.createElement('style');style.id='operator-redis-degraded-styles';
  style.textContent=`
    #operator-redis-limit-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:14px 0;padding:15px 17px;border:1px solid rgba(245,158,11,.38);border-radius:14px;background:rgba(245,158,11,.09)}
    #operator-redis-limit-banner[hidden]{display:none}
    #operator-redis-limit-banner>div{display:grid;gap:3px}#operator-redis-limit-banner small{font-weight:800;letter-spacing:.08em;color:#d97706}#operator-redis-limit-banner strong{font-size:15px}#operator-redis-limit-banner span{font-size:12px;opacity:.82;line-height:1.55}
    #operator-redis-limit-banner button{white-space:nowrap}body[data-operator-redis-degraded="1"] [data-redis-write-locked="1"]{opacity:.55;cursor:not-allowed}
    @media(max-width:760px){#operator-redis-limit-banner{align-items:flex-start;flex-direction:column}#operator-redis-limit-banner button{width:100%}}
  `;
  document.head.appendChild(style);
}
function ensureDegradedBanner(){
  installDegradedStyles();
  let banner=$('#operator-redis-limit-banner');if(banner)return banner;
  const dashboard=$('#operator-dashboard');if(!dashboard)return null;
  banner=document.createElement('section');banner.id='operator-redis-limit-banner';banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
  banner.innerHTML='<div><small>REDIS PROTECTION</small><strong>Redis 제한 보호 모드</strong><span data-redis-limit-detail>읽기와 진단은 계속 사용할 수 있고 Redis 저장 작업만 잠시 중지합니다.</span></div><button type="button" data-redis-limit-system>시스템 상태 보기</button>';
  const anchor=$('#operator-deployment-banner',dashboard)||dashboard.firstElementChild;
  if(anchor?.after)anchor.after(banner);else dashboard.prepend(banner);
  $('[data-redis-limit-system]',banner)?.addEventListener('click',()=>{
    const tab=$('[data-operator-tab="system"]');if(tab)tab.click();
  });
  return banner;
}
function degradedRetryLabel(value=''){
  if(!value)return'자동 보호 회로가 복구 여부를 확인할 때까지 저장 작업을 보류합니다.';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return'자동 보호 회로가 복구 여부를 확인할 때까지 저장 작업을 보류합니다.';
  return '다음 Redis 재시도 가능 시각: '+date.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+'.';
}
function applyWriteLocks(active){
  const selectors=['#feedback-status','#feedback-priority','#feedback-memo-save','#operator-recovery-toggle','#operator-logout-all','[data-revoke-session]'];
  document.querySelectorAll(selectors.join(',')).forEach(control=>{
    if(active){
      if(!control.dataset.redisWriteLocked){control.dataset.redisPreviousDisabled=control.disabled?'1':'0'}
      control.dataset.redisWriteLocked='1';control.disabled=true;control.title='Redis 제한 보호 모드에서는 이 저장 작업을 잠시 사용할 수 없습니다.';
    }else if(control.dataset.redisWriteLocked==='1'){
      control.disabled=control.dataset.redisPreviousDisabled==='1';delete control.dataset.redisWriteLocked;delete control.dataset.redisPreviousDisabled;
      if(control.title==='Redis 제한 보호 모드에서는 이 저장 작업을 잠시 사용할 수 없습니다.')control.removeAttribute('title');
    }
  });
}
function observeWriteLocks(){
  if(globalThis.__chunbongOperatorRedisWriteLockObserverV1||typeof MutationObserver!=='function')return;
  globalThis.__chunbongOperatorRedisWriteLockObserverV1=true;
  const observer=new MutationObserver(records=>{
    if(!redisDegradedState.active||!records.some(record=>record.addedNodes?.length))return;
    queueMicrotask(()=>applyWriteLocks(redisDegradedState.active));
  });
  observer.observe(document.body,{childList:true,subtree:true});
}
function setRedisDegradedMode(active,{reason='',retryAt=''}={}){
  redisDegradedState={active:Boolean(active),reason:String(reason||''),retryAt:String(retryAt||'')};
  globalThis.__chunbongOperatorRedisReadOnlyV1={...redisDegradedState};
  document.body?.setAttribute('data-operator-redis-degraded',active?'1':'0');
  const banner=ensureDegradedBanner();
  if(banner){
    banner.hidden=!active;
    const detail=$('[data-redis-limit-detail]',banner);
    if(detail)detail.textContent=active?'운영자 센터는 읽기·상태 확인·진단을 계속 제공합니다. 피드백 수정, 복구모드 전환, 세션 해제, 전체 로그아웃, Push 발송처럼 Redis 저장이 필요한 작업만 잠시 중지합니다. '+degradedRetryLabel(retryAt):'';
  }
  applyWriteLocks(Boolean(active));
  document.dispatchEvent(new CustomEvent('chunbong:operator-redis-degraded',{detail:{...redisDegradedState}}));
}
function budgetState(data={}){
  const budget=data?.resourceBudget||{};
  const active=budget.redisCircuitOpen===true||budget.mode==='limit';
  return{active,reason:active?'redis_limit':'',retryAt:String(budget.redisCircuitUntil||'')};
}
async function inspectOperatorResponse(type,response){
  if(!response)return;
  try{
    const clone=response.clone(),data=await clone.json();
    if(type==='operator-system-status'&&response.ok){const state=budgetState(data);setRedisDegradedMode(state.active,state);return}
    const reason=String(data?.error||data?.reason||'');
    if(!response.ok&&(response.status===429||response.status===503)&&/redis_service_limit|redis_circuit_open|operator_storage_unavailable|service_limit/i.test(reason)){
      setRedisDegradedMode(true,{reason,retryAt:String(data?.retryAt||'')});
    }
  }catch{}
}
function readOnlyError(type){
  const error=new Error('operator_read_only');error.name='OperatorReadOnlyError';error.code='operator_read_only';error.type=type;error.retryAt=redisDegradedState.retryAt;return error;
}
function installOperatorRequestOptimizer(){
  if(globalThis.__chunbongOperatorRequestOptimizerV1)return;
  const originalFetch=globalThis.fetch?.bind(globalThis);if(typeof originalFetch!=='function')return;
  globalThis.__chunbongOperatorRequestOptimizerV1=true;
  const releasedTabs=new Set();
  let securityLogCache=null,securityLogPending=null;
  const releaseFromTarget=target=>{
    const tab=target?.closest?.('[data-operator-tab],[data-operator-quick-tab],[data-operator-content-sync]');
    if(!tab)return;
    const name=tab.dataset.operatorTab||tab.dataset.operatorQuickTab||(tab.matches('[data-operator-content-sync]')?'contents':'');
    if(name)releasedTabs.add(name);
  };
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#operator-security-refresh'))securityLogCache=null;
    releaseFromTarget(event.target);
  },true);
  for(const panel of document.querySelectorAll('[data-operator-panel]:not([hidden])')){
    if(panel.dataset.operatorPanel)releasedTabs.add(panel.dataset.operatorPanel);
  }
  globalThis.fetch=async function optimizedOperatorFetch(input,init){
    const method=requestMethod(input,init),type=operatorRequestType(input);
    if(method!=='GET'){
      if(redisDegradedState.active&&REDIS_DEPENDENT_MUTATIONS.has(type))throw readOnlyError(type);
      const response=await originalFetch(input,init);void inspectOperatorResponse(type,response);return response;
    }
    const requiredTab=DEFERRED_BOOT_TYPES.get(type);
    if(requiredTab&&!releasedTabs.has(requiredTab)){
      const error=new Error('operator_request_deferred');error.name='AbortError';throw error;
    }
    if(type==='operator-security-log'){
      const now=Date.now(),cache=securityLogCache;
      if(cache&&now-cache.at<SECURITY_LOG_CACHE_MS)return cache.response.clone();
      if(securityLogPending)return(await securityLogPending).clone();
      securityLogPending=originalFetch(input,init).then(response=>{
        if(response.ok)securityLogCache={at:Date.now(),response:response.clone()};
        void inspectOperatorResponse(type,response);
        return response.clone();
      }).finally(()=>{securityLogPending=null});
      return(await securityLogPending).clone();
    }
    const response=await originalFetch(input,init);void inspectOperatorResponse(type,response);return response;
  };
}
installOperatorRequestOptimizer();

function readSnapshot(){try{return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null')}catch{return null}}
function writeSnapshot(value){try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({at:Date.now(),value}))}catch{}}
function rowMarkup(rows=[],labels={}){
  const safe=Array.isArray(rows)?rows:[];
  if(!safe.length)return'<p class="operator-empty">아직 관찰된 Redis command가 없습니다.</p>';
  const max=Math.max(1,...safe.map(row=>Number(row.count)||0));
  return safe.slice(0,12).map(row=>`<div class="operator-redis-diagnostic-row"><span><b>${esc(labels[row.key]||row.key)}</b><small>${fmt(row.count)}회 · ${Number(row.pct||0).toFixed(1)}%</small></span><i aria-hidden="true"><em style="width:${Math.max(3,(Number(row.count)||0)/max*100)}%"></em></i></div>`).join('');
}
function panel(){
  let root=$('#system-redis-diagnostics');if(root)return root;
  const system=$('[data-operator-panel="system"]');if(!system)return null;
  root=document.createElement('article');
  root.id='system-redis-diagnostics';root.className='operator-card operator-redis-diagnostics';
  root.innerHTML=`<header><div><h2>Redis command 진단</h2><small>실시간 진단 표본 · 진단 자체 Redis command 0회</small></div><button id="operator-redis-diagnostics-refresh" type="button">표본 새로고침</button></header>
  <div class="operator-redis-diagnostic-summary"><div><span>관찰 command</span><b id="system-redis-diagnostics-total">-</b></div><div><span>관찰 요청</span><b id="system-redis-diagnostics-requests">-</b></div><div><span>표본 시작</span><b id="system-redis-diagnostics-started">-</b></div></div>
  <div class="operator-grid-2 operator-redis-diagnostic-grid"><section class="operator-redis-diagnostic-note"><strong>전용 Operator Redis</strong><p id="system-operator-store-state">연결 대기 · native Upstash DB를 만든 뒤 기존 DB를 RDB Import하고 OPERATOR_REDIS 환경변수를 연결하세요.</p><small>기존 Vercel 관리형 Redis 데이터는 전환 확인 전까지 삭제하지 않습니다.</small></section><section><div class="operator-section-title-row"><strong>명령어별</strong><span>GET · ZRANGE · SMEMBERS 등</span></div><div id="system-redis-diagnostics-commands"></div></section><section><div class="operator-section-title-row"><strong>기능별</strong><span>키 prefix 기반 추정</span></div><div id="system-redis-diagnostics-features"></div></section><section><div class="operator-section-title-row"><strong>읽기/쓰기 비중</strong><span>command 종류 기준</span></div><div id="system-redis-diagnostics-categories"></div></section><section class="operator-redis-diagnostic-note"><strong>월간 Redis 사용량</strong><p id="system-redis-monthly-usage">실측 또는 관찰 기반 추정을 계산하는 중입니다.</p><small id="system-redis-monthly-thresholds">70% 주의 · 85% 경고 · 95% 위험</small></section><section><div class="operator-section-title-row"><strong>수집기 신선도</strong><span>warm-instance 표본 · Redis 0회</span></div><div id="system-collector-health"></div></section><section><div class="operator-section-title-row"><strong>실사용자 오류</strong><span>2% 익명 표본 · warm-instance 메모리</span></div><div id="system-client-health"></div></section></div>`;
  const grid=$('.operator-grid-2',system);if(grid)grid.appendChild(root);else system.appendChild(root);
  $('#operator-redis-diagnostics-refresh',root)?.addEventListener('click',()=>loadRedisDiagnostics({force:true}));
  return root;
}
function renderOperatorStoreState(data={}){
  const node=$('#system-operator-store-state');if(!node)return;
  const connected=Boolean(data?.resourceBudget?.isolatedStores?.operator);
  node.textContent=connected?'연결됨 · 신규 운영자 데이터는 전용 native Upstash Redis에 저장됩니다.':'연결 대기 · 기존 DB를 새 native Upstash DB에 RDB Import한 뒤 OPERATOR_REDIS 환경변수를 연결하세요.';
  node.dataset.connected=connected?'1':'0';
}
function elapsedLabel(value=''){
  const time=Date.parse(String(value||''));if(!Number.isFinite(time))return'-';
  const minutes=Math.max(0,Math.round((Date.now()-time)/60000));
  if(minutes<1)return'방금';if(minutes<60)return minutes+'분 전';if(minutes<1440)return Math.round(minutes/60)+'시간 전';return Math.round(minutes/1440)+'일 전';
}
function observedMonthlyUsage(snapshot={}){
  const commands=Number(snapshot.observedCommands)||0,started=Date.parse(String(snapshot.startedAt||''));
  if(!commands||!Number.isFinite(started))return null;
  const elapsedHours=Math.max((Date.now()-started)/3600000,5/60);
  return Math.max(commands,Math.round(commands/elapsedHours*24*30));
}
function redisUsageLevel(pct){const value=Number(pct)||0;return value>=95?'bad':value>=85?'warn':value>=70?'watch':'ok'}
function renderMonthlyUsage(data={},snapshot={}){
  const node=$('#system-redis-monthly-usage');if(!node)return;
  const candidates=[data?.realtimeRedisUsage,data?.redisUsage];
  const exact=candidates.find(row=>row?.exact===true&&Number.isFinite(Number(row.used)));
  const limit=Math.max(1,Number(exact?.monthlyLimit)||Number(candidates.find(row=>Number(row?.monthlyLimit)>0)?.monthlyLimit)||500000);
  const estimated=observedMonthlyUsage(snapshot),used=exact?Number(exact.used):estimated;
  if(!Number.isFinite(used)){node.textContent='정확 실측 연결 대기 · warm-instance 표본이 쌓이면 관찰 기반 추정을 표시합니다.';node.dataset.level='ok';return}
  const pct=Math.max(0,used/limit*100),remaining=Math.max(0,limit-used),level=redisUsageLevel(pct);
  node.dataset.level=level;
  node.textContent=(exact?'정확 실측':'관찰 기반 추정')+' · '+fmt(used)+' / '+fmt(limit)+' commands · '+pct.toFixed(1)+'% · 잔여 '+fmt(remaining);
}
function renderCollectorHealth(data={}){
  const root=$('#system-collector-health');if(!root)return;const rows=Array.isArray(data?.collectorHealth?.items)?data.collectorHealth.items:[];
  if(!rows.length){root.innerHTML='<p class="operator-empty">이 warm 인스턴스에서 아직 수집 요청 표본이 없습니다.</p>';return}
  root.innerHTML=rows.map(row=>{const failures=Number(row.consecutiveFailures)||0,state=failures?'연속 실패 '+fmt(failures)+'회':row.fallback?'fallback':'정상';return '<div class="operator-redis-diagnostic-row"><span><b>'+esc(row.type)+'</b><small>'+esc(state)+' · 확인 '+esc(elapsedLabel(row.lastCheckedAt))+' · 최신 데이터 '+esc(elapsedLabel(row.lastDataAt))+'</small></span></div>'}).join('');
}
function renderClientHealth(data={}){
  const root=$('#system-client-health');if(!root)return;const health=data?.clientHealth||{},rows=Array.isArray(health.samples)?health.samples:[];
  if(!rows.length){root.innerHTML='<p class="operator-empty">2% 표본에서 아직 오류·지연이 관찰되지 않았습니다.</p>';return}
  const summary='<p class="operator-empty">표본 '+fmt(health.count||0)+'건 · 오류 '+fmt(health.errors||0)+'건 · 지연 '+fmt(health.slow||0)+'건 · Redis 저장 0회</p>';
  root.innerHTML=summary+rows.slice(0,8).map(row=>'<div class="operator-redis-diagnostic-row"><span><b>'+esc(row.page||'/')+'</b><small>'+esc(row.kind)+' · '+esc(row.message||'')+(row.durationMs?' · '+fmt(row.durationMs)+'ms':'')+' · '+esc(elapsedLabel(row.at))+'</small></span></div>').join('');
}
function renderSystemObservability(data={},snapshot={}){renderMonthlyUsage(data,snapshot);renderCollectorHealth(data);renderClientHealth(data)}
function renderRedisDiagnostics(data={},meta={}){
  const root=panel();if(!root)return;
  const snapshot=data.redisCommandDiagnostics||data;
  const total=$('#system-redis-diagnostics-total',root),requests=$('#system-redis-diagnostics-requests',root),started=$('#system-redis-diagnostics-started',root);
  if(total)total.textContent=fmt(snapshot.observedCommands||0)+'회';
  if(requests)requests.textContent=fmt(snapshot.observedRequests||0)+'회';
  if(started)started.textContent=snapshot.startedAt?new Date(snapshot.startedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'-';
  $('#system-redis-diagnostics-commands',root).innerHTML=rowMarkup(snapshot.commands,commandLabel);
  $('#system-redis-diagnostics-features',root).innerHTML=rowMarkup(snapshot.features,featureLabel);
  $('#system-redis-diagnostics-categories',root).innerHTML=rowMarkup(snapshot.categories,categoryLabel);
  root.dataset.stale=meta.cached?'1':'0';
  const headerSmall=$('header small',root);if(headerSmall)headerSmall.textContent=meta.cached?'실시간 진단 표본 · 마지막 브라우저 스냅샷':'실시간 진단 표본 · 진단 자체 Redis command 0회';
}
let loading=false;
async function loadRedisDiagnostics({force=false}={}){
  const cached=readSnapshot();if(cached?.value&&!force)renderRedisDiagnostics(cached.value,{cached:true});
  if(loading)return;loading=true;
  const button=$('#operator-redis-diagnostics-refresh');if(button)button.disabled=true;
  try{
    const response=await fetch(API,{headers:{accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json(),snapshot=data.redisCommandDiagnostics;
    const state=budgetState(data);setRedisDegradedMode(state.active,state);
    renderOperatorStoreState(data);
    renderSystemObservability(data,snapshot||{});
    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}
  }catch{
    if(cached?.value)renderRedisDiagnostics(cached.value,{cached:true});
  }finally{loading=false;if(button)button.disabled=false}
}
function bind(){
  panel();ensureDegradedBanner();observeWriteLocks();applyWriteLocks(redisDegradedState.active);
  document.querySelectorAll('[data-operator-tab]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.operatorTab==='system')queueMicrotask(()=>loadRedisDiagnostics())}));
  const system=$('[data-operator-panel="system"]');if(system&&!system.hidden)void loadRedisDiagnostics();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();

function installOperatorMobileTabUX(){
  if(globalThis.__chunbongOperatorMobileTabUXV2)return;
  globalThis.__chunbongOperatorMobileTabUXV2=true;
  const mobile=()=>matchMedia('(max-width: 760px)').matches;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const center=button=>{
    if(!mobile()||!button?.matches?.('[data-operator-tab]'))return;
    button.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest',inline:'center'});
  };
  const centerActive=()=>center(document.querySelector('.operator-tabs [data-operator-tab][aria-selected="true"],.operator-tabs [data-operator-tab].active'));
  document.querySelectorAll('[data-operator-tab]').forEach(button=>button.addEventListener('click',()=>queueMicrotask(()=>center(button))));
  document.querySelectorAll('[data-operator-quick-tab]').forEach(button=>button.addEventListener('click',()=>queueMicrotask(centerActive)));
  window.addEventListener('resize',()=>{if(mobile())queueMicrotask(centerActive)},{passive:true});
  queueMicrotask(centerActive);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installOperatorMobileTabUX,{once:true});else installOperatorMobileTabUX();

function installOperatorTabKeyboardUX(){
  if(globalThis.__chunbongOperatorTabKeyboardUXV1)return;
  const tablist=document.querySelector('.operator-tabs[role="tablist"],.operator-tabs');
  if(!tablist)return;
  const tabs=[...tablist.querySelectorAll('[data-operator-tab]')];
  if(!tabs.length)return;
  globalThis.__chunbongOperatorTabKeyboardUXV1=true;
  const sync=()=>{
    const selected=tabs.find(tab=>tab.getAttribute('aria-selected')==='true'||tab.classList.contains('active'))||tabs[0];
    tabs.forEach(tab=>tab.setAttribute('tabindex',tab===selected?'0':'-1'));
    return selected;
  };
  const activate=tab=>{
    if(!tab)return;
    try{tab.focus({preventScroll:true})}catch{tab.focus()}
    tab.click();
    queueMicrotask(sync);
  };
  tablist.addEventListener('keydown',event=>{
    const current=event.target?.closest?.('[data-operator-tab]');
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
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installOperatorTabKeyboardUX,{once:true});else installOperatorTabKeyboardUX();

export{renderRedisDiagnostics,loadRedisDiagnostics,setRedisDegradedMode};