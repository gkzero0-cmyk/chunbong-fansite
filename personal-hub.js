(()=>{
  'use strict';
  if(window.ChunbongPersonal)return;
  const STORAGE_KEY='chunbong-personal-hub-v1';
  const MAX_FAVORITES=80,MAX_TAROT=40;
  const GAME_LABELS={chuntris:'춘트리스',chunbak:'춘박게임',chungwagame:'춘과게임',chuncortile:'춘컬타일'};
  const COLLECTIONS=Object.freeze({later:'나중에 보기',funny:'웃긴 방송',minecraft:'마크 명장면',favorite:'다시 보고 싶은 콘텐츠'});
  const ALERT_TYPE_LABELS=Object.freeze({live:'LIVE 시작',tarot:'타로 방송',minecraft:'마인크래프트',collab:'합방',special:'특별 콘텐츠',other:'기타 일정'});
  const blank=()=>({version:2,favorites:[],recent:null,tarot:[],games:{plays:{},lastPlayed:null,daily:{}},alerts:{enabled:false,leadMinutes:10,types:{live:true,tarot:true,minecraft:true,collab:true,special:true,other:true},lastNotified:'',lastLiveBroadcastId:''}});
  const safeParse=value=>{try{return JSON.parse(value)}catch(_){return null}};
  function normalizeImportedState(payload){
    const parsed=payload?.state&&typeof payload.state==='object'?payload.state:payload;
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid_backup');
    return {
      ...blank(),...parsed,
      favorites:(Array.isArray(parsed.favorites)?parsed.favorites:[]).slice(0,MAX_FAVORITES).map(row=>({...row,collection:COLLECTIONS[row?.collection]?row.collection:'later'})),
      tarot:(Array.isArray(parsed.tarot)?parsed.tarot:[]).slice(0,MAX_TAROT).map(row=>({...row,pinned:Boolean(row?.pinned)})),
      games:{...blank().games,...(parsed.games||{}),plays:{...(parsed.games?.plays||{})},daily:{...(parsed.games?.daily||{})}},
      alerts:{...blank().alerts,...(parsed.alerts||{}),types:{...blank().alerts.types,...(parsed.alerts?.types||{})}}
    };
  }
  function exportBackup(){
    const payload={format:'chunbong-fanhub-backup',version:1,exportedAt:new Date().toISOString(),state:read()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='chunbong-fanhub-backup-'+kstDateKey(new Date())+'.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importBackupFile(file){
    if(!file)throw new Error('missing_file');
    const text=await file.text();
    const parsed=safeParse(text);
    const next=normalizeImportedState(parsed);
    write(next);
    return next;
  }
  function resetPersonalData(){return write(blank())}
  function read(){
    try{
      const parsed=safeParse(localStorage.getItem(STORAGE_KEY)||'');
      if(!parsed||typeof parsed!=='object')return blank();
      return {
        ...blank(),...parsed,
        favorites:(Array.isArray(parsed.favorites)?parsed.favorites:[]).map(row=>({...row,collection:COLLECTIONS[row?.collection]?row.collection:'later'})),
        tarot:(Array.isArray(parsed.tarot)?parsed.tarot:[]).map(row=>({...row,pinned:Boolean(row?.pinned)})),
        games:{...blank().games,...(parsed.games||{}),plays:{...(parsed.games?.plays||{})},daily:{...(parsed.games?.daily||{})}},
        alerts:{...blank().alerts,...(parsed.alerts||{}),types:{...blank().alerts.types,...(parsed.alerts?.types||{})}}
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
    else state.favorites.unshift({...item,id:key,collection:COLLECTIONS[item?.collection]?item.collection:'later',savedAt:new Date().toISOString()});
    state.favorites=state.favorites.slice(0,MAX_FAVORITES);write(state);return index<0;
  }
  function setFavoriteCollection(key,type,collection){
    if(!COLLECTIONS[collection])return false;
    const state=read(),row=state.favorites.find(item=>keyOf(item)===String(key)&&String(item.type||'')===String(type||''));
    if(!row)return false;row.collection=collection;write(state);return true;
  }
  function toggleTarotPinned(id){
    const state=read(),row=state.tarot.find(item=>String(item.id)===String(id));if(!row)return false;
    row.pinned=!row.pinned;write(state);return row.pinned;
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
      id:'tarot-'+Date.now(),createdAt:new Date().toISOString(),pinned:false,
      question:String(entry.question||'').slice(0,500),
      topic:String(entry.topic||'general'),spreadId:String(entry.spreadId||'single'),
      cards:cards.slice(0,12).map(card=>({
        name:String(card.name||''),orientation:card.orientation==='reversed'?'reversed':'upright',
        position:String(card.position||''),deckNumber:Number(card.deckNumber)||0
      }))
    };
    state.tarot.unshift(row);state.tarot=state.tarot.slice(0,MAX_TAROT);write(state);return row.id;
  }
  function attachTarotReading(id,reading){
    if(!id||!reading||typeof reading!=='object')return false;
    const state=read(),row=state.tarot.find(item=>String(item.id)===String(id));
    if(!row)return false;
    try{row.reading=JSON.parse(JSON.stringify(reading))}catch(_){return false}
    write(state);return true;
  }
  const kstDateKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(value instanceof Date?value:new Date(value));
  const shiftDate=(key,days)=>{const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  function challengeDefinition(date){
    const list=[
      {kind:'game',game:'chuntris',goal:2,title:'춘트리스 2판',desc:'오늘 춘트리스를 2판 플레이해 보세요.'},
      {kind:'game',game:'chunbak',goal:2,title:'춘박게임 2판',desc:'오늘 왕관 춘봉을 향해 2판 도전해 보세요.'},
      {kind:'game',game:'chungwagame',goal:2,title:'합계 10 두 판',desc:'춘과게임을 2판 플레이해 오늘 감각을 올려보세요.'},
      {kind:'game',game:'chuncortile',goal:2,title:'컬러 타일 두 판',desc:'춘컬타일을 2판 플레이해 오늘 기록에 도전해 보세요.'},
      {kind:'any',goal:3,title:'오늘 3판 플레이',desc:'어떤 미니게임이든 합쳐서 3판 플레이해 보세요.'},
      {kind:'variety',goal:2,title:'두 게임 탐험',desc:'서로 다른 미니게임 2종을 오늘 플레이해 보세요.'}
    ];
    const seed=[...String(date)].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);return list[seed%list.length];
  }
  function challengeProgress(spec,row={}){const plays=row.plays||{};if(spec.kind==='game')return Number(plays[spec.game])||0;if(spec.kind==='variety')return Object.values(plays).filter(value=>(Number(value)||0)>0).length;return Object.values(plays).reduce((sum,value)=>sum+(Number(value)||0),0)}
  function dailyStreak(state,today=kstDateKey(new Date())){const daily=state.games?.daily||{};let key=today,streak=0;if(!daily[key]?.completed)key=shiftDate(key,-1);for(let i=0;i<365&&daily[key]?.completed;i+=1){streak+=1;key=shiftDate(key,-1)}return streak}
  function recordGameStart(game){
    if(!GAME_LABELS[game])return;
    const state=read(),date=kstDateKey(new Date());state.games.plays[game]=(Number(state.games.plays[game])||0)+1;state.games.lastPlayed={game,at:new Date().toISOString()};
    const row=state.games.daily[date]||{plays:{},completed:false};row.plays={...(row.plays||{})};row.plays[game]=(Number(row.plays[game])||0)+1;const spec=challengeDefinition(date);row.completed=Boolean(row.completed||challengeProgress(spec,row)>=spec.goal);state.games.daily[date]=row;Object.keys(state.games.daily).sort().slice(0,-90).forEach(key=>delete state.games.daily[key]);write(state);
  }
  const localNumber=key=>{try{const n=Number(localStorage.getItem(key));return Number.isFinite(n)&&n>0?n:0}catch(_){return 0}};
  function gameSnapshot(){
    const state=read(),plays=state.games.plays||{},streak=dailyStreak(state);
    const records={chuntris:Math.max(localNumber('chuntris.bestScore.classic.v1'),localNumber('chuntris.bestScore.hard.v1'),localNumber('chuntris.bestScore.classic.extreme.v1'),localNumber('chuntris.bestScore.score180.normal.v1'),localNumber('chuntris.bestScore.score180.hard.v1'),localNumber('chuntris.bestScore.score180.extreme.v1')),chunbak:localNumber('chunbak:best:v1'),chungwagame:localNumber('chungwagame-best-v2'),chuncortile:localNumber('chuncortile.best.v1')};
    const totalPlays=Object.values(plays).reduce((a,b)=>a+(Number(b)||0),0),playedGames=Object.keys(GAME_LABELS).filter(key=>(Number(plays[key])||0)>0).length;
    const achievements=[{id:'first',title:'첫 발자국',desc:'미니게임을 처음 플레이',earned:totalPlays>=1},{id:'regular',title:'게임 단골',desc:'누적 10회 플레이',earned:totalPlays>=10},{id:'explorer',title:'4종 탐험가',desc:'4개 미니게임 모두 플레이',earned:playedGames===4},{id:'streak3',title:'3일 연속 출석',desc:'일일 도전 3일 연속 완료',earned:streak>=3},{id:'streak7',title:'일주일 도전자',desc:'일일 도전 7일 연속 완료',earned:streak>=7},{id:'chuntris',title:'블록 러너',desc:'춘트리스 10,000점 이상',earned:records.chuntris>=10000},{id:'chunbak',title:'합체 장인',desc:'춘박게임 1,000점 이상',earned:records.chunbak>=1000},{id:'chungwa',title:'합계 10 장인',desc:'춘과게임 100점 이상',earned:records.chungwagame>=100},{id:'tile',title:'컬러 마스터',desc:'춘컬타일 100점 이상',earned:records.chuncortile>=100}];
    return {plays,records,totalPlays,playedGames,lastPlayed:state.games.lastPlayed,achievements,dailyStreak:streak};
  }
  function dailyChallenge(){const state=read(),date=kstDateKey(new Date()),spec=challengeDefinition(date),row=state.games.daily[date]||{plays:{},completed:false};const progress=Math.min(spec.goal,challengeProgress(spec,row)),completed=Boolean(row.completed||progress>=spec.goal),streak=dailyStreak(state,date);return {...spec,date,href:spec.game?spec.game+'.html':'minigames.html',progress,completed,streak}}

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
  let lastTarotRecordId='';
  document.addEventListener('chunbong:tarot-reading',event=>{lastTarotRecordId=recordTarot(event.detail||{})||''});
  document.addEventListener('chunbong:tarot-reading-detail',event=>{
    if(lastTarotRecordId)attachTarotReading(lastTarotRecordId,event.detail?.reading||event.detail||{});
  });

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
  function setAlertType(type,enabled){if(!Object.prototype.hasOwnProperty.call(ALERT_TYPE_LABELS,type))return false;const state=read();state.alerts.types[type]=Boolean(enabled);write(state);return state.alerts.types[type]}
  function setAlertLead(value){const lead=[5,10,30].includes(Number(value))?Number(value):10;const state=read();state.alerts.leadMinutes=lead;write(state);return lead}
  function classifyScheduleItem(item={}){const text=[item.title,...(Array.isArray(item.tags)?item.tags:[])].filter(Boolean).join(' ').toLowerCase();if(/타로|tarot/.test(text))return'tarot';if(/마인크래프트|minecraft|마크|서버|엔더|광질/.test(text))return'minecraft';if(/합방|합동|콜라보|collab|with /.test(text))return'collab';if(/특별|콘텐츠|대회|원정대|춘타클|이벤트|배그|프로젝트/.test(text))return'special';return'other'}
  function alertPermissionGranted(){
    return 'Notification'in window&&Notification.permission==='granted';
  }
  function disableUnavailableAlerts(state){
    if(alertPermissionGranted())return false;
    state.alerts.enabled=false;write(state);return true;
  }
  async function deliverNotification(title,options){
    try{
      const reg=await navigator.serviceWorker?.ready;
      if(reg?.showNotification){await reg.showNotification(title,options);return true}
      if('Notification'in window&&Notification.permission==='granted'){new Notification(title,options);return true}
    }catch(_){}
    return false;
  }
  async function showReminder(item){
    const title='춘봉 방송 예정 시간이에요';
    const options={body:item.title||'방송 일정을 확인해 보세요.',icon:'/assets/app-icon-192.png',badge:'/assets/app-icon-192.png',tag:'chunbong-schedule-'+String(item.start||''),data:{url:'/schedule.html'}};
    return deliverNotification(title,options);
  }
  async function checkLiveReminder(){
    const state=read();if(!state.alerts.enabled||state.alerts.types?.live===false)return;
    if(disableUnavailableAlerts(state))return;
    try{
      const payload=window.ChunbongCache
        ?await window.ChunbongCache.fetchJson('personal:live','/api/content?type=live',{ttl:30000,force:true})
        :await fetch('/api/content?type=live',{headers:{accept:'application/json'},cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
      if(payload?.live!==true)return;
      const broadcastId=String(payload.broadcastId||payload.startedAt||payload.title||'live');
      if(state.alerts.lastLiveBroadcastId===broadcastId)return;
      const title='춘봉 방송이 시작됐어요';
      const options={body:payload.title||'SOOP에서 방송이 시작됐습니다.',icon:'/assets/app-icon-192.png',badge:'/assets/app-icon-192.png',tag:'chunbong-live-'+broadcastId,data:{url:'/'}};
      const delivered=await deliverNotification(title,options);
      if(!delivered)return;
      state.alerts.lastLiveBroadcastId=broadcastId;write(state);
    }catch(_){}
  }

  async function checkBroadcastReminder(){
    const state=read();if(!state.alerts.enabled)return;
    if(disableUnavailableAlerts(state))return;
    try{
      const payload=window.ChunbongCache
        ?await window.ChunbongCache.fetchJson('personal:schedule','/api/content?type=schedule',{ttl:60000})
        :await fetch('/api/content?type=schedule',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject());
      const now=Date.now(),lead=[5,10,30].includes(Number(state.alerts.leadMinutes))?Number(state.alerts.leadMinutes):10;const items=Array.isArray(payload.items)?payload.items:[];
      const target=items.find(item=>{if(!item?.isDateTime)return false;const at=Date.parse(item.start);if(!Number.isFinite(at))return false;const type=classifyScheduleItem(item);if(state.alerts.types?.[type]===false)return false;return now>=at-lead*60000&&now<=at+15*60000;});
      if(!target)return;
      const key=String(target.start||'')+'|'+String(target.title||'');
      if(state.alerts.lastNotified===key)return;
      if(!(await showReminder(target)))return;
      state.alerts.lastNotified=key;write(state);
    }catch(_){}
  }

  function renderDashboard(){
    const root=document.querySelector('[data-personal-dashboard]');if(!root)return;
    const state=read(),game=gameSnapshot(),challenge=dailyChallenge(),recent=state.recent,latestTarot=state.tarot[0],earned=game.achievements.filter(x=>x.earned),collections=Object.entries(COLLECTIONS),counts=Object.fromEntries(collections.map(([key])=>[key,state.favorites.filter(item=>(item.collection||'later')===key).length])),tarotRows=state.tarot.slice().sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    root.innerHTML=`<section class="personal-hero-card"><div><p class="kicker">MY CHUNBONG HUB</p><h1>내 팬허브</h1><p>즐겨찾기, 이어보기, 타로 기록과 미니게임 기록은 이 기기에만 저장됩니다.</p></div><div class="personal-summary"><span><b>${state.favorites.length}</b>보관함</span><span><b>${state.tarot.length}</b>타로 기록</span><span><b>${game.totalPlays}</b>게임 플레이</span><span><b>${earned.length}</b>업적</span></div></section>
    <div class="personal-grid"><section class="personal-panel"><header><div><small>CONTINUE</small><h2>이어보기</h2></div></header>${recent?`<a class="personal-recent" href="${esc(hrefFor(recent))}"><strong>${esc(recent.title||'최근 콘텐츠')}</strong><span>${esc(recent.meta||recent.type||'')} · ${esc(formatDate(recent.updatedAt))}${recent.progress?' · '+Math.floor(recent.progress/60)+':'+String(recent.progress%60).padStart(2,'0')+'까지':''}</span><b>이어보기 →</b></a>`:'<p class="personal-empty">아직 본 콘텐츠가 없습니다.</p>'}</section>
    <section class="personal-panel"><header><div><small>DAILY CHALLENGE</small><h2>오늘의 도전</h2></div><span>${challenge.completed?'완료 ✓':challenge.progress+'/'+challenge.goal}</span></header><a class="personal-challenge ${challenge.completed?'is-complete':''}" href="${challenge.href}"><strong>${esc(challenge.title)}</strong><span>${esc(challenge.desc)}</span><b>${challenge.completed?'오늘 도전 완료 · 연속 '+challenge.streak+'일':'도전하기 · '+challenge.progress+'/'+challenge.goal+' →'}</b></a></section>
    <section class="personal-panel personal-alert-panel ${state.alerts.enabled?'is-on':'is-off'}"><header><div><small>LIVE & SCHEDULE ALERT</small><h2>방송 알림</h2><span class="personal-alert-default">기본 설정 OFF · 직접 켠 경우에만 알림</span></div><button type="button" data-personal-alert-toggle aria-pressed="${String(state.alerts.enabled)}" aria-label="방송 알림 ${state.alerts.enabled?'끄기':'켜기'}"><span>${state.alerts.enabled?'ON':'OFF'}</span></button></header><p>${state.alerts.enabled?'알림이 켜져 있습니다. 원하는 방송 종류와 미리 알림 시간을 선택하세요.':'알림은 현재 꺼져 있습니다. ON으로 바꾸기 전까지 알림 권한 요청이나 방송 알림이 발생하지 않습니다.'}</p><fieldset class="personal-alert-settings" ${state.alerts.enabled?'':'disabled'}><legend class="sr-only">방송 알림 세부 설정</legend><div class="personal-alert-options">${Object.entries(ALERT_TYPE_LABELS).map(([key,label])=>`<label><input type="checkbox" data-personal-alert-type="${key}" ${state.alerts.types?.[key]!==false?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div><label class="personal-alert-lead"><span>예정 방송 미리 알림</span><select data-personal-alert-lead><option value="5" ${Number(state.alerts.leadMinutes)===5?'selected':''}>5분 전</option><option value="10" ${Number(state.alerts.leadMinutes)===10?'selected':''}>10분 전</option><option value="30" ${Number(state.alerts.leadMinutes)===30?'selected':''}>30분 전</option></select></label></fieldset></section>
    <section class="personal-panel"><header><div><small>TAROT JOURNAL</small><h2>최근 타로</h2></div><a href="tarot.html">타로 보기 →</a></header>${latestTarot?`<article class="personal-tarot-latest"><strong>${esc(latestTarot.question||'질문 없는 리딩')}</strong><span>${latestTarot.cards.map(c=>esc(c.name)).join(' · ')}</span><small>${esc(formatDate(latestTarot.createdAt))}</small></article>`:'<p class="personal-empty">타로를 보면 자동으로 기록됩니다.</p>'}</section></div>
    <section class="personal-panel personal-wide"><header><div><small>SAVED COLLECTIONS</small><h2>내 보관함</h2></div><span>${state.favorites.length}개</span></header><div class="personal-collection-tabs"><button type="button" class="is-active" data-collection-filter="all">전체 <b>${state.favorites.length}</b></button>${collections.map(([key,label])=>`<button type="button" data-collection-filter="${key}">${esc(label)} <b>${counts[key]}</b></button>`).join('')}</div><div class="personal-saved-grid">${state.favorites.length?state.favorites.map(item=>`<article data-personal-collection="${esc(item.collection||'later')}"><a href="${esc(hrefFor(item))}"><small>${esc((item.type||'saved').toUpperCase())}</small><strong>${esc(item.title||'저장한 콘텐츠')}</strong><span>${esc(item.meta||'')}</span></a><select data-favorite-collection data-favorite-key="${esc(keyOf(item))}" data-favorite-type="${esc(item.type||'')}">${collections.map(([key,label])=>`<option value="${key}" ${(item.collection||'later')===key?'selected':''}>${esc(label)}</option>`).join('')}</select><button type="button" data-remove-favorite="${esc(keyOf(item))}" data-remove-type="${esc(item.type||'')}">삭제</button></article>`).join(''):'<p class="personal-empty">콘텐츠를 보관함에 저장해 보세요.</p>'}</div></section>
    <section class="personal-panel personal-wide"><header><div><small>ACHIEVEMENTS</small><h2>미니게임 업적</h2></div><a href="minigames.html">게임 기록 →</a></header><div class="personal-achievement-grid">${game.achievements.map(row=>`<article class="${row.earned?'is-earned':''}"><span>${row.earned?'✓':'○'}</span><div><strong>${esc(row.title)}</strong><small>${esc(row.desc)}</small></div></article>`).join('')}</div></section>
    <section class="personal-panel personal-wide"><header><div><small>TAROT JOURNAL</small><h2>타로 기록장</h2></div><span>★ ${state.tarot.filter(row=>row.pinned).length} · 최근 ${Math.min(state.tarot.length,10)}개</span></header><div class="personal-tarot-list">${tarotRows.length?tarotRows.slice(0,10).map(row=>`<article class="${row.pinned?'is-pinned':''}"><time>${esc(formatDate(row.createdAt))}</time><strong>${esc(row.question||'질문 없는 리딩')}</strong><span>${row.cards.map(c=>esc(c.name)+(c.orientation==='reversed'?' ↕':'')).join(' · ')}</span><button type="button" data-pin-tarot="${esc(row.id)}" aria-pressed="${String(Boolean(row.pinned))}">${row.pinned?'★ 즐겨찾기':'☆ 즐겨찾기'}</button>${row.reading?`<button type="button" data-view-tarot="${esc(row.id)}">상세 기록</button>`:''}</article>`).join(''):'<p class="personal-empty">아직 저장된 타로 기록이 없습니다.</p>'}</div></section>`;
    root.insertAdjacentHTML('afterbegin','<section class="personal-backup-bar"><div><small>MY DATA</small><strong>내 팬허브 백업</strong><span>이 기기의 보관함·타로·게임 기록을 파일로 보관할 수 있어요.</span></div><div class="personal-backup-actions"><button type="button" data-personal-export>백업 저장</button><button type="button" data-personal-import>백업 불러오기</button><button type="button" class="is-danger" data-personal-reset>기록 초기화</button><input type="file" accept="application/json,.json" data-personal-import-file hidden></div></section>');
    const importInput=root.querySelector('[data-personal-import-file]');
    root.querySelector('[data-personal-export]')?.addEventListener('click',exportBackup);
    root.querySelector('[data-personal-import]')?.addEventListener('click',()=>importInput?.click());
    importInput?.addEventListener('change',async()=>{
      const file=importInput.files?.[0];if(!file)return;
      try{await importBackupFile(file);alert('춘봉 팬허브 백업을 불러왔습니다.')}catch(_){alert('백업 파일을 확인해 주세요.')}
      importInput.value='';
    });
    root.querySelector('[data-personal-reset]')?.addEventListener('click',()=>{
      if(confirm('이 기기에 저장된 내 팬허브 기록을 모두 초기화할까요?'))resetPersonalData();
    });
    root.querySelector('[data-personal-alert-toggle]')?.addEventListener('click',async e=>{const enabled=await setAlertEnabled(!read().alerts.enabled);e.currentTarget.textContent=enabled?'ON':'OFF';e.currentTarget.setAttribute('aria-pressed',String(enabled))});
    root.querySelectorAll('[data-personal-alert-type]').forEach(input=>input.addEventListener('change',()=>setAlertType(input.dataset.personalAlertType,input.checked)));
    root.querySelector('[data-personal-alert-lead]')?.addEventListener('change',e=>setAlertLead(e.currentTarget.value));
    root.querySelectorAll('[data-collection-filter]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-collection-filter]').forEach(n=>n.classList.toggle('is-active',n===button));const filter=button.dataset.collectionFilter;root.querySelectorAll('[data-personal-collection]').forEach(article=>article.hidden=filter!=='all'&&article.dataset.personalCollection!==filter)}));
    root.querySelectorAll('[data-favorite-collection]').forEach(select=>select.addEventListener('change',()=>setFavoriteCollection(select.dataset.favoriteKey,select.dataset.favoriteType,select.value)));
    root.querySelectorAll('[data-remove-favorite]').forEach(button=>button.addEventListener('click',()=>{const state=read();state.favorites=state.favorites.filter(item=>!(keyOf(item)===button.dataset.removeFavorite&&String(item.type||'')===String(button.dataset.removeType||'')));write(state)}));
    root.querySelectorAll('[data-pin-tarot]').forEach(button=>button.addEventListener('click',()=>toggleTarotPinned(button.dataset.pinTarot)));
    root.querySelectorAll('[data-view-tarot]').forEach(button=>button.addEventListener('click',()=>{
      const row=read().tarot.find(item=>String(item.id)===String(button.dataset.viewTarot));
      if(!row?.reading)return;
      let dialog=document.getElementById('personal-tarot-archive-dialog');
      if(!dialog){
        dialog=document.createElement('dialog');dialog.id='personal-tarot-archive-dialog';dialog.className='personal-tarot-archive-dialog';
        dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
        document.body.appendChild(dialog);
      }
      const glance=row.reading.glance||{},detail=row.reading.detail||{};
      const actions=Array.isArray(detail.actions)?detail.actions:[];
      dialog.innerHTML='<div class="personal-tarot-archive-inner"><header><div><small>TAROT ARCHIVE</small><h2>'+esc(row.question||'질문 없는 리딩')+'</h2><p>'+esc(formatDate(row.createdAt))+'</p></div><button type="button" data-close-archive aria-label="타로 기록 닫기">×</button></header>'+
        '<div class="personal-tarot-archive-cards">'+row.cards.map(card=>'<span><b>'+esc(card.position||'카드')+'</b>'+esc(card.name)+(card.orientation==='reversed'?' · 역방향':' · 정방향')+'</span>').join('')+'</div>'+
        '<section><h3>핵심 결론</h3><p>'+esc(glance.conclusion||detail.answer||'저장된 상세 해석을 확인해 주세요.')+'</p></section>'+
        (glance.positive?'<section><h3>좋은 흐름</h3><p>'+esc(glance.positive)+'</p></section>':'')+
        (glance.caution||detail.caution?'<section><h3>주의할 점</h3><p>'+esc(glance.caution||detail.caution)+'</p></section>':'')+
        (detail.reason?'<section><h3>카드가 그렇게 말하는 이유</h3><p>'+esc(detail.reason)+'</p></section>':'')+
        (actions.length?'<section><h3>지금 해볼 수 있는 것</h3><ul>'+actions.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></section>':'')+
        (detail.oneLine?'<strong class="personal-tarot-one-line">한 줄 정리 · '+esc(detail.oneLine)+'</strong>':'')+
        '</div>';
      dialog.querySelector('[data-close-archive]')?.addEventListener('click',()=>dialog.close());
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    }));
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
    let timer=0;
    const startReminderTimer=()=>{
      if(timer)clearInterval(timer);
      timer=window.setInterval(()=>{void checkBroadcastReminder();void checkLiveReminder()},60000);
    };
    const stopReminderTimer=()=>{if(timer){clearInterval(timer);timer=0}};
    startReminderTimer();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){void checkBroadcastReminder();void checkLiveReminder()}});
    window.addEventListener('pagehide',stopReminderTimer);
    window.addEventListener('pageshow',()=>{startReminderTimer();void checkBroadcastReminder();void checkLiveReminder()});
  }

  window.ChunbongPersonal={read,write,favoriteItem,isFavorite,setFavoriteCollection,toggleTarotPinned,recordRecent,recordTarot,attachTarotReading,recordGameStart,gameSnapshot,dailyChallenge,setAlertEnabled,setAlertType,setAlertLead,exportBackup,importBackupFile,resetPersonalData,renderDashboard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();