(() => {
  'use strict';
  if (window.__CHUNBONG_MOBILE_APP_ENHANCEMENTS__) return;
  window.__CHUNBONG_MOBILE_APP_ENHANCEMENTS__ = true;

  const body = document.body;
  if (!body?.dataset?.page) return;
  const page = body.dataset.page;
  const mobile = window.matchMedia('(max-width:760px)');
  const appMode = Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    new URLSearchParams(location.search).get('source') === 'pwa'
  );
  const esc = (value='') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");
  const fetchJson = async (key, url, ttl=60000) => {
    if (window.ChunbongCache) return window.ChunbongCache.fetchJson(key,url,{ttl});
    const response = await fetch(url,{headers:{accept:'application/json'}});
    if(!response.ok) throw new Error('HTTP '+response.status);
    return response.json();
  };

  function setupContextHeader(){
    if(!mobile.matches||!appMode||page==='home')return;
    const header=document.querySelector('.site-header');
    const brand=header?.querySelector('.brand');
    if(!header||!brand||header.querySelector('.pwa-context-title'))return;
    const labels={
      schedule:'방송 일정',notice:'공지',vod:'다시보기',clips:'핫클립',fanart:'팬아트',
      youtube:'유튜브',tarot:'춘봉 타로',minigames:'미니게임',history:'방송 이력',
      data:'춘봉 데이터',changelog:'업데이트 일지',myhub:'내 팬허브'
    };
    const title=document.createElement('span');
    title.className='pwa-context-title';
    title.textContent=labels[page]||document.title.split('|')[0].trim()||'춘봉 팬허브';
    brand.insertAdjacentElement('afterend',title);
  }

  function formatKstTime(value){
    if(!value||!String(value).includes('T'))return '시간 미정';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '시간 미정';
    return new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',
      hour:'2-digit',minute:'2-digit',hour12:false
    }).format(date);
  }

  async function setupPriorityHome(){
    if(!mobile.matches||!appMode||page!=='home'||document.querySelector('[data-pwa-priority-home]'))return;
    const header=document.querySelector('.site-header');
    if(!header)return;
    const section=document.createElement('section');
    section.className='pwa-priority-home';
    section.dataset.pwaPriorityHome='';
    section.innerHTML='<div class="pwa-priority-head"><div><small>CHUNBONG FAN HUB</small><strong>오늘의 춘봉</strong></div><a href="myhub.html">내 팬허브 →</a></div><div class="pwa-priority-grid" data-pwa-priority-grid><a class="pwa-priority-card is-live" href="https://www.sooplive.com/station/chunbongtv" target="_blank" rel="noreferrer"><small>LIVE STATUS</small><strong>방송 상태 확인 중...</strong><span>SOOP</span></a><a class="pwa-priority-card" href="schedule.html" data-priority-schedule><small>NEXT SCHEDULE</small><strong>일정 확인 중...</strong><span>방송 일정</span></a><a class="pwa-priority-card" href="vod.html" data-priority-recent><small>CONTINUE</small><strong>최근 영상 보기</strong><span>이어보기</span></a><a class="pwa-priority-card" href="tarot.html" data-priority-tarot><small>MY TAROT</small><strong>오늘 카드 보기</strong><span>춘봉 타로</span></a><a class="pwa-priority-card" href="minigames.html" data-priority-challenge><small>DAILY MISSION</small><strong>오늘의 게임 도전</strong><span>미니게임</span></a></div>';
    header.insertAdjacentElement('afterend',section);

    const liveCard=section.querySelector('.is-live');
    const scheduleCard=section.querySelector('[data-priority-schedule]');
    const renderPersonal=()=>{
      const personal=window.ChunbongPersonal;
      if(!personal)return;
      const state=personal.read?.()||{};
      const recent=state.recent;
      const recentCard=section.querySelector('[data-priority-recent]');
      if(recentCard){
        recentCard.href=recent?.href||recent?.sourceHref||'vod.html';
        recentCard.querySelector('strong').textContent=recent?.title||'최근 영상 보기';
        recentCard.querySelector('span').textContent=recent?'이어서 보기':'다시보기';
      }
      const tarot=state.tarot?.[0];
      const tarotCard=section.querySelector('[data-priority-tarot]');
      if(tarotCard){
        tarotCard.querySelector('strong').textContent=tarot?.cards?.[0]?.name||'오늘 카드 보기';
        tarotCard.querySelector('span').textContent=tarot?'최근 타로 다시 확인':'춘봉 타로';
      }
      const challenge=personal.dailyChallenge?.();
      const challengeCard=section.querySelector('[data-priority-challenge]');
      if(challengeCard&&challenge){
        challengeCard.href=challenge.href||'minigames.html';
        challengeCard.querySelector('strong').textContent=challenge.title;
        challengeCard.querySelector('span').textContent=challenge.completed?'오늘 미션 완료 ✓':challenge.progress+' / '+challenge.goal+' 진행';
      }
    };
    renderPersonal();
    document.addEventListener('chunbong:personal-updated',renderPersonal);

    try{
      const [live,schedule]=await Promise.all([
        fetchJson('mobile-home:live','/api/content?type=live',30000).catch(()=>null),
        fetchJson('mobile-home:schedule','/api/content?type=schedule',120000).catch(()=>null)
      ]);
      if(live?.live===true){
        liveCard.innerHTML='<small><i class="pwa-priority-live-dot"></i>LIVE NOW</small><strong>'+esc(live.title||'춘봉 LIVE')+'</strong><span>'+esc([live.categoryName,Number(live.viewerCount)>0?Number(live.viewerCount).toLocaleString('ko-KR')+'명 시청 중':'SOOP에서 보기'].filter(Boolean).join(' · '))+'</span>';
      }else{
        liveCard.classList.remove('is-live');
        liveCard.innerHTML='<small>OFFLINE</small><strong>현재 방송 중이 아닙니다.</strong><span>SOOP 방송국 보기</span>';
      }
      const items=Array.isArray(schedule?.items)?schedule.items:[];
      const now=Date.now();
      const next=items.find(item=>{
        const at=Date.parse(item?.start||'');
        return Number.isFinite(at)?at>=now-60*60*1000:String(item?.start||'').slice(0,10)>=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      });
      if(next){
        scheduleCard.querySelector('strong').textContent=next.title||'다음 방송 일정';
        scheduleCard.querySelector('span').textContent=formatKstTime(next.start);
      }else{
        scheduleCard.querySelector('strong').textContent='등록된 다음 일정이 없습니다.';
        scheduleCard.querySelector('span').textContent='일정 페이지 보기';
      }
    }catch(_){}
  }

  function setupTarotSelectionBar(){
    if(!mobile.matches||page!=='tarot'||document.querySelector('[data-mobile-tarot-selection]'))return;
    const confirm=document.getElementById('tarot-confirm-selection');
    const status=document.getElementById('tarot-selection-status');
    if(!confirm)return;
    const bar=document.createElement('div');
    bar.className='mobile-tarot-selection-bar';
    bar.dataset.mobileTarotSelection='';
    bar.innerHTML='<div><small>CARD SELECTION</small><strong data-mobile-tarot-status>카드를 선택해 주세요.</strong></div><button type="button" data-mobile-tarot-confirm disabled>선택 완료</button>';
    document.body.appendChild(bar);
    const text=bar.querySelector('[data-mobile-tarot-status]');
    const button=bar.querySelector('[data-mobile-tarot-confirm]');
    const sync=()=>{
      const visible=!confirm.hidden;
      bar.classList.toggle('is-visible',visible);
      body.classList.toggle('tarot-mobile-selecting',visible);
      if(!visible)return;
      text.textContent=status?.textContent||confirm.textContent||'카드를 선택해 주세요.';
      button.disabled=confirm.disabled;
      button.textContent=confirm.disabled?'선택 중':'카드 펼치기';
    };
    button.addEventListener('click',()=>{if(!confirm.disabled)confirm.click();});
    new MutationObserver(sync).observe(confirm,{attributes:true,childList:true,subtree:true});
    if(status)new MutationObserver(sync).observe(status,{childList:true,subtree:true,characterData:true});
    sync();
  }

  function setupContentFilter(){
    if(!['vod','clips','youtube','fanart'].includes(page)||document.querySelector('[data-content-filter]'))return;
    const selectors={
      vod:'.video-list',clips:'.video-list',youtube:'.video-list',fanart:'.fanart-grid'
    };
    const itemSelectors={
      vod:'.video-list-card',clips:'.video-list-card',youtube:'.video-list-card',fanart:'.fanart-card'
    };
    const root=document.querySelector(selectors[page]);
    const sectionHead=document.querySelector('.content-section .section-head');
    if(!root||!sectionHead)return;
    const bar=document.createElement('label');
    bar.className='content-filter-bar';
    bar.dataset.contentFilter='';
    bar.innerHTML='<input type="search" autocomplete="off" enterkeyhint="search" placeholder="'+(page==='fanart'?'팬아트 제목 검색':'제목으로 검색')+'" aria-label="현재 페이지 콘텐츠 검색"><span data-content-filter-count>전체</span>';
    sectionHead.insertAdjacentElement('afterend',bar);
    const input=bar.querySelector('input');
    const count=bar.querySelector('[data-content-filter-count]');
    const apply=()=>{
      const query=input.value.trim().toLocaleLowerCase('ko-KR');
      const cards=[...root.querySelectorAll(itemSelectors[page])];
      let shown=0;
      cards.forEach(card=>{
        const match=!query||card.textContent.toLocaleLowerCase('ko-KR').includes(query);
        card.style.display=match?'':'none';
        if(match)shown+=1;
      });
      count.textContent=query?shown+'개':'전체 '+cards.length+'개';
    };
    input.addEventListener('input',apply);
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
    apply();
  }

  function setupBackupTools(){
    if(page!=='myhub'||document.querySelector('[data-personal-backup]'))return;
    const dashboard=document.querySelector('[data-personal-dashboard]');
    if(!dashboard)return;
    const panel=document.createElement('section');
    panel.className='personal-backup-panel';
    panel.dataset.personalBackup='';
    panel.innerHTML='<header><div><small>BACKUP & RESTORE</small><h2>내 팬허브 백업</h2></div></header><p>보관함·이어보기·타로 기록·게임 기록·알림 설정을 JSON 파일로 저장했다가 같은 기기나 다른 기기에서 복원할 수 있습니다.</p><div class="personal-backup-actions"><button type="button" data-backup-export>백업 파일 저장</button><label>백업 파일 불러오기<input type="file" accept="application/json,.json" data-backup-import></label><button type="button" class="is-danger" data-backup-reset>이 기기 기록 초기화</button></div><p class="personal-backup-status" data-backup-status aria-live="polite"></p>';
    dashboard.insertAdjacentElement('afterend',panel);
    const status=panel.querySelector('[data-backup-status]');
    panel.querySelector('[data-backup-export]')?.addEventListener('click',()=>{
      try{
        const content=window.ChunbongPersonal?.exportBackup?.();
        if(!content)throw new Error('backup_failed');
        const blob=new Blob([content],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');
        const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        link.href=url;link.download='chunbong-fanhub-backup-'+date+'.json';link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        status.textContent='백업 파일을 저장했습니다.';
      }catch(_){status.textContent='백업 파일을 만들지 못했습니다.';}
    });
    panel.querySelector('[data-backup-import]')?.addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      try{
        const text=await file.text();
        const ok=window.ChunbongPersonal?.importBackup?.(text);
        if(!ok)throw new Error('invalid_backup');
        status.textContent='백업을 복원했습니다.';
        setTimeout(()=>location.reload(),500);
      }catch(_){status.textContent='올바른 춘봉 팬허브 백업 파일인지 확인해 주세요.';}
      event.target.value='';
    });
    panel.querySelector('[data-backup-reset]')?.addEventListener('click',()=>{
      if(!confirm('이 기기의 내 팬허브 기록을 모두 초기화할까요? 백업하지 않은 기록은 복구할 수 없습니다.'))return;
      window.ChunbongPersonal?.resetPersonalData?.();
      status.textContent='이 기기 기록을 초기화했습니다.';
      setTimeout(()=>location.reload(),350);
    });
  }

  function boot(){
    setupContextHeader();
    void setupPriorityHome();
    setupTarotSelectionBar();
    setupContentFilter();
    setupBackupTools();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  document.addEventListener('chunbong:personal-updated',()=>{if(page==='myhub')setupBackupTools();});
})();
