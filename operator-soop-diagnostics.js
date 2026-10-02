const STORAGE_KEY='chunbong:operator:soop-diagnostic-targets:v1';
const PLAN_STORAGE_KEY='chunbong:operator:soop-recapture-plan:v1';
const API='/api/content?type=operator-content-soop-diagnostics';
const COLLECTOR_CHANNEL='chunbong-content-collector';
const COLLECTOR_COMMAND_ATTR='data-chunbong-collector-command';
const COLLECTOR_COMMAND_EVENT='chunbong-content-collector-page-command';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const handledCommands=new Map();

function cleanIds(values=[]){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'')).filter(value=>/^\d+$/.test(value)))].slice(0,80)}
function postIdFromUrl(raw=''){try{return(new URL(String(raw||''),location.href).pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i)||[])[1]||''}catch{return''}}
function rememberCommand(data={}){
  const id=String(data.commandId||'');if(!id)return false;const now=Date.now(),last=Number(handledCommands.get(id)||0);
  handledCommands.set(id,now);for(const [key,at] of handledCommands)if(now-at>15000)handledCommands.delete(key);return Boolean(last&&now-last<15000);
}
function statusFor(row={}){
  if(Number(row.imageCount||0)>0)return'ok';
  const phase=String(row.phase||'');
  if(phase==='restricted')return'restricted';
  if(phase==='body-empty')return'body-empty';
  if(phase==='capture-error')return'capture-error';
  if(phase==='captured'&&Number(row.acceptedCount||0)>0)return'captured';
  if(phase==='captured')return'no-images';
  return'pending';
}
export function soopDiagnosticViewRows(requestedPostIds=[],diagnosticRows=[]){
  const requested=cleanIds(requestedPostIds),byId=new Map((Array.isArray(diagnosticRows)?diagnosticRows:[]).map(row=>[String(row?.postId||''),row]));
  return requested.map(postId=>{
    const diagnostic=byId.get(postId)||{postId},row={...diagnostic,postId};
    row.imageCount=Math.max(0,Number(row.imageCount)||0);row.candidateCount=Math.max(0,Number(row.candidateCount)||0);row.acceptedCount=Math.max(0,Number(row.acceptedCount)||0);
    row.rejectedByReason=row.rejectedByReason&&typeof row.rejectedByReason==='object'?row.rejectedByReason:{};row.status=statusFor(row);return row;
  });
}
function readRequested(){try{return cleanIds(JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'[]'))}catch{return[]}}
function writeRequested(ids=[]){const next=cleanIds(ids);try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}return next}
function cleanPlan(data={}){
  const reasons=new Set(['image-ready','internal','image-missing','import-missing','lookup-failed']);
  const rows=(Array.isArray(data.rows)?data.rows:[]).map(row=>({postId:String(row?.postId||''),url:String(row?.url||''),reason:String(row?.reason||''),imageCount:Math.max(0,Number(row?.imageCount)||0)})).filter(row=>/^\d+$/.test(row.postId)&&reasons.has(row.reason)).slice(0,160);
  const raw=data.summary&&typeof data.summary==='object'?data.summary:{};
  const summary={recapture:Math.max(0,Number(raw.recapture)||0),imageReady:Math.max(0,Number(raw.imageReady)||0),internal:Math.max(0,Number(raw.internal)||0),lookupFailed:Math.max(0,Number(raw.lookupFailed)||0)};
  return{summary,rows,updatedAt:Date.now()};
}
function readPlan(){try{const row=JSON.parse(sessionStorage.getItem(PLAN_STORAGE_KEY)||'null');return row&&typeof row==='object'?cleanPlan(row):null}catch{return null}}
function writePlan(data={}){const plan=cleanPlan(data);try{sessionStorage.setItem(PLAN_STORAGE_KEY,JSON.stringify(plan))}catch{}return plan}
function ensurePanel(){
  let panel=$('[data-soop-diagnostic-panel]');if(panel)return panel;
  const helper=$('[data-unified-collector] .operator-soop-helper-body');if(!helper)return null;
  panel=document.createElement('section');panel.dataset.soopDiagnosticPanel='';panel.className='operator-soop-import';
  panel.innerHTML='<header><div><small>선택 재수집 진단</small><strong>SOOP 글별 복구 상태</strong></div><button type="button" data-soop-diagnostic-refresh>진단 새로고침</button></header><p data-soop-diagnostic-summary>누락 자료 재수집을 실행하면 글별 수집 결과가 여기에 표시됩니다.</p><div data-soop-diagnostic-list><p class="operator-empty">아직 확인할 대상이 없습니다.</p></div>';
  helper.appendChild(panel);$('[data-soop-diagnostic-refresh]',panel)?.addEventListener('click',()=>void refreshDiagnostics({force:true}));return panel;
}
function reasonText(reasons={}){const labels={not_post_asset:'본문 이미지 경로 아님',decorative:'장식 이미지',duplicate:'중복',invalid_url:'잘못된 URL',non_https:'HTTPS 아님',rendered_small:'너무 작은 이미지',rendered_untrusted:'허용되지 않은 미디어'};return Object.entries(reasons||{}).filter(([,value])=>Number(value)>0).map(([key,value])=>(labels[key]||key)+' '+Number(value)+'건').join(' · ')}
function statusLabel(status=''){return({ok:'이미지 복구됨',captured:'이미지 후보 수집됨','no-images':'이미지 0장',restricted:'접근 제한','body-empty':'본문 확인 실패','capture-error':'수집 오류',pending:'재수집 결과 대기',internal:'내부 자료 제외'}[status]||'확인 필요')}
function plannedMeta(row={}){
  if(row.reason==='image-ready')return'정확 상태 조회 · 저장 이미지 '+Number(row.imageCount||0)+'장 · 재수집 제외';
  if(row.reason==='internal')return'내부 자료 · 자동 공개 재수집 제외';
  if(row.reason==='lookup-failed')return'정확 상태 조회 실패 · 누락 방지를 위해 재수집 포함';
  if(row.reason==='image-missing')return'정확 상태 조회 · 이미지 0장 · 재수집 포함';
  if(row.reason==='import-missing')return'정확 상태 조회 · 브라우저 수집본 없음 · 재수집 포함';
  return'';
}
export function renderSoopDiagnostics(rows=[]){
  const panel=ensurePanel();if(!panel)return;
  const list=$('[data-soop-diagnostic-list]',panel),summary=$('[data-soop-diagnostic-summary]',panel),safe=Array.isArray(rows)?rows:[],plan=readPlan();
  const planById=new Map((plan?.rows||[]).map(row=>[row.postId,row]));
  const merged=safe.map(row=>({...planById.get(String(row.postId))||{},...row}));
  const present=new Set(merged.map(row=>String(row.postId)));
  for(const row of plan?.rows||[]){if(present.has(row.postId)||!['image-ready','internal'].includes(row.reason))continue;merged.push({...row,status:row.reason==='internal'?'internal':'ok',plannedOnly:true})}
  if(!merged.length){if(summary)summary.textContent='누락 자료 재수집을 실행하면 글별 수집 결과가 여기에 표시됩니다.';if(list)list.innerHTML='<p class="operator-empty">아직 확인할 대상이 없습니다.</p>';return}
  if(summary&&plan){const s=plan.summary;summary.textContent='재수집 필요 '+s.recapture+'건 · 이미지 이미 있음 '+s.imageReady+'건 · 내부 자료 제외 '+s.internal+'건'+(s.lookupFailed?' · 상태 조회 실패 '+s.lookupFailed+'건':'')}
  else if(summary){const ok=merged.filter(row=>row.status==='ok').length,pending=merged.filter(row=>row.status==='pending'||row.status==='captured').length,issues=merged.length-ok-pending;summary.textContent='대상 '+merged.length+'건 · 이미지 복구 '+ok+'건 · 확인 필요 '+issues+'건 · 결과 대기 '+pending+'건'}
  if(list)list.innerHTML=merged.map(row=>{
    const planned=plannedMeta(row),reason=reasonText(row.rejectedByReason),meta=row.plannedOnly?planned:['후보 '+Number(row.candidateCount||0)+'개','채택 '+Number(row.acceptedCount||0)+'개','저장 이미지 '+Number(row.imageCount||0)+'장',planned,reason].filter(Boolean).join(' · ');
    const when=row.capturedAt?new Date(row.capturedAt).toLocaleString('ko-KR'):'';
    return '<article class="operator-collector-inbox-item" data-state="'+esc(row.status)+'"><div><small>SOOP '+esc(row.postId)+'</small><strong>'+esc(statusLabel(row.status))+'</strong><p>'+esc(meta)+'</p>'+(when?'<time>'+esc(when)+'</time>':'')+'</div><a href="https://www.sooplive.com/station/chunbongtv/post/'+esc(row.postId)+'" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a></article>';
  }).join('');
}
let lastRows=[],loading=false,planRefreshTimer=null;
async function refreshDiagnostics({force=false}={}){
  const requested=readRequested();if(!requested.length){lastRows=[];renderSoopDiagnostics([]);return[]}
  if(loading&&!force)return lastRows;loading=true;
  try{
    const response=await fetch(API,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}),payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||('HTTP '+response.status));
    lastRows=soopDiagnosticViewRows(requested,Array.isArray(payload.rows)?payload.rows:[]);renderSoopDiagnostics(lastRows);return lastRows;
  }catch(error){
    lastRows=soopDiagnosticViewRows(requested,[]);renderSoopDiagnostics(lastRows);const summary=$('[data-soop-diagnostic-summary]');if(summary)summary.textContent='진단을 불러오지 못했습니다: '+String(error?.message||error);return lastRows;
  }finally{loading=false}
}
function recaptureIds(data={}){
  if(data?.channel!==COLLECTOR_CHANNEL)return[];
  if(data?.type==='recapture-plan'&&data?.kind==='soop-recapture')return cleanIds((Array.isArray(data.urls)?data.urls:[]).map(postIdFromUrl));
  if(data?.type==='open-urls'&&data?.kind==='soop-recapture')return cleanIds((Array.isArray(data.urls)?data.urls:[]).map(postIdFromUrl));
  return[];
}
function handleCollectorCommand(data={}){
  if(data?.channel!==COLLECTOR_CHANNEL||rememberCommand(data))return;
  if(data.type==='recapture-finish'&&data.kind==='soop-recapture'){
    if(planRefreshTimer){clearTimeout(planRefreshTimer);planRefreshTimer=null}
    void refreshDiagnostics({force:true});setTimeout(()=>void refreshDiagnostics({force:true}),2500);return;
  }
  const ids=recaptureIds(data);
  if(data.type==='recapture-plan'&&data.kind==='soop-recapture'){
    writePlan({summary:data.summary,rows:data.rows});const requested=writeRequested(ids);lastRows=soopDiagnosticViewRows(requested,lastRows);renderSoopDiagnostics(lastRows);
    if(planRefreshTimer)clearTimeout(planRefreshTimer);
    if(ids.length)planRefreshTimer=setTimeout(()=>{planRefreshTimer=null;void refreshDiagnostics({force:true})},6000);
    return;
  }
  if(!ids.length)return;
  const requested=writeRequested([...readRequested(),...ids]);lastRows=soopDiagnosticViewRows(requested,lastRows);renderSoopDiagnostics(lastRows);
  setTimeout(()=>void refreshDiagnostics({force:true}),5000);setTimeout(()=>void refreshDiagnostics({force:true}),22000);
}
function contentsVisible(){const panel=$('[data-operator-panel="contents"]');return Boolean(panel&&!panel.hidden)}
function boot(){
  ensurePanel();renderSoopDiagnostics(soopDiagnosticViewRows(readRequested(),[]));
  window.addEventListener('message',event=>{if(event.source===window&&event.origin===location.origin)handleCollectorCommand(event.data||{})});
  document.addEventListener(COLLECTOR_COMMAND_EVENT,()=>{try{handleCollectorCommand(JSON.parse(document.documentElement?.getAttribute(COLLECTOR_COMMAND_ATTR)||'{}'))}catch{}});
  document.addEventListener('click',event=>{const tab=event.target.closest?.('[data-operator-tab="contents"],[data-operator-quick-tab="contents"]');if(tab)setTimeout(()=>void refreshDiagnostics(),0)},true);
  if(contentsVisible())setTimeout(()=>void refreshDiagnostics(),450);
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
