const API='/api/content?type=operator-system-status';
const SNAPSHOT_KEY='chunbong:operator:redis-diagnostics:v1';
const SECURITY_LOG_CACHE_MS=5*60*1000;
const DEFERRED_BOOT_TYPES=new Map([
  ['operator-system-status','system'],
  ['operator-content-archive','contents']
]);
const $=(selector,root=document)=>root.querySelector(selector);
const fmt=value=>new Intl.NumberFormat('ko-KR').format(Number(value)||0);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const commandLabel={GET:'GET',MGET:'MGET',ZRANGE:'ZRANGE',ZREVRANGE:'ZREVRANGE',ZSCORE:'ZSCORE',ZCARD:'ZCARD',SMEMBERS:'SMEMBERS',HGET:'HGET',HGETALL:'HGETALL',SET:'SET',HSET:'HSET',HINCRBY:'HINCRBY',ZADD:'ZADD',ZREM:'ZREM',SADD:'SADD',SREM:'SREM',DEL:'DEL',EXISTS:'EXISTS'};
const featureLabel={analytics:'분석',feedback:'피드백','auth-session':'인증·세션','operator-health':'운영 상태',push:'Push',ranking:'랭킹',multiplayer:'멀티플레이','content-archive':'콘텐츠 아카이브',other:'기타',unknown:'분류 대기'};
const categoryLabel={read:'읽기',write:'쓰기',script:'스크립트',other:'기타'};

function requestUrl(input){
  try{return new URL(typeof input==='string'?input:input?.url||String(input||''),location.href)}catch{return null}
}
function requestMethod(input,init){return String(init?.method||input?.method||'GET').toUpperCase()}
function operatorRequestType(input){
  const url=requestUrl(input);if(!url||url.origin!==location.origin||url.pathname!=='/api/content')return'';
  return String(url.searchParams.get('type')||'');
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
    if(requestMethod(input,init)!=='GET')return originalFetch(input,init);
    const type=operatorRequestType(input),requiredTab=DEFERRED_BOOT_TYPES.get(type);
    if(requiredTab&&!releasedTabs.has(requiredTab)){
      const error=new Error('operator_request_deferred');error.name='AbortError';throw error;
    }
    if(type==='operator-security-log'){
      const now=Date.now(),cache=securityLogCache;
      if(cache&&now-cache.at<SECURITY_LOG_CACHE_MS)return cache.response.clone();
      if(securityLogPending)return(await securityLogPending).clone();
      securityLogPending=originalFetch(input,init).then(response=>{
        if(response.ok)securityLogCache={at:Date.now(),response:response.clone()};
        return response.clone();
      }).finally(()=>{securityLogPending=null});
      return(await securityLogPending).clone();
    }
    return originalFetch(input,init);
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
  <div class="operator-grid-2 operator-redis-diagnostic-grid"><section><div class="operator-section-title-row"><strong>명령어별</strong><span>GET · ZRANGE · SMEMBERS 등</span></div><div id="system-redis-diagnostics-commands"></div></section><section><div class="operator-section-title-row"><strong>기능별</strong><span>키 prefix 기반 추정</span></div><div id="system-redis-diagnostics-features"></div></section><section><div class="operator-section-title-row"><strong>읽기/쓰기 비중</strong><span>command 종류 기준</span></div><div id="system-redis-diagnostics-categories"></div></section><section class="operator-redis-diagnostic-note"><strong>공식 월간 사용량</strong><p>현재 DB는 Vercel 관리형 Upstash라 Developer API 자동 실측이 지원되지 않습니다. 월간 commands와 잔여량은 <a href="https://console.upstash.com/redis" target="_blank" rel="noopener">Upstash Usage ↗</a>가 공식 기준입니다.</p><small>이 패널은 현재 warm API 인스턴스에서 관찰한 표본이며 월간 전체 사용량이 아닙니다.</small></section></div>`;
  const grid=$('.operator-grid-2',system);if(grid)grid.appendChild(root);else system.appendChild(root);
  $('#operator-redis-diagnostics-refresh',root)?.addEventListener('click',()=>loadRedisDiagnostics({force:true}));
  return root;
}
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
    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}
  }catch{
    if(cached?.value)renderRedisDiagnostics(cached.value,{cached:true});
  }finally{loading=false;if(button)button.disabled=false}
}
function bind(){
  panel();
  document.querySelectorAll('[data-operator-tab]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.operatorTab==='system')queueMicrotask(()=>loadRedisDiagnostics())}));
  const system=$('[data-operator-panel="system"]');if(system&&!system.hidden)void loadRedisDiagnostics();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();

export{renderRedisDiagnostics,loadRedisDiagnostics};