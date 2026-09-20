(()=>{
  'use strict';
  if(window.ChunbongPersonal)return;
  const STORAGE_KEY='chunbong-personal-hub-v1';
  const MAX_FAVORITES=80,MAX_TAROT=40;
  const GAME_LABELS={chuntris:'춘트리스',chunbak:'춘박게임',chungwagame:'춘과게임',chuncortile:'춘컬타일'};

  const blank=()=>({version:1,favorites:[],recent:null,tarot:[],games:{plays:{},lastPlayed:null},alerts:{enabled:false,lastNotified:'',lastLiveBroadcastId:''}});
  const safeParse=value=>{try{return JSON.parse(value)}catch(_){return null}};
  function read(){
    try{
      const parsed=safeParse(localStorage.getItem(STORAGE_KEY)||'');
      if(!parsed||typeof parsed!=='object')return blank();
      return {
        ...blank(),...parsed,
        favorites:Array.isArray(parsed.favorites)?parsed.favorites:[],
        tarot:Array.isArray(parsed.tarot)?parsed.tarot:[],
        games:{...blank().games,...(parsed.games||{}),plays:{...(parsed.games?.plays||{})}},
        alerts:{...blank().alerts,...(parsed.alerts||{})}
      };
    }catch(_){return blank()}
  }
  function write(next){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch(_){}
    document.dispatchEvent(new CustomEvent('chunbong:personal-updated',{detail:next}));
    return next;
  }
  const keyOf=item=>String(item?.id||item?.href||item?.sourceHref||item?.title||'').trim();
  function favoriteItem(item={}){
    const key=keyOf(item);if(!key)return false;
    const state=read();const index=state.favorites.findIndex(row=>keyOf(row)===key&&row.type===item.type);
    if(index>=0)state.favorites.splice(index,1);
    else state.favorites.unshift({...item,id:key,savedAt:new Date().toISOString()});
    state.favorites=state.favorites.slice(0,MAX_FAVORITES);write(state);return index<0;
  }
  function isFavorite(item={}){
    const key=keyOf(item);if(!key)return false;
    return read().favorites.some(row=>keyOf(row)===key&&row.type===item.type);
  }
  function recordRecent(item={}){
    if(!keyOf(item))return;
    const state=read();
    const same=state.recent&&keyOf(state.recent)===keyOf(item)&&String(state.recent.type||'')===String(item.type||'');
    const preserved=same?{
      progress:Number(state.recent.progress)||0,
      duration:Number(state.recent.duration)||0
    }:{};
    state.recent={...preserved,...item,id:keyOf(item),updatedAt:new Date().toISOString()};
    if(!Number.isFinite(Number(item.progress))&&preserved.progress)state.recent.progress=preserved.progress;
    if(!Number.isFinite(Number(item.duration))&&preserved.duration)state.recent.duration=preserved.duration;
    write(state);
  }
  function recordTarot(entry={}){
    const cards=Array.isArray(entry.cards)?entry.cards:[];
    if(!cards.length)return;
    const state=read();
    const row={
      id:'tarot-'+Date.now(),createdAt:new Date().toISOString(),
      question:String(entry.question||'').slice(0,500),
      topic:String(entry.topic||'general'),spreadId:String(entry.spreadId||'single'),
      cards:cards.slice(0,12).map(card=>({
        name:String(card.name||''),orientation:card.orientation==='reversed'?'reversed':'upright',
        position:String(card.position||''),deckNumber:Number(card.deckNumber)||0
      }))
    };
    state.tarot.unshift(row);state.tarot=state.tarot.slice(0,MAX_TAROT);write(state);
  }
  function recordGameStart(game){
    if(!GAME_LABELS[game])return;
    const state=read();state.games.plays[game]=(Number(state.games.plays[game])||0)+1;
    state.games.lastPlayed={game,at:new Date().toISOString()};write(state);
  }
  const localNumber=key=>{try{const n=Number(localStorage.getItem(key));return Number.isFinite(n)&&n>0?n:0}catch(_){return 0}};
  function gameSnapshot(){
    const state=read(),plays=state.games.plays||{};
    const records={
      chuntris:Math.max(localNumber('chuntris.bestScore.classic.v1'),localNumber('chuntris.bestScore.hard.v1'),localNumber('chuntris.bestScore.classic.extreme.v1'),localNumber('chuntris.bestScore.score180.normal.v1'),localNumber('chuntris.bestScore.score180.hard.v1'),localNumber('chuntris.bestScore.score180.extreme.v1')),
      chunbak:localNumber('chunbak:best:v1'),chungwagame:localNumber('chungwagame-best-v2'),chuncortile:localNumber('chuncortile.best.v1')
    };
    const totalPlays=Object.values(plays).reduce((a,b)=>a+(Number(b)||0),0);
    const playedGames=Object.keys(GAME_LABELS).filter(key=>(Number(plays[key])||0)>0).length;
    const achievements=[
      {id:'first',title:'첫 발자국',desc:'미니게임을 처음 플레이',earned:totalPlays>=1},
      {id:'regular',title:'게임 단골',desc:'누적 10회 플레이',earned:totalPlays>=10},
      {id:'explorer',title:'4종 탐험가',desc:'4개 미니게임 모두 플레이',earned:playedGames===4},
      {id:'chuntris',title:'블록 러너',desc:'춘트리스 10,000점 이상',earned:records.chuntris>=10000},
      {id:'chunbak',title:'합체 장인',desc:'춘박게임 1,000점 이상',earned:records.chunbak>=1000},
      {id:'chungwa',title:'합계 10 장인',desc:'춘과게임 100점 이상',earned:records.chungwagame>=100},
      {id:'tile',title:'컬러 마스터',desc:'춘컬타일 100점 이상',earned:records.chuncortile>=100}
    ];
    return {plays,records,totalPlays,playedGames,lastPlayed:state.games.lastPlayed,achievements};
  }
  function dailyChallenge(){
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const list=[
      {game:'chuntris',title:'춘트리스 한 판',desc:'오늘 춘트리스 기록을 하나 만들어보세요.'},
      {game:'chunbak',title:'왕관 춘봉 도전',desc:'춘박게임에서 최고 기록에 도전해 보세요.'},
      {game:'chungwagame',title:'합계 10 도전',desc:'춘과게임에서 연속으로 10을 만들어보세요.'},
      {game:'chuncortile',title:'컬러 타일 도전',desc:'춘컬타일에서 오늘 최고 점수를 노려보세요.'}
    ];
    const seed=[...date].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    return {...list[seed%list.length],date,href:list[seed%list.length].game+'.html'};
  }

  function formatDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
  function esc(value=''){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
  function hrefFor(item){
    if(item?.href)return item.href;
    const type=item?.type||'vod';const id=encodeURIComponent(item?.id||'');
    if(type==='youtube')return 'youtube.html?open='+id;
    if(type==='clip'||type==='catch')return 'clips.html?kind='+encodeURIComponent(type)+'&open='+id;
    if(type==='fanart')return 'fanart.html?open='+id;
    return 'vod.html?open='+id;
  }

  let selectedMedia=null;
  function syncSaveButton(){
    const page=document.body.dataset.page;
    if(!['vod','clips','youtube'].includes(page))return;
    const viewer=document.getElementById(page==='clips'?'clip-viewer':page+'-viewer');
    const info=viewer?.querySelector('.player-info');if(!info)return;
    let button=info.querySelector('[data-personal-save-current]');
    if(!button){button=document.createElement('button');button.type='button';button.className='personal-save-button';button.dataset.personalSaveCurrent='';info.appendChild(button);button.addEventListener('click',()=>{if(selectedMedia){favoriteItem(selectedMedia);syncSaveButton()}})}
    const saved=selectedMedia&&isFavorite(selectedMedia);
    button.disabled=!selectedMedia;button.classList.toggle('is-saved',Boolean(saved));
    button.textContent=saved?'★ 보관함 저장됨':'☆ 나중에 보기';
    button.setAttribute('aria-pressed',String(Boolean(saved)));
  }
  document.addEventListener('chunbong:media-selected',event=>{
    selectedMedia=event.detail||null;
    if(selectedMedia){recordRecent(selectedMedia);syncSaveButton()}
  });
  document.addEventListener('chunbong:fanart-selected',event=>{
    const item=event.detail;if(!item)return;
    const copy=document.querySelector('#fanart-modal .fanart-modal-copy');if(!copy)return;
    let button=copy.querySelector('[data-personal-fanart-save]');
    if(!button){button=document.createElement('button');button.type='button';button.className='personal-save-button';button.dataset.personalFanartSave='';copy.appendChild(button)}
    const render=()=>{const saved=isFavorite(item);button.textContent=saved?'★ 보관함 저장됨':'☆ 보관함에 저장';button.classList.toggle('is-saved',saved);button.setAttribute('aria-pressed',String(saved))};
    button.onclick=()=>{favoriteItem(item);render()};render();
  });
  document.addEventListener('chunbong:tarot-reading',event=>recordTarot(event.detail||{}));

  function watchGame(){
    const game=document.body.dataset.game;if(!GAME_LABELS[game])return;
    const root=document.querySelector('[data-game-status]');if(!root)return;
    let previous=root.dataset.gameStatus||'';
    if(previous==='playing')recordGameStart(game);
    new MutationObserver(()=>{
      const next=root.dataset.gameStatus||'';
      if(next==='playing'&&previous!=='playing'&&previous!=='paused')recordGameStart(game);
      previous=next;
    }).observe(root,{attributes:true,attributeFilter:['data-game-status']});
  }

  async function setAlertEnabled(enabled){
    const state=read();
    if(enabled&&(!('Notification'in window))) enabled=false;
    if(enabled&&'Notification'in window){
      const permission=Notification.permission;
      if(permission==='default'){
        try{const nextPermission=await Notification.requestPermission();if(nextPermission!=='granted')enabled=false}catch(_){enabled=false}
      }else if(permission!=='granted')enabled=false;
    }
    state.alerts.enabled=Boolean(enabled);write(state);return state.alerts.enabled;
  }
  async function showReminder(item){
    const title='춘봉 방송 예정 시간이에요';
    const options={body:item.title||'방송 일정을 확인해 보세요.',icon:'/assets/app-icon-192.png',badge:'/assets/app-icon-192.png',tag:'chunbong-schedule-'+String(item.start||''),data:{url:'/schedule.html'}};
    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg?.showNotification)await reg.showNotification(title,options);
      else if('Notification'in window&&Notification.permission==='granted')new Notification(title,options);
    }catch(_){}
  }
  async function checkLiveReminder(){
    const state=read();if(!state.alerts.enabled)return;
    try{
      const payload=window.ChunbongCache
        ?await window.ChunbongCache.fetchJson('personal:live','/api/content?type=live',{ttl:30000,force:true})
        :await fetch('/api/content?type=live',{headers:{accept:'application/json'},cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
      if(payload?.live!==true)return;
      const broadcastId=String(payload.broadcastId||payload.startedAt||payload.title||'live');
      if(state.alerts.lastLiveBroadcastId===broadcastId)return;
      const title='춘봉 방송이 시작됐어요';
      const options={body:payload.title||'SOOP에서 방송이 시작됐습니다.',icon:'/assets/app-icon-192.png',badge:'/assets/app-icon-192.png',tag:'chunbong-live-'+broadcastId,data:{url:'/'}};
      try{
        const reg=await navigator.serviceWorker?.ready;
        if(reg?.showNotification)await reg.showNotification(title,options);
        else if('Notification'in window&&Notification.permission==='granted')new Notification(title,options);
      }catch(_){}
      state.alerts.lastLiveBroadcastId=broadcastId;write(state);
    }catch(_){}
  }

  async function checkBroadcastReminder(){
    const state=read();if(!state.alerts.enabled)return;
    try{
      const payload=window.ChunbongCache
        ?await window.ChunbongCache.fetchJson('personal:schedule','/api/content?type=schedule',{ttl:60000})
        :await fetch('/api/content?type=schedule',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject());
      const now=Date.now();const items=Array.isArray(payload.items)?payload.items:[];
      const target=items.find(item=>{
        if(!item?.isDateTime)return false;const at=Date.parse(item.start);if(!Number.isFinite(at))return false;
        return now>=at-5*60000&&now<=at+15*60000;
      });
      if(!target)return;
      const key=String(target.start||'')+'|'+String(target.title||'');
      if(state.alerts.lastNotified===key)return;
      await showReminder(target);state.alerts.lastNotified=key;write(state);
    }catch(_){}
  }

  function renderDashboard(){
    const root=document.querySelector('[data-personal-dashboard]');if(!root)return;
    const state=read(),game=gameSnapshot(),challenge=dailyChallenge();
    const recent=state.recent;
    const latestTarot=state.tarot[0];
    const earned=game.achievements.filter(x=>x.earned);
    root.innerHTML=`
      <section class="personal-hero-card">
        <div><p class="kicker">MY CHUNBONG HUB</p><h1>내 팬허브</h1><p>즐겨찾기, 이어보기, 타로 기록과 미니게임 기록은 이 기기에만 저장됩니다.</p></div>
        <div class="personal-summary"><span><b>${state.favorites.length}</b>보관함</span><span><b>${state.tarot.length}</b>타로 기록</span><span><b>${game.totalPlays}</b>게임 플레이</span><span><b>${earned.length}</b>업적</span></div>
      </section>
      <div class="personal-grid">
        <section class="personal-panel"><header><div><small>CONTINUE</small><h2>이어보기</h2></div></header>
          ${recent?`<a class="personal-recent" href="${esc(hrefFor(recent))}"><strong>${esc(recent.title||'최근 콘텐츠')}</strong><span>${esc(recent.meta||recent.type||'')} · ${esc(formatDate(recent.updatedAt))}${recent.progress?' · '+Math.floor(recent.progress/60)+':'+String(recent.progress%60).padStart(2,'0')+'까지':''}</span><b>이어보기 →</b></a>`:'<p class="personal-empty">아직 본 콘텐츠가 없습니다.</p>'}
        </section>
        <section class="personal-panel"><header><div><small>DAILY CHALLENGE</small><h2>오늘의 도전</h2></div></header>
          <a class="personal-challenge" href="${challenge.href}"><strong>${esc(challenge.title)}</strong><span>${esc(challenge.desc)}</span><b>도전하기 →</b></a>
        </section>
        <section class="personal-panel personal-alert-panel"><header><div><small>LIVE & SCHEDULE ALERT</small><h2>방송 알림</h2></div><button type="button" data-personal-alert-toggle aria-pressed="${String(state.alerts.enabled)}">${state.alerts.enabled?'ON':'OFF'}</button></header><p>팬사이트나 설치한 앱이 실행 중일 때 실제 LIVE 시작 또는 예정된 방송 시간에 브라우저 알림을 표시합니다.</p></section>
        <section class="personal-panel"><header><div><small>TAROT JOURNAL</small><h2>최근 타로</h2></div><a href="tarot.html">타로 보기 →</a></header>
          ${latestTarot?`<article class="personal-tarot-latest"><strong>${esc(latestTarot.question||'질문 없는 리딩')}</strong><span>${latestTarot.cards.map(c=>esc(c.name)).join(' · ')}</span><small>${esc(formatDate(latestTarot.createdAt))}</small></article>`:'<p class="personal-empty">타로를 보면 자동으로 기록됩니다.</p>'}
        </section>
      </div>
      <section class="personal-panel personal-wide"><header><div><small>SAVED</small><h2>내 보관함</h2></div><span>${state.favorites.length}개</span></header>
        <div class="personal-saved-grid">${state.favorites.length?state.favorites.map(item=>`<article><a href="${esc(hrefFor(item))}"><small>${esc((item.type||'saved').toUpperCase())}</small><strong>${esc(item.title||'저장한 콘텐츠')}</strong><span>${esc(item.meta||'')}</span></a><button type="button" data-remove-favorite="${esc(keyOf(item))}" data-remove-type="${esc(item.type||'')}">삭제</button></article>`).join(''):'<p class="personal-empty">다시보기·핫클립·유튜브·팬아트를 보관함에 저장해 보세요.</p>'}</div>
      </section>
      <section class="personal-panel personal-wide"><header><div><small>ACHIEVEMENTS</small><h2>미니게임 업적</h2></div><a href="minigames.html">게임 기록 →</a></header>
        <div class="personal-achievement-grid">${game.achievements.map(row=>`<article class="${row.earned?'is-earned':''}"><span>${row.earned?'✓':'○'}</span><div><strong>${esc(row.title)}</strong><small>${esc(row.desc)}</small></div></article>`).join('')}</div>
      </section>
      <section class="personal-panel personal-wide"><header><div><small>TAROT JOURNAL</small><h2>타로 기록장</h2></div><span>최근 ${Math.min(state.tarot.length,10)}개</span></header>
        <div class="personal-tarot-list">${state.tarot.length?state.tarot.slice(0,10).map(row=>`<article><time>${esc(formatDate(row.createdAt))}</time><strong>${esc(row.question||'질문 없는 리딩')}</strong><span>${row.cards.map(c=>esc(c.name)+(c.orientation==='reversed'?' ↕':'')).join(' · ')}</span></article>`).join(''):'<p class="personal-empty">아직 저장된 타로 기록이 없습니다.</p>'}</div>
      </section>`;
    root.querySelector('[data-personal-alert-toggle]')?.addEventListener('click',async event=>{const enabled=await setAlertEnabled(!read().alerts.enabled);event.currentTarget.textContent=enabled?'ON':'OFF';event.currentTarget.setAttribute('aria-pressed',String(enabled))});
    root.querySelectorAll('[data-remove-favorite]').forEach(button=>button.addEventListener('click',()=>{const state=read();state.favorites=state.favorites.filter(item=>!(keyOf(item)===button.dataset.removeFavorite&&String(item.type||'')===String(button.dataset.removeType||'')));write(state);renderDashboard()}));
  }

  function renderAppHome(){
    const root=document.querySelector('[data-app-home-panel]');if(!root)return;
    const state=read(),game=gameSnapshot(),challenge=dailyChallenge(),recent=state.recent;
    root.innerHTML=`
      <div class="app-home-head"><div><small>MY APP HOME</small><strong>오늘의 팬허브</strong></div><a href="myhub.html">내 팬허브 →</a></div>
      <div class="app-home-grid">
        <a href="${recent?esc(hrefFor(recent)):'vod.html'}"><small>이어보기</small><strong>${esc(recent?.title||'최근 영상 보기')}</strong></a>
        <a href="tarot.html"><small>오늘의 타로</small><strong>${state.tarot[0]?esc(state.tarot[0].cards[0]?.name||'다시 타로 보기'):'카드 뽑기'}</strong></a>
        <a href="${challenge.href}"><small>오늘의 게임</small><strong>${esc(challenge.title)}</strong></a>
        <a href="myhub.html"><small>내 기록</small><strong>★ ${state.favorites.length} · 🏆 ${game.achievements.filter(x=>x.earned).length}</strong></a>
      </div>`;
  }

  function boot(){
    selectedMedia=window.__CHUNBONG_CURRENT_MEDIA__||selectedMedia;
    if(selectedMedia)recordRecent(selectedMedia);
    watchGame();renderDashboard();renderAppHome();syncSaveButton();
    const nativeVideo=document.querySelector('video');
    const restoreNativeProgress=()=>{
      if(!nativeVideo||!selectedMedia)return;
      const recent=read().recent;
      if(!recent||keyOf(recent)!==keyOf(selectedMedia)||String(recent.type||'')!==String(selectedMedia.type||''))return;
      const progress=Number(recent.progress)||0;
      const duration=Number(nativeVideo.duration)||Number(recent.duration)||0;
      if(progress>3&&(!duration||progress<duration-3)){
        try{nativeVideo.currentTime=progress}catch(_){}
      }
    };
    nativeVideo?.addEventListener('loadedmetadata',restoreNativeProgress);
    if(nativeVideo?.readyState>=1)restoreNativeProgress();
    let lastProgressWrite=0;
    nativeVideo?.addEventListener('timeupdate',()=>{
      if(!selectedMedia||!Number.isFinite(nativeVideo.currentTime))return;
      if(Date.now()-lastProgressWrite<5000)return;
      lastProgressWrite=Date.now();
      recordRecent({...selectedMedia,progress:Math.max(0,Math.floor(nativeVideo.currentTime)),duration:Number.isFinite(nativeVideo.duration)?Math.floor(nativeVideo.duration):0});
    });
    document.addEventListener('chunbong:personal-updated',()=>{renderDashboard();renderAppHome();syncSaveButton()});
    setTimeout(()=>document.dispatchEvent(new CustomEvent('chunbong:personal-updated',{detail:read()})),0);
    void checkBroadcastReminder();void checkLiveReminder();
    const timer=setInterval(()=>{void checkBroadcastReminder();void checkLiveReminder()},60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){void checkBroadcastReminder();void checkLiveReminder()}});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  window.ChunbongPersonal={read,write,favoriteItem,isFavorite,recordRecent,recordTarot,recordGameStart,gameSnapshot,dailyChallenge,setAlertEnabled,renderDashboard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();