const API='/api/content?type=';
let root=null,items=[],selected=null,booted=false,autoSyncMeta=null,autoCandidates=[];
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
  $('[data-archive-select]',list).forEach(b=>b.addEventListener('click',()=>selectItem(b.dataset.archiveSelect)));
}
function field(label,name,value='',type='text',extra=''){return `<label class="operator-archive-field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`}
function selectField(label,name,value,options){return `<label class="operator-archive-field"><span>${label}</span><select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select></label>`}
function rowControls(){return `<div class="operator-archive-row-controls"><button type="button" data-move-row="up" aria-label="위로 이동">↑</button><button type="button" data-move-row="down" aria-label="아래로 이동">↓</button><button type="button" data-remove-row aria-label="항목 삭제">삭제</button></div>`}
function sourceRow(row={},index=0){return `<div class="operator-archive-repeater-row" data-source-row>${field('ID','source-id',row.id||`source-${index+1}`)}${field('출처 이름','source-label',row.label||'')}${selectField('종류','source-kind',row.kind||'official',[['official','공식'],['platform','플랫폼'],['relation','관계자'],['article','기사'],['reference','참고']])}${selectField('공개 범위','source-visibility',row.visibility||'public',[['public','팬사이트에 표시'],['internal','내부 검증용 · 숨김']])}${field('원문 URL','source-url',row.url||'','url')}<div class="operator-source-meta-actions"><button type="button" data-source-fetch-meta>메타 가져오기</button><small data-source-meta-status></small></div>${rowControls()}</div>`}
function materialRow(row={},kind='timeline',index=0){const types=kind==='media'?[['vod','다시보기'],['catch','Catch'],['clip','클립'],['youtube','YouTube'],['shorts','Shorts']]:[['notice','공지'],['post','게시글'],['article','기사'],['result','결과'],['reference','참고 자료']];return `<div class="operator-archive-repeater-row operator-archive-material-row" data-${kind}-row>${field('ID',`${kind}-id`,row.id||`${kind}-${index+1}`)}${selectField('유형',`${kind}-type`,row.type||types[0][0],types)}${field('제목',`${kind}-title`,row.title||'')}${field('날짜',`${kind}-date`,row.date||'')}${selectField('날짜 정확도',`${kind}-precision`,row.datePrecision||'unknown',[['day','일'],['month','월'],['year','연도'],['unknown','확인 중']])}${field('원문 URL',`${kind}-url`,row.url||'','url')}${field('썸네일',`${kind}-thumbnail`,row.thumbnail||'','url')}${field('출처 ID',`${kind}-source`,row.sourceId||'')}${selectField('공개 범위',`${kind}-visibility`,row.visibility||'public',[['public','팬사이트에 표시'],['internal','내부 검증용 · 숨김']])}${field('메모',`${kind}-note`,row.note||'')}${rowControls()}</div>`}
function galleryRow(row={},index=0){return `<div class="operator-archive-repeater-row" data-gallery-row>${field('ID','gallery-id',row.id||`image-${index+1}`)}${field('이미지 URL / /assets 경로','gallery-src',row.src||row.url||'')}${field('대체 텍스트','gallery-alt',row.alt||'')}${field('설명','gallery-caption',row.caption||'')}${field('출처 ID','gallery-source',row.sourceId||'')}${rowControls()}</div>`}
function resultRow(row={},index=0){return `<div class="operator-archive-repeater-row operator-archive-result-row" data-result-row>${field('제목','result-title',row.title||row.label||`기록 ${index+1}`)}${field('내용','result-value',row.value||row.name||'')}${rowControls()}</div>`}
function archiveAudit(item){
  const issues=[];
  const sources=Array.isArray(item.sources)?item.sources:[];
  const participants=Array.isArray(item.participants)?item.participants:[];
  const participantGroupCount=(Array.isArray(item.participantGroups)?item.participantGroups:[]).reduce((sum,row)=>sum+(Array.isArray(row.participants)?row.participants.length:Number(row.count)||0),0);
  const urls=sources.map(row=>String(row.url||'').toLowerCase());
  const labels=sources.map(row=>String(row.label||'').toLowerCase());
  const hasParticipantReference=urls.some(url=>url.includes('/streamers'))||labels.some(label=>label.includes('참가자')||label.includes('참여자'));
  if(hasParticipantReference&&participants.length===0&&participantGroupCount===0)issues.push(['참가자 미수집','참가자 명단용 참고 자료가 있지만 참가자 데이터가 0명입니다.']);
  const hasNotion=urls.some(url=>url.includes('notion.'));
  if(hasNotion&&!/(규칙|시스템|참가 조건|진행 방식|일정)/.test(String(item.description||'')))issues.push(['Notion 본문 미구조화','Notion 자료가 연결돼 있지만 규칙·시스템·일정 데이터 반영 여부를 확인해야 합니다.']);
  const genericMedia=(item.media||[]).filter(row=>/\b\d{8,}\b/.test(String(row.title||''))||/관련 youtube 영상 \d|다시보기 \d{2}$/i.test(String(row.title||'')));
  if(genericMedia.length)issues.push(['미디어 메타데이터 확인',`${genericMedia.length}개 영상의 실제 제목·날짜·썸네일 확인이 남아 있습니다.`]);
  const hasOfficialPost=urls.some(url=>url.includes('sooplive.com/station/'));
  const genericHero=!item.heroImage?.src||String(item.heroImage.src).includes('/assets/chunbong-contents/');
  if(hasOfficialPost&&genericHero)issues.push(['실제 대표 이미지 확인','공식 게시글이 연결돼 있으나 실제 포스터/첨부 이미지 대신 임시 커버를 사용 중입니다.']);
  return issues;
}
function auditBlock(item){const issues=archiveAudit(item);return `<section class="operator-archive-audit ${issues.length?'has-issues':'is-complete'}"><div><strong>자료 반영 상태</strong><span>${issues.length?`${issues.length}건 확인 필요`:'주요 누락 없음'}</span></div>${issues.length?`<ul>${issues.map(([title,detail])=>`<li><b>${esc(title)}</b><small>${esc(detail)}</small></li>`).join('')}</ul>`:'<p>등록된 참고자료와 현재 구조화 데이터를 기준으로 주요 누락이 없습니다.</p>'}</section>`}
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
      if(meta.image)details.push('이미지 후보');
      if(!details.length)details.push(meta.title?'제목 확인':'추출 가능한 메타 없음');
      status.textContent=details.join(' · ');
      if(Array.isArray(meta.outline)&&meta.outline.length)status.title=meta.outline.join(' · ');
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
function renderPreview(){const item=collect(),box=$('[data-archive-admin-preview] div',root);box.innerHTML=`<article><div class="operator-archive-preview-image">${item.heroImage?.src?`<img src="${esc(item.heroImage.src)}" alt="${esc(item.heroImage.alt||item.title)}">`:'<span>대표 이미지 없음</span>'}</div><div><small>${esc(item.category)} · ${esc(item.role)}</small><strong>${esc(item.title||'제목 없음')}</strong><p>${esc(item.summary||'소개를 입력하세요.')}</p><em>${esc(item.startDate||'날짜 확인 중')}</em></div></article>`}
function bindRowControls(){$$('[data-remove-row]',root).forEach(b=>b.addEventListener('click',()=>{b.closest('.operator-archive-repeater-row')?.remove();renderPreview()}));$$('[data-move-row]',root).forEach(b=>b.addEventListener('click',()=>{const row=b.closest('.operator-archive-repeater-row'),wrap=row?.parentElement;if(!row||!wrap)return;if(b.dataset.moveRow==='up'&&row.previousElementSibling)wrap.insertBefore(row,row.previousElementSibling);if(b.dataset.moveRow==='down'&&row.nextElementSibling)wrap.insertBefore(row.nextElementSibling,row);renderPreview()}))}
function addRow(kind){const map={result:['[data-results]',resultRow({},$$('[data-result-row]',root).length)],source:['[data-sources]',sourceRow({},$$('[data-source-row]',root).length)],timeline:['[data-timeline]',materialRow({},'timeline',$$('[data-timeline-row]',root).length)],media:['[data-media]',materialRow({},'media',$$('[data-media-row]',root).length)],gallery:['[data-gallery]',galleryRow({},$$('[data-gallery-row]',root).length)]};const [sel,html]=map[kind]||[];$(sel,root)?.insertAdjacentHTML('beforeend',html);bindRowControls();bindSourceMeta()}
async function persist(type){const item=collect();setMessage(type.includes('publish')?'공개 검증 중…':'초안 저장 중…');try{const p=await json(type,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});selected=p.item;setMessage(type.includes('publish')?'공개되었습니다.':'초안으로 저장했습니다.','ok');await load();selectItem(selected.id)}catch(e){setMessage(errorLabel[e.message]||`저장하지 못했습니다: ${e.message}`,'bad')}}
function bindEditor(){const form=$('[data-archive-form]',root);form.addEventListener('input',()=>renderPreview());bindSourceMeta();$$('[data-add-row]',root).forEach(b=>b.addEventListener('click',()=>addRow(b.dataset.addRow)));bindRowControls();$$('[data-resolve-conflict]',root).forEach(b=>b.addEventListener('click',()=>{selected.verification.conflicts.splice(Number(b.dataset.resolveConflict),1);renderEditor(selected)}));$('[data-archive-preview]',root)?.addEventListener('click',renderPreview);$('[data-archive-save]',root)?.addEventListener('click',()=>persist('operator-content-archive-save'));$('[data-archive-publish]',root)?.addEventListener('click',()=>persist('operator-content-archive-publish'));$('[data-archive-delete]',root)?.addEventListener('click',async()=>{if(!selected?.id||!confirm('이 콘텐츠 기록을 삭제할까요?'))return;try{await json('operator-content-archive-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id})});selected=null;await load();renderEditor(emptyItem())}catch(e){setMessage(errorLabel[e.message]||'삭제하지 못했습니다.','bad')}})}
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
  $('[data-candidate-action]',wrap).forEach(button=>button.addEventListener('click',()=>void processCandidate(button)));
}
async function processCandidate(button){
  const card=button.closest('[data-candidate-url]'),action=button.dataset.candidateAction||'',url=card?.dataset.candidateUrl||'',itemId=$('[data-candidate-target]',card)?.value||'';
  if(action==='connect'&&!itemId){alert('연결할 콘텐츠를 선택해 주세요.');return}
  button.disabled=true;
  try{const p=await json('operator-content-auto-candidate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,url,itemId})});await load();if(action==='draft'&&p.item?.id)selectItem(p.item.id)}
  catch(e){setMessage('후보 처리에 실패했습니다: '+e.message,'bad')}finally{button.disabled=false}
}
async function runOfficialSync(){
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
async function load(){try{const p=await json('operator-content-archive');items=Array.isArray(p.items)?p.items:[];autoSyncMeta=p.autoSync||null;autoCandidates=Array.isArray(p.candidates)?p.candidates:[];renderList();renderAutoSyncState();renderCandidates()}catch(e){setMessage(e.message==='archive_storage_unavailable'?'콘텐츠 저장소를 사용할 수 없습니다.':'콘텐츠 목록을 불러오지 못했습니다.','bad')}}
export async function bootOperatorContents(){if(booted)return;root=document.querySelector('[data-operator-panel="contents"]');if(!root)return;booted=true;$('[data-archive-admin-search]',root)?.addEventListener('input',renderList);$('[data-archive-admin-quality]',root)?.addEventListener('change',renderList);$('[data-archive-new]',root)?.addEventListener('click',()=>renderEditor(emptyItem()));$('[data-archive-auto-sync]',root)?.addEventListener('click',()=>void runOfficialSync());renderEditor(emptyItem());await load()}
