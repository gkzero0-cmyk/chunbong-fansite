const MIN_COLLECTOR_VERSION='1.4.6';
const COLLECTOR_CHANNEL='chunbong-content-collector';
const COMMAND_ATTR='data-chunbong-collector-command';
const COMMAND_EVENT='chunbong-content-collector-page-command';
const MESSAGE_ATTR='data-chunbong-collector-message';
const MESSAGE_EVENT='chunbong-content-collector-page-message';
const READY_ATTR='data-chunbong-collector-ready';
const VERSION_ATTR='data-chunbong-collector-version';
let awaitingRecaptureCommand=false,armTimer=null;

export function versionAtLeast(actual='',minimum=MIN_COLLECTOR_VERSION){
  const parse=value=>String(value||'').split('.').map(part=>Number.parseInt(part,10)).map(value=>Number.isFinite(value)?value:0);
  if(!String(actual||'').trim())return false;
  const left=parse(actual),right=parse(minimum),length=Math.max(left.length,right.length);
  for(let index=0;index<length;index++){
    const a=left[index]||0,b=right[index]||0;
    if(a>b)return true;if(a<b)return false;
  }
  return true;
}

export function collectorReadyState(root=typeof document!=='undefined'?document.documentElement:null){
  const ready=root?.getAttribute?.(READY_ATTR)==='1';
  const version=String(root?.getAttribute?.(VERSION_ATTR)||'');
  return{ready,version,supported:ready&&versionAtLeast(version,MIN_COLLECTOR_VERSION)};
}

function setStatus(text,state=''){
  if(typeof document==='undefined')return;
  const node=document.querySelector('[data-archive-admin-message]');
  if(!node)return;
  node.textContent=String(text||'');node.dataset.state=state;
}
function readPageMessage(){
  try{return JSON.parse(document.documentElement?.getAttribute(MESSAGE_ATTR)||'{}')}catch{return{}}
}
function isStateMessage(data={}){return Boolean(data&&data.channel===COLLECTOR_CHANNEL&&data.type==='state')}
function waitForCollectorState(timeoutMs=2200){
  return new Promise(resolve=>{
    let done=false,timer=null;
    const finish=value=>{if(done)return;done=true;if(timer)clearTimeout(timer);window.removeEventListener('message',onWindow);document.removeEventListener(MESSAGE_EVENT,onPage);resolve(value||null)};
    const onWindow=event=>{if(event.source===window&&event.origin===location.origin&&isStateMessage(event.data||{}))finish(event.data)};
    const onPage=()=>{const data=readPageMessage();if(isStateMessage(data))finish(data)};
    window.addEventListener('message',onWindow);document.addEventListener(MESSAGE_EVENT,onPage);
    timer=setTimeout(()=>finish(null),timeoutMs);
  });
}
function sendPing(){
  const payload={channel:COLLECTOR_CHANNEL,version:1,commandId:'recapture-ack-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type:'ping'};
  try{window.postMessage(payload,location.origin)}catch{}
  try{const root=document.documentElement;if(root){root.setAttribute(COMMAND_ATTR,JSON.stringify(payload));document.dispatchEvent(new CustomEvent(COMMAND_EVENT))}}catch{}
}
async function verifyRecaptureDelivery(){
  const pending=waitForCollectorState();sendPing();const state=await pending;
  if(!state){setStatus('SOOP 재수집 명령을 보냈지만 자동 수집기의 확인 응답이 없습니다. 자동 수집기 연결 상태를 확인한 뒤 다시 실행해 주세요.','bad');return false}
  const version=String(state.version||collectorReadyState().version||'');
  if(!versionAtLeast(version,MIN_COLLECTOR_VERSION)){setStatus('자동 수집기 응답은 왔지만 버전이 오래되었습니다. 자동 수집기를 업데이트한 뒤 다시 실행해 주세요.','bad');return false}
  setStatus('SOOP 재수집 명령 전달 확인됨 · 자동 수집기 v'+version+'이 명령을 정상 수신했습니다. 글별 복구 상태에서 결과를 확인할 수 있습니다.','ok');return true;
}
function recaptureCommand(){
  try{const data=JSON.parse(document.documentElement?.getAttribute(COMMAND_ATTR)||'{}');return data?.channel===COLLECTOR_CHANNEL&&data?.type==='open-urls'&&data?.kind==='soop-recapture'?data:null}catch{return null}
}
function armOneShotVerification(){
  awaitingRecaptureCommand=true;if(armTimer)clearTimeout(armTimer);
  armTimer=setTimeout(()=>{awaitingRecaptureCommand=false;armTimer=null},1200);
}
function blockUnavailableCollector(event){
  const button=event.target?.closest?.('[data-collector-recapture-soop]');if(!button)return;
  const state=collectorReadyState();
  if(state.supported){armOneShotVerification();return}
  event.preventDefault();event.stopImmediatePropagation();
  if(!state.ready){setStatus('SOOP 누락 자료 재수집을 시작하지 않았습니다. 자동 수집기가 이 운영자 페이지에 연결되지 않았습니다. 자동 수집기 설치 / 업데이트 후 페이지를 새로고침해 주세요.','bad');return}
  setStatus('SOOP 누락 자료 재수집을 시작하지 않았습니다. 자동 수집기 v'+(state.version||'?')+'가 감지됐지만 v'+MIN_COLLECTOR_VERSION+' 이상이 필요합니다. 자동 수집기를 업데이트해 주세요.','bad');
}
function handleCollectorCommand(){
  if(!awaitingRecaptureCommand||!recaptureCommand())return;
  awaitingRecaptureCommand=false;if(armTimer){clearTimeout(armTimer);armTimer=null}
  setTimeout(()=>void verifyRecaptureDelivery(),80);
}
function boot(){
  document.addEventListener('click',blockUnavailableCollector,true);
  document.addEventListener(COMMAND_EVENT,handleCollectorCommand);
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
