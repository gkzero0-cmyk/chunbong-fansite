const STORAGE_KEY='chunbong:operator:soop-diagnostic-targets:v1';
const API='/api/content?type=operator-content-soop-diagnostics';
const COLLECTOR_CHANNEL='chunbong-content-collector';
const COLLECTOR_COMMAND_ATTR='data-chunbong-collector-command';
const COLLECTOR_COMMAND_EVENT='chunbong-content-collector-page-command';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function cleanIds(values=[]){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'')).filter(value=>/^\d+$/.test(value)))].slice(0,40)}
function postIdFromUrl(raw=''){try{return(new URL(String(raw||''),location.href).pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i)||[])[1]||''}catch{return''}}
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
function ensurePanel(){
  let panel=$('[data-soop-diagnostic-panel]');if(panel)return panel;
  const helper=$('[data-unified-collector] .operator-soop-helper-body');if(!helper)return null;
  panel=document.createElement('section');panel.dataset.soopDiagnosticPanel='';panel.className='operator-soop-import';
  panel.innerHTML='<header><div><small>선택 재수집 진단</small><strong>SOOP 글별 복구 상태</strong></div><button type="button" data-soop-diagnostic-refresh>진단 새로고침</button></header><p data-soop-diagnostic-summary>누락 자료 재수집을 실행하면 글별 수집 결과가 여기에 표시됩니다.</p><div data-soop-diagnostic-list><p class="operator-empty">아직 확인할 대상이 없습니다.</p></div>';
  helper.appendChild(panel);$('[data-soop-diagnostic-refresh]',panel)?.addEventListener('click',()=>void refreshDiagnostics({force:true}));return panel;
}
function reasonText(reasons={}){const labels={not_post_asset:'본문 이미지 경로 아님',decorative:'장식 이미지',duplicate:'중복',invalid_url:'잘못된 URL',non_https:'HTTPS 아님',rendered_small:'너무 작은 이미지',rendered_untrusted:'허용되지 않은 미디어'};return Object.entries(reasons||{}).filter(([,value])=>Number(value)>0).map(([key,value])=>(labels[key]||key)+' '+Number(value)+'건').join(' · ')}
function statusLabel(status=''){return({ok:'이미지 복구됨',captured:'이미지 후보 수집됨','no-images':'이미지 0장',restricted:'접근 제한','body-empty':'본문 확인 실패','capture-error':'수집 오류',pending:'재수집 결과 대기'}[status]||'확인 필요')}
export function renderSoopDiagnostics(rows=[]){
  const panel=ensurePanel();if(!panel)return;
  const list=$('[data-soop-diagnostic-list]',panel),summary=$('[data-soop-diagnostic-summary]',panel),safe=Array.isArray(rows)?rows:[];
  if(!safe.length){if(summary)summary.textContent='누락 자료 재수집을 실행하면 글별 수집 결과가 여기에 표시됩니다.';if(list)list.innerHTML='<p class="operator-empty">아직 확인할 대상이 없습니다.</p>';return}
  const ok=safe.filter(row=>row.status==='ok').length,pending=safe.filter(row=>row.status==='pending'||row.status==='captured').length,issues=safe.length-ok-pending;
  if(summary)summary.textContent='대상 '+safe.length+'건 · 이미지 복구 '+ok+'건 · 확인 필요 '+issues+'건 · 결과 대기 '+pending+'건';
  if(list)list.innerHTML=safe.map(row=>{
    const reason=reasonText(row.rejectedByReason),meta=['후보 '+Number(row.candidateCount||0)+'개','채택 '+Number(row.acceptedCount||0)+'개','저장 이미지 '+Number(row.imageCount||0)+'장',reason].filter(Boolean).join(' · ');
    const when=row.capturedAt?new Date(row.capturedAt).toLocaleString('ko-KR'):'';
    return '<article class="operator-collector-inbox-item" data-state="'+esc(row.status)+'"><div><small>SOOP '+esc(row.postId)+'</small><strong>'+esc(statusLabel(row.status))+'</strong><p>'+esc(meta)+'</p>'+(when?'<time>'+esc(when)+'</time>':'')+'</div><a href="https://www.sooplive.com/station/chunbongtv/post/'+esc(row.postId)+'" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a></article>';
  }).join('');
}
let lastRows=[],loading=false;
async function refreshDiagnostics({force=false}={}){
  const requested=readRequested();if(!requested.length){renderSoopDiagnostics([]);return[]}
  if(loading&&!force)return lastRows;loading=true;
  try{
    const response=await fetch(API,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}),payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||('HTTP '+response.status));
    lastRows=soopDiagnosticViewRows(requested,Array.isArray(payload.rows)?payload.rows:[]);renderSoopDiagnostics(lastRows);return lastRows;
  }catch(error){
    lastRows=soopDiagnosticViewRows(requested,[]);renderSoopDiagnostics(lastRows);const summary=$('[data-soop-diagnostic-summary]');if(summary)summary.textContent='진단을 불러오지 못했습니다: '+String(error?.message||error);return lastRows;
  }finally{loading=false}
}
function recaptureIds(data={}){if(data?.channel!==COLLECTOR_CHANNEL||data?.type!=='open-urls'||data?.kind!=='soop-recapture')return[];return cleanIds((Array.isArray(data.urls)?data.urls:[]).map(postIdFromUrl))}
function handleCollectorCommand(data={}){
  const ids=recaptureIds(data);if(!ids.length)return;
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
