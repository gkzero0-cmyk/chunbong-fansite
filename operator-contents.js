const API='/api/content?type=';
let root=null,items=[],selected=null,booted=false,autoSyncMeta=null,autoCandidates=[],browserImports=[],browserImport=null,namuBrowserImport=null,collectorState={connected:false,queueCount:0,seenCount:0,version:'',soopHistoryCount:0,soopBackfill:{}},collectorImportChain=Promise.resolve();
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug=v=>String(v||'').toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-|-$/g,'');
const emptyItem=()=>({id:'',title:'',aliases:[],category:'minecraft',role:'주최',status:'ended',startDate:'',endDate:'',datePrecision:'unknown',summary:'',description:'',heroImage:{src:'',alt:'',sourceId:''},participants:[],results:[],timeline:[],media:[],gallery:[],sources:[],verification:{state:'needs_review',verifiedAt:'',conflicts:[]},published:false});
const errorLabel={published_source_required:'공개하려면 공식 또는 확인 가능한 출처가 1개 이상 필요합니다.',published_source_url_required:'공개 출처에는 원문 URL이 필요합니다.',unresolved_conflict:'확인되지 않은 정보 충돌이 남아 있어 공개할 수 없습니다.',duplicate_material_url:'같은 원문 URL이 두 번 등록되어 있습니다.',duplicate_source_id:'같은 출처 ID가 두 번 등록되어 있습니다.',unknown_source_id:'자료가 존재하지 않는 출처 ID를 참조하고 있습니다.',invalid_start_date:'시작 날짜 형식 또는 실제 날짜를 확인해 주세요.',invalid_end_date:'종료 날짜 형식 또는 실제 날짜를 확인해 주세요.',end_before_start:'종료일은 시작일보다 빠를 수 없습니다.',invalid_material_date:'타임라인·영상 자료의 날짜 형식 또는 실제 날짜를 확인해 주세요.',id_required:'콘텐츠 ID가 필요합니다.',title_required:'콘텐츠 제목이 필요합니다.'};
async function json(type,options={}){const r=await fetch(API+type,{headers:{accept:'application/json',...(options.headers||{})},...options});let p={};try{p=await r.json()}catch{}if(!r.ok)throw new Error(p.error||'request_failed');return p}
function statusText(item){if(item.published)return'공개';if(item.verification?.state==='needs_review'||item.verification?.conflicts?.length)return'확인 필요';return'초안'}
function setMessage(text,type=''){const el=$('[data-archive-admin-message]',root);if(!el)return;el.textContent=text||'';el.dataset.state=type}
function renderList(){
  const list=$('[data-archive-admin-list]',root),q=String($('[data-archive-admin-search]',root)?.value||'').toLowerCase(),quality=$('[data-archive-admin-quality]',root)?.value||'all';
  const rows=items.filter(i=>{const issues=archiveAudit(i).length;if(quality==='issues'&&!issues)return false;if(quality==='complete'&&issues)return false;return !q||[i.title,i.id,...(i.aliases||[])].join(' ').toLowerCase().includes(q)});
  list.innerHTML=rows.length?rows.map(i=>{
    const issues=archiveAudit(i).length,issueText=issues?'보강 '+issues+'건':'주요 누락 없음';
    return '<button type="button" class="operator-archive-list-item '+(selected?.id===i.id?'active':'')+'" data-archive-select="'+esc(i.id)+'"><span><strong>'+esc(i.title||i.id)+'</strong><small>'+esc(i.id)+' · '+esc(i.category||'기타')+' · '+esc(issueText)+'</small></span><b data-state="'+esc(statusText(i))+'">'+esc(statusText(i))+'</b></button>';
  }).join(''):'<p class="operator-empty">조건에 맞는 콘텐츠가 없습니다.</p>';
  
}
function field(label,name,value='',type='text',extra=''){return `<label class="operator-archive-field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`}
function selectField(label,name,value,options){return `<label class="operator-archive-field"><span>${label}</span><select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select></label>`}
function rowControls(){return `<div class="operator-archive-row-controls"><button type="button" data-move-row="up" aria-label="위로 이동">↑</button><button type="button" data-move-row="down" aria-label="아래로 이동">↓</button><button type="button" data-remove-row aria-label="항목 삭제">삭제</button></div>`}
function sourceRow(row={},index=0){return `<div class="operator-archive-repeater-row" data-source-row>${field('ID','source-id',row.id||`source-${index+1}`)}${field('출처 이름','source-label',row.label||'')}${selectField('종류','source-kind',row.kind||'official',[['official','공식'],['platform','플랫폼'],['relation','관계자'],['article','기사'],['reference','참고']])}${selectField('공개 범위','source-visibility',row.visibility||'public',[['public','팬사이트에 표시'],['internal','내부 검증용 · 숨김']])}${field('원문 URL','source-url',row.url||'','url')}<div class="operator-source-meta-actions"><button type="button" data-source-fetch-meta>메타 가져오기</button><small data-source-meta-status></small></div>${rowControls()}</div>`}
function isGenericMaterialTitle(value=''){return /\b\d{8,}\b/.test(String(value||''))||/관련 youtube 영상 \d|다시보기 \d{2}|공식 게시글(?: ·)? \d+$/i.test(String(value||''))}
function materialRow(row={},kind='timeline',index=0){const types=kind==='media'?[['vod','다시보기'],['catch','Catch'],['clip','클립'],['youtube','YouTube'],['shorts','Shorts']]:[['notice','공지'],['post','게시글'],['article','기사'],['result','결과'],['reference','참고 자료']];return `<div class="operator-archive-repeater-row operator-archive-material-row" data-${kind}-row>${field('ID',`${kind}-id`,row.id||`${kind}-${index+1}`)}${selectField('유형',`${kind}-type`,row.type||types[0][0],types)}${field('제목',`${kind}-title`,row.title||'')}${field('날짜',`${kind}-date`,row.date||'')}${selectField('날짜 정확도',`${kind}-precision`,row.datePrecision||'unknown',[['day','일'],['month','월'],['year','연도'],['unknown','확인 중']])}${field('원문 URL',`${kind}-url`,row.url||'','url')}${field('썸네일',`${kind}-thumbnail`,row.thumbnail||'','url')}${field('출처 ID',`${kind}-source`,row.sourceId||'')}${selectField('공개 범위',`${kind}-visibility`,row.visibility||'public',[['public','팬사이트에 표시'],['internal','내부 검증용 · 숨김']])}${field('메모',`${kind}-note`,row.note||'')}<div class="operator-source-meta-actions"><button type="button" data-material-fetch-meta>원문 메타 가져오기</button><small data-material-meta-status></small></div>${rowControls()}</div>`}
function galleryRow(row={},index=0){return `<div class="operator-archive-repeater-row" data-gallery-row>${field('ID','gallery-id',row.id||`image-${index+1}`)}${field('이미지 URL / /assets 경로','gallery-src',row.src||row.url||'')}${field('대체 텍스트','gallery-alt',row.alt||'')}${field('설명','gallery-caption',row.caption||'')}${field('출처 ID','gallery-source',row.sourceId||'')}${rowControls()}</div>`}
function resultRow(row={},index=0){return `<div class="operator-archive-repeater-row operator-archive-result-row" data-result-row>${field('제목','result-title',row.title||row.label||`기록 ${index+1}`)}${field('내용','result-value',row.value||row.name||'')}${rowControls()}</div>`}
export function archiveAudit(item){
  const issues=[];
  const sources=Array.isArray(item.sources)?item.sources:[];
  const participants=Array.isArray(item.participants)?item.participants:[];
  const participantGroupCount=(Array.isArray(item.participantGroups)?item.participantGroups:[]).reduce((sum,row)=>sum+(Array.isArray(row.participants)?row.participants.length:Number(row.count)||0),0);
  const urls=sources.map(row=>String(row.url||'').toLowerCase());
  const labels=sources.map(row=>String(row.label||'').toLowerCase());
  const knownParticipantCount=participants.length+participantGroupCount;
  const hasBngtsParticipantReference=urls.some(url=>url.includes('bngts.com')&&url.includes('/streamers'));
  const hasFmParticipantReference=sources.some((row,index)=>urls[index].includes('fmkorea.com')&&(labels[index].includes('참가자')||labels[index].includes('참여자')));
  const hasParticipantReference=hasBngtsParticipantReference||hasFmParticipantReference||labels.some(label=>label.includes('참가자')||label.includes('참여자'));
  if(hasBngtsParticipantReference&&knownParticipantCount===0)issues.push(['방통실 참가자 명단 미수집','방통실 참가 스트리머 원문이 연결돼 있지만 구조화된 참가자 명단이 아직 없습니다.']);
  else if(hasFmParticipantReference&&participantGroupCount===0&&participants.length<2)issues.push(['FM코리아 참가자 명단 미수집',`FM코리아 참가자 참고 자료가 연결돼 있지만 현재 확인된 참가자는 ${participants.length}명뿐입니다.`]);
  else if(hasParticipantReference&&knownParticipantCount===0)issues.push(['참가자 미수집','참가자 명단용 참고 자료가 있지만 참가자 데이터가 0명입니다.']);
  const hasNotion=urls.some(url=>url.includes('notion.'));
  const structuredText=[item.description||'',...(item.results||[]).flatMap(row=>[row.title||row.label||'',row.value||row.name||'']),...(item.timeline||[]).flatMap(row=>[row.title||'',row.note||''])].join(' ');
  const hasRuleStructure=/(규칙|참가 조건|신청 조건|제한|금지|허용)/.test(structuredText);
  const hasSystemStructure=/(시스템|경제|재화|진행 방식|게임 방식|승리 조건|정산|랭킹|상점|강화)/.test(structuredText);
  if(hasNotion&&!(hasRuleStructure&&hasSystemStructure))issues.push(['Notion 본문 미구조화','Notion 자료가 연결돼 있지만 규칙과 핵심 시스템이 모두 구조화되었는지 확인해야 합니다.']);
  const soopPosts=(item.timeline||[]).filter(row=>/sooplive\.com\/station\//i.test(String(row.url||''))&&(!String(row.date||'').trim()||isGenericMaterialTitle(row.title)));
  if(soopPosts.length)issues.push(['SOOP 게시글 메타데이터 확인',`${soopPosts.length}개 게시글의 실제 제목·게시일 확인이 남아 있습니다.`]);
  const incompleteMedia=(item.media||[]).filter(row=>{
    const thumbnail=String(row.thumbnail||'');
    return isGenericMaterialTitle(row.title)||!String(row.date||'').trim()||!thumbnail||thumbnail.includes('/assets/chunbong-contents/')||/\.svg(?:\?|$)/i.test(thumbnail);
  });
  if(incompleteMedia.length)issues.push(['미디어 메타데이터 확인',`${incompleteMedia.length}개 영상의 실제 제목·날짜·원본 썸네일 확인이 남아 있습니다.`]);
  const syntheticMedia=(item.media||[]).filter(row=>String(row.thumbnail||'').includes('/assets/chunbong-contents/')||/\.svg(?:\?|$)/i.test(String(row.thumbnail||'')));
  if(syntheticMedia.length)issues.push(['실제 영상 썸네일 확인',`${syntheticMedia.length}개 영상이 자체 제작/임시 썸네일을 사용 중입니다.`]);
  const hasExternalVisual=(item.gallery||[]).some(row=>/^https:\/\//i.test(String(row.src||'')))||(item.media||[]).some(row=>/^https:\/\//i.test(String(row.thumbnail||'')));
  const hasOfficialPost=urls.some(url=>url.includes('sooplive.com/station/'));
  const genericHero=!item.heroImage?.src||String(item.heroImage.src).includes('/assets/chunbong-contents/')||/\.svg(?:\?|$)/i.test(String(item.heroImage?.src||''));
  if((hasOfficialPost||hasExternalVisual)&&genericHero)issues.push(['실제 대표 이미지 확인','실제 포스터·첨부 이미지·영상 썸네일이 있는데 임시 커버를 사용 중입니다.']);
  return issues;
}
function auditBlock(item){const issues=archiveAudit(item);return `<section class="operator-archive-audit ${issues.length?'has-issues':'is-complete'}"><div><strong>자료 반영 상태</strong><span>${issues.length?`${issues.length}건 확인 필요`:'주요 누락 없음'}</span></div>${issues.length?`<ul>${issues.map(([title,detail])=>`<li><b>${esc(title)}</b><small>${esc(detail)}</small></li>`).join('')}</ul>`:'<p>등록된 참고자료와 현재 구조화 데이터를 기준으로 주요 누락이 없습니다.</p>'}</section>`}
function archiveHealthSnapshot(itemRows=[],candidates=[],sync=null){
  const rows=(Array.isArray(itemRows)?itemRows:[]).map(item=>{
    const issues=archiveAudit(item),visualIssues=issues.filter(([title])=>/(이미지|썸네일)/.test(String(title||'')));
    return{id:item.id||'',title:item.title||item.id||'이름 없음',issueCount:issues.length,visualIssueCount:visualIssues.length,issues};
  });
  const needs=rows.filter(row=>row.issueCount>0),visual=rows.filter(row=>row.visualIssueCount>0);
  const failed=sync?.status==='failed';
  const lastSuccessAt=sync?.lastSuccessAt||sync?.completedAt||'';
  return{
    total:rows.length,
    issueItemCount:needs.length,
    totalIssues:needs.reduce((sum,row)=>sum+row.issueCount,0),
    visualIssueItemCount:visual.length,
    visualIssueCount:visual.reduce((sum,row)=>sum+row.visualIssueCount,0),
    candidateCount:Array.isArray(candidates)?candidates.length:0,
    syncFailed:failed,
    syncStatus:failed?'failed':sync?'ok':'unknown',
    lastSuccessAt,
    syncError:failed?String(sync?.error||'동기화 실패'): '',
    topIssues:needs.slice().sort((a,b)=>b.issueCount-a.issueCount||a.title.localeCompare(b.title)).slice(0,5).map(row=>({id:row.id,title:row.title,issueCount:row.issueCount,visualIssueCount:row.visualIssueCount}))
  };
}
function renderArchiveHealth(health){
  if(!root||!health)return;
  const total=$('#archive-health-total',root),issues=$('#archive-health-issues',root),issuesMeta=$('#archive-health-issues-meta',root),visual=$('#archive-health-visual',root),visualMeta=$('#archive-health-visual-meta',root),candidates=$('#archive-health-candidates',root),syncMeta=$('#archive-health-sync-meta',root);
  if(total)total.textContent=String(health.total);
  if(issues){issues.textContent=String(health.issueItemCount);issues.className=health.issueItemCount?'is-warn':'is-ok'}
  if(issuesMeta)issuesMeta.textContent=health.issueItemCount?health.totalIssues+'건의 보강 항목':'주요 누락 없음';
  if(visual){visual.textContent=String(health.visualIssueItemCount);visual.className=health.visualIssueItemCount?'is-warn':'is-ok'}
  if(visualMeta)visualMeta.textContent=health.visualIssueItemCount?health.visualIssueCount+'건 확인 필요':'대표 이미지·썸네일 정상';
  if(candidates){candidates.textContent=String(health.candidateCount);candidates.className=health.syncFailed?'is-bad':health.candidateCount?'is-warn':'is-ok'}
  if(syncMeta)syncMeta.textContent=health.syncFailed?'자동수집 실패 · '+health.syncError:health.syncStatus==='ok'?'자동수집 정상 · 후보 '+health.candidateCount+'건':'동기화 기록 없음';
}
function publishArchiveHealth(health){
  renderArchiveHealth(health);
  document.dispatchEvent(new CustomEvent('chunbong:operator-archive-health',{detail:health}));
}
export async function fetchOperatorContentHealth(){
  const payload=await json('operator-content-archive');
  return archiveHealthSnapshot(Array.isArray(payload.items)?payload.items:[],Array.isArray(payload.candidates)?payload.candidates:[],payload.autoSync||null);
}
const IMAGE_AUDIT_LIMIT=80,IMAGE_AUDIT_LARGE_BYTES=1536*1024,IMAGE_AUDIT_SLOW_MS=2500;
function collectArchiveImages(itemRows=items){
  const map=new Map();
  const add=(item,kind,src)=>{
    const raw=String(src||'').trim();if(!raw||/^(?:data:|blob:|javascript:)/i.test(raw))return;
    let href='';try{href=new URL(raw,location.origin).href}catch{return}
    const existing=map.get(href)||{url:href,uses:[]};
    existing.uses.push({itemId:item.id||'',title:item.title||item.id||'이름 없음',kind});
    map.set(href,existing);
  };
  for(const item of Array.isArray(itemRows)?itemRows:[]){
    add(item,'대표 이미지',item.heroImage?.src);
    for(const row of Array.isArray(item.gallery)?item.gallery:[])add(item,'갤러리',row.src||row.url);
    for(const row of Array.isArray(item.media)?item.media:[])add(item,'영상 썸네일',row.thumbnail);
    for(const section of Array.isArray(item.notionSections)?item.notionSections:[]){
      for(const image of Array.isArray(section.images)?section.images:[])add(item,'Notion 원문',image?.src);
      for(const block of Array.isArray(section.content)?section.content:[])if(block?.type==='image')add(item,'Notion 원문',block.image?.src);
    }
    for(const section of Array.isArray(item.referenceSections)?item.referenceSections:[]){
      for(const image of Array.isArray(section.images)?section.images:[])add(item,'나무위키 원문',image?.src);
      for(const block of Array.isArray(section.content)?section.content:[])if(block?.type==='image')add(item,'나무위키 원문',block.image?.src);
    }
    for(const section of Array.isArray(item.knowledgeSections)?item.knowledgeSections:[])for(const image of Array.isArray(section.images)?section.images:[])add(item,'지식 가이드',image?.src);
  }
  return [...map.values()];
}
function imageLoad(url,timeoutMs=8000){
  return new Promise(resolve=>{
    const image=new Image(),started=performance.now();let done=false;
    const finish=(ok,reason='')=>{if(done)return;done=true;clearTimeout(timer);resolve({ok,reason,width:Number(image.naturalWidth)||0,height:Number(image.naturalHeight)||0,ms:Math.max(0,Math.round(performance.now()-started))})};
    const timer=setTimeout(()=>finish(false,'시간 초과'),timeoutMs);
    image.onload=()=>finish(true);image.onerror=()=>finish(false,'불러오기 실패');image.decoding='async';image.src=url;
  });
}
async function probeArchiveImage(target){
  const loaded=await imageLoad(target.url);
  let size=0,type='',headOk=null;
  try{
    const parsed=new URL(target.url);
    if(parsed.origin===location.origin){
      const response=await fetch(parsed.href,{method:'HEAD',cache:'no-store'});
      headOk=response.ok;type=response.headers.get('content-type')||'';size=Number(response.headers.get('content-length'))||0;
    }
  }catch{}
  const isVector=/\.svg(?:\?|$)/i.test(target.url)||/svg/i.test(type);
  const hero=target.uses.some(use=>use.kind==='대표 이미지');
  const lowResolution=Boolean(loaded.ok&&hero&&!isVector&&loaded.width&&loaded.height&&(loaded.width<800||loaded.height<450));
  const large=Boolean(size>=IMAGE_AUDIT_LARGE_BYTES),slow=Boolean(loaded.ok&&loaded.ms>=IMAGE_AUDIT_SLOW_MS);
  const reasons=[];
  if(!loaded.ok||headOk===false)reasons.push(!loaded.ok?loaded.reason:'로컬 파일 응답 오류');
  if(large)reasons.push('대용량 '+Math.round(size/1024)+'KB');
  if(slow)reasons.push('느린 표시 '+loaded.ms+'ms');
  if(lowResolution)reasons.push('대표 이미지 해상도 '+loaded.width+'×'+loaded.height);
  return{...target,...loaded,size,type,large,slow,lowResolution,issue:reasons.length>0,reasons};
}
async function mapImageAudit(rows,limit=6){
  const out=new Array(rows.length);let cursor=0;
  const worker=async()=>{while(true){const index=cursor++;if(index>=rows.length)return;out[index]=await probeArchiveImage(rows[index])}};
  await Promise.all(Array.from({length:Math.min(limit,rows.length)},worker));return out;
}
function imageAuditUseLabel(row){
  const first=row.uses?.[0];if(!first)return'이미지';
  return first.title+' · '+first.kind+(row.uses.length>1?' 외 '+(row.uses.length-1)+'곳':'');
}
function renderImageAudit(health){
  const state=$('[data-archive-image-audit-state]',root),results=$('[data-archive-image-audit-results]',root);if(!state||!results)return;
  const problems=Number(health.issueImages)||0;
  state.dataset.state=health.failed?'bad':problems?'warn':'ok';
  state.innerHTML='<strong>'+(health.failed?'검사 실패':problems?'확인 필요 '+problems+'개':'검사 완료 · 정상')+'</strong><span>검사 '+health.scanned+'/'+health.total+'개 · 깨짐 '+health.failedCount+' · 대용량 '+health.large+' · 지연 '+health.slow+' · 대표 이미지 해상도 '+health.lowResolution+(health.skipped?' · 미검사 '+health.skipped:'')+'</span>';
  const rows=Array.isArray(health.issues)?health.issues:[];
  results.innerHTML=rows.length?rows.map(row=>'<article class="operator-image-audit-row" data-state="'+(row.ok?'warn':'bad')+'"><span class="operator-image-audit-thumb">'+(row.ok?'<img src="'+esc(row.url)+'" alt="">':'!')+'</span><div><strong>'+esc(imageAuditUseLabel(row))+'</strong><small>'+esc(row.reasons.join(' · '))+'</small><code>'+esc(row.url.length>120?row.url.slice(0,117)+'…':row.url)+'</code></div><b>'+(row.width&&row.height?row.width+'×'+row.height:'확인 필요')+'</b></article>').join(''):'<div class="operator-image-audit-ok"><span>✓</span><div><strong>검사한 이미지에서 문제를 찾지 못했습니다.</strong><small>실제 로딩, 로컬 파일 크기, 대표 이미지 해상도를 확인했습니다.</small></div></div>';
}
function publishImageAudit(health){
  renderImageAudit(health);
  document.dispatchEvent(new CustomEvent('chunbong:operator-image-health',{detail:health}));
}
async function runImageAudit(){
  const button=$('[data-archive-image-audit]',root),state=$('[data-archive-image-audit-state]',root);if(button)button.disabled=true;
  const all=collectArchiveImages(items),targets=all.slice(0,IMAGE_AUDIT_LIMIT);
  if(state){state.dataset.state='';state.innerHTML='<strong>검사 중…</strong><span>'+targets.length+'개 이미지를 실제로 불러오고 있습니다.</span>'}
  try{
    const rows=await mapImageAudit(targets),issues=rows.filter(row=>row.issue);
    const health={checkedAt:new Date().toISOString(),total:all.length,scanned:rows.length,skipped:Math.max(0,all.length-rows.length),failed:false,failedCount:rows.filter(row=>!row.ok).length,large:rows.filter(row=>row.large).length,slow:rows.filter(row=>row.slow).length,lowResolution:rows.filter(row=>row.lowResolution).length,issueImages:issues.length,issues:issues.sort((a,b)=>(Number(a.ok)-Number(b.ok))||b.size-a.size||b.ms-a.ms).slice(0,30)};
    publishImageAudit(health);
  }catch(error){
    publishImageAudit({checkedAt:new Date().toISOString(),total:all.length,scanned:0,skipped:all.length,failed:true,failedCount:0,large:0,slow:0,lowResolution:0,issueImages:0,issues:[],error:String(error?.message||error)});
  }finally{if(button)button.disabled=false}
}
function conflictBlock(item){const rows=item.verification?.conflicts||[];return `<div class="operator-archive-conflicts ${rows.length?'has-conflict':''}"><div><strong>정보 충돌</strong><span>${rows.length?`${rows.length}건 확인 필요`:'미해결 충돌 없음'}</span></div>${rows.length?`<ul>${rows.map((c,i)=>`<li><span>${esc(c.field||'필드')} · ${esc(c.note||c.reason||'출처 간 값 확인 필요')}</span><button type="button" data-resolve-conflict="${i}">해소</button></li>`).join('')}</ul>`:''}</div>`}
function renderEditor(item){selected=structuredClone(item||emptyItem());const editor=$('[data-archive-admin-editor]',root);editor.innerHTML=`<form data-archive-form><div class="operator-archive-editor-head"><div><small>CONTENT RECORD</small><h2>${esc(selected.title||'새 콘텐츠')}</h2></div><span class="operator-archive-state" data-state="${esc(statusText(selected))}">${esc(statusText(selected))}</span></div><div class="operator-archive-form-grid">${field('콘텐츠 ID','id',selected.id)}${field('제목','title',selected.title)}${selectField('카테고리','category',selected.category,[['minecraft','마인크래프트'],['song','노래대회'],['broadcast','방송 기획'],['class-event','클래스 · 이벤트'],['other','기타']])}${field('춘봉 역할','role',selected.role)}${selectField('상태','status',selected.status,[['planned','예정'],['recruiting','모집'],['ongoing','진행 중'],['ended','종료']])}${selectField('날짜 정확도','datePrecision',selected.datePrecision,[['day','일'],['month','월'],['year','연도'],['unknown','확인 중']])}${field('시작 날짜','startDate',selected.startDate)}${field('종료 날짜','endDate',selected.endDate)}${field('참가자 / 수강생','participants',(selected.participants||[]).join(', '))}${field('별칭','aliases',(selected.aliases||[]).join(', '))}${selectField('검증 상태','verificationState',selected.verification?.state||'needs_review',[['official','공식 자료 확인'],['cross_checked','교차 확인'],['needs_review','확인 필요']])}</div><label class="operator-archive-field operator-archive-wide"><span>한 줄 소개</span><textarea name="summary" rows="2">${esc(selected.summary)}</textarea></label><label class="operator-archive-field operator-archive-wide"><span>상세 소개</span><textarea name="description" rows="5">${esc(selected.description)}</textarea></label><fieldset><legend>대표 이미지</legend><div class="operator-archive-form-grid">${field('이미지 URL / /assets 경로','heroSrc',selected.heroImage?.src||'')}${field('대체 텍스트','heroAlt',selected.heroImage?.alt||'')}${field('출처 ID','heroSourceId',selected.heroImage?.sourceId||'')}</div></fieldset>${conflictBlock(selected)}${auditBlock(selected)}<fieldset><legend>결과 · 회차 기록 <button type="button" data-add-row="result">+ 추가</button></legend><div class="operator-archive-repeater" data-results>${(selected.results||[]).map(resultRow).join('')}</div></fieldset><fieldset><legend>출처 <button type="button" data-add-row="source">+ 추가</button></legend><div class="operator-archive-repeater" data-sources>${(selected.sources||[]).map(sourceRow).join('')}</div></fieldset><fieldset><legend>타임라인 <button type="button" data-add-row="timeline">+ 추가</button></legend><div class="operator-archive-repeater" data-timeline>${(selected.timeline||[]).map((r,i)=>materialRow(r,'timeline',i)).join('')}</div></fieldset><fieldset><legend>영상 <button type="button" data-add-row="media">+ 추가</button></legend><div class="operator-archive-repeater" data-media>${(selected.media||[]).map((r,i)=>materialRow(r,'media',i)).join('')}</div></fieldset><fieldset><legend>이미지 갤러리 <button type="button" data-add-row="gallery">+ 추가</button></legend><div class="operator-archive-repeater" data-gallery>${(selected.gallery||[]).map(galleryRow).join('')}</div></fieldset><section class="operator-archive-preview" data-archive-admin-preview><small>미리보기</small><div></div></section><p class="operator-archive-message" data-archive-admin-message aria-live="polite"></p><div class="operator-archive-actions">${selected.id?`<a class="operator-archive-open-public" href="chunbong-contents.html?id=${encodeURIComponent(selected.id)}" target="_blank" rel="noreferrer">공개 페이지 열기 ↗</a>`:''}<button type="button" data-archive-preview>미리보기 갱신</button><button type="button" data-archive-save>초안 저장</button><button type="button" class="primary" data-archive-publish>공개하기</button><button type="button" class="danger" data-archive-delete ${selected.id?'':'disabled'}>삭제</button></div></form>`;bindEditor();renderPreview()}
function values(selector,prefix){return $$(selector,root).map(row=>{const g=name=>row.querySelector(`[name="${prefix}-${name}"]`)?.value?.trim()||'';return{id:g('id'),type:g('type'),title:g('title'),date:g('date'),datePrecision:g('precision')||'unknown',url:g('url'),thumbnail:g('thumbnail'),sourceId:g('source'),note:g('note'),visibility:g('visibility')==='internal'?'internal':'public'}}).filter(r=>r.title||r.url)}
function sourceValues(){return $$('[data-source-row]',root).map(row=>({id:$('[name="source-id"]',row)?.value.trim()||'',label:$('[name="source-label"]',row)?.value.trim()||'',kind:$('[name="source-kind"]',row)?.value||'official',visibility:$('[name="source-visibility"]',row)?.value==='internal'?'internal':'public',url:$('[name="source-url"]',row)?.value.trim()||''})).filter(r=>r.label||r.url)}
function galleryValues(){return $$('[data-gallery-row]',root).map(row=>({id:$('[name="gallery-id"]',row)?.value.trim()||'',src:$('[name="gallery-src"]',row)?.value.trim()||'',alt:$('[name="gallery-alt"]',row)?.value.trim()||'',caption:$('[name="gallery-caption"]',row)?.value.trim()||'',sourceId:$('[name="gallery-source"]',row)?.value.trim()||''})).filter(r=>r.src)}
function resultValues(){return $$('[data-result-row]',root).map(row=>({title:$('[name="result-title"]',row)?.value.trim()||'',value:$('[name="result-value"]',row)?.value.trim()||''})).filter(r=>r.title||r.value)}
function collect(){const form=$('[data-archive-form]',root),v=n=>form.elements[n]?.value?.trim?.()||form.elements[n]?.value||'';const item=structuredClone(selected||emptyItem());item.id=slug(v('id')||v('title'));item.title=v('title');item.category=v('category');item.role=v('role');item.status=v('status');item.datePrecision=v('datePrecision');item.startDate=v('startDate');item.endDate=v('endDate');item.participants=String(v('participants')).split(',').map(x=>x.trim()).filter(Boolean);item.aliases=String(v('aliases')).split(',').map(x=>x.trim()).filter(Boolean);item.results=resultValues();item.summary=v('summary');item.description=v('description');item.heroImage={src:v('heroSrc'),alt:v('heroAlt'),sourceId:v('heroSourceId')};item.verification={...(item.verification||{}),state:v('verificationState')||'needs_review',conflicts:item.verification?.conflicts||[]};item.sources=sourceValues();item.timeline=values('[data-timeline-row]','timeline');item.media=values('[data-media-row]','media');item.gallery=galleryValues();return item}
async function fetchSourceMetaForRow(row){
  const url=$('[name="source-url"]',row)?.value.trim()||'',status=$('[data-source-meta-status]',row),button=$('[data-source-fetch-meta]',row);
  if(!url){if(status)status.textContent='URL을 먼저 입력하세요.';return}
  if(button)button.disabled=true;if(status)status.textContent='원문 확인 중…';
  try{
    const payload=await json('operator-content-source-meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const meta=payload.meta||{},label=$('[name="source-label"]',row),sourceId=$('[name="source-id"]',row)?.value.trim()||'';
    if(label&&!label.value.trim()&&meta.title)label.value=meta.title;
    if(meta.image){
      const gallery=$('[data-gallery]',root),existing=$$('[data-gallery-row]',root).some(g=>String($('[name="gallery-src"]',g)?.value||'')===meta.image);
      if(gallery&&!existing){
        gallery.insertAdjacentHTML('beforeend',galleryRow({id:(sourceId||'source')+'-visual',src:meta.image,alt:meta.title||'원문 대표 이미지',caption:meta.title||'원문 대표 이미지',sourceId},$$('[data-gallery-row]',root).length));
        bindRowControls();
      }
      const form=$('[data-archive-form]',root);
      if(form&&!String(form.elements.heroSrc?.value||'').trim()){
        form.elements.heroSrc.value=meta.image;
        form.elements.heroAlt.value=meta.title||selected?.title||'콘텐츠 대표 이미지';
        form.elements.heroSourceId.value=sourceId;
      }
    }
    const form=$('[data-archive-form]',root);
    if(Array.isArray(meta.participants)&&meta.participants.length&&form&&!String(form.elements.participants?.value||'').trim()){
      form.elements.participants.value=meta.participants.join(', ');
    }
    if(status){
      const details=[];
      if(meta.participantCount)details.push(`참가자 ${meta.participantCount}명`);
      if(Array.isArray(meta.outline)&&meta.outline.length)details.push(`Notion 구조 ${meta.outline.length}개`);
      if(Array.isArray(meta.sections)&&meta.sections.length)details.push(`Notion 섹션 ${meta.sections.length}개`);
      if(meta.image)details.push('이미지 후보');
      if(!details.length)details.push(meta.title?'제목 확인':'추출 가능한 메타 없음');
      status.textContent=details.join(' · ');
      if(Array.isArray(meta.sections)&&meta.sections.length)status.title=meta.sections.map(section=>section.title).filter(Boolean).join(' · ');else if(Array.isArray(meta.outline)&&meta.outline.length)status.title=meta.outline.join(' · ');
    }
    renderPreview();
  }catch(error){
    if(status){
      const code=String(error?.message||'');
      if(code==='source_meta_human_verification_required')status.textContent='사람 확인(Turnstile)이 필요합니다. 브라우저 확인 또는 수동 등록이 필요합니다.';
      else if(code==='source_meta_auth_required')status.textContent='SOOP 애청자 공개 등 로그인 권한이 필요한 글입니다. 인증된 브라우저에서 확인 후 수동 등록해 주세요.';
      else if(code==='source_meta_client_render_required')status.textContent='JavaScript로 본문을 불러오는 페이지입니다. 전용 API 또는 브라우저 수집이 필요합니다.';
      else if(code==='source_meta_timeout')status.textContent='원문 응답 시간이 길어 수집이 중단됐습니다.';
      else if(code.startsWith('source_meta_notion_'))status.textContent='Notion 공개 데이터 조회에 실패했습니다.';
      else if(code.startsWith('source_meta_fetch_'))status.textContent='원문 서버가 자동 요청을 거부했습니다 ('+code.replace('source_meta_fetch_','HTTP ')+').';
      else status.textContent='메타데이터를 가져오지 못했습니다.';
    }
  }finally{if(button)button.disabled=false}
}
function bindSourceMeta(){$$('[data-source-fetch-meta]',root).forEach(button=>{if(button.dataset.bound)return;button.dataset.bound='1';button.addEventListener('click',()=>void fetchSourceMetaForRow(button.closest('[data-source-row]')))})}
async function fetchMaterialMetaForRow(row){
  const kind=row?.hasAttribute('data-media-row')?'media':'timeline';
  const url=$(`[name="${kind}-url"]`,row)?.value.trim()||'',status=$('[data-material-meta-status]',row),button=$('[data-material-fetch-meta]',row);
  if(!url){if(status)status.textContent='URL을 먼저 입력하세요.';return}
  if(button)button.disabled=true;if(status)status.textContent='원문 확인 중…';
  try{
    const payload=await json('operator-content-source-meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const meta=payload.meta||{},title=$(`[name="${kind}-title"]`,row),date=$(`[name="${kind}-date"]`,row),precision=$(`[name="${kind}-precision"]`,row),thumbnail=$(`[name="${kind}-thumbnail"]`,row);
    const applied=[];
    if(title&&meta.title&&(!title.value.trim()||isGenericMaterialTitle(title.value))){title.value=meta.title;applied.push('제목')}
    const sourceDate=meta.publishedDate||meta.date||'';
    if(date&&sourceDate&&!date.value.trim()){date.value=sourceDate;if(precision)precision.value='day';applied.push('날짜')}
    if(thumbnail&&meta.image&&(!thumbnail.value.trim()||thumbnail.value.includes('/assets/chunbong-contents/')||/\.svg(?:\?|$)/i.test(thumbnail.value))){thumbnail.value=meta.image;applied.push('썸네일')}
    if(status)status.textContent=applied.length?`${applied.join('·')} 반영`:'새로 반영할 메타데이터 없음';
    renderPreview();
  }catch(error){
    if(status){
      const code=String(error?.message||'');
      if(code==='source_meta_human_verification_required')status.textContent='사람 확인이 필요한 원문입니다.';
      else if(code==='source_meta_auth_required')status.textContent='로그인 권한이 필요한 원문입니다.';
      else if(code==='source_meta_client_render_required')status.textContent='브라우저 렌더링이 필요한 원문입니다.';
      else if(code==='source_meta_timeout')status.textContent='원문 응답 시간이 길어 수집이 중단됐습니다.';
      else if(code.startsWith('source_meta_fetch_'))status.textContent='원문 서버가 자동 요청을 거부했습니다.';
      else status.textContent='메타데이터를 가져오지 못했습니다.';
    }
  }finally{if(button)button.disabled=false}
}
function bindMaterialMeta(){$$('[data-material-fetch-meta]',root).forEach(button=>{if(button.dataset.bound)return;button.dataset.bound='1';button.addEventListener('click',()=>void fetchMaterialMetaForRow(button.closest('.operator-archive-material-row')))})}
function renderPreview(){const item=collect(),box=$('[data-archive-admin-preview] div',root);box.innerHTML=`<article><div class="operator-archive-preview-image">${item.heroImage?.src?`<img src="${esc(item.heroImage.src)}" alt="${esc(item.heroImage.alt||item.title)}">`:'<span>대표 이미지 없음</span>'}</div><div><small>${esc(item.category)} · ${esc(item.role)}</small><strong>${esc(item.title||'제목 없음')}</strong><p>${esc(item.summary||'소개를 입력하세요.')}</p><em>${esc(item.startDate||'날짜 확인 중')}</em></div></article>`}
function bindRowControls(){$$('[data-remove-row]',root).forEach(b=>b.addEventListener('click',()=>{b.closest('.operator-archive-repeater-row')?.remove();renderPreview()}));$$('[data-move-row]',root).forEach(b=>b.addEventListener('click',()=>{const row=b.closest('.operator-archive-repeater-row'),wrap=row?.parentElement;if(!row||!wrap)return;if(b.dataset.moveRow==='up'&&row.previousElementSibling)wrap.insertBefore(row,row.previousElementSibling);if(b.dataset.moveRow==='down'&&row.nextElementSibling)wrap.insertBefore(row.nextElementSibling,row);renderPreview()}))}
function addRow(kind){const map={result:['[data-results]',resultRow({},$$('[data-result-row]',root).length)],source:['[data-sources]',sourceRow({},$$('[data-source-row]',root).length)],timeline:['[data-timeline]',materialRow({},'timeline',$$('[data-timeline-row]',root).length)],media:['[data-media]',materialRow({},'media',$$('[data-media-row]',root).length)],gallery:['[data-gallery]',galleryRow({},$$('[data-gallery-row]',root).length)]};const [sel,html]=map[kind]||[];$(sel,root)?.insertAdjacentHTML('beforeend',html);bindRowControls();bindSourceMeta();bindMaterialMeta()}
async function persist(type){const item=collect();setMessage(type.includes('publish')?'공개 검증 중…':'초안 저장 중…');try{const p=await json(type,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});selected=p.item;setMessage(type.includes('publish')?'공개되었습니다.':'초안으로 저장했습니다.','ok');await load();selectItem(selected.id)}catch(e){setMessage(errorLabel[e.message]||`저장하지 못했습니다: ${e.message}`,'bad')}}
function bindEditor(){const form=$('[data-archive-form]',root);form.addEventListener('input',()=>renderPreview());bindSourceMeta();bindMaterialMeta();$$('[data-add-row]',root).forEach(b=>b.addEventListener('click',()=>addRow(b.dataset.addRow)));bindRowControls();$$('[data-resolve-conflict]',root).forEach(b=>b.addEventListener('click',()=>{selected.verification.conflicts.splice(Number(b.dataset.resolveConflict),1);renderEditor(selected)}));$('[data-archive-preview]',root)?.addEventListener('click',renderPreview);$('[data-archive-save]',root)?.addEventListener('click',()=>persist('operator-content-archive-save'));$('[data-archive-publish]',root)?.addEventListener('click',()=>persist('operator-content-archive-publish'));$('[data-archive-delete]',root)?.addEventListener('click',async()=>{if(!selected?.id||!confirm('이 콘텐츠 기록을 삭제할까요?'))return;try{await json('operator-content-archive-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id})});selected=null;await load();renderEditor(emptyItem())}catch(e){setMessage(errorLabel[e.message]||'삭제하지 못했습니다.','bad')}})}
function selectItem(id){const item=items.find(x=>x.id===id);if(item){renderEditor(item);renderList()}}
function renderAutoSyncState(){
  const el=$('[data-archive-auto-state]',root);if(!el)return;
  const failed=autoSyncMeta?.status==='failed',when=String((failed?autoSyncMeta?.failedAt:autoSyncMeta?.completedAt)||'').slice(0,16).replace('T',' '),lastOk=String(autoSyncMeta?.lastSuccessAt||'').slice(0,16).replace('T',' ');
  const d=autoSyncMeta?.discovered||{},total=['posts','vods','catches','clips','youtube','shorts'].reduce((sum,key)=>sum+Number(d[key]||0),0);
  el.dataset.state=failed?'bad':autoSyncMeta?'ok':'';
  if(!autoSyncMeta){el.innerHTML='<strong>공식 자료 자동 수집</strong><span>아직 동기화 기록이 없습니다.</span><small>SOOP 방송국을 최우선으로 수집합니다.</small>';return}
  if(failed){el.innerHTML='<strong>공식 자료 자동 수집 · 실패</strong><span>실패 '+esc(when||'확인 중')+' · 마지막 성공 '+esc(lastOk||'없음')+' · 검토 후보 '+autoCandidates.length+'건</span><small>'+esc(autoSyncMeta.error||'원인을 확인해 주세요.')+'</small>';return}
  el.innerHTML='<strong>공식 자료 자동 수집 · 정상</strong><span>마지막 성공 '+esc(when||'확인 중')+' · 발견 '+total+'건 · 자동 연결 '+Number(autoSyncMeta.attachedCount||0)+'건 · 검토 후보 '+autoCandidates.length+'건 · '+Number(autoSyncMeta.durationMs||0)+'ms</span><small>우선순위: SOOP 게시글·VOD·Catch·Clip → 춘봉TV YouTube·Shorts</small>';
}
function renderCandidates(){
  const wrap=$('[data-archive-candidate-list]',root),count=$('[data-archive-candidate-count]',root);if(count)count.textContent=autoCandidates.length+'건';if(!wrap)return;
  if(!autoCandidates.length){wrap.innerHTML='<p class="operator-empty">검토 후보가 없습니다.</p>';return}
  const options=items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.title)+'</option>').join('');
  wrap.innerHTML=autoCandidates.slice(0,80).map(row=>{
    const thumb=row.thumbnail?'<img src="'+esc(row.thumbnail)+'" alt="">':'';
    return '<article class="operator-archive-candidate" data-candidate-url="'+esc(row.url)+'"><div class="operator-archive-candidate-main">'+thumb+'<div><small>'+esc(String(row.platform||'official').toUpperCase())+' · '+esc(row.type||'자료')+' · '+esc(row.date||'날짜 확인 중')+'</small><strong>'+esc(row.title||'제목 없음')+'</strong><a href="'+esc(row.url)+'" target="_blank" rel="noreferrer">원문 보기 ↗</a></div></div><label><span>연결할 콘텐츠</span><select data-candidate-target><option value="">선택</option>'+options+'</select></label><div class="operator-archive-candidate-actions"><button type="button" data-candidate-action="connect">기존 콘텐츠에 연결</button><button type="button" data-candidate-action="draft">새 콘텐츠 초안</button><button type="button" data-candidate-action="ignore">관련 없음</button></div></article>';
  }).join('');
  $$('[data-candidate-action]',wrap).forEach(button=>button.addEventListener('click',()=>void processCandidate(button)));
}
async function processCandidate(button){
  const card=button.closest('[data-candidate-url]'),action=button.dataset.candidateAction||'',url=card?.dataset.candidateUrl||'',itemId=$('[data-candidate-target]',card)?.value||'';
  if(action==='connect'&&!itemId){alert('연결할 콘텐츠를 선택해 주세요.');return}
  button.disabled=true;
  try{const p=await json('operator-content-auto-candidate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,url,itemId})});await load();if(action==='draft'&&p.item?.id)selectItem(p.item.id)}
  catch(e){setMessage('후보 처리에 실패했습니다: '+e.message,'bad')}finally{button.disabled=false}
}
function utf8ToBase64(value=''){
  const bytes=new TextEncoder().encode(String(value));let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToUtf8(value=''){
  const binary=atob(String(value));const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const COLLECTOR_CHANNEL='chunbong-content-collector';

function collectorInboxStateLabel(state=''){return({unlinked:'미연결',internal:'내부',public:'공개',ignored:'무시'}[state]||state||'확인 필요')}
function collectorInboxPlatformLabel(row={}){return row.platform==='fmkorea'?'FM코리아':'SOOP'}
function setCollectorInboxMessage(text='',state=''){const el=$('[data-collector-inbox-message]',root);if(!el)return;el.textContent=text||'';el.dataset.state=state||''}
function renderCollectorInbox(){
  const list=$('[data-collector-inbox-list]',root),total=$('[data-collector-inbox-total]',root),pending=$('[data-collector-inbox-pending]',root),internal=$('[data-collector-inbox-internal]',root),published=$('[data-collector-inbox-public]',root);
  if(total)total.textContent=browserImports.length+'건';
  if(pending)pending.textContent=browserImports.filter(row=>row.state==='unlinked').length+'건';
  if(internal)internal.textContent=browserImports.filter(row=>row.state==='internal').length+'건';
  if(published)published.textContent=browserImports.filter(row=>row.state==='public').length+'건';
  if(!list)return;
  const q=String($('[data-collector-inbox-search]',root)?.value||'').toLowerCase().trim(),state=$('[data-collector-inbox-state]',root)?.value||'attention',source=$('[data-collector-inbox-source]',root)?.value||'all';
  const rows=browserImports.filter(row=>{
    if(source!=='all'&&row.platform!==source)return false;
    if(state==='attention'&&!['unlinked','internal'].includes(row.state))return false;
    if(state!=='all'&&state!=='attention'&&row.state!==state)return false;
    if(q&&![row.title,row.linkedItemTitle,row.author,row.board,row.url].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
  const options=items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.title)+'</option>').join('');
  list.innerHTML=rows.length?rows.map(row=>{
    const publicBadge=row.publicEligible?'<span class="operator-collector-access is-public">일반 공개 확인</span>':'<span class="operator-collector-access is-limited">로그인 제한</span>';
    const thumb=row.thumbnail?'<img src="'+esc(row.thumbnail)+'" alt="">':'<span>'+esc(row.platform==='fmkorea'?'FM':'SO')+'</span>';
    const linked=row.linkedItemId?'<b>'+esc(row.linkedItemTitle||row.linkedItemId)+'</b>':'<b>연결된 콘텐츠 없음</b>';
    const meta=[row.date||'',row.author||'',row.board||'',row.imageCount?('이미지 '+row.imageCount+'장'):''].filter(Boolean).join(' · ');
    const disabledPublic=row.publicEligible?'':' disabled title="SOOP에서 비로그인 일반 공개로 확인된 뒤에 공개할 수 있습니다."';
    const ignored=row.state==='ignored';
    return '<article class="operator-collector-inbox-row" data-collector-record="'+esc(row.recordId)+'" data-state="'+esc(row.state)+'">'+
      '<div class="operator-collector-inbox-thumb">'+thumb+'</div>'+
      '<div class="operator-collector-inbox-main"><div class="operator-collector-inbox-badges"><span class="operator-collector-platform">'+esc(collectorInboxPlatformLabel(row))+'</span><span class="operator-collector-state is-'+esc(row.state)+'">'+esc(collectorInboxStateLabel(row.state))+'</span>'+publicBadge+'</div>'+
      '<strong>'+esc(row.title||'제목 없음')+'</strong><small>'+esc(meta||'날짜 정보 없음')+'</small><p>'+esc(row.excerpt||'본문 미리보기가 없습니다.')+'</p><div class="operator-collector-linked"><span>현재 연결</span>'+linked+'</div></div>'+
      '<div class="operator-collector-inbox-manage"><label><span>연결할 춘봉 콘텐츠</span><select data-collector-target><option value="">선택</option>'+options+'</select></label>'+
      '<div class="operator-collector-inbox-actions">'+
      (ignored?'<button type="button" data-collector-manage="restore">다시 관리</button>':
        '<button type="button" data-collector-manage="connect">'+(row.linkedItemId?'연결 변경':'콘텐츠 연결')+'</button>'+
        '<button type="button" data-collector-manage="public"'+disabledPublic+'>공개로 전환</button>'+
        '<button type="button" data-collector-manage="internal">내부로 전환</button>'+
        '<button type="button" data-collector-manage="ignore">목록에서 무시</button>')+
      '<a href="'+esc(row.url)+'" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a></div>'+
      (!row.publicEligible&&row.platform==='soop'?'<small class="operator-collector-policy">애청자·로그인 제한 글은 내부 자료로만 연결됩니다. SOOP에서 일반 공개로 바뀌면 공개 전환이 활성화됩니다.</small>':'')+
      '</div></article>';
  }).join(''):'<div class="operator-collector-inbox-empty"><strong>조건에 맞는 수집 자료가 없습니다.</strong><span>필터를 바꾸거나 자동 수집을 실행해 주세요.</span></div>';
  rows.forEach(row=>{
    const card=list.querySelector('[data-collector-record="'+CSS.escape(row.recordId)+'"]'),select=$('[data-collector-target]',card);
    if(select&&row.linkedItemId)select.value=row.linkedItemId;
  });
}
async function manageCollectorInbox(button){
  const card=button.closest('[data-collector-record]'),recordId=card?.dataset.collectorRecord||'',action=button.dataset.collectorManage||'',itemId=$('[data-collector-target]',card)?.value||'';
  if(!recordId||!action)return;
  if(['connect','public','internal'].includes(action)&&!itemId){setCollectorInboxMessage('먼저 연결할 춘봉 콘텐츠를 선택해 주세요.','bad');return}
  button.disabled=true;setCollectorInboxMessage('수집 자료 상태를 변경하고 있습니다.','busy');
  try{
    const result=await json('operator-content-browser-import-manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recordId,action,itemId})});
    await load();if(result.item?.id)selectItem(result.item.id);
    const label={connect:'콘텐츠 연결',public:'공개 전환',internal:'내부 전환',ignore:'무시 처리',restore:'관리 복원'}[action]||'변경';
    setCollectorInboxMessage(label+'이 완료됐습니다.','ok');
  }catch(error){
    const message=error.message==='browser_import_not_publicly_accessible'?'이 자료는 현재 SOOP에서 일반 공개로 확인되지 않아 팬사이트 공개로 전환할 수 없습니다.':error.message==='content_target_required'?'연결할 춘봉 콘텐츠를 선택해 주세요.':'수집 자료 상태를 변경하지 못했습니다: '+error.message;
    setCollectorInboxMessage(message,'bad');
  }finally{button.disabled=false}
}
function bindCollectorInbox(){
  $('[data-collector-inbox-search]',root)?.addEventListener('input',renderCollectorInbox);
  $('[data-collector-inbox-state]',root)?.addEventListener('change',renderCollectorInbox);
  $('[data-collector-inbox-source]',root)?.addEventListener('change',renderCollectorInbox);
  $('[data-collector-inbox-list]',root)?.addEventListener('click',event=>{const button=event.target.closest('[data-collector-manage]');if(button)void manageCollectorInbox(button)});
}

function renderUnifiedCollectorStatus(){
  const box=$('[data-unified-collector-status]',root);if(!box)return;
  if(!collectorState.connected){
    box.dataset.state='idle';
    box.innerHTML='<strong>자동 수집기 연결 대기</strong><span>아래 설치 링크로 1회 설치하면 나무위키·SOOP·FM코리아 수집을 같은 큐로 처리합니다.</span>';
    return;
  }
  box.dataset.state=collectorState.queueCount?'busy':'ok';
  const backfill=collectorState.soopBackfill||{},status=String(backfill.status||''),statusText={running:'진행 중',paused:'일시 중단',complete:'완료'}[status]||status;
  const progress=status?' · SOOP 전체수집 '+statusText+' '+Number(backfill.pagesScanned||0)+'페이지 / '+Number(backfill.handled||0)+'건 처리':'';
  box.innerHTML='<strong>자동 수집기 연결됨'+(collectorState.version?' · v'+esc(collectorState.version):'')+'</strong><span>전송 대기 '+Number(collectorState.queueCount||0)+'건 · 브라우저에서 확인한 자료 '+Number(collectorState.seenCount||0)+'건 · SOOP 기록 '+Number(collectorState.soopHistoryCount||0)+'건'+progress+'</span>';
}
function collectorPost(type,data={}){
  window.postMessage({channel:COLLECTOR_CHANNEL,type,...data},location.origin);
}
async function handleUnifiedCollectorImport(message={}){
  const id=String(message.id||''),payload=message.payload||{};
  if(!id||!payload?.source)return;
  try{
    if(payload.source==='namuwiki-browser'){
      namuBrowserImport=payload;
      const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'auto',payload})});
      if(result?.matched){
        const title=result.item?.title||'춘봉 콘텐츠';namuBrowserImport=null;await load();if(result.item?.id)selectItem(result.item.id);
        setMessage('자동 수집기가 '+title+'에 나무위키 원문 '+Number(result.sectionCount||0)+'개 구역 · 이미지 '+Number(result.imageCount||0)+'장을 반영했습니다.','ok');
      }else{
        renderNamuHelper();setMessage('자동 수집한 나무위키 문서의 연결 대상을 찾지 못했습니다. 아래에서 콘텐츠를 직접 선택할 수 있습니다.','bad');
      }
      collectorPost('ack',{id,ok:true});
      return;
    }
    if(payload.source==='soop-authenticated-browser'){
      browserImport=payload;
      const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'auto',payload})});
      if(result?.matched){
        const title=result.item?.title||'춘봉 콘텐츠';browserImport=null;await load();if(result.item?.id)selectItem(result.item.id);
        setMessage('SOOP 글을 '+title+'에 자동 연결했습니다. 수집 자료함에서 공개/내부 상태를 바로 확인할 수 있습니다.','ok');
      }else{
        renderSoopHelper();setMessage('SOOP 글을 수집 자료함에 보관했습니다. 자동 매칭이 확실하지 않아 미연결 상태로 남겼습니다.','ok');
      }
      collectorPost('ack',{id,ok:true});
      return;
    }
    if(payload.source==='fmkorea-public-browser'){
      const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'auto',payload})});
      if(result?.matched){
        const title=result.item?.title||'춘봉 콘텐츠';await load();if(result.item?.id)selectItem(result.item.id);
        setMessage('FM코리아 공개글을 '+title+'에 공개 참고자료로 자동 연결했습니다'+(result.duplicate?' (이미 수집된 글)':'')+'.','ok');
      }else{
        setMessage('FM코리아 공개글을 수집해 보관했지만 연결할 춘봉 콘텐츠를 확실하게 찾지 못했습니다. 원문은 중복 없이 저장되어 있습니다.','ok');
      }
      collectorPost('ack',{id,ok:true});
      return;
    }
    collectorPost('ack',{id,ok:false,error:'unsupported_source'});
  }catch(error){
    collectorPost('ack',{id,ok:false,error:String(error?.message||'collector_import_failed')});
    setMessage('자동 수집 자료를 저장하지 못했습니다: '+String(error?.message||error),'bad');
  }
}
function bindUnifiedCollector(){
  if(!root||root.dataset.collectorBound==='1')return;root.dataset.collectorBound='1';
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin)return;
    const data=event.data||{};if(data.channel!==COLLECTOR_CHANNEL)return;
    if(data.type==='state'){
      collectorState={connected:true,queueCount:Number(data.queueCount||0),seenCount:Number(data.seenCount||0),version:String(data.version||''),soopHistoryCount:Number(data.soopHistoryCount||0),soopBackfill:data.soopBackfill||{}};
      renderUnifiedCollectorStatus();return;
    }
    if(data.type==='import'){
      collectorImportChain=collectorImportChain.then(()=>handleUnifiedCollectorImport(data)).catch(error=>setMessage('자동 수집 처리 중 오류: '+error.message,'bad'));
    }
  });
  $('[data-collector-run-namu]',root)?.addEventListener('click',()=>{
    const rows=namuPendingSources();if(!rows.length){setMessage('현재 이미지 수집이 필요한 나무위키 원문이 없습니다.','ok');return}
    collectorPost('open-urls',{kind:'namuwiki',urls:rows.map(row=>row.url)});
    setMessage('나무위키 수집 대기 '+rows.length+'개를 브라우저 자동 수집 큐로 보냈습니다.','ok');
  });
  $('[data-collector-backfill-soop]',root)?.addEventListener('click',()=>{
    collectorPost('start-soop-backfill',{url:'https://www.sooplive.com/station/chunbongtv/post'});
    setMessage('SOOP 전체 기록 수집을 시작했습니다. 과거 게시판을 순회하고, 중단되면 다음 실행에서 이어서 진행합니다.','ok');
  });
  $('[data-collector-open-soop]',root)?.addEventListener('click',()=>{
    collectorPost('open-soop-board',{url:'https://www.sooplive.com/station/chunbongtv/post'});
    setMessage('SOOP 최근 게시글을 확인합니다. 전체 기록 수집 완료 뒤에는 신규 글만 증분 수집합니다.','ok');
  });
  $('[data-collector-open-fmk]',root)?.addEventListener('click',()=>{
    collectorPost('open-fmk-board',{url:'https://www.fmkorea.com/'});
    setMessage('FM코리아를 열었습니다. 춘봉·콘텐츠 관련 제목을 자동 감지하며, 직접 연 공개 게시글도 자동 수집합니다.','ok');
  });
  collectorPost('ping');renderUnifiedCollectorStatus();
}

function namuCollectorBookmarklet(){
  const target=location.origin+'/operator.html?tab=contents';
  const script=`(async()=>{try{
    const okHost=location.hostname==='namu.wiki'||location.hostname==='www.namu.wiki';
    if(!okHost||!location.pathname.startsWith('/w/')){alert('namu.wiki 문서에서 실행해 주세요.');return}
    const root=document.querySelector('article')||document.querySelector('main')||document.body;
    const clean=value=>(value||'').replace(/\\s+/g,' ').trim();
    const generic=/상세 내용|관련 문서|상위 문서|편집|접기|펼치기|아이콘|favicon|external link/i;
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const startY=window.scrollY;
    const pageHeight=()=>Math.max(document.body?.scrollHeight||0,document.documentElement?.scrollHeight||0);
    for(let step=0,y=0;step<72&&y<pageHeight();step++,y+=Math.max(640,Math.floor((innerHeight||800)*.82))){window.scrollTo(0,y);await wait(55)}
    window.scrollTo(0,startY);await wait(120);
    const officialImage=node=>{const values=[node.currentSrc,node.src,node.getAttribute?.('src'),node.getAttribute?.('data-src'),node.getAttribute?.('data-original'),node.getAttribute?.('data-lazy-src')];for(const attr of ['srcset','data-srcset']){const raw=node.getAttribute?.(attr)||'';for(const part of raw.split(',')){const candidate=part.trim().split(/\\s+/)[0];if(candidate)values.push(candidate)}}for(const value of values){if(!value)continue;let parsed=null;try{parsed=new URL(value,location.href)}catch{}if(parsed?.protocol==='https:'&&parsed.hostname==='i.namu.wiki')return parsed.href}return''};
    const sections=[];let current={title:'본문',text:[],images:[]};
    const push=()=>{const text=current.text.join('\\n').slice(0,6000);if(text||current.images.length)sections.push({title:current.title||'본문',text,images:current.images.slice(0,18)});current={title:'본문',text:[],images:[]}};
    const nodes=[...root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption,img,source')].slice(0,3200);
    for(const node of nodes){
      if(/^H[1-4]$/.test(node.tagName)){push();current={title:clean(node.innerText||node.textContent)||'본문',text:[],images:[]};continue}
      if(node.tagName==='IMG'||node.tagName==='SOURCE'){
        const src=officialImage(node),pictureImg=node.closest?.('picture')?.querySelector?.('img'),alt=clean(node.alt||node.title||pictureImg?.alt||pictureImg?.title||'').replace(/^파일:/,'');
        if(!src||generic.test(alt))continue;
        if(!current.images.some(image=>image.src===src))current.images.push({src,alt,caption:alt});
        continue;
      }
      const value=clean(node.innerText||node.textContent);if(!value||value.length>1800)continue;
      if(!current.text.includes(value))current.text.push(value);
    }
    push();
    const payload={version:1,source:'namuwiki-browser',url:location.origin+location.pathname,title:clean(document.querySelector('h1')?.innerText||document.title.replace(/\\s*-\\s*나무위키.*$/,'')),sections:sections.slice(0,64),capturedAt:new Date().toISOString()};
    const bytes=new TextEncoder().encode(JSON.stringify(payload));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const encoded=btoa(binary);window.open(${JSON.stringify(target)}+'#namu-import='+encodeURIComponent(encoded),'_blank','noopener');
  }catch(error){alert('나무위키 문서 수집에 실패했습니다: '+(error?.message||error))}})()`;
  return 'javascript:'+script.replace(/\s+/g,' ');
}
function readNamuImportHash(){
  const match=location.hash.match(/^#namu-import=(.+)$/);if(!match)return null;
  try{
    const payload=JSON.parse(base64ToUtf8(decodeURIComponent(match[1])));
    history.replaceState(null,'',location.pathname+location.search);
    if(payload?.source!=='namuwiki-browser'||!/^https:\/\/(?:www\.)?namu\.wiki\/w\//i.test(String(payload.url||'')))return null;
    return payload;
  }catch{history.replaceState(null,'',location.pathname+location.search);return null}
}
function namuPendingSources(){
  const pending=[];
  for(const item of items){
    const sections=Array.isArray(item.referenceSections)?item.referenceSections:[];
    for(const source of item.sources||[]){
      const url=String(source?.url||'');
      if(!/^https:\/\/(?:www\.)?namu\.wiki\/w\//i.test(url))continue;
      const linked=sections.filter(row=>String(row?.sourceId||'')===String(source?.id||''));
      const images=linked.flatMap(row=>[
        ...(row.images||[]),
        ...(row.content||[]).filter(block=>block?.type==='image').map(block=>block?.image).filter(Boolean)
      ]);
      const collected=images.some(image=>{
        const src=String(image?.src||''),assetId=String(image?.assetId||'');
        return /^https:\/\/i\.namu\.wiki\//i.test(src)||(/res\.cloudinary\.com/i.test(src)&&!/^curated:/i.test(assetId));
      });
      if(collected)continue;
      pending.push({itemId:item.id,itemTitle:item.title||item.id,sourceId:source.id||'',label:source.label||'나무위키',url});
    }
  }
  return pending;
}
function renderNamuPending(){
  const helper=$('[data-namu-helper]',root);if(!helper)return;
  let panel=$('[data-namu-pending]',helper);
  if(!panel){
    panel=document.createElement('div');
    panel.dataset.namuPending='';
    panel.className='operator-soop-import';
    const list=helper.querySelector('ol'),body=helper.querySelector('.operator-soop-helper-body');
    if(list)list.insertAdjacentElement('afterend',panel);else body?.append(panel);
  }
  const pending=namuPendingSources();
  panel.hidden=false;
  if(!pending.length){
    panel.innerHTML='<header><div><small>원문 이미지 수집 현황</small><strong>수집 대기 없음</strong></div></header><p>현재 연결된 나무위키 출처는 모두 이미지까지 수집됐습니다.</p>';
    return;
  }
  panel.innerHTML='<header><div><small>원문 이미지 수집 현황</small><strong>수집 대기 '+pending.length+'개</strong></div></header>'+
    '<p>아래 원문을 열고 북마크바의 <b>나무위키 문서 수집</b>을 누르면 해당 콘텐츠에 자동 연결됩니다.</p>'+
    '<div class="operator-soop-helper-actions">'+pending.map(row=>'<a href="'+esc(row.url)+'" target="_blank" rel="noopener noreferrer">'+esc(row.itemTitle)+' · 원문 열기</a>').join('')+'</div>';
}
function renderNamuHelper(){
  const link=$('[data-namu-bookmarklet]',root),copy=$('[data-namu-bookmarklet-copy]',root),href=namuCollectorBookmarklet();
  renderNamuPending();
  if(link)link.href=href;
  if(copy&&!copy.dataset.bound){copy.dataset.bound='1';copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(href);copy.textContent='복사됨';setTimeout(()=>copy.textContent='북마크 코드 복사',1400)}
    catch{prompt('아래 코드를 북마크 URL에 붙여넣으세요.',href)}
  })}
  const box=$('[data-namu-import]',root);if(!box)return;
  if(!namuBrowserImport){box.hidden=true;return}
  box.hidden=false;
  const sections=Array.isArray(namuBrowserImport.sections)?namuBrowserImport.sections:[],images=sections.flatMap(row=>row.images||[]);
  $('[data-namu-import-title]',box).textContent=namuBrowserImport.title||'나무위키 문서';
  $('[data-namu-import-meta]',box).textContent='namu.wiki 직접 수집 · '+sections.length+'개 구역 · 이미지 '+images.length+'장';
  $('[data-namu-import-summary]',box).textContent=namuBrowserImport.url||'';
  const target=$('[data-namu-import-target]',box);
  if(target)target.innerHTML='<option value="">자동 연결</option>'+items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.title)+'</option>').join('');
  const dismiss=$('[data-namu-import-dismiss]',box);if(dismiss&&!dismiss.dataset.bound){dismiss.dataset.bound='1';dismiss.addEventListener('click',()=>{namuBrowserImport=null;renderNamuHelper()})}
  const connect=$('[data-namu-import-connect]',box);if(connect&&!connect.dataset.bound){connect.dataset.bound='1';connect.addEventListener('click',()=>void submitNamuImport())}
}
async function submitNamuImport(){
  if(!namuBrowserImport)return;
  const box=$('[data-namu-import]',root),itemId=$('[data-namu-import-target]',box)?.value||'',button=$('[data-namu-import-connect]',box);if(button)button.disabled=true;
  try{
    const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:itemId?'connect':'auto',itemId,payload:namuBrowserImport})});
    if(!result?.matched){setMessage('이 나무위키 주소와 연결된 콘텐츠를 자동으로 찾지 못했습니다. 콘텐츠를 직접 선택해 주세요.','bad');return}
    const title=result.item?.title||'춘봉 콘텐츠';namuBrowserImport=null;await load();renderNamuHelper();if(result.item?.id)selectItem(result.item.id);
    setMessage(title+'에 namu.wiki 원문 '+Number(result.sectionCount||0)+'개 구역 · 이미지 '+Number(result.imageCount||0)+'장을 반영했습니다.','ok');
  }catch(error){setMessage('나무위키 직접 수집 자료를 저장하지 못했습니다: '+error.message,'bad')}
  finally{if(button)button.disabled=false}
}
function soopCollectorBookmarklet(){
  const target=location.origin+'/operator.html?tab=contents';
  const script=`(()=>{try{
    const okHost=location.hostname==='www.sooplive.com'||location.hostname==='sooplive.com';
    const match=location.pathname.match(/^\\/station\\/chunbongtv\\/post\\/(\\d+)\\/?$/i);
    if(!okHost||!match){alert('춘봉 SOOP 방송국 게시글에서 실행해 주세요.');return}
    const meta=(selector)=>document.querySelector(selector)?.getAttribute('content')||'';
    const title=(meta('meta[property="og:title"]')||document.querySelector('h1')?.textContent||document.title||'').replace(/\\s*[|｜-]\\s*SOOP.*$/i,'').trim();
    const pageText=(document.body?.innerText||'').replace(/\\u00a0/g,' ');
    const dateRaw=meta('meta[property="article:published_time"]')||document.querySelector('time[datetime]')?.getAttribute('datetime')||(pageText.match(/20\\d{2}[.\\/-]\\d{1,2}[.\\/-]\\d{1,2}/)||[])[0]||'';
    const nodes=[...document.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"]')];
    const candidates=nodes.map(el=>({el,text:(el.innerText||'').trim()})).filter(row=>row.text.length>80).sort((a,b)=>b.text.length-a.text.length);
    const chosen=candidates[0]?.el||document.querySelector('main')||document.body;
    const body=((chosen?.innerText||pageText).trim()).slice(0,40000);
    const imageSet=new Set();
    const og=meta('meta[property="og:image"]');if(og)imageSet.add(og);
    for(const img of [...(chosen?.querySelectorAll?.('img')||[])].slice(0,80)){
      const src=img.currentSrc||img.src||'';if(/^https:\\/\\//i.test(src))imageSet.add(src);
    }
    const payload={version:1,source:'soop-authenticated-browser',url:location.href.split('#')[0],title,date:dateRaw,body,images:[...imageSet].slice(0,24),capturedAt:new Date().toISOString()};
    const bytes=new TextEncoder().encode(JSON.stringify(payload));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const encoded=btoa(binary);window.open(${JSON.stringify(target)}+'#soop-import='+encodeURIComponent(encoded),'_blank','noopener');
  }catch(error){alert('SOOP 글 수집에 실패했습니다: '+(error?.message||error))}})()`;
  return 'javascript:'+script.replace(/\s+/g,' ');
}
function readSoopImportHash(){
  const match=location.hash.match(/^#soop-import=(.+)$/);if(!match)return null;
  try{
    const payload=JSON.parse(base64ToUtf8(decodeURIComponent(match[1])));
    history.replaceState(null,'',location.pathname+location.search);
    if(payload?.source!=='soop-authenticated-browser'||!/https:\/\/(?:www\.)?sooplive\.com\/station\/chunbongtv\/post\/\d+/i.test(String(payload.url||'')))return null;
    return payload;
  }catch{
    history.replaceState(null,'',location.pathname+location.search);return null;
  }
}
function analyzeSoopImport(payload={}){
  const lines=String(payload.body||'').split(/\n+/).map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
  const dates=[...new Set((String(payload.body||'').match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g)||[]))].slice(0,12);
  const headingRx=/(공지|일정|기간|규칙|진행|참가|입주|수강|결과|상금|시간|모집|안내|서버|콘텐츠)/;
  const headings=[...new Set(lines.filter(line=>line.length<=70&&headingRx.test(line)))].slice(0,14);
  const listCount=lines.filter(line=>/^(?:[-*•·]|\d+[.)]|[①-⑳])\s*/.test(line)).length;
  return{lineCount:lines.length,dates,headings,listCount};
}
function renderSoopHelper(){
  const link=$('[data-soop-bookmarklet]',root),copy=$('[data-soop-bookmarklet-copy]',root);
  const href=soopCollectorBookmarklet();if(link)link.href=href;
  if(copy&&!copy.dataset.bound){copy.dataset.bound='1';copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(href);copy.textContent='복사됨';setTimeout(()=>copy.textContent='북마크 코드 복사',1400)}
    catch{prompt('아래 코드를 북마크 URL에 붙여넣으세요.',href)}
  })}
  const box=$('[data-soop-import]',root);if(!box)return;
  if(!browserImport){box.hidden=true;return}
  box.hidden=false;
  const facts=analyzeSoopImport(browserImport),target=$('[data-soop-import-target]',box);
  $('[data-soop-import-title]',box).textContent=browserImport.title||'제목 확인 필요';
  $('[data-soop-import-meta]',box).textContent='SOOP 애청자 공개글 · '+(browserImport.date||'날짜 확인 중');
  $('[data-soop-import-summary]',box).textContent=String(browserImport.body||'').slice(0,420)||(browserImport.url||'');
  $('[data-soop-import-facts]',box).innerHTML=[
    '<span>본문 '+facts.lineCount+'줄</span>',
    '<span>날짜 후보 '+facts.dates.length+'개</span>',
    '<span>구조 제목 '+facts.headings.length+'개</span>',
    '<span>목록형 문장 '+facts.listCount+'개</span>',
    '<span>이미지 '+(browserImport.images||[]).length+'개</span>'
  ].join('');
  if(target)target.innerHTML='<option value="">연결할 콘텐츠 선택</option>'+items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.title)+'</option>').join('');
  const dismiss=$('[data-soop-import-dismiss]',box);if(dismiss&&!dismiss.dataset.bound){dismiss.dataset.bound='1';dismiss.addEventListener('click',()=>{browserImport=null;renderSoopHelper()})}
  const connect=$('[data-soop-import-connect]',box);if(connect&&!connect.dataset.bound){connect.dataset.bound='1';connect.addEventListener('click',()=>void submitSoopImport('connect'))}
  const draft=$('[data-soop-import-draft]',box);if(draft&&!draft.dataset.bound){draft.dataset.bound='1';draft.addEventListener('click',()=>void submitSoopImport('draft'))}
}
async function autoRouteSoopImport(){
  if(!browserImport)return false;
  try{
    const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'auto',payload:browserImport})});
    if(!result?.matched){
      renderSoopHelper();
      setMessage('애청자 글을 내부 원문으로 보관했습니다. 자동 매칭이 확실하지 않아 연결할 콘텐츠를 확인해 주세요.','ok');
      return false;
    }
    const title=result.item?.title||'춘봉 콘텐츠';
    browserImport=null;await load();renderSoopHelper();
    if(result.item?.id)selectItem(result.item.id);
    setMessage('애청자 글을 자동으로 '+title+'에 연결했습니다.','ok');
    return true;
  }catch(error){
    renderSoopHelper();setMessage('애청자 글 자동 매칭에 실패했습니다. 직접 연결할 수 있습니다: '+error.message,'bad');return false;
  }
}
async function submitSoopImport(action){
  if(!browserImport)return;
  const box=$('[data-soop-import]',root),itemId=$('[data-soop-import-target]',box)?.value||'';
  if(action==='connect'&&!itemId){alert('연결할 콘텐츠를 선택해 주세요.');return}
  const buttons=$$('[data-soop-import-connect],[data-soop-import-draft]',box);buttons.forEach(button=>button.disabled=true);
  try{
    const result=await json('operator-content-browser-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,itemId,payload:browserImport})});
    browserImport=null;await load();renderSoopHelper();
    if(result.item?.id)selectItem(result.item.id);
    setMessage(action==='connect'?'애청자 글을 내부 원문으로 보관하고 콘텐츠 기록에 연결했습니다.':'애청자 글을 내부 원문으로 보관하고 새 초안을 만들었습니다.','ok');
  }catch(error){setMessage('SOOP 브라우저 수집 자료를 저장하지 못했습니다: '+error.message,'bad')}
  finally{buttons.forEach(button=>button.disabled=false)}
}
export async function runOfficialSync(){
  const button=$('[data-archive-auto-sync]',root);if(button)button.disabled=true;
  const el=$('[data-archive-auto-state]',root);if(el)el.textContent='SOOP · YouTube 공식 자료를 동기화하고 있습니다…';
  try{
    const p=await json('operator-content-auto-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    await load();
    if(el&&!p.skipped)el.dataset.state='ok';
  }catch(e){
    if(el){el.textContent='공식 자료 동기화에 실패했습니다: '+e.message;el.dataset.state='bad'}
  }finally{if(button)button.disabled=false}
}
async function load(){try{const p=await json('operator-content-archive');items=Array.isArray(p.items)?p.items:[];autoSyncMeta=p.autoSync||null;autoCandidates=Array.isArray(p.candidates)?p.candidates:[];browserImports=Array.isArray(p.browserImports)?p.browserImports:[];renderList();renderAutoSyncState();renderCandidates();renderCollectorInbox();renderSoopHelper();renderNamuHelper();publishArchiveHealth(archiveHealthSnapshot(items,autoCandidates,autoSyncMeta))}catch(e){setMessage(e.message==='archive_storage_unavailable'?'콘텐츠 저장소를 사용할 수 없습니다.':'콘텐츠 목록을 불러오지 못했습니다.','bad')}}
export async function bootOperatorContents(){if(booted)return;root=document.querySelector('[data-operator-panel="contents"]');if(!root)return;booted=true;browserImport=readSoopImportHash();namuBrowserImport=readNamuImportHash();bindUnifiedCollector();bindCollectorInbox();$('[data-archive-admin-search]',root)?.addEventListener('input',renderList);$('[data-archive-admin-quality]',root)?.addEventListener('change',renderList);$('[data-archive-admin-list]',root)?.addEventListener('click',event=>{const button=event.target.closest('[data-archive-select]');if(button)selectItem(button.dataset.archiveSelect)});$('[data-archive-new]',root)?.addEventListener('click',()=>renderEditor(emptyItem()));$('[data-archive-auto-sync]',root)?.addEventListener('click',()=>void runOfficialSync());$('[data-archive-image-audit]',root)?.addEventListener('click',()=>void runImageAudit());renderEditor(emptyItem());await load();if(namuBrowserImport)await submitNamuImport();else if(browserImport)await autoRouteSoopImport();else{renderSoopHelper();renderNamuHelper();renderUnifiedCollectorStatus()}}
