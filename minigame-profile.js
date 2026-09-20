(() => {
  'use strict';

  const root=document.querySelector('[data-minigame-profile]');
  if(!root)return;

  const UNIFIED_NICKNAME_KEY='chunbong.minigame.nickname.v1';
  const KEYS={
    nickname:['chuntris.nickname.v1','chunbak.multiplayer.nickname','chungwagame.multiplayer.nickname','chuncortile.multiplayer.nickname'],
    chuntrisClassic:['chuntris.bestScore.classic.v1','chuntris.bestScore.hard.v1','chuntris.bestScore.classic.extreme.v1'],
    chuntrisSprint:['chuntris.bestTime.sprint40.v1','chuntris.bestTime.sprint40.hard.v1','chuntris.bestTime.sprint40.extreme.v1'],
    chuntrisScore180:['chuntris.bestScore.score180.normal.v1','chuntris.bestScore.score180.hard.v1','chuntris.bestScore.score180.extreme.v1'],
    chunbak:['chunbak:best:v1'],
    chungwa:['chungwagame-best-v2'],
    chuncortile:['chuncortile.best.v1']
  };

  const safeGet=key=>{try{return localStorage.getItem(key)||''}catch(_){return''}};
  const positive=key=>{const value=Number(safeGet(key));return Number.isFinite(value)&&value>0?value:0};
  const maxOf=keys=>Math.max(0,...keys.map(positive));
  const minOf=keys=>{const rows=keys.map(positive).filter(Boolean);return rows.length?Math.min(...rows):0};
  const formatScore=value=>value?Number(value).toLocaleString('ko-KR')+'점':'아직 기록 없음';
  const formatTime=value=>{
    if(!value)return '';
    const total=Math.max(0,Math.round(Number(value)));
    const minutes=Math.floor(total/60000);
    const seconds=Math.floor((total%60000)/1000);
    const millis=total%1000;
    return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+'.'+String(millis).padStart(3,'0');
  };

  function readProfile(){
    const nickname=(safeGet(UNIFIED_NICKNAME_KEY)||KEYS.nickname.map(safeGet).find(value=>value.trim())||'').trim()||'로컬 플레이어';
    const classic=maxOf(KEYS.chuntrisClassic);
    const sprint=minOf(KEYS.chuntrisSprint);
    const score180=maxOf(KEYS.chuntrisScore180);
    const chunbak=maxOf(KEYS.chunbak);
    const chungwa=maxOf(KEYS.chungwa);
    const chuncortile=maxOf(KEYS.chuncortile);
    const completed=[classic||sprint||score180,chunbak,chungwa,chuncortile].filter(Boolean).length;
    return {nickname,classic,sprint,score180,chunbak,chungwa,chuncortile,completed};
  }

  function setText(selector,value){
    const node=root.querySelector(selector);
    if(node)node.textContent=value;
  }

  function setNickname(value){
    const nickname=String(value||'').trim().slice(0,20);
    if(!nickname)return false;
    try{
      localStorage.setItem(UNIFIED_NICKNAME_KEY,nickname);
      KEYS.nickname.forEach(key=>localStorage.setItem(key,nickname));
    }catch(_){return false}
    render();
    document.dispatchEvent(new CustomEvent('chunbong:minigame-profile-updated',{detail:{nickname}}));
    return true;
  }

  function ensureNicknameEditor(data){
    const host=root.querySelector('.minigame-profile-id');
    if(!host)return;
    let form=host.querySelector('[data-profile-edit]');
    if(!form){
      form=document.createElement('form');
      form.className='minigame-profile-edit';
      form.dataset.profileEdit='';
      form.innerHTML='<input type="text" maxlength="20" aria-label="미니게임 통합 닉네임" placeholder="통합 닉네임"><button type="submit">4개 게임에 적용</button>';
      host.appendChild(form);
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const input=form.querySelector('input');
        if(setNickname(input?.value))input.value=readProfile().nickname;
      });
    }
    const input=form.querySelector('input');
    if(input&&document.activeElement!==input)input.value=data.nickname==='로컬 플레이어'?'':data.nickname;
  }

  function render(){
    const data=readProfile();
    ensureNicknameEditor(data);
    setText('[data-profile-name]',data.nickname);
    setText('[data-profile-progress]',data.completed+'/4 게임 기록');
    const meter=root.querySelector('[data-profile-meter]');
    if(meter){
      meter.style.setProperty('--profile-progress',String(data.completed/4));
      meter.setAttribute('aria-valuenow',String(data.completed));
    }

    const chuntrisPrimary=data.classic?formatScore(data.classic):data.score180?formatScore(data.score180):data.sprint?formatTime(data.sprint):'아직 기록 없음';
    const chuntrisMeta=[
      data.classic?'클래식 '+Number(data.classic).toLocaleString('ko-KR')+'점':'',
      data.score180?'3분 '+Number(data.score180).toLocaleString('ko-KR')+'점':'',
      data.sprint?'40줄 '+formatTime(data.sprint):''
    ].filter(Boolean).join(' · ')||'춘트리스 첫 기록을 만들어보세요.';

    setText('[data-record="chuntris"]',chuntrisPrimary);
    setText('[data-record-meta="chuntris"]',chuntrisMeta);
    setText('[data-record="chunbak"]',formatScore(data.chunbak));
    setText('[data-record-meta="chunbak"]',data.chunbak?'로컬 최고 점수':'춘박게임 첫 기록을 만들어보세요.');
    setText('[data-record="chungwa"]',formatScore(data.chungwa));
    setText('[data-record-meta="chungwa"]',data.chungwa?'120초 로컬 최고 점수':'춘과게임 첫 기록을 만들어보세요.');
    setText('[data-record="chuncortile"]',formatScore(data.chuncortile));
    setText('[data-record-meta="chuncortile"]',data.chuncortile?'120초 로컬 최고 점수':'춘컬타일 첫 기록을 만들어보세요.');

    const personal=window.ChunbongPersonal?.gameSnapshot?.()||{totalPlays:0,achievements:[],lastPlayed:null};
    setText('[data-profile-total-plays]',Number(personal.totalPlays||0).toLocaleString('ko-KR')+'회');
    const earned=(personal.achievements||[]).filter(row=>row.earned);
    setText('[data-profile-achievements]',earned.length+'개');
    const recentKey=personal.lastPlayed?.game||'';
    const gameNames={chuntris:'춘트리스',chunbak:'춘박게임',chungwagame:'춘과게임',chuncortile:'춘컬타일'};
    setText('[data-profile-recent]',gameNames[recentKey]||'기록 없음');
    setText('[data-profile-streak]',Number(personal.dailyStreak||0)+'일');
    const challenge=window.ChunbongPersonal?.dailyChallenge?.(),dailyRoot=root.querySelector('[data-profile-daily-challenge]');
    if(dailyRoot&&challenge){dailyRoot.href=challenge.href;dailyRoot.classList.toggle('is-complete',Boolean(challenge.completed));dailyRoot.querySelector('strong').textContent=challenge.title;dailyRoot.querySelector('span').textContent=challenge.completed?'오늘 미션 완료 · 내일 새로운 미션이 열립니다.':challenge.desc;dailyRoot.querySelector('b').textContent=challenge.completed?'완료 ✓':challenge.progress+' / '+challenge.goal;}
    const achievementRoot=root.querySelector('[data-profile-achievement-list]');
    if(achievementRoot)achievementRoot.innerHTML=(personal.achievements||[]).map(row=>'<span class="'+(row.earned?'is-earned':'')+'" title="'+row.desc+'">'+(row.earned?'✓ ':'○ ')+row.title+'</span>').join('');
    root.classList.toggle('is-complete',data.completed===4);
    const badge=root.querySelector('[data-profile-badge]');
    if(badge)badge.textContent=data.completed===4?'4종 기록 완료':'이 기기에 저장된 기록';
  }

  render();
  window.addEventListener('storage',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  document.addEventListener('chunbong:personal-updated',render);
  window.addEventListener('pageshow',render);
  window.ChunbongMinigameProfile={readProfile,setNickname,render};
})();