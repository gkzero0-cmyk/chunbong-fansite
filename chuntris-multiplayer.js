(function(root){
  'use strict';
  if(typeof document==='undefined'||!root.MinigameMultiplayer)return;
  const App=root.ChuntrisApp;
  if(!App)return;
  const client=root.MinigameMultiplayer.createClient('chuntris');
  const SESSION_KEY='chuntris.multiplayer.session.v1';
  const MODE_KEY='chuntris.multiplayer.mode.v1';
  const MODES=Object.freeze({
    classic:{label:'클래식',description:'같은 블록 순서 · 먼저 GAME OVER 되면 패배'},
    sprint40:{label:'40줄 레이스',description:'같은 블록 순서 · 40줄을 먼저 지우면 승리'},
    hard:{label:'하드',description:'더 빠른 중력과 짧은 락딜레이 · 먼저 GAME OVER 되면 패배'}
  });
  const openButton=document.querySelector('[data-chuntris-multiplayer]');
  if(!openButton)return;

  let pollTimer=0;
  let progressTimer=0;
  let startedRound=0;
  let lastRoom=null;
  let terminalSent='';
  let startTimer=0;
  let clockOffset=0;
  let selectedMode=localStorage.getItem(MODE_KEY);
  if(!MODES[selectedMode])selectedMode='sprint40';

  const shell=document.createElement('div');
  shell.className='mp-shell';shell.hidden=true;
  shell.innerHTML=`
    <section class="mp-card" role="dialog" aria-modal="true" aria-labelledby="mp-title">
      <header class="mp-head"><div><small>MULTIPLAYER · 1 VS 1</small><h2 id="mp-title">춘트리스 1:1</h2></div><button class="mp-close" type="button" aria-label="닫기">×</button></header>
      <div class="mp-intro" data-mp-intro>
        <label class="mp-field"><span>닉네임</span><input data-mp-nickname maxlength="16" autocomplete="nickname" placeholder="2~16자"></label>
        <fieldset class="mp-mode-picker"><legend>새 방 모드</legend><button type="button" data-mp-chuntris-mode="classic" aria-pressed="false"><strong>클래식</strong><small>생존 대결</small></button><button type="button" data-mp-chuntris-mode="sprint40" aria-pressed="true"><strong>40줄</strong><small>스피드 레이스</small></button><button type="button" data-mp-chuntris-mode="hard" aria-pressed="false"><strong>하드</strong><small>고속 생존</small></button></fieldset>
        <p class="mp-mode-description" data-mp-mode-description></p>
        <div class="mp-actions"><button class="mp-btn mp-btn-primary" data-mp-create type="button">선택 모드로 방 만들기</button><button class="mp-btn" data-mp-show-join type="button">방 코드로 입장</button></div>
        <div data-mp-join-box hidden>
          <label class="mp-field"><span>6자리 방 코드</span><input class="mp-room-input" data-mp-code maxlength="6" placeholder="ABC234"></label>
          <p class="mp-join-note">입장 모드는 방장이 만든 방의 모드로 자동 적용됩니다.</p><button class="mp-btn mp-btn-primary" data-mp-join type="button" style="width:100%;margin-top:8px">입장하기</button>
        </div>
      </div>
      <div class="mp-room" data-mp-room hidden>
        <div class="mp-codebox"><div><span>ROOM CODE · <b data-mp-room-mode>MODE</b></span><strong data-mp-room-code>------</strong></div><button class="mp-copy" data-mp-copy type="button">초대 링크 복사</button></div>
        <p class="mp-room-rule" data-mp-room-rule></p>
        <div class="mp-players" data-mp-players></div>
        <div class="mp-countdown" data-mp-countdown hidden><span>동시에 시작합니다</span><strong>3</strong></div>
        <div class="mp-result" data-mp-result hidden></div>
        <div class="mp-room-actions"><button class="mp-btn mp-btn-primary" data-mp-ready type="button">READY</button><button class="mp-btn" data-mp-leave type="button">방 나가기</button></div>
      </div>
      <p class="mp-status" data-mp-status aria-live="polite"></p>
    </section>`;
  document.body.append(shell);

  const hud=document.createElement('div');
  hud.className='mp-hud';hud.hidden=true;
  hud.innerHTML='<div><span>ME</span><strong data-mp-hud-me>-</strong></div><b class="mp-vs" data-mp-hud-mode>VS</b><div><span>RIVAL</span><strong data-mp-hud-rival>-</strong></div>';
  document.querySelector('.chuntris-board-wrap')?.append(hud);

  const $=selector=>shell.querySelector(selector);
  const els={
    close:$('.mp-close'),intro:$('[data-mp-intro]'),room:$('[data-mp-room]'),nickname:$('[data-mp-nickname]'),
    create:$('[data-mp-create]'),showJoin:$('[data-mp-show-join]'),joinBox:$('[data-mp-join-box]'),code:$('[data-mp-code]'),
    join:$('[data-mp-join]'),roomCode:$('[data-mp-room-code]'),roomMode:$('[data-mp-room-mode]'),roomRule:$('[data-mp-room-rule]'),copy:$('[data-mp-copy]'),players:$('[data-mp-players]'),
    countdown:$('[data-mp-countdown]'),result:$('[data-mp-result]'),ready:$('[data-mp-ready]'),leave:$('[data-mp-leave]'),status:$('[data-mp-status]'),modeDescription:$('[data-mp-mode-description]')
  };
  const modeButtons=[...shell.querySelectorAll('[data-mp-chuntris-mode]')];
  const storedName=localStorage.getItem('chuntris.multiplayer.nickname')||'';
  els.nickname.value=storedName;

  function serverNow(){return Date.now()+clockOffset;}
  function modeMeta(mode){return MODES[mode]||MODES.sprint40;}
  function setSelectedMode(mode){
    if(!MODES[mode])return;
    selectedMode=mode;
    localStorage.setItem(MODE_KEY,mode);
    modeButtons.forEach(button=>{const active=button.dataset.mpChuntrisMode===mode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    if(els.modeDescription)els.modeDescription.textContent=modeMeta(mode).description;
  }
  function playerMetric(player,mode){if(!player)return '-';return mode==='sprint40'?`${player.lines}/40 · ${Math.round(player.timeMs/1000)}s`:`${Number(player.score)||0}점 · ${Number(player.lines)||0}줄`;}
  function playerState(player,room){if(!player)return '';if(room.state==='finished'&&player.id===room.winnerId)return room.mode==='sprint40'?'40줄 완료':'SURVIVED';if(player.finished)return room.mode==='sprint40'&&player.status==='completed'?'40줄 완료':'GAME OVER';if(room.state==='playing')return playerMetric(player,room.mode);return player.ready?'READY':'WAIT';}
  function message(text,error=false){els.status.textContent=text||'';els.status.classList.toggle('is-error',Boolean(error));}
  function normalizeName(){const value=els.nickname.value.trim();if(value.length<2||value.length>16)throw new Error('닉네임은 2~16자로 입력해 주세요.');localStorage.setItem('chuntris.multiplayer.nickname',value);return value;}
  function saveSession(){if(client.code&&client.token)localStorage.setItem(SESSION_KEY,JSON.stringify({code:client.code,token:client.token}));else localStorage.removeItem(SESSION_KEY);}
  function stopTimers(){if(pollTimer)clearInterval(pollTimer);if(progressTimer)clearInterval(progressTimer);if(startTimer)clearTimeout(startTimer);pollTimer=progressTimer=startTimer=0;}
  function open(){shell.hidden=false;document.documentElement.style.overflow='hidden';}
  function close(){shell.hidden=true;document.documentElement.style.overflow='';}
  function currentPlayers(room){const me=room.players.find(p=>p.id===room.selfId)||null;const rival=room.players.find(p=>p.id!==room.selfId)||null;return{me,rival};}
  function render(room){
    lastRoom=room;
    els.intro.hidden=Boolean(room);
    els.room.hidden=!room;
    if(!room){hud.hidden=true;return;}
    clockOffset=Number(room.serverNow||Date.now())-Date.now();
    const meta=modeMeta(room.mode);
    els.roomCode.textContent=room.code;
    if(els.roomMode)els.roomMode.textContent=meta.label;
    if(els.roomRule)els.roomRule.textContent=meta.description;
    const {me,rival}=currentPlayers(room);
    const cards=[me,rival].map((player,index)=>{
      if(!player)return '<div class="mp-player is-empty"><span>상대방 기다리는 중…</span></div>';
      const cls=['mp-player',player.id===room.selfId?'is-self':'',player.ready?'is-ready':'',player.finished?'is-finished':''].filter(Boolean).join(' ');
      const label=player.id===room.selfId?'나':'상대';
      const state=playerState(player,room);
      return `<div class="${cls}"><small>${label}</small><strong></strong><b>${state}</b></div>`;
    });
    els.players.innerHTML=cards.join('');
    [...els.players.querySelectorAll('.mp-player strong')].forEach((node,index)=>{const player=[me,rival][index];if(player)node.textContent=player.nickname;});

    const readyAllowed=room.players.length===2&&(room.state==='waiting'||room.state==='countdown');
    els.ready.hidden=room.state==='finished';
    els.ready.disabled=!readyAllowed;
    els.ready.textContent=me?.ready?'READY 취소':'READY';

    if(room.state==='countdown'&&room.startAt){
      els.countdown.hidden=false;
      const remain=Math.max(0,room.startAt-serverNow());
      els.countdown.querySelector('strong').textContent=remain>3000?'3':remain>2000?'2':remain>1000?'1':'START!';
    }else els.countdown.hidden=true;

    if(room.state==='finished'){
      els.result.hidden=false;
      const winner=room.players.find(p=>p.id===room.winnerId);
      const won=room.winnerId===room.selfId;
      const scores=room.players.map(player=>`<em>${player.nickname} <b>${playerMetric(player,room.mode)}</b></em>`).join('');
      els.result.innerHTML=`<strong>${room.winnerId?(won?'승리! 🏆':'상대 승리'):'경기 종료'}</strong><span>${meta.label} · ${winner?winner.nickname+' · ':''}ROUND ${room.round}</span><div class="mp-final-scores">${scores}</div><div style="margin-top:10px"><button class="mp-btn mp-btn-primary" data-mp-rematch type="button">재대결 요청</button></div>`;
      els.result.querySelector('[data-mp-rematch]')?.addEventListener('click',async()=>{try{await client.rematch();render(client.room);message('재대결을 기다리는 중…');}catch(error){message(errorMessage(error),true);}});
    }else els.result.hidden=true;

    if(room.state==='playing'||room.state==='finished'){
      hud.hidden=false;
      hud.querySelector('[data-mp-hud-me]').textContent=me?playerMetric(me,room.mode):'-';
      hud.querySelector('[data-mp-hud-rival]').textContent=rival?playerMetric(rival,room.mode):'대기';
      hud.querySelector('[data-mp-hud-mode]').textContent=room.mode==='sprint40'?'40L':room.mode==='hard'?'HARD':'CLASSIC';
    }else hud.hidden=true;
  }
  function errorMessage(error){
    const map={room_not_found:'방을 찾을 수 없습니다.',room_full:'이미 2명이 참가한 방입니다.',room_started:'이미 시작된 방입니다.',invalid_nickname:'닉네임을 확인해 주세요.',invalid_mode:'지원하지 않는 모드입니다.',multiplayer_unavailable:'멀티플레이 서버에 연결할 수 없습니다.'};
    return map[error?.code]||error?.message||'잠시 후 다시 시도해 주세요.';
  }
  async function refresh(){
    if(!client.code)return;
    try{
      const data=await client.refresh();render(data.room);handleRoom(data.room);
    }catch(error){
      if(error.status===404||error.status===403){client.clear();saveSession();render(null);stopTimers();}
      message(errorMessage(error),true);
    }
  }
  function startPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(refresh,700);void refresh();}
  function handleRoom(room){
    if(!room)return;
    clockOffset=Number(room.serverNow||Date.now())-Date.now();
    if(room.state==='countdown'&&room.startAt&&room.round!==startedRound){
      if(startTimer)clearTimeout(startTimer);
      const delay=Math.max(0,room.startAt-serverNow());
      startTimer=setTimeout(()=>{
        if(startedRound===room.round)return;
        startedRound=room.round;terminalSent='';
        App.startMultiplayer?.(room.seed,room.mode);
        close();
        startProgress(room);
      },delay);
    }
    if(room.state==='finished'){if(progressTimer){clearInterval(progressTimer);progressTimer=0;}open();render(room);}
    if(room.state==='waiting'&&startedRound===room.round){startedRound=0;hud.hidden=true;}
  }
  function startProgress(room){
    if(progressTimer)clearInterval(progressTimer);
    const send=async()=>{
      const snap=App.getGame()?.getSnapshot?.();if(!snap)return;
      let status=snap.status==='completed'?'completed':snap.status==='gameover'?'gameover':'playing';
      if((status==='completed'||status==='gameover')&&terminalSent===status)return;
      const payload={lines:snap.lines,score:snap.score,timeMs:Math.max(snap.elapsedMs,serverNow()-(room.startAt||serverNow())),status};
      try{
        const data=await client.progress(payload);render(data.room);handleRoom(data.room);
        if(status!=='playing')terminalSent=status;
      }catch(error){message(errorMessage(error),true);}
    };
    progressTimer=setInterval(send,650);void send();
  }

  openButton.classList.add('mp-open-button');
  openButton.addEventListener('click',()=>{open();render(client.room);});
  els.close.addEventListener('click',close);
  shell.addEventListener('click',event=>{if(event.target===shell)close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.hidden){event.preventDefault();close();}});
  modeButtons.forEach(button=>button.addEventListener('click',()=>setSelectedMode(button.dataset.mpChuntrisMode)));
  els.showJoin.addEventListener('click',()=>{els.joinBox.hidden=!els.joinBox.hidden;if(!els.joinBox.hidden)els.code.focus();});
  els.code.addEventListener('input',()=>{els.code.value=els.code.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);});
  els.create.addEventListener('click',async()=>{try{message('방 만드는 중…');const data=await client.create(normalizeName(),selectedMode);saveSession();render(data.room);startPolling();message(`${modeMeta(data.room.mode).label} 방을 만들었습니다. 초대 링크를 친구에게 보내 주세요.`);}catch(error){message(errorMessage(error),true);}});
  els.join.addEventListener('click',async()=>{try{message('입장 중…');const data=await client.join(els.code.value,normalizeName());saveSession();render(data.room);startPolling();message(`${modeMeta(data.room.mode).label} 방에 입장했습니다. 두 명 모두 READY를 눌러 주세요.`);}catch(error){message(errorMessage(error),true);}});
  els.ready.addEventListener('click',async()=>{try{const me=currentPlayers(client.room||{players:[]}).me;const data=await client.ready(!me?.ready);render(data.room);message(data.room.state==='countdown'?`${modeMeta(data.room.mode).label} 대결이 곧 시작됩니다!`:'READY 상태를 변경했습니다.');handleRoom(data.room);}catch(error){message(errorMessage(error),true);}});
  els.leave.addEventListener('click',async()=>{try{await client.leave();saveSession();stopTimers();render(null);hud.hidden=true;message('방에서 나왔습니다.');}catch(error){message(errorMessage(error),true);}});
  els.copy.addEventListener('click',async()=>{const text=root.MinigameMultiplayer.roomInviteUrl(client.code);try{await navigator.clipboard.writeText(text);message('초대 링크를 복사했습니다.');}catch{message(`방 코드: ${client.code}`);}});

  setSelectedMode(selectedMode);
  const params=new URLSearchParams(location.search);
  const invite=params.get('room');
  if(invite){open();els.showJoin.click();els.code.value=invite.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);message('닉네임을 입력하고 입장해 주세요. 모드는 방 설정을 따릅니다.');}
  try{
    const saved=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(saved?.code&&saved?.token&&!invite){client.restore(saved.code,saved.token);open();startPolling();message('이전 멀티플레이 방을 다시 연결하는 중…');}
  }catch{}
  root.addEventListener('beforeunload',()=>{stopTimers();});
})(typeof globalThis!=='undefined'?globalThis:window);
