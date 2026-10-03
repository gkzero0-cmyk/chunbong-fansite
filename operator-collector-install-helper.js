const COLLECTOR_LATEST_VERSION='1.4.8';
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
  return{ready,version,current:ready&&versionAtLeast(version,COLLECTOR_LATEST_VERSION)};
}

function installUrl(){
  return COLLECTOR_SCRIPT_PATH+'?install=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now();
}
function sourceUrl(){
  return COLLECTOR_SCRIPT_PATH+'?source=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now();
}
function downloadUrl(){
  return COLLECTOR_SCRIPT_PATH+'?download=1&v='+encodeURIComponent(COLLECTOR_LATEST_VERSION)+'&t='+Date.now();
}

function updateLowDataGuidance(){
  const scope=document.querySelector('[data-unified-collector]');
  if(!scope)return;
  for(const li of scope.querySelectorAll('li')){
    if(!li.textContent.includes('약 5분 간격'))continue;
    li.innerHTML=li.innerHTML.replace(
      '백그라운드 탭이 약 5분 간격으로 신규 게시글을 확인합니다.',
      '운영자 센터가 열려 있는 동안 약 <b>15분</b> 간격으로 1회 확인 탭을 잠깐 열어 신규 게시글을 확인한 뒤 자동으로 닫습니다.'
    );
  }
}

function ensureHelperPanel(trigger){
  let panel=document.querySelector('[data-collector-install-helper]');
  if(panel)return panel;
  panel=document.createElement('div');
  panel.className='operator-soop-import';
  panel.setAttribute('data-collector-install-helper','');
  panel.hidden=true;
  panel.innerHTML=`
    <header><div><small>자동 수집기 설치 도우미</small><strong data-collector-install-title>설치 상태 확인</strong></div><button type="button" data-collector-install-close>닫기</button></header>
    <p data-collector-install-message></p>
    <div class="operator-soop-helper-actions">
      <a href="${installUrl()}" data-collector-install-action>자동 수집기 설치 / 업데이트</a>
      <a href="${downloadUrl()}" download="chunbong-content-collector.user.js" data-collector-stable-download>5.5 정식판용 파일 받기</a>
      <a href="${sourceUrl()}" target="_blank" rel="noopener noreferrer" data-collector-script-source>스크립트 원문 보기</a>
      <a href="${TAMPERMONKEY_URL}" target="_blank" rel="noopener noreferrer" data-collector-tampermonkey>Tampermonkey 공식 사이트</a>
    </div>
    <div data-collector-stable-guide>
      <small><b>Tampermonkey 5.5.x 정식판:</b> Chrome 152+에서는 .user.js 주소를 눌러도 설치 화면이 자동으로 열리지 않을 수 있습니다. 이 경우 ‘5.5 정식판용 파일 받기’로 최신 파일을 받은 뒤 Tampermonkey에서 로컬 userscript 파일을 열거나 가져오면 됩니다. 기존 v1.4.7과 같은 스크립트 이름으로 인식되면 v1.4.8로 업데이트하세요.</small>
    </div>
    <small><b>Tampermonkey 5.6+:</b> Chrome 152+용 inline 설치를 지원하므로 위 ‘설치 / 업데이트’ 링크를 먼저 사용하세요.</small>`;
  const actions=trigger.closest('.operator-soop-helper-actions');
  (actions||trigger.parentElement)?.insertAdjacentElement('afterend',panel);
  panel.querySelector('[data-collector-install-close]')?.addEventListener('click',()=>{panel.hidden=true});
  return panel;
}

function refreshInstallLinks(panel){
  const action=panel.querySelector('[data-collector-install-action]');
  const download=panel.querySelector('[data-collector-stable-download]');
  const source=panel.querySelector('[data-collector-script-source]');
  action?.setAttribute('href',installUrl());
  download?.setAttribute('href',downloadUrl());
  source?.setAttribute('href',sourceUrl());
}

function renderInstallHelper(trigger){
  const panel=ensureHelperPanel(trigger),state=collectorState();
  const title=panel.querySelector('[data-collector-install-title]');
  const message=panel.querySelector('[data-collector-install-message]');
  const action=panel.querySelector('[data-collector-install-action]');
  refreshInstallLinks(panel);
  panel.hidden=false;
  if(state.current){
    if(title)title.textContent='자동 수집기 v'+state.version+' · 최신 상태';
    if(message)message.textContent='현재 설치된 자동 수집기가 최신 버전입니다. 재설치는 필요하지 않습니다. 문제가 있을 때만 아래 링크로 같은 버전을 다시 설치하세요.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' 다시 설치';
  }else if(state.ready){
    if(title)title.textContent='자동 수집기 업데이트 필요 · 현재 v'+(state.version||'?');
    if(message)message.textContent='최신 v'+COLLECTOR_LATEST_VERSION+'이 있습니다. Tampermonkey 5.5.x 정식판을 사용 중이면 아래 ‘5.5 정식판용 파일 받기’를 사용하세요. 5.6+에서는 설치/업데이트 링크를 바로 사용할 수 있습니다.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' 설치 / 업데이트';
  }else{
    if(title)title.textContent='자동 수집기 설치 필요';
    if(message)message.textContent='자동 수집기가 이 운영자 페이지에 연결되어 있지 않습니다. Tampermonkey 5.5.x 정식판은 파일 방식, 5.6+는 설치 링크 방식을 사용하세요.';
    if(action)action.textContent='v'+COLLECTOR_LATEST_VERSION+' 설치';
  }
}

function correctWatchStartMessage(){
  const message=document.querySelector('[data-archive-admin-message]');
  if(!message)return;
  message.textContent='SOOP 저데이터 감시를 시작했습니다. 운영자 센터가 열려 있는 동안 약 15분 간격으로 1회 확인 탭을 잠깐 열고, 확인이 끝나면 자동으로 닫습니다.';
  message.dataset.state='ok';
}

export function bindCollectorInstallHelper(){
  const trigger=document.querySelector('[data-collector-install]');
  if(!trigger||trigger.dataset.installHelperBound==='1')return false;
  trigger.dataset.installHelperBound='1';
  trigger.removeAttribute('target');
  trigger.removeAttribute('rel');
  trigger.setAttribute('href','#collector-install-helper');
  trigger.addEventListener('click',event=>{
    event.preventDefault();
    renderInstallHelper(trigger);
  });
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-collector-watch-start]'))setTimeout(correctWatchStartMessage,0);
  },true);
  updateLowDataGuidance();
  return true;
}

function boot(){bindCollectorInstallHelper();updateLowDataGuidance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
