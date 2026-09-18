(()=>{'use strict';
  const Core=globalThis.ChuncortileCore;
  if(!Core)return;
  const BEST_KEY='chuncortile.best.v1';
  const COLORS=['#16c931','#2377ee','#ef254f','#ffc51f','#ff6b24','#982fe8','#16c4c8','#8e531d','#969ca1','#ef4a9d','#49b856'];
  const e={
    game:document.getElementById('chuncortile'),board:document.getElementById('ct-board'),wrap:document.getElementById('ct-board-wrap'),
    score:document.getElementById('ct-score'),best:document.getElementById('ct-best'),timer:document.getElementById('ct-timer'),timeFill:document.getElementById('ct-time-fill'),
    remaining:document.getElementById('ct-remaining'),misses:document.getElementById('ct-misses'),message:document.getElementById('ct-message'),
    startOverlay:document.getElementById('ct-start-overlay'),countdown:document.getElementById('ct-countdown'),over:document.getElementById('ct-over-overlay'),
    start:document.getElementById('ct-start'),again:document.getElementById('ct-again'),restart:document.getElementById('ct-restart'),hint:document.getElementById('ct-hint'),
    sound:document.getElementById('ct-sound'),soundIcon:document.getElementById('ct-sound-icon'),soundLabel:document.getElementById('ct-sound-label'),
    flash:document.getElementById('ct-flash'),finalScore:document.getElementById('ct-final-score'),finalMisses:document.getElementById('ct-final-misses'),
    finalRemaining:document.getElementById('ct-final-remaining'),resultKicker:document.getElementById('ct-result-kicker'),resultTitle:document.getElementById('ct-result-title'),resultText:document.getElementById('ct-result-text')
  };
  if(Object.values(e).some(value=>!value))return;

  let board=Core.createBoard(),score=0,best=Number(localStorage.getItem(BEST_KEY)||0),misses=0,remainingMs=Core.GAME_MS,endAt=0,running=false,raf=0,soundOn=true,audioCtx=null,hintIndex=-1,seed=0;

  const cells=[];
  function buildCells(){
    if(cells.length)return;
    const frag=document.createDocumentFragment();
    for(let i=0;i<Core.COLS*Core.ROWS;i+=1){
      const button=document.createElement('button');
      button.type='button';button.className='ct-cell';button.dataset.index=String(i);button.setAttribute('role','gridcell');
      button.addEventListener('click',()=>handleCell(i));
      cells.push(button);frag.append(button);
    }
    e.board.replaceChildren(frag);
  }
  function faceClass(type){return 'ct-face ct-face-'+(type+1);}
  function renderBoard(clearSet=null){
    cells.forEach((cell,index)=>{
      const type=board[index];
      cell.className='ct-cell '+(type===null?'is-empty':'is-tile');
      if(index===hintIndex)cell.classList.add('is-hint');
      cell.replaceChildren();
      cell.setAttribute('aria-label',type===null?'빈 칸':`춘봉 타일 ${type+1}`);
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
    e.score.textContent=String(score);e.best.textContent=String(best);e.misses.textContent=String(misses);e.remaining.textContent=String(remain);e.timer.textContent=formatTime(remainingMs);
    e.timeFill.style.transform=`scaleX(${Math.max(0,Math.min(1,remainingMs/Core.GAME_MS))})`;
  }
  function setStatus(status){e.game.dataset.gameStatus=status;}
  function setMessage(text){e.message.textContent=text;}
  function flash(kind){e.flash.className='ct-flash';void e.flash.offsetWidth;e.flash.classList.add(kind);}
  function getAudio(){if(!soundOn)return null;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
  function tone(freq,duration=.06,delay=0,volume=.02){const ctx=getAudio();if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+delay;osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.03);}
  const sound={clear(n){tone(650,.06);tone(780+n*20,.08,.04,.016)},miss(){tone(220,.08);tone(165,.11,.045,.014)},start(){tone(520,.06);tone(660,.07,.06);tone(880,.09,.12)},finish(){[660,880,1100].forEach((f,i)=>tone(f,.14,i*.08,.018))},hint(){tone(900,.06);tone(1200,.08,.05,.014)}};

  function tick(now=performance.now()){
    if(!running)return;
    remainingMs=Math.max(0,endAt-now);updateHud();
    if(remainingMs<=0){finishGame('time');return;}
    raf=requestAnimationFrame(tick);
  }
  function finishGame(reason){
    if(!running&&reason!=='clear')return;
    running=false;cancelAnimationFrame(raf);remainingMs=Math.max(0,remainingMs);
    best=Math.max(best,score);try{localStorage.setItem(BEST_KEY,String(best))}catch{}
    updateHud();setStatus('gameover');
    e.finalScore.textContent=String(score);e.finalMisses.textContent=String(misses);e.finalRemaining.textContent=String(Core.remainingTiles(board));
    if(reason==='clear'){
      e.resultKicker.textContent='PERFECT CLEAR';e.resultTitle.textContent='200개 전부 클리어!';e.resultText.textContent='춘컬타일 마스터! 시간 안에 모든 타일을 지웠어요.';
    }else{
      e.resultKicker.textContent='TIME OVER';e.resultTitle.textContent=score>=150?'엄청난 집중력!':score>=90?'좋아요! 감 잡았어요.':'한 판 더 도전!';
      e.resultText.textContent=score>=150?'200점이 코앞이에요. 다음 판은 완벽 클리어!':'같은 타일이 두 방향 이상 보이는 빈 칸을 빠르게 찾아보세요.';
    }
    e.over.classList.remove('hidden');sound.finish();
  }
  function newBoard(){
    seed=(Date.now()^(Math.random()*0xffffffff))>>>0;
    board=Core.createBoard({random:Core.seededRandom(seed)});score=0;misses=0;remainingMs=Core.GAME_MS;hintIndex=-1;running=false;cancelAnimationFrame(raf);
    renderBoard();updateHud();setStatus('countdown');e.startOverlay.classList.add('hidden');e.over.classList.add('hidden');setMessage('준비!');
    runCountdown();
  }
  async function runCountdown(){
    e.countdown.classList.remove('hidden');
    for(const value of ['3','2','1']){
      e.countdown.querySelector('strong').textContent=value;sound.hint();await new Promise(resolve=>setTimeout(resolve,650));
    }
    e.countdown.querySelector('strong').textContent='START!';await new Promise(resolve=>setTimeout(resolve,360));e.countdown.classList.add('hidden');
    running=true;remainingMs=Core.GAME_MS;endAt=performance.now()+remainingMs;setStatus('playing');setMessage('빈 칸을 눌러 같은 춘봉 타일을 찾아보세요!');sound.start();tick();
  }
  function handleCell(index){
    if(!running)return;
    if(board[index]!==null){setMessage('타일이 아니라 빈 칸을 눌러주세요.');return;}
    hintIndex=-1;
    const result=Core.applyClick(board,index);
    if(result.removed>=2){
      const clearing=new Set(result.matches);renderBoard(clearing);score+=result.removed;best=Math.max(best,score);updateHud();setMessage(`${result.removed}개 제거! +${result.removed}점`);flash('good');sound.clear(result.removed);
      setTimeout(()=>{board=result.board;renderBoard();updateHud();if(Core.remainingTiles(board)===0)finishGame('clear');},180);
      return;
    }
    misses+=1;endAt-=Core.MISS_PENALTY_MS;remainingMs=Math.max(0,endAt-performance.now());updateHud();setMessage('미스! 남은 시간 -10초');flash('miss');sound.miss();if(remainingMs<=0)finishGame('time');
  }
  function showHint(){
    if(!running)return;
    const move=Core.findAnyMove(board);
    hintIndex=move?.index??-1;renderBoard();if(move){setMessage('파랗게 빛나는 빈 칸을 눌러보세요.');sound.hint();setTimeout(()=>{if(hintIndex===move.index){hintIndex=-1;renderBoard();}},1800);}else setMessage('현재 가능한 매치가 없어요. 새 게임을 시작해 주세요.');
  }
  function toggleSound(){soundOn=!soundOn;e.sound.setAttribute('aria-pressed',String(soundOn));e.soundIcon.textContent=soundOn?'🔊':'🔇';e.soundLabel.textContent=soundOn?'ON':'OFF';if(soundOn)sound.hint();}
  function snapshot(){return {status:e.game.dataset.gameStatus,score,best,misses,remainingMs,remaining:Core.remainingTiles(board),seed,board:[...board]};}

  buildCells();renderBoard();updateHud();
  e.start.addEventListener('click',newBoard);e.again.addEventListener('click',newBoard);e.restart.addEventListener('click',newBoard);e.hint.addEventListener('click',showHint);e.sound.addEventListener('click',toggleSound);
  globalThis.ChuncortileApp=Object.freeze({startGame:newBoard,getSnapshot:snapshot,debugFindMove:()=>Core.findAnyMove(board),debugClick:handleCell});
})();