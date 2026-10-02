const MIN_COLLECTOR_VERSION='1.4.7';
const COLLECTOR_CHANNEL='chunbong-content-collector';
const COMMAND_ATTR='data-chunbong-collector-command';
const COMMAND_EVENT='chunbong-content-collector-page-command';
const MESSAGE_ATTR='data-chunbong-collector-message';
const MESSAGE_EVENT='chunbong-content-collector-page-message';
const READY_ATTR='data-chunbong-collector-ready';
const VERSION_ATTR='data-chunbong-collector-version';
const ARCHIVE_API='/api/content?type=operator-content-archive';
const EXACT_STATUS_API='/api/content?type=operator-content-soop-recapture-status';
const SOOP_RECAPTURE_SESSION_KEY='chunbong:operator:soop-sequential-recapture:v1';
const RECAPTURE_SESSION_TTL_MS=30*60*1000;
const STEP_TIMEOUT_MS=32000;
let recaptureRunning=false;
let lastRecaptureSummary={total:0,needsRecapture:0,imagesPresent:0,statusLookupFailed:0};
let lastRecapturePlanRows=[];

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
function postIdFromUrl(raw=''){try{return(new URL(String(raw||''),location.href).pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i)||[])[1]||''}catch{return''}}
function canonicalSoopPost(raw=''){
  try{
    const url=new URL(String(raw||''),'https://www.sooplive.com'),match=url.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);
    if(!['sooplive.com','www.sooplive.com'].includes(url.hostname.toLowerCase())||!match)return'';
    return'https://www.sooplive.com/station/chunbongtv/post/'+match[1];
  }catch{return''}
}
function archiveRecaptureCandidates(payload={}){
  const seen=new Set(),targets=[];
  for(const item of Array.isArray(payload.items)?payload.items:[]){
    for(const row of [...(Array.isArray(item?.timeline)?item.timeline:[]),...(Array.isArray(item?.media)?item.media:[]),...(Array.isArray(item?.sources)?item.sources:[])]){
      if(!row||row.visibility==='internal')continue;
      const url=canonicalSoopPost(row.url);if(!url||seen.has(url))continue;seen.add(url);
      targets.push({url,postId:postIdFromUrl(url)});
    }
  }
  return targets.filter(row=>row.postId).sort((a,b)=>Number(b.postId)-Number(a.postId));
}
async function exactRecaptureTargets(payload={}){
  const candidates=archiveRecaptureCandidates(payload);
  if(!candidates.length){lastRecaptureSummary={total:0,needsRecapture:0,imagesPresent:0,statusLookupFailed:0};lastRecapturePlanRows=[];return[]}
  const statuses=new Map(),failedIds=new Set();
  for(let offset=0;offset<candidates.length;offset+=80){
    const batch=candidates.slice(offset,offset+80),ids=batch.map(row=>row.postId).join(',');
    try{
      const response=await fetch(EXACT_STATUS_API+'&postIds='+encodeURIComponent(ids),{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
      const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||('HTTP '+response.status));
      for(const row of Array.isArray(result.rows)?result.rows:[])if(/^\d+$/.test(String(row?.postId||'')))statuses.set(String(row.postId),row);
      for(const candidate of batch)if(!statuses.has(candidate.postId))failedIds.add(candidate.postId);
    }catch{for(const candidate of batch)failedIds.add(candidate.postId)}
  }
  const targets=[];lastRecapturePlanRows=[];
  for(const candidate of candidates){
    const exactStatus=statuses.get(candidate.postId)||null,imageCount=Math.max(0,Number(exactStatus?.imageCount)||0),lookupFailed=failedIds.has(candidate.postId)||!exactStatus;
    if(exactStatus&&imageCount>0){
      lastRecapturePlanRows.push({...candidate,planReason:'images-present',imageCount,statusLookupFailed:false});continue;
    }
    targets.push({...candidate,exactStatus,statusLookupFailed:lookupFailed});
    lastRecapturePlanRows.push({...candidate,planReason:lookupFailed?'status-lookup-failed':'recapture-needed',imageCount,statusLookupFailed:lookupFailed});
  }
  const imagesPresent=lastRecapturePlanRows.filter(row=>row.planReason==='images-present').length,statusLookupFailed=lastRecapturePlanRows.filter(row=>row.statusLookupFailed).length;
  lastRecaptureSummary={total:candidates.length,needsRecapture:targets.length,imagesPresent,statusLookupFailed};
  return targets;
}
function readRecaptureSession(){
  try{const row=JSON.parse(localStorage.getItem(SOOP_RECAPTURE_SESSION_KEY)||'null');return row&&Number(row.expiresAt||0)>Date.now()?row:null}catch{return null}
}
function writeRecaptureSession(patch={}){
  const previous=readRecaptureSession()||{};const next={...previous,...patch,active:true,updatedAt:Date.now(),expiresAt:Date.now()+RECAPTURE_SESSION_TTL_MS};
  try{localStorage.setItem(SOOP_RECAPTURE_SESSION_KEY,JSON.stringify(next))}catch{}return next;
}
function clearRecaptureSession(){try{localStorage.removeItem(SOOP_RECAPTURE_SESSION_KEY)}catch{}}
function suppressAutoFlushDuringSequentialRecapture(){
  if(typeof location==='undefined'||!location.hash.includes('collector-auto-flush')||!readRecaptureSession())return false;
  setTimeout(()=>{try{window.close()}catch{}},0);return true;
}
function sendCommand(type,data={}){
  const payload={channel:COLLECTOR_CHANNEL,version:1,commandId:'recapture-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type,...data};
  try{window.postMessage(payload,location.origin)}catch{}
  try{const root=document.documentElement;if(root){root.setAttribute(COMMAND_ATTR,JSON.stringify(payload));document.dispatchEvent(new CustomEvent(COMMAND_EVENT))}}catch{}
  return payload;
}
function sendPing(){const payload={type:'ping'};return sendCommand(payload.type)}
function waitForCollectorState(timeoutMs=2600){
  return new Promise(resolve=>{
    let done=false,timer=null;
    const finish=value=>{if(done)return;done=true;if(timer)clearTimeout(timer);window.removeEventListener('message',onWindow);document.removeEventListener(MESSAGE_EVENT,onPage);resolve(value||null)};
    const onWindow=event=>{if(event.source===window&&event.origin===location.origin&&isStateMessage(event.data||{}))finish(event.data)};
    const onPage=()=>{const data=readPageMessage();if(isStateMessage(data))finish(data)};
    window.addEventListener('message',onWindow);document.addEventListener(MESSAGE_EVENT,onPage);timer=setTimeout(()=>finish(null),timeoutMs);
  });
}
function waitForPostDiagnostic(postId,startedAt=Date.now(),timeoutMs=STEP_TIMEOUT_MS){
  return new Promise(resolve=>{
    let done=false,timer=null;
    const matches=data=>{
      if(!isStateMessage(data))return false;
      const status=data.collectorStatus||{},at=Date.parse(status.lastDiagnosticAt||'')||0;
      return String(status.lastDiagnosticPostId||'')===String(postId)&&at>=startedAt-1000;
    };
    const finish=value=>{if(done)return;done=true;if(timer)clearTimeout(timer);window.removeEventListener('message',onWindow);document.removeEventListener(MESSAGE_EVENT,onPage);resolve(Boolean(value))};
    const onWindow=event=>{if(event.source===window&&event.origin===location.origin&&matches(event.data||{}))finish(true)};
    const onPage=()=>{const data=readPageMessage();if(matches(data))finish(true)};
    window.addEventListener('message',onWindow);document.addEventListener(MESSAGE_EVENT,onPage);timer=setTimeout(()=>finish(false),timeoutMs);
  });
}
async function verifyCollectorConnection(){
  const detected=collectorReadyState();
  if(!detected.ready){setStatus('SOOP 누락 자료 재수집을 시작하지 않았습니다. 자동 수집기가 이 운영자 페이지에 연결되지 않았습니다. 자동 수집기 설치 / 업데이트 후 페이지를 새로고침해 주세요.','bad');return null}
  if(!detected.supported){setStatus('SOOP 누락 자료 재수집을 시작하지 않았습니다. 자동 수집기 v'+(detected.version||'?')+'가 감지됐지만 v'+MIN_COLLECTOR_VERSION+' 이상이 필요합니다. 자동 수집기를 업데이트해 주세요.','bad');return null}
  const pending=waitForCollectorState();sendPing();const state=await pending;
  if(!state){setStatus('자동 수집기는 감지됐지만 확인 응답이 없습니다. 페이지를 새로고침한 뒤 다시 실행해 주세요.','bad');return null}
  const version=String(state.version||detected.version||'');
  if(!versionAtLeast(version,MIN_COLLECTOR_VERSION)){setStatus('자동 수집기 응답 버전이 오래되었습니다. v'+MIN_COLLECTOR_VERSION+' 이상으로 업데이트해 주세요.','bad');return null}
  return{...state,version};
}
async function loadRecaptureTargets(){
  const response=await fetch(ARCHIVE_API,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}),payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||('HTTP '+response.status));return exactRecaptureTargets(payload);
}
async function runSequentialRecapture(button){
  if(recaptureRunning){setStatus('SOOP 누락 자료 재수집이 이미 순차 진행 중입니다.','busy');return}
  recaptureRunning=true;if(button)button.disabled=true;
  let finished=0,timeouts=0,total=0;
  try{
    const connection=await verifyCollectorConnection();if(!connection)return;
    const targets=await loadRecaptureTargets();total=targets.length;
    sendCommand('recapture-plan',{kind:'soop-recapture',urls:lastRecapturePlanRows.map(row=>row.url),planRows:lastRecapturePlanRows.map(({postId,url,planReason,imageCount,statusLookupFailed})=>({postId,url,planReason,imageCount,statusLookupFailed}))});
    if(!total){setStatus('현재 다시 수집할 SOOP 원문이 없습니다. 정확 조회 기준 이미지 복구됨 '+lastRecaptureSummary.imagesPresent+'건입니다.','ok');return}
    if(lastRecaptureSummary.statusLookupFailed)setStatus('정확 상태 조회 실패 '+lastRecaptureSummary.statusLookupFailed+'건은 누락 방지를 위해 재수집 대상으로 유지합니다.','busy');
    writeRecaptureSession({total,completed:0,currentPostId:'',version:connection.version});
    for(let index=0;index<targets.length;index++){
      const {url,postId}=targets[index],startedAt=Date.now();
      writeRecaptureSession({total,completed:index,currentPostId:postId});
      setStatus('SOOP 누락 자료 순차 재수집 중 · '+(index+1)+'/'+total+' · 글 '+postId+' 처리 중','busy');
      const completion=waitForPostDiagnostic(postId,startedAt);
      sendCommand('open-urls',{kind:'soop-recapture-step',urls:[url]});
      const ok=await completion;if(ok)finished+=1;else timeouts+=1;
      writeRecaptureSession({total,completed:index+1,currentPostId:'',timeouts});
      await new Promise(resolve=>setTimeout(resolve,900));
    }
    sendCommand('recapture-finish',{kind:'soop-recapture',total,completed:finished,timeouts});
    setStatus('SOOP 누락 자료 순차 재수집 완료 · '+finished+'/'+total+'건 응답 확인'+(timeouts?' · 시간 초과 '+timeouts+'건':'')+'. 글별 복구 상태를 새로고침해 결과를 확인하세요.','ok');
  }catch(error){
    sendCommand('recapture-finish',{kind:'soop-recapture',total,completed:finished,timeouts,error:String(error?.message||error)});
    setStatus('SOOP 누락 자료 순차 재수집을 완료하지 못했습니다: '+String(error?.message||error),'bad');
  }finally{
    clearRecaptureSession();recaptureRunning=false;if(button)button.disabled=false;
  }
}
function handleRecaptureClick(event){
  const button=event.target?.closest?.('[data-collector-recapture-soop]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();void runSequentialRecapture(button);
}
function boot(){document.addEventListener('click',handleRecaptureClick,true)}
const autoFlushSuppressed=typeof document!=='undefined'&&typeof window!=='undefined'&&suppressAutoFlushDuringSequentialRecapture();
if(typeof document!=='undefined'&&typeof window!=='undefined'&&!autoFlushSuppressed){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
