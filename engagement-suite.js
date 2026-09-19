(()=>{
  'use strict';
  if(document.body?.dataset?.game)return;

  const STORE_KEY='chunbong-personal-hub-v1';
  const ALERT_KEY='chunbong-broadcast-alert-v1';
  const MAX_FAVORITES=60;
  const MAX_RECENTS=12;
  const MAX_TAROT=40;
  const page=document.body.dataset.page||'home';
  const standalone=Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches||
    window.navigator.standalone===true||
    new URLSearchParams(location.search).get('source')==='pwa'
  );

  const safeParse=(value,fallback)=>{
    try{return JSON.parse(value)}catch(_){return fallback}
  };
  const loadStore=()=>{
    try{
      const parsed=safeParse(localStorage.getItem(STORE_KEY)||'',null);
      if(parsed&&typeof parsed==='object')return {
        favorites:Array.isArray(parsed.favorites)?parsed.favorites:[],
        recents:Array.isArray(parsed.recents)?parsed.recents:[],
        tarot:Array.isArray(parsed.tarot)?parsed.tarot:[]
      };
    }catch(_){}
    return {favorites:[],recents:[],tarot:[]};
  };
  let store=loadStore();
  const saveStore=()=>{
    try{localStorage.setItem(STORE_KEY,JSON.stringify(store))}catch(_){}
    document.dispatchEvent(new CustomEvent('chunbong:personal-hub-updated',{detail:{...store}}));
  };
  const normalizeMedia=item=>({
    id:String(item?.id||''),
    page:String(item?.page||''),
    kind:String(item?.kind||''),
    title:String(item?.title||'춘봉 콘텐츠').trim(),
    date:String(item?.date||''),
    thumb:String(item?.thumb||''),
    link:String(item?.link||''),
    at:Number(item?.at||Date.now())
  });
  const mediaKey=item=>[item.page,item.kind,item.id||item.link||item.title].join(':');
  const mediaHref=item=>{
    const target=item.page==='clip'?'clips':item.page;
    if(!['vod','youtube','clips'].includes(target))return item.link||'#';
    const params=new URLSearchParams();
    if(item.id)params.set('open',item.id);
    if(item.page==='clip'&&item.kind)params.set('kind',item.kind);
    if(item.page==='youtube'&&item.kind)params.set('kind',item.kind);
    return target+'.html'+(params.toString()?'?'+params.toString():'');
  };
  const isFavorite=item=>{
    const key=mediaKey(item);
    return store.favorites.some(row=>mediaKey(row)===key);
  };
  function toggleFavorite(item){
    const normalized=normalizeMedia(item);
    const key=mediaKey(normalized);
    const index=store.favorites.findIndex(row=>mediaKey(row)===key);
    if(index>=0)store.favorites.splice(index,1);
    else store.favorites.unshift({...normalized,at:Date.now()});
    store.favorites=store.favorites.slice(0,MAX_FAVORITES);
    saveStore();
    renderHubDrawer();
    renderDashboard();
    updateMediaFavoriteButton(normalized);
  }
  function trackRecent(item){
    const normalized=normalizeMedia({...item,at:Date.now()});
    if(!normalized.title)return;
    const key=mediaKey(normalized);
    store.recents=[normalized,...store.recents.filter(row=>mediaKey(row)!==key)].slice(0,MAX_RECENTS);
    saveStore();
    renderHubDrawer();
    renderDashboard();
    updateMediaFavoriteButton(normalized);
  }

  function esc(value=''){
    return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  function formatDate(value=''){
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return value;
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  let currentMedia=null;
  function ensureMediaFavoriteButton(){
    if(!['vod','youtube','clips'].includes(page))return null;
    const info=document.querySelector('.player-info');
    if(!info)return null;
    let button=info.querySelector('[data-media-favorite]');
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.className='personal-media-favorite';
    button.dataset.mediaFavorite='';
    button.addEventListener('click',()=>{if(currentMedia)toggleFavorite(currentMedia)});
    info.appendChild(button);
    return button;
  }
  function updateMediaFavoriteButton(item=currentMedia){
    if(!item)return;
    currentMedia=normalizeMedia(item);
    const button=ensureMediaFavoriteButton();
    if(!button)return;
    const active=isFavorite(currentMedia);
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
    button.innerHTML='<span aria-hidden="true">'+(active?'★':'☆')+'</span><strong>'+(active?'보관함 저장됨':'보관함에 저장')+'</strong>';
  }
  document.addEventListener('chunbong:media-selected',event=>{
    const item=event.detail||{};
    if(!item.title)return;
    currentMedia=normalizeMedia(item);
    updateMediaFavoriteButton(currentMedia);
    if(item.trackRecent!==false)trackRecent(currentMedia);
  });

  const ACHIEVEMENTS=[
    {id:'first-record',label:'첫 기록',test:p=>p.completed>=1},
    {id:'all-games',label:'4종 도전자',test:p=>p.completed>=4},
    {id:'chuntris-50k',label:'춘트리스 5만점',test:p=>p.classic>=50000||p.score180>=50000},
    {id:'chunbak-10k',label:'춘박 1만점',test:p=>p.chunbak>=10000},
    {id:'chungwa-3k',label:'춘과 3천점',test:p=>p.chungwa>=3000},
    {id:'tile-3k',label:'춘컬 3천점',test:p=>p.chuncortile>=3000}
  ];
  function readGameProfile(){
    const profile=window.ChunbongMinigameProfile?.readProfile?.();
    if(profile)return profile;
    const get=key=>{try{return Number(localStorage.getItem(key)||0)||0}catch(_){return 0}};
    return {
      completed:0,classic:get('chuntris.bestScore.classic.v1'),score180:get('chuntris.bestScore.score180.normal.v1'),
      chunbak:get('chunbak:best:v1'),chungwa:get('chungwagame-best-v2'),chuncortile:get('chuncortile.best.v1')
    };
  }
  function achievements(){
    const profile=readGameProfile();
    return ACHIEVEMENTS.map(row=>({...row,unlocked:Boolean(row.test(profile))}));
  }
  function enhanceMinigameProfile(){
    const root=document.querySelector('[data-minigame-profile]');
    if(!root||root.querySelector('[data-achievement-grid]'))return;
    const section=document.createElement('section');
    section.className='minigame-achievements';
    section.innerHTML='<div class="minigame-achievements-head"><div><small>ACHIEVEMENTS</small><strong>내 업적</strong></div><span data-achievement-count></span></div><div class="minigame-achievement-grid" data-achievement-grid></div>';
    root.appendChild(section);
    const draw=()=>{
      const rows=achievements();
      const count=rows.filter(row=>row.unlocked).length;
      section.querySelector('[data-achievement-count]').textContent=count+'/'+rows.length+' 달성';
      section.querySelector('[data-achievement-grid]').innerHTML=rows.map(row=>'<span class="minigame-achievement '+(row.unlocked?'is-unlocked':'')+'"><i aria-hidden="true">'+(row.unlocked?'◆':'◇')+'</i>'+esc(row.label)+'</span>').join('');
    };
    draw();
    window.addEventListener('storage',draw);
    window.addEventListener('pageshow',draw);
  }

  function tarotSignature(entry){
    return [entry.question,entry.cards.map(card=>card.name+'|'+card.direction).join(',')].join('::');
  }
  function saveTarotFromDom(){
    const results=document.getElementById('tarot-results');
    if(!results||results.hidden||!results.classList.contains('is-complete'))return;
    const cards=[...results.querySelectorAll('.tarot-card-result')].map(card=>({
      position:card.querySelector('.tarot-position')?.textContent?.trim()||'',
      name:card.querySelector('h2')?.textContent?.trim()||'',
      direction:(card.querySelector('.tarot-card-copy small')?.textContent||'').split('·')[0].trim()
    })).filter(card=>card.name);
    if(!cards.length)return;
    const question=document.getElementById('tarot-question')?.value?.trim()||'질문 없음';
    const entry={id:'tarot-'+Date.now(),at:Date.now(),question,cards};
    const sig=tarotSignature(entry);
    if(store.tarot.some(row=>tarotSignature(row)===sig))return;
    store.tarot.unshift(entry);
    store.tarot=store.tarot.slice(0,MAX_TAROT);
    saveStore();
    renderTarotJournal();
    renderDashboard();
  }
  function renderTarotJournal(){
    if(page!=='tarot')return;
    const shell=document.querySelector('.tarot-shell');
    if(!shell)return;
    let section=shell.querySelector('[data-tarot-journal]');
    if(!section){
      section=document.createElement('section');
      section.className='tarot-journal';
      section.dataset.tarotJournal='';
      shell.appendChild(section);
    }
    const entries=store.tarot.slice(0,8);
    section.innerHTML='<div class="personal-section-head"><div><p class="kicker">MY TAROT JOURNAL</p><h2>타로 기록장</h2><p>이 기기에서 본 최근 리딩을 자동으로 저장합니다.</p></div><span>'+store.tarot.length+'개 기록</span></div>'+
      (entries.length?'<div class="tarot-journal-grid">'+entries.map(entry=>'<article><time>'+esc(formatDate(entry.at))+'</time><strong>'+esc(entry.question)+'</strong><p>'+entry.cards.map(card=>esc(card.name)+' '+esc(card.direction)).join(' · ')+'</p></article>').join('')+'</div>':'<div class="personal-empty">아직 저장된 타로 기록이 없습니다.</div>');
  }
  if(page==='tarot'){
    const result=document.getElementById('tarot-results');
    if(result)new MutationObserver(()=>setTimeout(saveTarotFromDom,60)).observe(result,{attributes:true,subtree:true,childList:true});
    renderTarotJournal();
  }

  let scheduleItems=[];
  let alertTimer=0;
  function parseScheduleDate(item){
    const raw=item?.startAt||item?.start||item?.dateTime||item?.datetime||item?.iso||item?.date||'';
    const direct=Date.parse(raw);
    if(Number.isFinite(direct))return direct;
    const text=[item?.date,item?.time].filter(Boolean).join(' ');
    const parsed=Date.parse(text);
    return Number.isFinite(parsed)?parsed:NaN;
  }
  async function loadSchedule(){
    try{
      const response=await fetch('/api/content?type=schedule',{headers:{accept:'application/json'}});
      if(!response.ok)return [];
      const payload=await response.json();
      scheduleItems=Array.isArray(payload.items)?payload.items:[];
      return scheduleItems;
    }catch(_){return []}
  }
  function upcomingSchedule(){
    const now=Date.now();
    return scheduleItems.map(item=>({item,ts:parseScheduleDate(item)}))
      .filter(row=>Number.isFinite(row.ts)&&row.ts>=now-30*60*1000)
      .sort((a,b)=>a.ts-b.ts)[0]||null;
  }
  function getAlertPrefs(){
    try{return safeParse(localStorage.getItem(ALERT_KEY)||'',{enabled:false,leadMinutes:30,last:''})||{enabled:false,leadMinutes:30,last:''}}catch(_){return{enabled:false,leadMinutes:30,last:''}}
  }
  function setAlertPrefs(prefs){try{localStorage.setItem(ALERT_KEY,JSON.stringify(prefs))}catch(_){}}
  async function enableAlerts(){
    const prefs=getAlertPrefs();
    if('Notification' in window&&Notification.permission==='default'){
      try{await Notification.requestPermission()}catch(_){}
    }
    prefs.enabled=true;
    setAlertPrefs(prefs);
    if(!scheduleItems.length)await loadSchedule();
    if(!alertTimer)alertTimer=setInterval(checkBroadcastAlert,60*1000);
    renderDashboard();
    checkBroadcastAlert();
  }
  function checkBroadcastAlert(){
    const prefs=getAlertPrefs();
    if(!prefs.enabled)return;
    const next=upcomingSchedule();
    if(!next)return;
    const diff=next.ts-Date.now();
    if(diff<0||diff>Number(prefs.leadMinutes||30)*60000)return;
    const key=String(next.item?.id||next.item?.title||next.ts)+':'+next.ts;
    if(prefs.last===key)return;
    prefs.last=key;
    setAlertPrefs(prefs);
    const title=next.item?.title||'춘봉 방송 일정';
    const bodyText='곧 시작할 일정이 있어요 · '+formatDate(next.ts);
    if('Notification' in window&&Notification.permission==='granted'){
      try{new Notification(title,{body:bodyText,icon:'/assets/app-icon-192.png',tag:'chunbong-schedule'})}catch(_){}
    }
    const toast=document.createElement('div');
    toast.className='personal-alert-toast';
    toast.innerHTML='<strong>'+esc(title)+'</strong><span>'+esc(bodyText)+'</span><a href="schedule.html">일정 보기</a>';
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),9000);
  }

  let drawer=null;
  function ensureHubButton(){
    const header=document.querySelector('.site-header');
    if(!header||header.querySelector('[data-personal-hub-toggle]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='personal-hub-toggle';
    button.dataset.personalHubToggle='';
    button.setAttribute('aria-label','내 보관함 열기');
    button.innerHTML='<span aria-hidden="true">★</span><i data-personal-hub-count></i>';
    button.addEventListener('click',()=>openHubDrawer());
    const theme=header.querySelector('.theme-toggle');
    header.insertBefore(button,theme||header.querySelector('.changelog-button')||header.querySelector('.nav-toggle')||null);
    updateHubCount();
  }
  function updateHubCount(){
    const count=document.querySelector('[data-personal-hub-count]');
    if(count)count.textContent=store.favorites.length?String(Math.min(99,store.favorites.length)):'';
  }
  function openHubDrawer(){
    if(!drawer)createHubDrawer();
    renderHubDrawer();
    drawer.hidden=false;
    document.body.classList.add('personal-hub-open');
    drawer.querySelector('.personal-hub-close')?.focus();
  }
  function closeHubDrawer(){
    if(!drawer)return;
    drawer.hidden=true;
    document.body.classList.remove('personal-hub-open');
    document.querySelector('[data-personal-hub-toggle]')?.focus();
  }
  function createHubDrawer(){
    drawer=document.createElement('div');
    drawer.className='personal-hub-backdrop';
    drawer.dataset.personalHub='';
    drawer.hidden=true;
    drawer.innerHTML='<aside class="personal-hub-drawer" role="dialog" aria-modal="true" aria-labelledby="personal-hub-title"><div class="personal-hub-head"><div><small>MY CHUNBONG</small><h2 id="personal-hub-title">내 보관함</h2></div><button type="button" class="personal-hub-close" aria-label="내 보관함 닫기">×</button></div><div data-personal-hub-body></div></aside>';
    drawer.querySelector('.personal-hub-close').addEventListener('click',closeHubDrawer);
    drawer.addEventListener('click',event=>{if(event.target===drawer)closeHubDrawer()});
    document.body.appendChild(drawer);
  }
  function renderHubDrawer(){
    updateHubCount();
    if(!drawer)return;
    const root=drawer.querySelector('[data-personal-hub-body]');
    const favs=store.favorites.slice(0,12);
    const recents=store.recents.slice(0,8);
    const tarot=store.tarot.slice(0,4);
    const favHtml=favs.length?favs.map(item=>'<a class="personal-hub-row" href="'+esc(mediaHref(item))+'"><span>★</span><div><strong>'+esc(item.title)+'</strong><small>'+esc(item.date||item.kind||item.page)+'</small></div></a>').join(''):'<div class="personal-empty">즐겨찾기에 저장한 콘텐츠가 없습니다.</div>';
    const recentHtml=recents.length?recents.map(item=>'<a class="personal-hub-row" href="'+esc(mediaHref(item))+'"><span>▶</span><div><strong>'+esc(item.title)+'</strong><small>'+esc(item.date||'최근 본 콘텐츠')+'</small></div></a>').join(''):'<div class="personal-empty">최근 본 콘텐츠가 없습니다.</div>';
    const tarotHtml=tarot.length?tarot.map(item=>'<a class="personal-hub-row" href="tarot.html"><span>✦</span><div><strong>'+esc(item.question)+'</strong><small>'+esc(item.cards.map(card=>card.name).join(' · '))+'</small></div></a>').join(''):'<div class="personal-empty">저장된 타로 기록이 없습니다.</div>';
    root.innerHTML='<section><h3>즐겨찾기 · 나중에 보기</h3>'+favHtml+'</section><section><h3>이어보기</h3>'+recentHtml+'</section><section><h3>최근 타로</h3>'+tarotHtml+'</section><a class="personal-hub-timeline" href="timeline.html">춘봉 타임라인 보기 →</a>';
  }

  async function renderDashboard(){
    if(page!=='home')return;
    const main=document.getElementById('main-content');
    if(!main)return;
    let section=main.querySelector('[data-personal-dashboard]');
    if(!section){
      section=document.createElement('section');
      section.className='personal-dashboard-section';
      section.dataset.personalDashboard='';
      const hero=main.querySelector('.home-hero,.hero,.page-hero');
      if(hero?.nextSibling)main.insertBefore(section,hero.nextSibling);
      else main.prepend(section);
    }
    const next=upcomingSchedule();
    const recent=store.recents[0];
    const tarot=store.tarot[0];
    const ach=achievements();
    const unlocked=ach.filter(row=>row.unlocked).length;
    const prefs=getAlertPrefs();
    section.classList.toggle('is-app-home',standalone);
    section.innerHTML='<div class="page-shell"><div class="personal-dashboard-head"><div><p class="kicker">'+(standalone?'APP HOME':'TODAY')+'</p><h2>오늘의 춘봉</h2><p>'+(standalone?'앱에서 자주 쓰는 기능을 한 화면에 모았습니다.':'오늘 필요한 정보와 내 기록을 빠르게 확인하세요.')+'</p></div><button type="button" data-dashboard-alert class="'+(prefs.enabled?'is-active':'')+'">'+(prefs.enabled?'🔔 방송 알림 ON':'🔕 방송 알림 켜기')+'</button></div><div class="personal-dashboard-grid">'+
      '<a class="personal-dashboard-card is-live" href="schedule.html"><small>NEXT SCHEDULE</small><strong>'+(next?esc(next.item?.title||'예정 일정'): '예정 일정 확인')+'</strong><span>'+(next?esc(formatDate(next.ts)):'방송 일정을 확인해 보세요.')+'</span></a>'+
      '<a class="personal-dashboard-card" href="tarot.html"><small>TODAY TAROT</small><strong>'+(tarot?esc(tarot.cards[0]?.name||'최근 타로'):'오늘의 타로')+'</strong><span>'+(tarot?esc(tarot.question):'오늘의 운세와 춘봉 타로 보기')+'</span></a>'+
      '<a class="personal-dashboard-card" href="'+esc(recent?mediaHref(recent):'vod.html')+'"><small>CONTINUE</small><strong>'+(recent?esc(recent.title):'이어보기')+'</strong><span>'+(recent?'최근 본 콘텐츠 이어서 열기':'다시보기·유튜브를 보면 여기에 표시됩니다.')+'</span></a>'+
      '<a class="personal-dashboard-card" href="minigames.html"><small>MY GAME</small><strong>업적 '+unlocked+'/'+ach.length+'</strong><span>미니게임 기록과 배지 확인</span></a>'+
      '<button type="button" class="personal-dashboard-card is-button" data-open-personal-hub><small>MY HUB</small><strong>보관함 '+store.favorites.length+'개</strong><span>즐겨찾기 · 타로 · 최근 콘텐츠</span></button>'+
      '<a class="personal-dashboard-card" href="timeline.html"><small>TIMELINE</small><strong>춘봉 타임라인</strong><span>방송과 팬사이트 기록을 날짜순으로 보기</span></a>'+
      '</div></div>';
    section.querySelector('[data-dashboard-alert]')?.addEventListener('click',enableAlerts);
    section.querySelector('[data-open-personal-hub]')?.addEventListener('click',openHubDrawer);
  }

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer&&!drawer.hidden)closeHubDrawer()});
  document.addEventListener('chunbong:personal-hub-updated',updateHubCount);

  ensureHubButton();
  enhanceMinigameProfile();
  createHubDrawer();
  renderHubDrawer();
  const initialAlertPrefs=getAlertPrefs();
  if(page==='home'||initialAlertPrefs.enabled){
    void loadSchedule().then(()=>{renderDashboard();checkBroadcastAlert()});
  }
  renderDashboard();
  if(initialAlertPrefs.enabled)alertTimer=setInterval(checkBroadcastAlert,60*1000);
  window.addEventListener('storage',()=>{store=loadStore();renderHubDrawer();renderDashboard();renderTarotJournal()});
  window.addEventListener('pagehide',()=>clearInterval(alertTimer),{once:true});

  window.ChunbongPersonalHub={
    getStore:()=>JSON.parse(JSON.stringify(store)),
    toggleFavorite,trackRecent,achievements,enableAlerts,renderDashboard
  };
})();