(function(root){
  'use strict';
  if(typeof document==='undefined'||!root.MinigameMultiplayer)return;

  const button=document.querySelector('[data-score-multiplayer]');
  if(!button)return;
  const game=button.dataset.scoreMultiplayer;

  const configs={
    chunbak:{
      label:'춘박게임',
      sessionKey:'chunbak.multiplayer.session.v1',
      nicknameKey:'chunbak.multiplayer.nickname',
      ready(){
        const app=root.ChunbakGame;
        return app&&typeof app.resetGame==='function'&&typeof app.getDebugState==='function';
      },
      start(seed){
        root.ChunbakGame.resetGame({autoStart:true,random:root.MinigameMultiplayer.seededRandom(seed)});
      },
      snapshot(){
        const state=root.ChunbakGame.getDebugState();
        return {score:Number(state.score)||0,secondary:Number(state.maxLevel)||1,terminal:state.gameState==='gameover'};
      },
      stop(){
        const state=root.ChunbakGame.getDebugState();
        if(state.gameState==='playing')root.ChunbakGame.pauseGame('multiplayer-timeover');
      },
      metric(player){return `${Number(player.score)||0}점 · MAX ${Number(player.lines)||1}`;}
    },
    chungwagame:{
      label:'춘과게임',
      sessionKey:'chungwagame.multiplayer.session.v1',
      nicknameKey:'chungwagame.multiplayer.nickname',
      ready(){
        const app=root.ChungwagameApp;
        return app&&typeof app.startGame==='function'&&typeof app.getSnapshot==='function';
      },
      start(seed){
        root.ChungwagameApp.startGame({random:root.MinigameMultiplayer.seededRandom(seed)});
      },
      snapshot(){
        const state=root.ChungwagameApp.getSnapshot();
        return {score:Number(state.score)||0,secondary:Number(state.cleared)||0,terminal:state.status==='gameover'};
      },
      stop(){
        const state=root.ChungwagameApp.getSnapshot();
        if(state.status==='playing')root.ChungwagameApp.pauseGame(false);
      },
      metric(player){return `${Number(player.score)||0}점 · 제거 ${Number(player.lines)||0}`;}
    },
    chuncortile:{
      label:'춘컬타일',
      sessionKey:'chuncortile.multiplayer.session.v1',
      nicknameKey:'chuncortile.multiplayer.nickname',
      ready(){
        const app=root.ChuncortileApp;
        return app&&typeof app.startGame==='function'&&typeof app.getSnapshot==='function';
      },
      start(seed){
        root.ChuncortileApp.startGame({seed,random:root.MinigameMultiplayer.seededRandom(seed),multiplayer:true});
      },
      snapshot(){
        const state=root.ChuncortileApp.getSnapshot();
        const cleared=Math.max(0,200-(Number(state.remaining)||0));
        return {score:Number(state.score)||0,secondary:cleared,terminal:state.status==='gameover'};
      },
      stop(){
        const state=root.ChuncortileApp.getSnapshot();
        if(state.status==='playing')root.ChuncortileApp.pauseGame(false);
      },
      metric(player){return `${Number(player.score)||0}점 · 제거 ${Number(player.lines)||0}`;}
    }
  };
  const config=configs[game];
  if(!config||!config.ready())return;

  const client=root.MinigameMultiplayer.createClient(game);
  let pollTimer=0;
  let progressTimer=0;
  let countdownTimer=0;
  let startedRound=0;
  let raceEndAt=0;
  let clockOffset=0;
  let localFinished=false;

  const shell=document.createElement('div');
  shell.className='mp-shell';shell.hidden=true;
  shell.innerHTML=`
    <section class="mp-card" role="dialog" aria-modal="true" aria-labelledby="mp-score-title">
      <header class="mp-head"><div><small>MULTIPLAYER · 120 SEC SCORE RACE</small><h2 id="mp-score-title">${config.label} 1:1 점수 대결</h2></div><button class="mp-close" type="button" aria-label="닫기">×</button></header>
      <div class="mp-intro" data-mp-intro>
        <p class="mp-description">같은 랜덤 시드로 120초 동안 플레이하고 최종 점수를 겨룹니다.</p>
        <label class="mp-field"><span>닉네임</span><input data-mp-nickname maxlength="16" autocomplete="nickname" placeholder="2~16자"></label>
        <div class="mp-actions"><button class="mp-btn mp-btn-primary" data-mp-create type="button">새 방 만들기</button><button class="mp-btn" data-mp-show-join type="button">방 코드로 입장</button></div>
        <div data-mp-join-box hidden>
          <label class="mp-field"><span>6자리 방 코드 또는 초대 링크</span><input class="mp-room-input" data-mp-code autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234 또는 초대 링크"></label>
          <button class="mp-btn mp-btn-primary" data-mp-join type="button" style="width:100%;margin-top:8px">입장하기</button>
        </div>
      </div>
      <div class="mp-room" data-mp-room hidden>
        <div class="mp-codebox"><div><span>ROOM CODE</span><strong data-mp-room-code>------</strong></div><button class="mp-copy" data-mp-copy type="button">초대 링크 복사</button></div>
        <div class="mp-players" data-mp-players></div>
        <div class="mp-countdown" data-mp-countdown hidden><span>동시에 시작합니다</span><strong>3</strong></div>
        <div class="mp-result" data-mp-result hidden></div>
        <div class="mp-room-actions"><button class="mp-btn mp-btn-primary" data-mp-ready type="button">READY</button><button class="mp-btn" data-mp-leave type="button">방 나가기</button></div>
      </div>
      <p class="mp-status" data-mp-status aria-live="polite"></p>
    </section>`;
  document.body.append(shell);

  const hud=document.createElement('div');
  hud.className='mp-hud mp-score-hud';hud.hidden=true;
  hud.innerHTML='<div><span>ME</span><strong data-mp-hud-me>-</strong></div><div class="mp-race-clock"><span>TIME</span><strong data-mp-hud-time>02:00</strong></div><div><span>RIVAL</span><strong data-mp-hud-rival>-</strong></div>';
  const hudHost=game==='chunbak'?document.querySelector('#chunbak-stage'):game==='chuncortile'?document.querySelector('#ct-board-wrap'):document.querySelector('#cg-board-wrap');
  hudHost?.append(hud);

  const $=selector=>shell.querySelector(selector);
  const els={
    close:$('.mp-close'),intro:$('[data-mp-intro]'),room:$('[data-mp-room]'),nickname:$('[data-mp-nickname]'),
    create:$('[data-mp-create]'),showJoin:$('[data-mp-show-join]'),joinBox:$('[data-mp-join-box]'),code:$('[data-mp-code]'),
    join:$('[data-mp-join]'),roomCode:$('[data-mp-room-code]'),copy:$('[data-mp-copy]'),players:$('[data-mp-players]'),
    countdown:$('[data-mp-countdown]'),result:$('[data-mp-result]'),ready:$('[data-mp-ready]'),leave:$('[data-mp-leave]'),status:$('[data-mp-status]')
  };
  els.nickname.value=localStorage.getItem(config.nicknameKey)||'';

  function message(text,error=false){els.status.textContent=text||'';els.status.classList.toggle('is-error',Boolean(error));}
  function errorMessage(error){
    const map={room_not_found:'방을 찾을 수 없습니다.',room_full:'이미 2명이 참가한 방입니다.',room_started:'이미 시작된 방입니다.',invalid_nickname:'닉네임을 확인해 주세요.',multiplayer_unavailable:'멀티플레이 서버에 연결할 수 없습니다.'};
    return map[error?.code]||error?.message||'잠시 후 다시 시도해 주세요.';
  }
  function normalizeName(){
    const value=els.nickname.value.trim();
    if(value.length<2||value.length>16)throw new Error('닉네임은 2~16자로 입력해 주세요.');
    localStorage.setItem(config.nicknameKey,value);
    return value;
  }
  function saveSession(){if(client.code&&client.token)localStorage.setItem(config.sessionKey,JSON.stringify({code:client.code,token:client.token}));else localStorage.removeItem(config.sessionKey);}
  function stopTimers(){
    if(pollTimer)clearInterval(pollTimer);
    if(progressTimer)clearInterval(progressTimer);
    if(countdownTimer)clearTimeout(countdownTimer);
    pollTimer=progressTimer=countdownTimer=0;
  }
  function open(){shell.hidden=false;document.documentElement.style.overflow='hidden';}
  function close(){shell.hidden=true;document.documentElement.style.overflow='';}
  function players(room){
    return {
      me:room.players.find(player=>player.id===room.selfId)||null,
      rival:room.players.find(player=>player.id!==room.selfId)||null
    };
  }
  function serverNow(){return Date.now()+clockOffset;}
  function formatClock(ms){
    const seconds=Math.max(0,Math.ceil(ms/1000));
    return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  function updateClock(){
    const node=hud.querySelector('[data-mp-hud-time]');
    if(node)node.textContent=formatClock(raceEndAt?raceEndAt-serverNow():120000);
  }
  function render(room){
    if(!room){els.intro.hidden=false;els.room.hidden=true;hud.hidden=true;return;}
    clockOffset=Number(room.serverNow||Date.now())-Date.now();
    els.intro.hidden=true;els.room.hidden=false;els.roomCode.textContent=room.code;
    const {me,rival}=players(room);
    els.players.innerHTML=[me,rival].map(player=>{
      if(!player)return '<div class="mp-player is-empty"><span>상대방 기다리는 중…</span></div>';
      const cls=['mp-player',player.id===room.selfId?'is-self':'',player.ready?'is-ready':'',player.finished?'is-finished':''].filter(Boolean).join(' ');
      const who=player.id===room.selfId?'나':'상대';
      const status=player.finished?'FINISH':player.ready?'READY':room.state==='playing'?'PLAYING':'WAIT';
      return `<div class="${cls}"><small>${who}</small><strong></strong><b>${status} · ${config.metric(player)}</b></div>`;
    }).join('');
    [...els.players.querySelectorAll('.mp-player strong')].forEach((node,index)=>{
      const player=[me,rival][index];if(player)node.textContent=player.nickname;
    });

    els.ready.hidden=room.state==='finished';
    els.ready.disabled=!(room.players.length===2&&(room.state==='waiting'||room.state==='countdown'));
    els.ready.textContent=me?.ready?'READY 취소':'READY';

    if(room.state==='countdown'&&room.startAt){
      els.countdown.hidden=false;
      const remain=Math.max(0,room.startAt-serverNow());
      els.countdown.querySelector('strong').textContent=remain>3000?'3':remain>2000?'2':remain>1000?'1':'START!';
    }else els.countdown.hidden=true;

    if(room.state==='finished'){
      els.result.hidden=false;
      const winner=room.players.find(player=>player.id===room.winnerId);
      const draw=!room.winnerId;
      const won=room.winnerId===room.selfId;
      els.result.innerHTML=`<strong>${draw?'무승부':won?'승리! 🏆':'상대 승리'}</strong><span>${winner?winner.nickname+' · ':''}ROUND ${room.round}</span><div class="mp-final-scores">${room.players.map(player=>`<em>${player.nickname} <b>${config.metric(player)}</b></em>`).join('')}</div><div style="margin-top:10px"><button class="mp-btn mp-btn-primary" data-mp-rematch type="button">재대결 요청</button></div>`;
      els.result.querySelector('[data-mp-rematch]')?.addEventListener('click',async()=>{
        try{const data=await client.rematch();render(data.room);message('재대결을 기다리는 중…');handleRoom(data.room);}catch(error){message(errorMessage(error),true);}
      });
    }else els.result.hidden=true;

    if(room.state==='playing'||room.state==='finished'){
      hud.hidden=false;
      hud.querySelector('[data-mp-hud-me]').textContent=me?config.metric(me):'-';
      hud.querySelector('[data-mp-hud-rival]').textContent=rival?config.metric(rival):'대기';
      updateClock();
    }else hud.hidden=true;

    if(me?.finished&&room.state==='playing'){
      open();
      message('내 플레이는 종료됐습니다. 상대의 120초가 끝나길 기다리는 중…');
    }
  }
  async function refresh(){
    if(!client.code||refreshInFlight)return;
    refreshInFlight=true;
    try{
      const data=await client.refresh();render(data.room);handleRoom(data.room);
    }catch(error){
      if(error.status===404||error.status===403){client.clear();saveSession();render(null);stopTimers();}
      message(errorMessage(error),true);
    }finally{refreshInFlight=false;}
  }
  function startPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(refresh,1000);void refresh();}
  async function finishLocal(){
    if(localFinished)return;
    localFinished=true;
    config.stop();
    const snap=config.snapshot();
    try{
      const data=await client.progress({score:snap.score,lines:snap.secondary,timeMs:120000,status:'completed'});
      render(data.room);handleRoom(data.room);
      if(data.room.state!=='finished'){open();message('내 기록을 전송했습니다. 상대방을 기다리는 중…');}
    }catch(error){message(errorMessage(error),true);}
    if(progressTimer){clearInterval(progressTimer);progressTimer=0;}
  }
  function startProgress(room){
    if(progressTimer)clearInterval(progressTimer);
    const sync=async()=>{
      if(progressInFlight)return;
      const snap=config.snapshot();
      const remaining=Math.max(0,raceEndAt-serverNow());
      updateClock();
      if(snap.terminal||remaining<=0){await finishLocal();return;}
      progressInFlight=true;
      try{
        const data=await client.progress({score:snap.score,lines:snap.secondary,timeMs:Math.max(0,120000-remaining),status:'playing'});
        render(data.room);handleRoom(data.room);
      }catch(error){message(errorMessage(error),true);}
      finally{progressInFlight=false;}
    };
    progressTimer=setInterval(sync,1000);void sync();
  }
  function handleRoom(room){
    if(!room)return;
    clockOffset=Number(room.serverNow||Date.now())-Date.now();
    if(room.state==='countdown'&&room.startAt&&room.round!==startedRound){
      if(countdownTimer)clearTimeout(countdownTimer);
      const delay=Math.max(0,room.startAt-serverNow());
      countdownTimer=setTimeout(()=>{
        if(startedRound===room.round)return;
        startedRound=room.round;localFinished=false;raceEndAt=room.startAt+120000;
        config.start(room.seed);close();startProgress(room);
      },delay);
    }
    if(room.state==='finished'){
      if(progressTimer){clearInterval(progressTimer);progressTimer=0;}
      open();render(room);
    }
    if(room.state==='waiting'&&startedRound===room.round){
      startedRound=0;localFinished=false;raceEndAt=0;hud.hidden=true;
    }
  }

  button.classList.add('mp-open-button');
  button.addEventListener('click',()=>{open();render(client.room);});
  els.close.addEventListener('click',close);
  shell.addEventListener('click',event=>{if(event.target===shell)close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shell.hidden){event.preventDefault();close();}});
  const normalizeCodeInput=value=>root.MinigameMultiplayer.normalizeRoomCode(value);
  els.showJoin.addEventListener('click',()=>{els.joinBox.hidden=!els.joinBox.hidden;if(!els.joinBox.hidden)els.code.focus();});
  els.code.addEventListener('input',()=>{els.code.value=normalizeCodeInput(els.code.value);});
  els.code.addEventListener('paste',event=>{
    const text=event.clipboardData?.getData('text')||'';
    if(!text)return;
    event.preventDefault();
    els.code.value=normalizeCodeInput(text);
    message(els.code.value.length===6?'초대 링크에서 방 코드를 가져왔습니다.':'6자리 방 코드 또는 초대 링크를 확인해 주세요.',els.code.value.length!==6);
  });
  els.create.addEventListener('click',async()=>{
    try{message('방 만드는 중…');const data=await client.create(normalizeName());saveSession();render(data.room);startPolling();message('방 코드나 초대 링크를 친구에게 보내 주세요.');}
    catch(error){message(errorMessage(error),true);}
  });
  els.join.addEventListener('click',async()=>{
    try{
      const roomCode=normalizeCodeInput(els.code.value);
      if(roomCode.length!==6)throw new Error('6자리 방 코드 또는 초대 링크를 입력해 주세요.');
      els.code.value=roomCode;
      message('입장 중…');const data=await client.join(roomCode,normalizeName());saveSession();render(data.room);startPolling();message('입장했습니다. 두 명 모두 READY를 눌러 주세요.');
    }catch(error){message(errorMessage(error),true);}
  });
  els.ready.addEventListener('click',async()=>{
    try{const me=players(client.room||{players:[]}).me;const data=await client.ready(!me?.ready);render(data.room);message(data.room.state==='countdown'?'곧 동시에 시작합니다!':'READY 상태를 변경했습니다.');handleRoom(data.room);}
    catch(error){message(errorMessage(error),true);}
  });
  els.leave.addEventListener('click',async()=>{
    try{await client.leave();saveSession();stopTimers();render(null);hud.hidden=true;localFinished=false;raceEndAt=0;message('방에서 나왔습니다.');}
    catch(error){message(errorMessage(error),true);}
  });
  els.copy.addEventListener('click',async()=>{
    const text=root.MinigameMultiplayer.roomInviteUrl(client.code);
    try{await navigator.clipboard.writeText(text);message('초대 링크를 복사했습니다.');}
    catch{message(`방 코드: ${client.code}`);}
  });

  const params=new URLSearchParams(location.search);
  const invite=params.get('room');
  if(invite){open();els.showJoin.click();els.code.value=normalizeCodeInput(invite);message('닉네임을 입력하고 입장해 주세요.');}
  try{
    const saved=JSON.parse(localStorage.getItem(config.sessionKey)||'null');
    if(saved?.code&&saved?.token&&!invite){client.restore(saved.code,saved.token);open();startPolling();message('이전 멀티플레이 방을 다시 연결하는 중…');}
  }catch{}
  root.addEventListener('beforeunload',stopTimers);
})(typeof globalThis!=='undefined'?globalThis:window);
