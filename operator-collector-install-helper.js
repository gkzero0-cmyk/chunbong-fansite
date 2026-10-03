const COLLECTOR_LATEST_VERSION='1.5.0';
const COLLECTOR_SCRIPT_PATH='/chunbong-content-collector.user.js';
const TAMPERMONKEY_URL='https://www.tampermonkey.net/';
const READY_ATTR='data-chunbong-collector-ready';
const VERSION_ATTR='data-chunbong-collector-version';

function versionAtLeast(actual='',minimum=COLLECTOR_LATEST_VERSION){
  const parse=value=>String(value||'').split('.').map(part=>Number.parseInt(part,10)||0);
  const left=parse(actual),right=parse(minimum),length=Math.max(left.length,right.length);
  for(let index=0;index<length;index++){
    const a=left[index]||0,b=right[index]||0;
    if(a>b)return true;if(a<b)return false;
  }
  return Boolean(String(actual||'').trim());
}

function collectorState(){
  const root=document.documentElement;
  const ready=root?.getAttribute(READY_ATTR)==='1';
  const version=String(root?.getAttribute(VERSION_ATTR)||'');
  const bootstrapVersion=String(root?.getAttribute('data-chunbong-collector-bootstrap-version')||version||'');
  const runtimeVersion=String(root?.getAttribute('data-chunbong-collector-runtime-version')||'');
  const runtimeState=String(root?.getAttribute('data-chunbong-collector-runtime-state')||'');
  const lastRuntimeCheckAt=String(root?.getAttribute('data-chunbong-collector-runtime-check-at')||'');
  const lastRuntimeLoadedAt=String(root?.getAttribute('data-chunbong-collector-runtime-loaded-at')||'');
  const reinstallRequired=root?.getAttribute('data-chunbong-collector-reinstall-required')==='1';
  return{ready,version,bootstrapVersion,runtimeVersion,runtimeState,lastRuntimeCheckAt,lastRuntimeLoadedAt,reinstallRequired,current:ready&&versionAtLeast(bootstrapVersion,COLLECTOR_LATEST_VERSION)};
}

function installUrl(){return COLLECTOR_SCRIPT_PATH+'?install=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now()}
function sourceUrl(){return COLLECTOR_SCRIPT_PATH+'?source=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now()}
function downloadUrl(){return COLLECTOR_SCRIPT_PATH+'?download=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now()}

function updateLowDataGuidance(){
  const scope=document.querySelector('[data-unified-collector]');
  if(!scope)return;
  for(const li of scope.querySelectorAll('li'))if(li.textContent.includes('약 5분 간격'))li.innerHTML=li.innerHTML.replace('백그라운드 탭이 약 5분 간격으로 신규 게시글을 확인합니다.','운영자 센터가 열려 있는 동안 약 <b>15분</b> 간격으로 1회 확인 탭을 잠깐 열어 신규 게시글을 확인한 뒤 자동으로 닫습니다.');
}

function ensureHelperPanel(trigger){
  let panel=document.querySelector('[data-collector-install-helper]');
  if(panel)return panel;
  panel=document.createElement('div');
  panel.className='operator-soop-import';
  panel.setAttribute('data-collector-install-helper','');
  panel.hidden=true;
  panel.innerHTML=`<header><div><small>자동 수집기 설치 도우미</small><strong data-collector-install-title>설치 상태 확인</strong></div><button type="button" data-collector-install-close>닫기</button></header><p data-collector-install-message></p><p data-collector-runtime-summary></p><div class="operator-soop-helper-actions"><a href="${installUrl()}" data-collector-install-action>자동 수집기 설치 / 업데이트</a><a href="${downloadUrl()}" download="chunbong-content-collector.user.js" data-collector-stable-download>5.5 정식판용 파일 받기</a><a href="${sourceUrl()}" target="_blank" rel="noopener noreferrer" data-collector-script-source>스크립트 원문 보기</a><a href="${TAMPERMONKEY_URL}" target="_blank" rel="noopener noreferrer">Tampermonkey 공식 사이트</a></div><small>Tampermonkey 5.5.x 정식판은 bootstrap 자체 업데이트가 필요할 때만 파일 방식으로 업데이트합니다. v1.5.0 이후 일반 수집 로직은 runtime-only 업데이트로 자동 반영되어 Tampermonkey 재설치가 필요하지 않습니다.</small>`;
  (trigger.closest('.operator-soop-helper-actions')||trigger.parentElement)?.insertAdjacentElement('afterend',panel);
  panel.querySelector('[data-collector-install-close]')?.addEventListener('click',()=>{panel.hidden=true});
  return panel;
}

function refreshPanel(trigger){
  const panel=ensureHelperPanel(trigger),state=collectorState();
  const title=panel.querySelector('[data-collector-install-title]');
  const message=panel.querySelector('[data-collector-install-message]');
  const summary=panel.querySelector('[data-collector-runtime-summary]');
  const action=panel.querySelector('[data-collector-install-action]');
  action?.setAttribute('href',installUrl());
  panel.querySelector('[data-collector-stable-download]')?.setAttribute('href',downloadUrl());
  panel.querySelector('[data-collector-script-source]')?.setAttribute('href',sourceUrl());
  if(summary)summary.textContent=`Bootstrap ${state.bootstrapVersion||'-'} · Runtime ${state.runtimeVersion||'-'} · ${state.runtimeState||'연결 대기'}${state.lastRuntimeCheckAt?' · 마지막 확인 '+state.lastRuntimeCheckAt:''}${state.lastRuntimeLoadedAt?' · 마지막 적용 '+state.lastRuntimeLoadedAt:''}`;
  panel.hidden=false;
  if(state.current&&!state.reinstallRequired){
    if(title)title.textContent='자동 수집기 bootstrap v'+state.bootstrapVersion+' · 최신 상태';
    if(message)message.textContent='일반 수집 로직 업데이트는 자동 적용되며 Tampermonkey 재설치는 필요하지 않습니다.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' bootstrap 다시 설치';
  }else if(state.ready){
    if(title)title.textContent='자동 수집기 bootstrap 업데이트 필요 · 현재 v'+(state.bootstrapVersion||'?');
    if(message)message.textContent='이번 1회 bootstrap 전환은 설치가 필요합니다. Tampermonkey 5.5.x 정식판은 아래 파일 받기를 사용하세요.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' bootstrap 설치 / 업데이트';
  }else{
    if(title)title.textContent='자동 수집기 설치 필요';
    if(message)message.textContent='Tampermonkey 5.5.x 정식판은 파일 방식으로 bootstrap을 설치하세요.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' 설치';
  }
}

function correctWatchStartMessage(){
  const message=document.querySelector('[data-archive-admin-message]');
  if(message){message.textContent='SOOP 저데이터 감시를 시작했습니다. 운영자 센터가 열려 있는 동안 약 15분 간격으로 1회 확인 탭을 잠깐 열고, 확인이 끝나면 자동으로 닫습니다.';message.dataset.state='ok'}
}

export function bindCollectorInstallHelper(){
  const trigger=document.querySelector('[data-collector-install]');
  if(!trigger||trigger.dataset.installHelperBound==='1')return false;
  trigger.dataset.installHelperBound='1';
  trigger.removeAttribute('target');trigger.removeAttribute('rel');trigger.setAttribute('href','#collector-install-helper');
  trigger.addEventListener('click',event=>{event.preventDefault();refreshPanel(trigger)});
  document.addEventListener('click',event=>{if(event.target?.closest?.('[data-collector-watch-start]'))setTimeout(correctWatchStartMessage,0)},true);
  document.addEventListener('chunbong-content-collector-page-message',()=>{const panel=document.querySelector('[data-collector-install-helper]');if(panel&&!panel.hidden)refreshPanel(trigger)});
  updateLowDataGuidance();
  return true;
}

function boot(){bindCollectorInstallHelper();updateLowDataGuidance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
