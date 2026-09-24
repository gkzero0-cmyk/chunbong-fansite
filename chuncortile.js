(()=>{'use strict';
  const Core=globalThis.ChuncortileCore;
  if(!Core)return;

  const BEST_KEY='chuncortile.best.v1';
  const RANKING_ENDPOINT='/api/content?type=chuncortile-ranking&mode=classic';
  const COMBO_WINDOW=2800;
  const CLEAR_PARTICLES_PER_TILE=4;
  const CLEAR_RESOLVE_MS=300;
  const HUD_FRAME_MS=50;
  const COLORS=['#E53935','#1E88E5','#FDD835','#43A047','#FB8C00','#8E24AA','#00ACC1','#EC407A','#90A4AE','#3949AB','#7CB342'];

  const e={
    game:document.getElementById('chuncortile'),board:document.getElementById('ct-board'),wrap:document.getElementById('ct-board-wrap'),
    score:document.getElementById('ct-score'),best:document.getElementById('ct-best'),timer:document.getElementById('ct-timer'),timeFill:document.getElementById('ct-time-fill'),
    comboStat:document.getElementById('ct-combo-stat'),comboPop:document.getElementById('ct-combo-pop'),remaining:document.getElementById('ct-remaining'),misses:document.getElementById('ct-misses'),message:document.getElementById('ct-message'),
    startOverlay:document.getElementById('ct-start-overlay'),countdown:document.getElementById('ct-countdown'),pauseOverlay:document.getElementById('ct-pause-overlay'),over:document.getElementById('ct-over-overlay'),
    start:document.getElementById('ct-start'),again:document.getElementById('ct-again'),restart:document.getElementById('ct-restart'),pause:document.getElementById('ct-pause'),resume:document.getElementById('ct-resume'),pauseRestart:document.getElementById('ct-pause-restart'),
    hint:document.getElementById('ct-hint'),sound:document.getElementById('ct-sound'),soundIcon:document.getElementById('ct-sound-icon'),soundLabel:document.getElementById('ct-sound-label'),
    ranking:document.getElementById('ct-ranking'),pauseRanking:document.getElementById('ct-pause-ranking'),overRanking:document.getElementById('ct-over-ranking'),
    rankingModal:document.getElementById('ct-ranking-modal'),rankingClose:document.getElementById('ct-ranking-close'),rankingStatus:document.getElementById('ct-ranking-status'),rankingList:document.getElementById('ct-ranking-list'),
    fx:document.getElementById('ct-fx-layer'),flash:document.getElementById('ct-flash'),
    finalScore:document.getElementById('ct-final-score'),finalCombo:document.getElementById('ct-final-combo'),finalMisses:document.getElementById('ct-final-misses'),finalRemaining:document.getElementById('ct-final-remaining'),
    resultKicker:document.getElementById('ct-result-kicker'),resultTitle:document.getElementById('ct-result-title'),resultText:document.getElementById('ct-result-text')
  };
  if(Object.values(e).some(value=>!value))return;

  let board=Core.createBoard(),score=0,best=Number(localStorage.getItem(BEST_KEY)||0),misses=0,combo=0,maxCombo=0,lastClearAt=0;
  let remainingMs=Core.GAME_MS,endAt=0,running=false,paused=false,resolving=false,raf=0,soundOn=true,audioCtx=null,hintIndex=-1,seed=0,lastHudFrameAt=0;
  let modalPaused=false,modalFromPause=false;
  let previewIndex=-1,previewMatches=[];
  let touchTargetIndex=-1;
  const coarsePointer=window.matchMedia?.('(pointer: coarse)');

  const cells=[];

  function touchAssistEnabled(){return Boolean(coarsePointer?.matches||navigator.maxTouchPoints>0);}
  function clearTouchTarget(){
    if(touchTargetIndex>=0)cells[touchTargetIndex]?.classList.remove('is-touch-target');
    touchTargetIndex=-1;
  }
  function nearestEmptyIndex(index,clientX,clientY){
    if(!touchAssistEnabled()||board[index]===null)return index;
    const rect=e.board.getBoundingClientRect(),cellW=rect.width/Core.COLS,cellH=rect.height/Core.ROWS;
    const row=Math.floor(index/Core.COLS),col=index%Core.COLS;
    let best=-1,bestDistance=Infinity;
    for(let dr=-2;dr<=2;dr+=1)for(let dc=-2;dc<=2;dc+=1){
      const r=row+dr,c=col+dc;
      if(r<0||r>=Core.ROWS||c<0||c>=Core.COLS)continue;
      const candidate=r*Core.COLS+c;
      if(board[candidate]!==null)continue;
      const x=rect.left+(c+.5)*cellW,y=rect.top+(r+.5)*cellH;
      const distance=Math.hypot(clientX-x,clientY-y);
      if(distance<bestDistance){bestDistance=distance;best=candidate;}
    }
    return best>=0&&bestDistance<=Math.max(cellW,cellH)*1.65?best:index;
  }
  function resolveCellInput(index,event){
    if(!touchAssistEnabled()||event?.detail===0)return index;
    return nearestEmptyIndex(index,Number(event?.clientX)||0,Number(event?.clientY)||0);
  }

  function buildCells(){
    if(cells.length)return;
    const frag=document.createDocumentFragment();
    for(let i=0;i<Core.COLS*Core.ROWS;i+=1){
      const button=document.createElement('button');
      button.type='button';button.className='ct-cell';button.dataset.index=String(i);button.setAttribute('role','gridcell');
      button.addEventListener('click',event=>handleCell(resolveCellInput(i,event)));
      cells.push(button);frag.append(button);
    }
    e.board.replaceChildren(frag);
  }

  function faceClass(type){return 'ct-face ct-face-'+(type+1);}
  function renderBoard(clearSet=null){
    previewIndex=-1;previewMatches=[];
    cells.forEach((cell,index)=>{
      const type=board[index];
      cell.className='ct-cell '+(type===null?'is-empty':'is-tile');
      if(index===hintIndex)cell.classList.add('is-hint');
      cell.replaceChildren();
      cell.setAttribute('aria-label',type===null?'빈 칸':`춘봉 표정 타일 ${type+1}`);
      if(type!==null){
        const tile=document.createElement('span');tile.className='ct-tile type-'+type;tile.style.setProperty('--tile-color',COLORS[type]);
        const face=document.createElement('i');face.className=faceClass(type);tile.append(face);cell.append(tile);
        if(clearSet?.has(index))cell.classList.add('is-clearing');
      }
    });
  }

  function formatTime(ms){const total=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
  function updateHud(){
    const remain=Core.remainingTiles(board);
    e.score.textContent=String(score);e.best.textContent=String(best);e.comboStat.textContent=`x${combo}`;e.misses.textContent=String(misses);e.remaining.textContent=String(remain);e.timer.textContent=formatTime(remainingMs);
    e.timeFill.style.transform=`scaleX(${Math.max(0,Math.min(1,remainingMs/Core.GAME_MS))})`;
  }
  function setStatus(status){e.game.dataset.gameStatus=status;}
  function setMessage(text){e.message.textContent=text;}
  function flash(kind){e.flash.className='ct-flash';void e.flash.offsetWidth;e.flash.classList.add(kind);}

  function getAudio(){
    if(!soundOn)return null;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;
  }
  function tone(freq,duration=.06,delay=0,volume=.02,type='sine'){
    const ctx=getAudio();if(!ctx)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+delay;
    osc.type=type;osc.frequency.setValueAtTime(freq,t);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.03);
  }
  const sound={
    clear(removed,chain){
      const lift=Math.min(chain,8)*28;
      tone(660+lift,.055,0,.026,'triangle');
      tone(880+lift,.07,.035,.021,'sine');
      tone(1100+lift,.09,.075,.016,'triangle');
      if(removed>=3)tone(1320+lift,.11,.11,.014,'sine');
      if(chain>=3)tone(1560+lift,.13,.145,.011,'triangle');
    },
    miss(){tone(225,.08,0,.016,'square');tone(165,.12,.045,.013,'sine');},
    start(){tone(520,.06);tone(660,.07,.06);tone(880,.09,.12);},
    finish(){[660,880,1100,1320].forEach((f,i)=>tone(f,.15,i*.075,.018,i%2?'triangle':'sine'));},
    hint(){tone(900,.06);tone(1200,.08,.05,.014);},
    pause(){tone(440,.055);tone(330,.07,.05,.012);},
    resume(){tone(523,.05);tone(784,.08,.045,.015);}
  };

  function showCombo(value){
    if(value<2)return;
    e.comboPop.textContent=`COMBO x${value}`;
    e.comboPop.classList.remove('show','hot');if(value>=5)e.comboPop.classList.add('hot');
    void e.comboPop.offsetWidth;e.comboPop.classList.add('show');
  }

  function showClearFx(matches,clickIndex,removed,chain){
    const wrapRect=e.wrap.getBoundingClientRect();
    const clickRect=cells[clickIndex].getBoundingClientRect();
    const origin={
      x:clickRect.left-wrapRect.left+clickRect.width/2,
      y:clickRect.top-wrapRect.top+clickRect.height/2
    };
    const matchType=board[matches[0]];
    const matchColor=COLORS[Number.isInteger(matchType)?matchType:0]||'#ff7650';
    const burstColors=[matchColor,'#fff4cf','#ffffff','#ffb36d'];

    // Read every layout value first. DOM writes happen afterwards in one batch,
    // preventing repeated style/layout recalculation during a clear.
    const geometry=matches.map(index=>{
      const rect=cells[index].getBoundingClientRect();
      const x=rect.left-wrapRect.left+rect.width/2;
      const y=rect.top-wrapRect.top+rect.height/2;
      const dx=x-origin.x,dy=y-origin.y;
      return {x,y,distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)*180/Math.PI};
    });

    const fragment=document.createDocumentFragment();
    const transient=[];

    geometry.forEach((point,mIndex)=>{
      const line=document.createElement('i');
      line.className='ct-match-line';
      line.style.left=`${origin.x}px`;
      line.style.top=`${origin.y}px`;
      line.style.width=`${point.distance}px`;
      line.style.transform=`rotate(${point.angle}deg)`;
      line.style.setProperty('--match-color',matchColor);
      fragment.append(line);transient.push(line);

      const ring=document.createElement('i');
      ring.className='ct-clear-ring';
      ring.style.left=`${point.x}px`;
      ring.style.top=`${point.y}px`;
      ring.style.setProperty('--match-color',matchColor);
      fragment.append(ring);transient.push(ring);

      for(let p=0;p<CLEAR_PARTICLES_PER_TILE;p+=1){
        const particle=document.createElement('i');
        particle.className='ct-burst';
        particle.style.left=`${point.x}px`;
        particle.style.top=`${point.y}px`;
        particle.style.setProperty('--burst',burstColors[(mIndex+p+chain)%burstColors.length]);
        const burstAngle=(Math.PI*2*(p/CLEAR_PARTICLES_PER_TILE))+(mIndex*.27);
        const distancePx=26+Math.random()*28;
        particle.style.setProperty('--dx',`${Math.cos(burstAngle)*distancePx}px`);
        particle.style.setProperty('--dy',`${Math.sin(burstAngle)*distancePx}px`);
        fragment.append(particle);transient.push(particle);
      }
    });

    const originRing=document.createElement('i');
    originRing.className='ct-clear-ring';
    originRing.style.left=`${origin.x}px`;
    originRing.style.top=`${origin.y}px`;
    originRing.style.setProperty('--match-color',matchColor);
    fragment.append(originRing);transient.push(originRing);

    const pop=document.createElement('b');
    pop.className='ct-score-pop';
    pop.textContent=`+${removed}`;
    pop.style.left=`${origin.x}px`;
    pop.style.top=`${origin.y}px`;
    fragment.append(pop);

    e.fx.append(fragment);
    setTimeout(()=>transient.forEach(node=>node.remove()),720);
    setTimeout(()=>pop.remove(),820);
    showCombo(chain);
  }

  function tick(now=performance.now()){
    if(!running||paused)return;
    remainingMs=Math.max(0,endAt-now);if(!HUD_FRAME_MS||now-lastHudFrameAt>=HUD_FRAME_MS||remainingMs<=0){lastHudFrameAt=now;updateHud();}
    if(remainingMs<=0){finishGame('time');return;}
    raf=requestAnimationFrame(tick);
  }

  function finishGame(reason){
    if(!running&&!paused)return;
    running=false;paused=false;cancelAnimationFrame(raf);
    if(reason==='time')remainingMs=0;
    best=Math.max(best,score);try{localStorage.setItem(BEST_KEY,String(best))}catch{}
    e.pauseOverlay.classList.add('hidden');updateHud();setStatus('gameover');
    e.finalScore.textContent=String(score);e.finalCombo.textContent=`x${maxCombo}`;e.finalMisses.textContent=String(misses);e.finalRemaining.textContent=String(Core.remainingTiles(board));
    if(reason==='clear'){
      e.resultKicker.textContent='PERFECT CLEAR';e.resultTitle.textContent='200개 전부 클리어!';e.resultText.textContent='춘컬타일 마스터! 시간 안에 모든 타일을 지웠어요.';
    }else{
      e.resultKicker.textContent='TIME OVER';e.resultTitle.textContent=score>=150?'엄청난 집중력!':score>=90?'좋아요! 감 잡았어요.':'한 판 더 도전!';
      e.resultText.textContent=maxCombo>=5?`MAX COMBO x${maxCombo}! 연속 제거 감각이 좋아요.`:score>=150?'200점이 코앞이에요. 다음 판은 완벽 클리어!':'같은 타일이 두 방향 이상 보이는 빈 칸을 빠르게 찾아보세요.';
    }
    e.over.classList.remove('hidden');sound.finish();
  }

  function resetRoundState(){
    score=0;misses=0;combo=0;maxCombo=0;lastClearAt=0;remainingMs=Core.GAME_MS;hintIndex=-1;lastHudFrameAt=0;running=false;paused=false;resolving=false;cancelAnimationFrame(raf);
    e.pauseOverlay.classList.add('hidden');e.over.classList.add('hidden');e.rankingModal.hidden=true;e.comboPop.classList.remove('show','hot');e.fx.replaceChildren();
  }

  function newBoard(options={}){
    const externalRandom=typeof options?.random==='function'?options.random:null;
    seed=Number.isFinite(Number(options?.seed))?(Number(options.seed)>>>0):((Date.now()^(Math.random()*0xffffffff))>>>0);
    board=Core.createBoard({random:externalRandom||Core.seededRandom(seed)});resetRoundState();
    renderBoard();updateHud();e.startOverlay.classList.add('hidden');
    if(options?.multiplayer){
      e.countdown.classList.add('hidden');running=true;paused=false;remainingMs=Core.GAME_MS;endAt=performance.now()+remainingMs;
      setStatus('playing');setMessage('멀티플레이 시작! 같은 춘봉 타일을 찾아보세요.');sound.start();tick();return;
    }
    setStatus('countdown');setMessage('준비!');void runCountdown();
  }

  async function runCountdown(){
    e.countdown.classList.remove('hidden');
    for(const value of ['3','2','1']){
      e.countdown.querySelector('strong').textContent=value;sound.hint();await new Promise(resolve=>setTimeout(resolve,650));
    }
    e.countdown.querySelector('strong').textContent='START!';await new Promise(resolve=>setTimeout(resolve,360));e.countdown.classList.add('hidden');
    running=true;paused=false;remainingMs=Core.GAME_MS;endAt=performance.now()+remainingMs;setStatus('playing');setMessage('빈 칸을 눌러 같은 춘봉 타일을 찾아보세요!');sound.start();tick();
  }

  function pauseGame(showOverlay=true){
    if(!running||paused)return false;
    remainingMs=Math.max(0,endAt-performance.now());paused=true;cancelAnimationFrame(raf);setStatus('paused');
    if(showOverlay)e.pauseOverlay.classList.remove('hidden');
    setMessage('게임이 잠시 멈췄어요.');sound.pause();return true;
  }
  function resumeGame(){
    if(!running||!paused)return false;
    paused=false;e.pauseOverlay.classList.add('hidden');endAt=performance.now()+remainingMs;setStatus('playing');setMessage('다시 시작! 같은 춘봉 타일을 찾아보세요.');sound.resume();tick();return true;
  }

  function clearPreview(){
    if(previewIndex>=0)cells[previewIndex]?.classList.remove('is-preview-origin','is-preview-valid','is-preview-miss');
    previewMatches.forEach(index=>cells[index]?.classList.remove('is-preview-match'));
    previewIndex=-1;previewMatches=[];
  }
  function previewCell(index,{announce=true}={}){
    clearPreview();
    if(!running||paused||resolving||!Number.isInteger(index)||board[index]!==null)return;
    previewIndex=index;
    const matches=Core.findMatch(board,index);
    previewMatches=matches;
    const origin=cells[index];
    origin?.classList.add('is-preview-origin',matches.length>=2?'is-preview-valid':'is-preview-miss');
    matches.forEach(matchIndex=>cells[matchIndex]?.classList.add('is-preview-match'));
    if(announce){
      setMessage(matches.length>=2?`${matches.length}개 제거 가능 · 클릭하면 사라져요!`:'이 빈 칸은 같은 타일이 2개 이상 연결되지 않아요.');
    }
  }

  function handleCell(index){
    if(!running||paused||resolving)return;
    clearPreview();
    if(board[index]!==null){setMessage('타일이 아니라 빈 칸을 눌러주세요.');return;}
    if(hintIndex>=0)cells[hintIndex]?.classList.remove('is-hint');
    hintIndex=-1;
    const result=Core.applyClick(board,index);
    if(result.removed>=2){
      const now=performance.now();
      combo=lastClearAt&&now-lastClearAt<=COMBO_WINDOW?combo+1:1;lastClearAt=now;maxCombo=Math.max(maxCombo,combo);
      resolving=true;result.matches.forEach(matchIndex=>cells[matchIndex]?.classList.add('is-clearing'));score+=result.removed;best=Math.max(best,score);updateHud();
      setMessage(combo>=2?`${result.removed}개 제거! COMBO x${combo}`:`${result.removed}개 제거! +${result.removed}점`);
      flash('good');showClearFx(result.matches,index,result.removed,combo);sound.clear(result.removed,combo);
      setTimeout(()=>{
        board=result.board;resolving=false;renderBoard();updateHud();
        if(Core.remainingTiles(board)===0)finishGame('clear');
        else if(!Core.findAnyMove(board))setMessage('가능한 매치가 없어요. 다시 시작으로 새 보드를 만들어 주세요.');
      },CLEAR_RESOLVE_MS);
      return;
    }
    combo=0;lastClearAt=0;misses+=1;endAt-=Core.MISS_PENALTY_MS;remainingMs=Math.max(0,endAt-performance.now());updateHud();
    setMessage('미스! 남은 시간 -10초 · 콤보 초기화');flash('miss');sound.miss();if(remainingMs<=0)finishGame('time');
  }

  function showHint(){
    if(!running||paused)return;
    const move=Core.findAnyMove(board);hintIndex=move?.index??-1;renderBoard();
    if(move){previewCell(move.index,{announce:false});setMessage(`${move.matches.length}개가 강조됐어요 · 빛나는 빈 칸을 눌러보세요.`);sound.hint();setTimeout(()=>{if(hintIndex===move.index){clearPreview();hintIndex=-1;renderBoard();}},1800);}
    else setMessage('현재 가능한 매치가 없어요. 새 게임을 시작해 주세요.');
  }

  function toggleSound(){soundOn=!soundOn;e.sound.setAttribute('aria-pressed',String(soundOn));e.soundIcon.textContent=soundOn?'🔊':'🔇';e.soundLabel.textContent=soundOn?'ON':'OFF';if(soundOn)sound.hint();}

  function renderRanking(entries=[]){
    const frag=document.createDocumentFragment();
    entries.slice(0,10).forEach((entry,index)=>{
      const li=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('strong'),metric=document.createElement('span');
      rank.textContent=String(entry.rank??index+1);name.textContent=String(entry.nickname??'-');
      metric.innerHTML=`<b>${Number(entry.score)||0}점</b> · x${Number(entry.maxCombo)||0} · 미스 ${Number(entry.misses)||0}`;
      li.append(rank,name,metric);frag.append(li);
    });
    e.rankingList.replaceChildren(frag);
  }
  async function loadRanking(){
    e.rankingStatus.textContent='랭킹 불러오는 중…';
    try{
      const response=await fetch(RANKING_ENDPOINT,{headers:{accept:'application/json'}});
      if(!response.ok)throw new Error('ranking');
      const payload=await response.json();renderRanking(payload.entries||[]);e.rankingStatus.textContent=payload.entries?.length?'현재 TOP 10':'아직 등록된 기록이 없어요.';return payload.entries||[];
    }catch{e.rankingStatus.textContent='랭킹을 불러오지 못했습니다.';return[];}
  }
  function openRanking(){
    modalPaused=running&&!paused;modalFromPause=running&&paused;
    if(modalPaused)pauseGame(false);
    e.pauseOverlay.classList.add('hidden');e.rankingModal.hidden=false;void loadRanking();e.rankingClose.focus?.();
  }
  function closeRanking(){
    if(e.rankingModal.hidden)return;
    e.rankingModal.hidden=true;
    if(modalPaused&&running&&paused)resumeGame();
    else if(modalFromPause&&running&&paused)e.pauseOverlay.classList.remove('hidden');
    modalPaused=false;modalFromPause=false;
  }

  function handleEscape(event){
    if(event.key!=='Escape')return;
    if(!e.rankingModal.hidden){event.preventDefault();closeRanking();return;}
    if(!running)return;
    event.preventDefault();paused?resumeGame():pauseGame(true);
  }

  function snapshot(){return{status:e.game.dataset.gameStatus,score,best,misses,combo,maxCombo,remainingMs,remaining:Core.remainingTiles(board),seed,board:[...board]};}

  buildCells();renderBoard();updateHud();void loadRanking();
  // Normal hover/focus no longer reveals valid moves. Preview is reserved for the Hint button.
  e.board.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||!touchAssistEnabled())return;
    const cell=event.target.closest?.('.ct-cell');if(!cell)return;
    const index=Number(cell.dataset.index),target=nearestEmptyIndex(index,event.clientX,event.clientY);
    clearTouchTarget();
    if(target!==index&&board[target]===null){touchTargetIndex=target;cells[target]?.classList.add('is-touch-target');}
  });
  e.board.addEventListener('pointerup',()=>setTimeout(clearTouchTarget,120));
  e.board.addEventListener('pointercancel',clearTouchTarget);
  e.board.addEventListener('pointerleave',()=>{clearTouchTarget();clearPreview();if(running&&!paused)setMessage('빈 칸을 눌러 같은 춘봉 표정을 찾아보세요.');});
  e.board.addEventListener('focusout',event=>{if(!e.board.contains(event.relatedTarget)){clearPreview();}});
  e.start.addEventListener('click',newBoard);e.again.addEventListener('click',newBoard);e.restart.addEventListener('click',newBoard);e.pauseRestart.addEventListener('click',newBoard);
  e.pause.addEventListener('click',()=>paused?resumeGame():pauseGame(true));e.resume.addEventListener('click',resumeGame);e.hint.addEventListener('click',showHint);e.sound.addEventListener('click',toggleSound);
  e.ranking.addEventListener('click',openRanking);e.pauseRanking.addEventListener('click',openRanking);e.overRanking.addEventListener('click',openRanking);e.rankingClose.addEventListener('click',closeRanking);e.rankingModal.querySelector('[data-ct-ranking-close]')?.addEventListener('click',closeRanking);
  document.addEventListener('keydown',handleEscape);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)pauseGame(true);});

  globalThis.ChuncortileApp=Object.freeze({
    startGame:newBoard,getSnapshot:snapshot,pauseGame,resumeGame,loadRanking,renderRanking,
    debugFindMove:()=>Core.findAnyMove(board),debugClick:handleCell,debugFinishGame:()=>finishGame('time')
  });
})();