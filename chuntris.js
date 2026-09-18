(function (root) {
  'use strict';

  const Engine = root.ChuntrisEngine;
  if (!Engine || typeof document === 'undefined') return;

  const RankingCore = root.ChuntrisRankingCore;
  const DAS_MS = 150;
  const ARR_MS = 40;
  const CLASSIC_BEST_KEY = 'chuntris.bestScore.classic.v1';
  const SPRINT_BEST_KEY = 'chuntris.bestTime.sprint40.v1';
  const HARD_BEST_KEY = 'chuntris.bestScore.hard.v1';
  const NICKNAME_KEY = 'chuntris.nickname.v1';
  const RANKING_ENDPOINT = '/api/content?type=chuntris-ranking';
  const REACTION_SPRITE = 'assets/chuntris/reactions.webp';
  const CLEAR_LABELS = Object.freeze({1:'SINGLE',2:'DOUBLE',3:'TRIPLE',4:'QUAD'});
  const CLEAR_SOUNDS = Object.freeze({1:'single',2:'double',3:'triple',4:'quad'});
  const REACTION_MAP = Object.freeze({
    idle:0, gameover:1, dizzy:2, cryA:3, cryB:4, alert:5, sweat:6, money:7, smile:8, question:9,
    sparkle:10, loading:11, sigh:12, smug:13, burnout:14, excited:15, sleep:16, love:17, angry:18, calm:19
  });
  const REACTION_LABELS = Object.freeze({
    idle:['춘봉 기본 표정','준비됐봉!'], gameover:['춘봉 게임오버 표정','앗… 다음 판은 더 잘할 수 있어!'],
    dizzy:['춘봉 어지러운 표정','블록이 빙글빙글!'], cryA:['춘봉 우는 표정','조금만 더 버텨!'],
    cryB:['춘봉 눈물 표정','위험해, 공간을 만들자!'], alert:['춘봉 놀란 표정','위험! 위쪽이 차고 있어!'],
    sweat:['춘봉 식은땀 표정','침착하게 한 줄씩!'], money:['춘봉 돈눈 표정','대박!'],
    smile:['춘봉 웃는 표정','깔끔하게 한 줄!'], question:['춘봉 물음표 표정','어디에 놓을까?'],
    sparkle:['춘봉 반짝이는 표정','좋아! 흐름 탔다!'], loading:['춘봉 로딩 표정','계산 중…'],
    sigh:['춘봉 한숨 표정','후… 다시 정리해 보자'], smug:['춘봉 뿌듯한 표정','이 정도는 쉽지!'],
    burnout:['춘봉 지친 표정','진짜 위험해! 공간부터 만들자!'], excited:['춘봉 신난 표정','콤보 폭발!'],
    sleep:['춘봉 졸린 표정','잠깐 쉬는 중…'], love:['춘봉 하트눈 표정','완벽해! 최고야!'],
    angry:['춘봉 화난 표정','집중! 아직 안 끝났어!'], calm:['춘봉 평온한 표정','천천히, 정확하게!']
  });
  const COLORS = Object.freeze({I:'#41d9ff',O:'#ffd73b',T:'#a86dff',S:'#55dc73',Z:'#ff5c67',J:'#5d82ff',L:'#ff9c3e'});

  const els = {
    game:document.getElementById('chuntris-game'), startView:document.getElementById('chuntris-start-view'),
    playView:document.getElementById('chuntris-play-view'), playerStep:document.getElementById('chuntris-player-step'),
    board:document.getElementById('chuntris-board'), boardWrap:document.querySelector('.chuntris-board-wrap'),
    hold:document.getElementById('chuntris-hold'), next:document.getElementById('chuntris-next'),
    score:document.getElementById('chuntris-score'), level:document.getElementById('chuntris-level'),
    lines:document.getElementById('chuntris-lines'), time:document.getElementById('chuntris-time'), best:document.getElementById('chuntris-best'),
    reaction:document.getElementById('chuntris-reaction'), reactionCaption:document.getElementById('chuntris-reaction-caption'),
    status:document.getElementById('chuntris-status'), start:document.getElementById('chuntris-start'), pause:document.getElementById('chuntris-pause'),
    sound:document.getElementById('chuntris-sound'), volume:document.getElementById('chuntris-volume'),
    overlay:document.getElementById('chuntris-overlay'), overlayTitle:document.getElementById('chuntris-overlay-title'),
    overlayCopy:document.getElementById('chuntris-overlay-copy'), mobile:document.getElementById('chuntris-mobile-controls'),
    nickname:document.getElementById('chuntris-nickname'), rankingStatus:document.getElementById('chuntris-ranking-status'),
    rankingList:document.getElementById('chuntris-ranking-list'), modal:document.getElementById('chuntris-modal'),
    modalTitle:document.getElementById('chuntris-modal-title'), modalBody:document.getElementById('chuntris-modal-body'),
    pauseContinue:document.getElementById('chuntris-pause-continue'), pauseNew:document.getElementById('chuntris-pause-new'),
    newConfirm:document.getElementById('chuntris-new-confirm'), newCancel:document.getElementById('chuntris-new-cancel'),
    clearLabel:document.getElementById('chuntris-clear-label'), hardDropFx:document.getElementById('chuntris-harddrop-fx'),
    lineFx:document.getElementById('chuntris-line-fx'), countdown:document.getElementById('chuntris-countdown'),
    countdownValue:document.getElementById('chuntris-countdown-value')
  };
  if (!els.game || !els.board) return;

  const rankingButtons = [...document.querySelectorAll('[data-chuntris-ranking-mode]')];
  const modalPanels = [...document.querySelectorAll('[data-chuntris-panel]')];
  const modeButtons = [...document.querySelectorAll('[data-chuntris-mode]')];
  const repeats = new Map();
  let mode = 'classic';
  let rankingMode = 'classic';
  let rankingRequestId = 0;
  let lastSubmittedTerminal = '';
  let game = new Engine.ChuntrisGame({mode});
  let rafId = 0;
  let lastStatus = 'idle';
  let lastLevel = 1;
  let lastClearAt = null;
  let lastInputAt = Date.now();
  let transientReaction = null;
  let bestFlashUntil = 0;
  let uiState = 'start-mode';
  let activeModal = 'none';
  let modalAutoPaused = false;
  let modalReturnToPause = false;
  let modalTrigger = null;
  let clearTimer = 0;
  let hardDropTimer = 0;
  let countdownTimer = 0;
  let countdownToken = 0;
  let startViewportY = 0;

  function storageGet(key, fallback = null) { try { const value=localStorage.getItem(key); return value==null?fallback:value; } catch { return fallback; } }
  function storageSet(key, value) { try { localStorage.setItem(key,String(value)); } catch {} }
  function numberFromStorage(key,fallback=0){const value=Number(storageGet(key,fallback));return Number.isFinite(value)&&value>=0?value:fallback;}

  function formatTime(ms){
    if(RankingCore?.formatTime) return RankingCore.formatTime(ms);
    const safe=Math.max(0,Math.floor(Number(ms)||0));
    const minutes=Math.floor(safe/60000),seconds=Math.floor((safe%60000)/1000),millis=safe%1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
  }
  function currentBest(){if(mode==='sprint40')return numberFromStorage(SPRINT_BEST_KEY,0);return numberFromStorage(mode==='hard'?HARD_BEST_KEY:CLASSIC_BEST_KEY,0);}
  function currentNickname(){
    const raw=els.nickname?.value||'';
    if (!raw.trim()) return null;
    const result=RankingCore?.validateNickname(raw);
    return result?.ok?result:false;
  }

  function setViewState(nextState){
    const allowed=new Set(['start-mode','start-player','countdown','playing','paused','terminal']);
    uiState=allowed.has(nextState)?nextState:'start-mode';
    els.game.dataset.uiState=uiState;
    const start=uiState==='start-mode'||uiState==='start-player'||uiState==='countdown';
    if(els.startView) els.startView.hidden=!start;
    if(els.playView) els.playView.hidden=start;
    if(els.playerStep) els.playerStep.hidden=!start;
    if(start) closeModalShell(false);
  }

  function syncRankingButtons(){rankingButtons.forEach(button=>{const active=button.dataset.chuntrisRankingMode===rankingMode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});}
  function renderRanking(entries){
    if(!els.rankingList)return;
    const current=currentNickname();
    els.rankingList.replaceChildren();
    entries.slice(0,10).forEach((entry,index)=>{
      const item=document.createElement('li'),rank=document.createElement('span'),nickname=document.createElement('span'),metric=document.createElement('strong');
      rank.className='rank';nickname.className='nickname';metric.className='metric';rank.textContent=String(entry.rank||index+1);nickname.textContent=String(entry.nickname||'익명');
      metric.textContent=rankingMode==='sprint40'?formatTime(Number(entry.timeMs)||0):Number(entry.score||0).toLocaleString('ko-KR');
      if(current&&current!==false&&RankingCore?.normalizeNickname(entry.nickname).toLocaleLowerCase('ko-KR')===current.key)item.classList.add('is-current-player');
      item.append(rank,nickname,metric);els.rankingList.append(item);
    });
    if(els.rankingStatus)els.rankingStatus.textContent=entries.length?`TOP ${Math.min(entries.length,10)} · 최고 기록 기준`:'아직 등록된 기록이 없어요.';
  }
  async function loadRanking(nextMode=mode){
    rankingMode=nextMode==='sprint40'?'sprint40':nextMode==='hard'?'hard':'classic';syncRankingButtons();const requestId=++rankingRequestId;
    if(els.rankingStatus)els.rankingStatus.textContent='랭킹 불러오는 중…';
    if(typeof fetch!=='function'){if(els.rankingStatus)els.rankingStatus.textContent='랭킹 연결을 사용할 수 없어요. 게임은 계속할 수 있어요.';return;}
    try{const response=await fetch(`${RANKING_ENDPOINT}&mode=${encodeURIComponent(rankingMode)}`,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`ranking ${response.status}`);const payload=await response.json();if(requestId!==rankingRequestId)return;renderRanking(Array.isArray(payload.entries)?payload.entries:[]);}catch{if(requestId===rankingRequestId&&els.rankingStatus)els.rankingStatus.textContent='랭킹을 불러오지 못했어요. 게임은 계속할 수 있어요.';}
  }
  async function submitRanking(state){
    const nickname=currentNickname();
    if (!nickname || typeof fetch !== 'function') return;
    const key=`${mode}:${state.status}:${state.elapsedMs}:${state.score}:${state.lines}`;if(key===lastSubmittedTerminal)return;lastSubmittedTerminal=key;
    try{const response=await fetch(RANKING_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({mode,nickname:nickname.displayName,score:state.score,lines:state.lines,level:state.level,timeMs:state.elapsedMs})});if(!response.ok)throw new Error(`ranking ${response.status}`);const payload=await response.json();if(payload.mode===rankingMode&&Array.isArray(payload.entries))renderRanking(payload.entries);else void loadRanking(rankingMode);}catch{if(els.rankingStatus)els.rankingStatus.textContent='기록 저장에 실패했어요. 게임 기록은 기기 안에 유지돼요.';}
  }

  function setReaction(name){
    if(!els.reaction)return;const safe=Object.prototype.hasOwnProperty.call(REACTION_MAP,name)?name:'idle';const index=REACTION_MAP[safe],col=index%5,row=Math.floor(index/5);
    els.reaction.style.backgroundImage=`url("${REACTION_SPRITE}")`;els.reaction.style.backgroundSize='500% 400%';els.reaction.style.backgroundPosition=`${col*25}% ${row*(100/3)}%`;
    const [label,caption]=REACTION_LABELS[safe];els.reaction.setAttribute('aria-label',label);if(els.reactionCaption)els.reactionCaption.textContent=caption;els.reaction.dataset.reaction=safe;
  }
  function boardFillRatio(state){let first=-1;for(let y=Engine.HIDDEN_ROWS;y<Engine.BOARD_ROWS;y+=1){if(state.board[y].some(Boolean)){first=y;break;}}return first<0?0:Math.min(1,(Engine.BOARD_ROWS-first)/Engine.VISIBLE_ROWS);}
  function chooseReaction(state,now=Date.now()){
    if(state.status==='gameover')return'gameover';if(state.status==='completed')return now<bestFlashUntil?'money':'love';if(state.status==='paused'||(state.status==='playing'&&now-lastInputAt>=10000))return'sleep';
    const fill=boardFillRatio(state);if(fill>=.85)return Math.floor(now/900)%2?'burnout':'cryA';if(fill>=.70)return Math.floor(now/900)%2?'alert':'sweat';if(now<bestFlashUntil)return'money';if(transientReaction&&now<transientReaction.until)return transientReaction.name;return state.status==='idle'?'idle':'calm';
  }

  function prepareCanvas(canvas,ratio){const dpr=Math.max(1,root.devicePixelRatio||1);const cssWidth=Math.max(1,Math.round(canvas.getBoundingClientRect().width||canvas.width/ratio));const cssHeight=Math.round(cssWidth*ratio);const width=Math.round(cssWidth*dpr),height=Math.round(cssHeight*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;return{ctx,width:cssWidth,height:cssHeight};}
  function drawCell(ctx,x,y,size,color,alpha=1){const gap=Math.max(1,size*.055);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(x*size+gap,y*size+gap,size-gap*2,size-gap*2);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x*size+gap*1.5,y*size+gap*1.5,size-gap*3,Math.max(2,size*.08));ctx.strokeStyle='rgba(0,0,0,.38)';ctx.lineWidth=Math.max(1,size*.045);ctx.strokeRect(x*size+gap,y*size+gap,size-gap*2,size-gap*2);ctx.restore();}
  function drawBoard(state){
    const {ctx,width,height}=prepareCanvas(els.board,2);ctx.clearRect(0,0,width,height);ctx.fillStyle='#080808';ctx.fillRect(0,0,width,height);const cell=width/Engine.BOARD_WIDTH;ctx.strokeStyle='rgba(255,255,255,.055)';ctx.lineWidth=1;
    for(let x=0;x<=Engine.BOARD_WIDTH;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,height);ctx.stroke();}for(let y=0;y<=Engine.VISIBLE_ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(width,y*cell);ctx.stroke();}
    for(let y=Engine.HIDDEN_ROWS;y<Engine.BOARD_ROWS;y++)for(let x=0;x<Engine.BOARD_WIDTH;x++){const type=state.board[y][x];if(type)drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[type]||'#aaa');}
    if(state.active){const gy=Engine.ghostY(state.board,state.active),ghost={...state.active,y:gy};for(const [x,y] of Engine.cellsFor(ghost))if(y>=Engine.HIDDEN_ROWS)drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[ghost.type]||'#aaa',.18);for(const [x,y] of Engine.cellsFor(state.active))if(y>=Engine.HIDDEN_ROWS)drawCell(ctx,x,y-Engine.HIDDEN_ROWS,cell,COLORS[state.active.type]||'#aaa',1);}
  }
  function drawMini(canvas,types,slots){if(!canvas)return;const {ctx,width,height}=prepareCanvas(canvas,canvas===els.next?(300/180):.75);ctx.clearRect(0,0,width,height);ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,width,height);const list=Array.isArray(types)?types:[types],slotH=height/slots;list.slice(0,slots).forEach((type,index)=>{if(!type||!Engine.SHAPES[type])return;const cells=Engine.SHAPES[type][0];const minX=Math.min(...cells.map(c=>c[0])),maxX=Math.max(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1])),maxY=Math.max(...cells.map(c=>c[1]));const size=Math.min(width/(maxX-minX+2),slotH/(maxY-minY+2)),ox=(width-(maxX-minX+1)*size)/2-minX*size,oy=index*slotH+(slotH-(maxY-minY+1)*size)/2-minY*size;cells.forEach(([x,y])=>{ctx.save();ctx.translate(ox,oy);drawCell(ctx,x,y,size,COLORS[type]||'#aaa');ctx.restore();});});}

  function statusMessage(state){if(state.status==='idle')return mode==='classic'?'클래식 무한 · 오래 버티며 최고 점수에 도전하세요.':mode==='hard'?'하드 무한 · 빠른 중력과 짧은 고정 시간에 도전하세요.':'40줄 타임어택 · 40줄을 가장 빠르게 지워 보세요.';if(state.status==='paused')return'일시정지 중';if(state.status==='gameover')return'GAME OVER · 새 게임으로 다시 도전하세요.';if(state.status==='completed')return`40줄 완주! 기록 ${formatTime(state.elapsedMs)}`;if(mode==='sprint40')return`${state.lines}/40줄 · ${Math.max(0,40-state.lines)}줄 남았어요.`;return`LEVEL ${state.level} · COMBO ${Math.max(0,state.combo)}`;}
  function updateRecords(state,previousStatus){if(state.status==='gameover'&&previousStatus!=='gameover'&&(mode==='classic'||mode==='hard')){const old=currentBest();if(state.score>old){storageSet(mode==='hard'?HARD_BEST_KEY:CLASSIC_BEST_KEY,state.score);bestFlashUntil=Date.now()+1800;}}if(state.status==='completed'&&previousStatus!=='completed'&&mode==='sprint40'){const old=currentBest();if(!old||state.elapsedMs<old){storageSet(SPRINT_BEST_KEY,state.elapsedMs);bestFlashUntil=Date.now()+1800;}}}

  function restartAnimation(element,className){if(!element)return;element.classList.remove(className);void element.offsetWidth;element.classList.add(className);}
  function showHardDropEffect(detail={}){
    const active=detail.active||null;
    const landingY=Number.isFinite(detail.landingY)?detail.landingY:(active?.y??0);
    const startCells=active?Engine.cellsFor(active):[];
    const landingCells=active?Engine.cellsFor({...active,y:landingY}):[];
    const xCells=landingCells.length?landingCells:startCells;
    const xPct=xCells.length?(xCells.reduce((sum,[x])=>sum+x+.5,0)/xCells.length/Engine.BOARD_WIDTH)*100:50;
    const startRows=startCells.filter(([,y])=>y>=Engine.HIDDEN_ROWS).map(([,y])=>y-Engine.HIDDEN_ROWS);
    const endRows=landingCells.filter(([,y])=>y>=Engine.HIDDEN_ROWS).map(([,y])=>y-Engine.HIDDEN_ROWS);
    const startPct=startRows.length?(Math.min(...startRows)/Engine.VISIBLE_ROWS)*100:0;
    const endPct=endRows.length?((Math.max(...endRows)+1)/Engine.VISIBLE_ROWS)*100:95;
    if(els.hardDropFx){
      els.hardDropFx.style.setProperty('--drop-x',`${Math.max(2,Math.min(98,xPct))}%`);
      els.hardDropFx.style.setProperty('--drop-start',`${Math.max(0,Math.min(95,startPct))}%`);
      els.hardDropFx.style.setProperty('--drop-end',`${Math.max(5,Math.min(100,endPct))}%`);
      restartAnimation(els.hardDropFx,'is-active');
      clearTimeout(hardDropTimer);
      hardDropTimer=setTimeout(()=>els.hardDropFx?.classList.remove('is-active'),260);
    }
    if(els.boardWrap){restartAnimation(els.boardWrap,'is-impact');setTimeout(()=>els.boardWrap?.classList.remove('is-impact'),220);}
  }
  function showClearEffect(lines,clearDetail={}){
    const label=CLEAR_LABELS[lines];
    if(!label||!els.clearLabel)return;
    els.clearLabel.textContent=label;
    els.clearLabel.className=`chuntris-clear-label is-${label.toLowerCase()}`;
    restartAnimation(els.clearLabel,'is-visible');
    if(els.lineFx){
      els.lineFx.replaceChildren();
      const rows=Array.isArray(clearDetail.clearedRows)?clearDetail.clearedRows:[];
      const visibleRows=rows.filter(row=>Number.isInteger(row)&&row>=Engine.HIDDEN_ROWS&&row<Engine.BOARD_ROWS);
      const count=Math.max(0,Math.min(4,Number(lines)||0));
      const effectRows=visibleRows.length?visibleRows:Array.from({length:count},(_,index)=>Engine.BOARD_ROWS-1-index);
      effectRows.forEach(row=>{
        const visualRow=row-Engine.HIDDEN_ROWS;
        if(visualRow<0||visualRow>=Engine.VISIBLE_ROWS)return;
        const flash=document.createElement('span');
        flash.className=`chuntris-line-flash is-${label.toLowerCase()}`;
        flash.style.top=`${(visualRow/Engine.VISIBLE_ROWS)*100}%`;
        els.lineFx.append(flash);
      });
    }
    clearTimeout(clearTimer);
    clearTimer=setTimeout(()=>{
      if(els.clearLabel){els.clearLabel.classList.remove('is-visible');els.clearLabel.textContent='';}
      els.lineFx?.replaceChildren();
    },950);
  }
  function observeEvents(state){
    if(state.lastClear&&state.lastClear.at!==lastClearAt){lastClearAt=state.lastClear.at;const clear=state.lastClear;if(clear.lines>0){showClearEffect(clear.lines,clear);const clearSound=CLEAR_SOUNDS[clear.lines];if(clearSound&&root.ChuntrisAudio)root.ChuntrisAudio.play(clearSound);let name='smile',duration=850;if(clear.lines===2){name='sparkle';duration=950;}else if(clear.lines===3){name='love';duration=1150;}else if(clear.lines>=4){name='money';duration=1300;}transientReaction={name,until:Date.now()+duration};}}
    if(state.level!==lastLevel&&state.level>lastLevel&&root.ChuntrisAudio)root.ChuntrisAudio.play('levelup');lastLevel=state.level;
  }

  function render(){
    const state=game.getSnapshot(),previousStatus=lastStatus;updateRecords(state,previousStatus);observeEvents(state);
    if(!els.playView?.hidden){drawBoard(state);drawMini(els.hold,state.hold?[state.hold]:[],1);drawMini(els.next,state.next,5);}
    if(els.score)els.score.textContent=state.score.toLocaleString('ko-KR');if(els.level)els.level.textContent=state.level;if(els.lines)els.lines.textContent=mode==='sprint40'?`${state.lines} / 40`:state.lines;if(els.time)els.time.textContent=formatTime(state.elapsedMs);
    const best=currentBest();if(els.best)els.best.textContent=mode==='sprint40'?(best?formatTime(best):'--:--.---'):Number(best).toLocaleString('ko-KR');if(els.status)els.status.textContent=statusMessage(state);els.game.dataset.gameStatus=state.status;els.game.dataset.mode=mode;
    if(els.pause)els.pause.disabled=!(state.status==='playing'||state.status==='paused');
    const terminal=state.status==='gameover'||state.status==='completed';if(terminal&&uiState!=='terminal')setViewState('terminal');
    if(els.overlay){els.overlay.hidden=!terminal;if(terminal){els.overlayTitle.textContent=state.status==='completed'?'40 LINES!':'GAME OVER';els.overlayCopy.textContent=statusMessage(state);}}
    setReaction(chooseReaction(state));
    if(previousStatus!==state.status&&root.ChuntrisAudio){if(state.status==='gameover')root.ChuntrisAudio.play('gameover');if(state.status==='completed')root.ChuntrisAudio.play('complete');}
    if(previousStatus!==state.status&&(((mode==='classic'||mode==='hard')&&state.status==='gameover')||(mode==='sprint40'&&state.status==='completed')))void submitRanking(state);
    lastStatus=state.status;return state;
  }

  function showModalPanel(kind){modalPanels.forEach(panel=>{panel.hidden=panel.dataset.chuntrisPanel!==kind;});const titles={ranking:'전체 랭킹',sound:'소리 설정',controls:'키 조작법',pause:'일시정지','new-game-confirm':'새 게임'};if(els.modalTitle)els.modalTitle.textContent=titles[kind]||'춘트리스';activeModal=kind;if(els.modal)els.modal.hidden=false;document.body.classList.add('chuntris-modal-open');}
  function closeModalShell(restoreFocus=true){if(els.modal)els.modal.hidden=true;document.body.classList.remove('chuntris-modal-open');activeModal='none';modalReturnToPause=false;if(restoreFocus&&modalTrigger?.focus)modalTrigger.focus();modalTrigger=null;}
  function openUtilityModal(kind,trigger=null){
    if(!['ranking','sound','controls'].includes(kind))return;modalTrigger=trigger||document.activeElement;const state=game.getSnapshot();modalReturnToPause=activeModal==='pause'||uiState==='paused';modalAutoPaused=false;
    if (state.status === 'playing') { game.pause(Date.now()); modalAutoPaused = true; setViewState('paused'); }
    showModalPanel(kind);if(kind==='ranking')void loadRanking(rankingMode);render();
  }
  function closeUtilityModal(){
    if(!['ranking','sound','controls'].includes(activeModal)){closeModalShell();return;}
    if(modalReturnToPause){modalAutoPaused=false;modalReturnToPause=false;showModalPanel('pause');return;}
    const shouldResume=modalAutoPaused;modalAutoPaused=false;closeModalShell();
    if (shouldResume && game.getSnapshot().status==='paused') { game.resume(Date.now()); setViewState('playing'); }
    render();ensureLoop();
  }
  function openPauseMenu(){
    const state=game.getSnapshot();if(state.status==='playing')game.pause(Date.now());else if(state.status!=='paused')return false;modalAutoPaused=false;modalReturnToPause=false;setViewState('paused');showModalPanel('pause');render();return true;
  }
  function continueGame(){if(game.getSnapshot().status==='paused')game.resume(Date.now());closeModalShell();setViewState('playing');lastInputAt=Date.now();render();ensureLoop();return true;}
  function returnToStartForNewGame(){cancelCountdown();game.reset(mode);lastStatus='idle';lastLevel=1;lastClearAt=null;transientReaction=null;lastSubmittedTerminal='';closeModalShell(false);setViewState('start-player');render();return true;}

  function setStartControlsDisabled(disabled){
    if(els.start)els.start.disabled=Boolean(disabled);
    modeButtons.forEach(button=>{button.disabled=Boolean(disabled);});
    els.startView?.querySelectorAll('.chuntris-start-utils button').forEach(button=>{button.disabled=Boolean(disabled);});
  }
  function cancelCountdown(){
    countdownToken+=1;
    if(countdownTimer){clearTimeout(countdownTimer);countdownTimer=0;}
    if(els.countdown){els.countdown.hidden=true;els.countdown.classList.remove('is-start');}
    if(els.countdownValue)els.countdownValue.textContent='3';
    setStartControlsDisabled(false);
  }
  function restoreStartViewport(){
    if(typeof root.scrollTo!=='function')return;
    const target=Math.max(0,Number(startViewportY)||0);
    const restore=()=>root.scrollTo(0,target);
    restore();
    if(typeof root.requestAnimationFrame==='function'){
      root.requestAnimationFrame(()=>{restore();root.requestAnimationFrame?.(restore);});
    }
    root.setTimeout?.(restore,120);
    root.setTimeout?.(restore,260);
  }
  function beginGame(){
    game.start(Date.now());lastStatus='idle';lastLevel=1;lastClearAt=null;lastInputAt=Date.now();transientReaction=null;lastSubmittedTerminal='';
    if(els.countdown){els.countdown.hidden=true;els.countdown.classList.remove('is-start');}
    setStartControlsDisabled(false);closeModalShell(false);setViewState('playing');render();restoreStartViewport();ensureLoop();return true;
  }
  function start(){
    if(uiState==='countdown')return false;
    const nickname=currentNickname();
    if(nickname===false){if(els.status)els.status.textContent='닉네임 형식을 확인해 주세요. 비워두면 로컬 기록으로 바로 플레이할 수 있어요.';els.nickname?.focus();return false;}
    if(nickname)storageSet(NICKNAME_KEY,nickname.displayName);
    if(root.ChuntrisAudio)root.ChuntrisAudio.resume();
    if(['playing','paused','gameover','completed'].includes(game.getSnapshot().status))game.reset(mode);
    cancelCountdown();
    startViewportY=typeof root.scrollY==='number'?root.scrollY:0;
    els.start?.blur?.();
    const token=++countdownToken;
    setViewState('countdown');setStartControlsDisabled(true);render();
    if(!els.countdown||!els.countdownValue)return beginGame();
    els.countdown.hidden=false;
    const frames=['3','2','1','START!'];
    let index=0;
    const advance=()=>{
      if(token!==countdownToken)return;
      const value=frames[index];
      els.countdownValue.textContent=value;
      els.countdown.classList.toggle('is-start',value==='START!');
      if(root.ChuntrisAudio&&value!=='START!')root.ChuntrisAudio.play?.('move');
      index+=1;
      if(index<frames.length){countdownTimer=setTimeout(advance,700);return;}
      countdownTimer=setTimeout(()=>{if(token===countdownToken)beginGame();},420);
    };
    advance();
    return true;
  }
  function setMode(nextMode){cancelCountdown();mode=nextMode==='sprint40'?'sprint40':nextMode==='hard'?'hard':'classic';game=new Engine.ChuntrisGame({mode});modeButtons.forEach(button=>{const active=button.dataset.chuntrisMode===mode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});lastStatus='idle';lastLevel=1;lastClearAt=null;transientReaction=null;lastSubmittedTerminal='';setViewState('start-player');render();void loadRanking(mode);}
  function pause(){const state=game.getSnapshot();if(state.status==='playing')return openPauseMenu();if(state.status==='paused')return continueGame();return false;}

  function act(action){
    const state=game.getSnapshot();if(state.status!=='playing'||activeModal!=='none')return false;lastInputAt=Date.now();if(root.ChuntrisAudio)root.ChuntrisAudio.resume();let changed=false;
    if(action==='left'){changed=game.moveHorizontal(-1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('move');}
    else if(action==='right'){changed=game.moveHorizontal(1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('move');}
    else if(action==='soft-drop')changed=game.softDrop();
    else if(action==='rotate-cw'){changed=game.rotate(1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='rotate-ccw'){changed=game.rotate(-1);if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='hold'){changed=game.holdPiece();if(changed&&root.ChuntrisAudio)root.ChuntrisAudio.play('rotate');}
    else if(action==='hard-drop'){const before=game.getSnapshot();const active=before.active?{...before.active}:null;const landingY=active?Engine.ghostY(before.board,active):null;game.hardDrop(Date.now());changed=true;showHardDropEffect({active,landingY});if(root.ChuntrisAudio)root.ChuntrisAudio.play('harddrop');}
    if(changed)render();return changed;
  }

  function stopRepeat(key){const item=repeats.get(key);if(!item)return;clearTimeout(item.timeout);clearInterval(item.interval);repeats.delete(key);}
  function startRepeat(key,action){if(repeats.has(key))return;act(action);const item={timeout:0,interval:0};item.timeout=setTimeout(()=>{item.interval=setInterval(()=>act(action),ARR_MS);},DAS_MS);repeats.set(key,item);}
  function stopAllRepeats(){for(const key of [...repeats.keys()])stopRepeat(key);}
  const repeatKeys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft-drop'};
  const singleKeys={ArrowUp:'rotate-cw',KeyX:'rotate-cw',KeyZ:'rotate-ccw',Space:'hard-drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
  document.addEventListener('keydown',event=>{
    if(event.code==='Escape'){
      if(activeModal==='ranking'||activeModal==='sound'||activeModal==='controls'){event.preventDefault();closeUtilityModal();return;}
      if(activeModal==='pause'){event.preventDefault();continueGame();return;}
      if(activeModal==='new-game-confirm'){event.preventDefault();showModalPanel('pause');return;}
      if(game.getSnapshot().status==='playing'){event.preventDefault();openPauseMenu();return;}
    }
    if(event.code==='KeyP'&&!event.repeat&&['playing','paused'].includes(game.getSnapshot().status)){event.preventDefault();if(activeModal==='none')pause();else if(activeModal==='pause')continueGame();return;}
    if(activeModal!=='none')return;
    if(repeatKeys[event.code]){if(game.getSnapshot().status==='playing'){event.preventDefault();startRepeat(event.code,repeatKeys[event.code]);}return;}
    if(singleKeys[event.code]){if(game.getSnapshot().status==='playing'){event.preventDefault();if(!event.repeat)act(singleKeys[event.code]);}}
  });
  document.addEventListener('keyup',event=>stopRepeat(event.code));root.addEventListener('blur',stopAllRepeats);

  els.mobile?.querySelectorAll('[data-chuntris-action]').forEach(button=>{const action=button.dataset.chuntrisAction,repeatable=['left','right','soft-drop'].includes(action),key=`pointer:${action}`;button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);if(repeatable)startRepeat(key,action);else act(action);});for(const type of ['pointerup','pointercancel','pointerleave'])button.addEventListener(type,()=>stopRepeat(key));});
  modeButtons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.chuntrisMode)));
  rankingButtons.forEach(button=>button.addEventListener('click',()=>void loadRanking(button.dataset.chuntrisRankingMode)));
  document.querySelectorAll('[data-chuntris-open]').forEach(button=>button.addEventListener('click',event=>openUtilityModal(button.dataset.chuntrisOpen,event.currentTarget)));
  document.querySelectorAll('[data-chuntris-modal-close]').forEach(button=>button.addEventListener('click',()=>{if(['ranking','sound','controls'].includes(activeModal))closeUtilityModal();else if(activeModal==='pause')continueGame();else closeModalShell();}));
  els.start?.addEventListener('click',start);els.pause?.addEventListener('click',openPauseMenu);els.pauseContinue?.addEventListener('click',continueGame);els.pauseNew?.addEventListener('click',()=>showModalPanel('new-game-confirm'));els.newConfirm?.addEventListener('click',returnToStartForNewGame);els.newCancel?.addEventListener('click',()=>showModalPanel('pause'));
  els.nickname?.addEventListener('change',()=>{const nickname=currentNickname();if(nickname&&nickname!==false)storageSet(NICKNAME_KEY,nickname.displayName);});
  if(els.sound&&root.ChuntrisAudio){const settings=root.ChuntrisAudio.getSettings();els.sound.setAttribute('aria-pressed',String(settings.enabled));els.sound.textContent=settings.enabled?'효과음 ON':'효과음 OFF';els.volume.value=String(Math.round(settings.volume*100));els.sound.addEventListener('click',()=>{const next=els.sound.getAttribute('aria-pressed')!=='true';root.ChuntrisAudio.setEnabled(next);els.sound.setAttribute('aria-pressed',String(next));els.sound.textContent=next?'효과음 ON':'효과음 OFF';root.ChuntrisAudio.resume();});els.volume.addEventListener('input',()=>root.ChuntrisAudio.setVolume(Number(els.volume.value)/100));}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.getSnapshot().status==='playing'){game.pause(Date.now());setViewState('paused');showModalPanel('pause');}render();});
  root.addEventListener('resize',render);root.addEventListener('orientationchange',()=>setTimeout(render,80));

  function frame(){if(game.getSnapshot().status==='playing')game.advance(Date.now());render();rafId=root.requestAnimationFrame(frame);}
  function ensureLoop(){if(!rafId)rafId=root.requestAnimationFrame(frame);}

  if(els.nickname)els.nickname.value=storageGet(NICKNAME_KEY,'');
  root.ChuntrisApp={start,pause,setMode,render,loadRanking,getNickname:()=>els.nickname?.value||'',getGame:()=>game,getUiState:()=>uiState,setViewState,openUtilityModal,closeUtilityModal,openPauseMenu,continueGame,returnToStartForNewGame,showHardDropEffect,showClearEffect};
  setReaction('idle');setViewState('start-mode');render();ensureLoop();void loadRanking(mode);
})(typeof globalThis!=='undefined'?globalThis:window);
