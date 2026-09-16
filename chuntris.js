(function (root) {
  'use strict';

  const Engine = root.ChuntrisEngine;
  if (!Engine || typeof document === 'undefined') return;

  const RankingCore = root.ChuntrisRankingCore;
  const DAS_MS = 150;
  const ARR_MS = 40;
  const CLASSIC_BEST_KEY = 'chuntris.bestScore.classic.v1';
  const SPRINT_BEST_KEY = 'chuntris.bestTime.sprint40.v1';
  const NICKNAME_KEY = 'chuntris.nickname.v1';
  const RANKING_ENDPOINT = '/api/content?type=chuntris-ranking';
  const REACTION_SPRITE = 'assets/chuntris/reactions.webp';
  const REACTION_MAP = Object.freeze({
    idle: 0, gameover: 1, dizzy: 2, cryA: 3, cryB: 4,
    alert: 5, sweat: 6, money: 7, smile: 8, question: 9,
    sparkle: 10, loading: 11, sigh: 12, smug: 13, burnout: 14,
    excited: 15, sleep: 16, love: 17, angry: 18, calm: 19
  });
  const REACTION_LABELS = Object.freeze({
    idle: ['춘봉 기본 표정','준비됐봉!'], gameover: ['춘봉 게임오버 표정','앗… 다음 판은 더 잘할 수 있어!'],
    dizzy: ['춘봉 어지러운 표정','블록이 빙글빙글!'], cryA: ['춘봉 우는 표정','조금만 더 버텨!'],
    cryB: ['춘봉 눈물 표정','위험해, 공간을 만들자!'], alert: ['춘봉 놀란 표정','위험! 위쪽이 차고 있어!'],
    sweat: ['춘봉 식은땀 표정','침착하게 한 줄씩!'], money: ['춘봉 돈눈 표정','테트리스! 대박!'],
    smile: ['춘봉 웃는 표정','깔끔하게 한 줄!'], question: ['춘봉 물음표 표정','어디에 놓을까?'],
    sparkle: ['춘봉 반짝이는 표정','좋아! 흐름 탔다!'], loading: ['춘봉 로딩 표정','계산 중…'],
    sigh: ['춘봉 한숨 표정','후… 다시 정리해 보자'], smug: ['춘봉 뿌듯한 표정','이 정도는 쉽지!'],
    burnout: ['춘봉 지친 표정','진짜 위험해! 공간부터 만들자!'], excited: ['춘봉 신난 표정','콤보 폭발!'],
    sleep: ['춘봉 졸린 표정','잠깐 쉬는 중…'], love: ['춘봉 하트눈 표정','완벽해! 최고야!'],
    angry: ['춘봉 화난 표정','집중! 아직 안 끝났어!'], calm: ['춘봉 평온한 표정','천천히, 정확하게!']
  });
  const COLORS = Object.freeze({ I:'#41d9ff', O:'#ffd73b', T:'#a86dff', S:'#55dc73', Z:'#ff5c67', J:'#5d82ff', L:'#ff9c3e' });

  const els = {
    game: document.getElementById('chuntris-game'), board: document.getElementById('chuntris-board'),
    hold: document.getElementById('chuntris-hold'), next: document.getElementById('chuntris-next'),
    score: document.getElementById('chuntris-score'), level: document.getElementById('chuntris-level'),
    lines: document.getElementById('chuntris-lines'), time: document.getElementById('chuntris-time'),
    best: document.getElementById('chuntris-best'), reaction: document.getElementById('chuntris-reaction'),
    reactionCaption: document.getElementById('chuntris-reaction-caption'), status: document.getElementById('chuntris-status'),
    start: document.getElementById('chuntris-start'), pause: document.getElementById('chuntris-pause'),
    sound: document.getElementById('chuntris-sound'), volume: document.getElementById('chuntris-volume'),
    overlay: document.getElementById('chuntris-overlay'), overlayTitle: document.getElementById('chuntris-overlay-title'),
    overlayCopy: document.getElementById('chuntris-overlay-copy'), mobile: document.getElementById('chuntris-mobile-controls'),
    nickname: document.getElementById('chuntris-nickname'), rankingStatus: document.getElementById('chuntris-ranking-status'),
    rankingList: document.getElementById('chuntris-ranking-list')
  };
  if (!els.game || !els.board) return;

  const rankingButtons = [...document.querySelectorAll('[data-chuntris-ranking-mode]')];
  let mode = 'classic';
  let rankingMode = 'classic';
  let rankingRequestId = 0;
  let lastSubmittedTerminal = '';
  let game = new Engine.ChuntrisGame({ mode });
  let rafId = 0;
  let lastStatus = 'idle';
  let lastLevel = 1;
  let lastClearAt = null;
  let lastInputAt = Date.now();
  let transientReaction = null;
  let bestFlashUntil = 0;
  const repeats = new Map();

  function storageGet(key, fallback = null) {
    try { const value = localStorage.getItem(key); return value == null ? fallback : value; }
    catch { return fallback; }
  }
  function storageSet(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  function numberFromStorage(key, fallback = 0) {
    const value = Number(storageGet(key, fallback));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function formatTime(ms) {
    if (RankingCore?.formatTime) return RankingCore.formatTime(ms);
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const millis = safe % 1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
  }

  function currentBest() {
    return mode === 'classic' ? numberFromStorage(CLASSIC_BEST_KEY, 0) : numberFromStorage(SPRINT_BEST_KEY, 0);
  }

  function currentNickname() {
    const result = RankingCore?.validateNickname(els.nickname?.value || '');
    return result?.ok ? result : null;
  }

  function syncRankingButtons() {
    rankingButtons.forEach(button => {
      const active = button.dataset.chuntrisRankingMode === rankingMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderRanking(entries) {
    if (!els.rankingList) return;
    const current = currentNickname();
    els.rankingList.replaceChildren();
    entries.slice(0, 10).forEach((entry, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      const nickname = document.createElement('span');
      const metric = document.createElement('strong');
      rank.className = 'rank'; nickname.className = 'nickname'; metric.className = 'metric';
      rank.textContent = String(entry.rank || index + 1);
      nickname.textContent = String(entry.nickname || '익명');
      metric.textContent = rankingMode === 'sprint40'
        ? formatTime(Number(entry.timeMs) || 0)
        : Number(entry.score || 0).toLocaleString('ko-KR');
      if (current && RankingCore?.normalizeNickname(entry.nickname).toLocaleLowerCase('ko-KR') === current.key) {
        item.classList.add('is-current-player');
      }
      item.append(rank, nickname, metric);
      els.rankingList.append(item);
    });
    if (els.rankingStatus) {
      els.rankingStatus.textContent = entries.length ? `TOP ${Math.min(entries.length, 10)} · 최고 기록 기준` : '아직 등록된 기록이 없어요.';
    }
  }

  async function loadRanking(nextMode = mode) {
    rankingMode = nextMode === 'sprint40' ? 'sprint40' : 'classic';
    syncRankingButtons();
    const requestId = ++rankingRequestId;
    if (els.rankingStatus) els.rankingStatus.textContent = '랭킹 불러오는 중…';
    if (typeof fetch !== 'function') {
      if (els.rankingStatus) els.rankingStatus.textContent = '랭킹 연결을 사용할 수 없어요. 게임은 계속할 수 있어요.';
      return;
    }
    try {
      const response = await fetch(`${RANKING_ENDPOINT}&mode=${encodeURIComponent(rankingMode)}`, { headers: { accept:'application/json' } });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      if (requestId !== rankingRequestId) return;
      renderRanking(Array.isArray(payload.entries) ? payload.entries : []);
    } catch {
      if (requestId === rankingRequestId && els.rankingStatus) {
        els.rankingStatus.textContent = '랭킹을 불러오지 못했어요. 게임은 계속할 수 있어요.';
      }
    }
  }

  async function submitRanking(state) {
    const nickname = currentNickname();
    if (!nickname || typeof fetch !== 'function') return;
    const key = `${mode}:${state.status}:${state.elapsedMs}:${state.score}:${state.lines}`;
    if (key === lastSubmittedTerminal) return;
    lastSubmittedTerminal = key;
    try {
      const response = await fetch(RANKING_ENDPOINT, {
        method:'POST',
        headers:{ 'content-type':'application/json', accept:'application/json' },
        body:JSON.stringify({ mode, nickname:nickname.displayName, score:state.score, lines:state.lines, level:state.level, timeMs:state.elapsedMs })
      });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      if (payload.mode === rankingMode && Array.isArray(payload.entries)) renderRanking(payload.entries);
      else void loadRanking(rankingMode);
    } catch {
      if (els.rankingStatus) els.rankingStatus.textContent = '기록 저장에 실패했어요. 게임 기록은 기기 안에 유지돼요.';
    }
  }

  function setReaction(name) {
    const safeName = Object.prototype.hasOwnProperty.call(REACTION_MAP, name) ? name : 'idle';
    const index = REACTION_MAP[safeName];
    const col = index % 5;
    const row = Math.floor(index / 5);
    els.reaction.style.backgroundImage = `url("${REACTION_SPRITE}")`;
    els.reaction.style.backgroundSize = '500% 400%';
    els.reaction.style.backgroundPosition = `${col * 25}% ${row * (100 / 3)}%`;
    const [label, caption] = REACTION_LABELS[safeName];
    els.reaction.setAttribute('aria-label', label);
    if (els.reactionCaption) els.reactionCaption.textContent = caption;
    els.reaction.dataset.reaction = safeName;
  }

  function boardFillRatio(state) {
    let first = -1;
    for (let y = Engine.HIDDEN_ROWS; y < Engine.BOARD_ROWS; y += 1) {
      if (state.board[y].some(Boolean)) { first = y; break; }
    }
    if (first < 0) return 0;
    return Math.min(1, (Engine.BOARD_ROWS - first) / Engine.VISIBLE_ROWS);
  }

  function chooseReaction(state, now = Date.now()) {
    if (state.status === 'gameover') return 'gameover';
    if (state.status === 'completed') return now < bestFlashUntil ? 'money' : 'love';
    if (state.status === 'paused' || (state.status === 'playing' && now - lastInputAt >= 10000)) return 'sleep';
    const fill = boardFillRatio(state);
    if (fill >= .85) return Math.floor(now / 900) % 2 ? 'burnout' : 'cryA';
    if (fill >= .70) return Math.floor(now / 900) % 2 ? 'alert' : 'sweat';
    if (now < bestFlashUntil) return 'money';
    if (transientReaction && now < transientReaction.until) return transientReaction.name;
    return state.status === 'idle' ? 'idle' : 'calm';
  }

  function prepareCanvas(canvas, ratio) {
    const dpr = Math.max(1, root.devicePixelRatio || 1);
    const cssWidth = Math.max(1, Math.round(canvas.getBoundingClientRect().width || canvas.width / ratio));
    const cssHeight = Math.round(cssWidth * ratio);
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = true;
    return { ctx, width: cssWidth, height: cssHeight };
  }

  function drawCell(ctx, x, y, size, color, alpha = 1) {
    const gap = Math.max(1, size * .055);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = color; ctx.fillRect(x*size+gap, y*size+gap, size-gap*2, size-gap*2);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x*size+gap*1.5, y*size+gap*1.5, size-gap*3, Math.max(2,size*.08));
    ctx.strokeStyle = 'rgba(0,0,0,.38)'; ctx.lineWidth = Math.max(1,size*.045); ctx.strokeRect(x*size+gap, y*size+gap, size-gap*2, size-gap*2);
    ctx.restore();
  }

  function drawBoard(state) {
    const { ctx, width, height } = prepareCanvas(els.board, 2);
    ctx.clearRect(0,0,width,height); ctx.fillStyle='#080808'; ctx.fillRect(0,0,width,height);
    const cell = width / Engine.BOARD_WIDTH;
    ctx.strokeStyle='rgba(255,255,255,.055)'; ctx.lineWidth=1;
    for (let x=0;x<=Engine.BOARD_WIDTH;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,height);ctx.stroke();}
    for (let y=0;y<=Engine.VISIBLE_ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(width,y*cell);ctx.stroke();}
    for (let y=Engine.HIDDEN_ROWS;y<Engine.BOARD_ROWS;y++) for(let x=0;x<Engine.BOARD_WIDTH;x++) {
      const type=state.board[y][x]; if(type) drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[type]||'#aaa');
    }
    if (state.active) {
      const gy=Engine.ghostY(state.board,state.active);
      const ghost={...state.active,y:gy};
      for(const [x,y] of Engine.cellsFor(ghost)) if(y>=Engine.HIDDEN_ROWS) drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[ghost.type]||'#aaa',.18);
      for(const [x,y] of Engine.cellsFor(state.active)) if(y>=Engine.HIDDEN_ROWS) drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[state.active.type]||'#aaa',1);
    }
  }

  function drawMini(canvas, types, slots) {
    const {ctx,width,height}=prepareCanvas(canvas, canvas===els.next ? (300/180) : (.75));
    ctx.clearRect(0,0,width,height); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(0,0,width,height);
    const list=Array.isArray(types)?types:[types];
    const slotH=height/slots;
    list.slice(0,slots).forEach((type,index)=>{
      if(!type||!Engine.SHAPES[type]) return;
      const cells=Engine.SHAPES[type][0];
      const minX=Math.min(...cells.map(c=>c[0])),maxX=Math.max(...cells.map(c=>c[0]));
      const minY=Math.min(...cells.map(c=>c[1])),maxY=Math.max(...cells.map(c=>c[1]));
      const size=Math.min(width/(maxX-minX+2),slotH/(maxY-minY+2));
      const ox=(width-(maxX-minX+1)*size)/2-minX*size;
      const oy=index*slotH+(slotH-(maxY-minY+1)*size)/2-minY*size;
      cells.forEach(([x,y])=>{ctx.save();ctx.translate(ox,oy);drawCell(ctx,x,y,size,COLORS[type]||'#aaa');ctx.restore();});
    });
  }

  function statusMessage(state) {
    if(state.status==='idle') return mode==='classic'?'클래식 무한모드 · 오래 버티며 최고 점수에 도전하세요.':'40줄 타임어택 · 40줄을 가장 빠르게 지워 보세요.';
    if(state.status==='paused') return '일시정지 중 · P 또는 일시정지 버튼으로 계속할 수 있어요.';
    if(state.status==='gameover') return 'GAME OVER · 게임 시작을 눌러 다시 도전하세요.';
    if(state.status==='completed') return `40줄 완주! 기록 ${formatTime(state.elapsedMs)}`;
    if(mode==='sprint40') return `${state.lines}/40줄 · ${Math.max(0,40-state.lines)}줄 남았어요.`;
    return `LEVEL ${state.level} · COMBO ${Math.max(0,state.combo)}`;
  }

  function updateRecords(state, previousStatus) {
    if(state.status==='gameover' && previousStatus!=='gameover' && mode==='classic') {
      const old=currentBest();
      if(state.score>old){storageSet(CLASSIC_BEST_KEY,state.score);bestFlashUntil=Date.now()+1800;}
    }
    if(state.status==='completed' && previousStatus!=='completed' && mode==='sprint40') {
      const old=currentBest();
      if(!old||state.elapsedMs<old){storageSet(SPRINT_BEST_KEY,state.elapsedMs);bestFlashUntil=Date.now()+1800;}
    }
  }

  function observeEvents(state) {
    if(state.lastClear && state.lastClear.at!==lastClearAt){
      lastClearAt=state.lastClear.at;
      const clear=state.lastClear;
      let name='smile',duration=800;
      if(clear.lines>=4){name='money';duration=1200;}
      else if(clear.lines===3){name='love';duration=1200;}
      else if(clear.lines===2){name='sparkle';duration=800;}
      if(clear.combo>=6){name='excited';duration=1200;}
      else if(clear.combo>=3){name=Math.floor(clear.at/100)%2?'sparkle':'excited';duration=1200;}
      if(clear.lines>0||clear.tSpin) transientReaction={name,until:Date.now()+duration};
      if(root.ChuntrisAudio){ if(clear.lines>=4) root.ChuntrisAudio.play('tetris'); else if(clear.lines>0) root.ChuntrisAudio.play('line'); }
    }
    if(state.level!==lastLevel && state.level>lastLevel && root.ChuntrisAudio) root.ChuntrisAudio.play('levelup');
    lastLevel=state.level;
  }

  function render() {
    const state=game.getSnapshot();
    const previousStatus=lastStatus;
    updateRecords(state,previousStatus); observeEvents(state);
    drawBoard(state); drawMini(els.hold,state.hold? [state.hold]:[],1); drawMini(els.next,state.next,5);
    els.score.textContent=state.score.toLocaleString('ko-KR'); els.level.textContent=state.level;
    els.lines.textContent=mode==='sprint40'?`${state.lines} / 40`:state.lines; els.time.textContent=formatTime(state.elapsedMs);
    const best=currentBest(); els.best.textContent=mode==='classic'?Number(best).toLocaleString('ko-KR'):(best?formatTime(best):'--:--.---');
    els.status.textContent=statusMessage(state); els.game.dataset.gameStatus=state.status; els.game.dataset.mode=mode;
    els.pause.disabled=!(state.status==='playing'||state.status==='paused'); els.pause.textContent=state.status==='paused'?'계속하기':'일시정지';
    els.start.textContent=(state.status==='playing'||state.status==='paused')?'새 게임':'게임 시작';
    const showOverlay=['paused','gameover','completed'].includes(state.status); els.overlay.hidden=!showOverlay;
    if(showOverlay){els.overlayTitle.textContent=state.status==='paused'?'PAUSED':state.status==='completed'?'40 LINES!':'GAME OVER';els.overlayCopy.textContent=statusMessage(state);}
    setReaction(chooseReaction(state));
    if(previousStatus!==state.status && root.ChuntrisAudio){if(state.status==='gameover')root.ChuntrisAudio.play('gameover');if(state.status==='completed')root.ChuntrisAudio.play('complete');}
    if(previousStatus!==state.status && ((mode==='classic'&&state.status==='gameover')||(mode==='sprint40'&&state.status==='completed'))) void submitRanking(state);
    lastStatus=state.status;
    return state;
  }

  function start() {
    const nickname=currentNickname();
    if(!nickname){els.status.textContent='닉네임은 한글/영문/숫자/공백/_/- 조합으로 2~16자 입력해 주세요.';els.nickname?.focus();return false;}
    storageSet(NICKNAME_KEY,nickname.displayName);
    if(root.ChuntrisAudio) root.ChuntrisAudio.resume();
    if(['playing','paused','gameover','completed'].includes(game.getSnapshot().status)) game.reset(mode);
    game.start(Date.now()); lastStatus='idle'; lastLevel=1; lastClearAt=null; lastInputAt=Date.now(); transientReaction=null; lastSubmittedTerminal='';
    render(); ensureLoop(); return true;
  }

  function pause() {
    const now=Date.now(); const state=game.getSnapshot();
    if(state.status==='playing') game.pause(now); else if(state.status==='paused') game.resume(now);
    render(); ensureLoop();
  }

  function setMode(nextMode) {
    mode=nextMode==='sprint40'?'sprint40':'classic'; game=new Engine.ChuntrisGame({mode});
    document.querySelectorAll('[data-chuntris-mode]').forEach(button=>{const active=button.dataset.chuntrisMode===mode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    lastStatus='idle';lastLevel=1;lastClearAt=null;transientReaction=null;lastSubmittedTerminal='';render();void loadRanking(mode);
  }

  function act(action) {
    const state=game.getSnapshot(); if(state.status!=='playing') return false;
    lastInputAt=Date.now(); if(root.ChuntrisAudio) root.ChuntrisAudio.resume();
    let changed=false;
    if(action==='left'){changed=game.moveHorizontal(-1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('move');}
    else if(action==='right'){changed=game.moveHorizontal(1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('move');}
    else if(action==='soft-drop') changed=game.softDrop();
    else if(action==='rotate-cw'){changed=game.rotate(1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='rotate-ccw'){changed=game.rotate(-1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='hold'){changed=game.holdPiece();if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='hard-drop'){game.hardDrop(Date.now());changed=true;if(root.ChuntrisAudio)root.ChuntrisAudio.play('lock');}
    if(changed) render(); return changed;
  }

  function stopRepeat(key) {
    const item=repeats.get(key); if(!item)return; clearTimeout(item.timeout); clearInterval(item.interval); repeats.delete(key);
  }
  function startRepeat(key,action) {
    if(repeats.has(key))return; act(action);
    const item={timeout:0,interval:0}; item.timeout=setTimeout(()=>{item.interval=setInterval(()=>act(action),ARR_MS);},DAS_MS); repeats.set(key,item);
  }
  function stopAllRepeats(){for(const key of [...repeats.keys()])stopRepeat(key);}

  const repeatKeys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft-drop'};
  const singleKeys={ArrowUp:'rotate-cw',KeyX:'rotate-cw',KeyZ:'rotate-ccw',Space:'hard-drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
  document.addEventListener('keydown',event=>{
    if(repeatKeys[event.code]){if(game.getSnapshot().status==='playing'){event.preventDefault();startRepeat(event.code,repeatKeys[event.code]);}return;}
    if(singleKeys[event.code]){if(game.getSnapshot().status==='playing'){event.preventDefault();if(!event.repeat)act(singleKeys[event.code]);}return;}
    if((event.code==='KeyP'||event.code==='Escape')&&['playing','paused'].includes(game.getSnapshot().status)){event.preventDefault();if(!event.repeat)pause();}
  });
  document.addEventListener('keyup',event=>stopRepeat(event.code)); root.addEventListener('blur',stopAllRepeats);

  els.mobile?.querySelectorAll('[data-chuntris-action]').forEach(button=>{
    const action=button.dataset.chuntrisAction; const repeatable=['left','right','soft-drop'].includes(action); const key=`pointer:${action}`;
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);if(repeatable)startRepeat(key,action);else act(action);});
    for(const type of ['pointerup','pointercancel','pointerleave'])button.addEventListener(type,()=>stopRepeat(key));
  });

  document.querySelectorAll('[data-chuntris-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.chuntrisMode)));
  rankingButtons.forEach(button=>button.addEventListener('click',()=>void loadRanking(button.dataset.chuntrisRankingMode)));
  els.start.addEventListener('click',start); els.pause.addEventListener('click',pause);
  els.nickname?.addEventListener('change',()=>{const nickname=currentNickname();if(nickname)storageSet(NICKNAME_KEY,nickname.displayName);renderRanking([...els.rankingList?.children||[]].length?[]:[]);void loadRanking(rankingMode);});
  if(els.sound&&root.ChuntrisAudio){const settings=root.ChuntrisAudio.getSettings();els.sound.setAttribute('aria-pressed',String(settings.enabled));els.sound.textContent=settings.enabled?'효과음 ON':'효과음 OFF';els.volume.value=String(Math.round(settings.volume*100));els.sound.addEventListener('click',()=>{const next=els.sound.getAttribute('aria-pressed')!=='true';root.ChuntrisAudio.setEnabled(next);els.sound.setAttribute('aria-pressed',String(next));els.sound.textContent=next?'효과음 ON':'효과음 OFF';root.ChuntrisAudio.resume();});els.volume.addEventListener('input',()=>root.ChuntrisAudio.setVolume(Number(els.volume.value)/100));}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.getSnapshot().status==='playing')game.pause(Date.now());render();});
  root.addEventListener('resize',render); root.addEventListener('orientationchange',()=>setTimeout(render,80));

  function frame(){if(game.getSnapshot().status==='playing')game.advance(Date.now());render();rafId=root.requestAnimationFrame(frame);}
  function ensureLoop(){if(!rafId)rafId=root.requestAnimationFrame(frame);}

  if(els.nickname) els.nickname.value=storageGet(NICKNAME_KEY,'');
  root.ChuntrisApp={start,pause,setMode,render,loadRanking,getNickname:()=>els.nickname?.value||'',getGame:()=>game};
  setReaction('idle'); render(); ensureLoop(); void loadRanking(mode);
})(typeof globalThis !== 'undefined' ? globalThis : window);