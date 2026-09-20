(() => {
  'use strict';
  const App=globalThis.ChuntrisApp,RankingCore=globalThis.ChuntrisRankingCore,gameRoot=document.getElementById('chuntris-game');
  const registerButton=document.getElementById('chuntris-ranking-register'),panel=document.getElementById('chuntris-ranking-submit-panel'),nicknameInput=document.getElementById('chuntris-ranking-nickname'),submitButton=document.getElementById('chuntris-ranking-submit'),cancelButton=document.getElementById('chuntris-ranking-cancel'),statusNode=document.getElementById('chuntris-ranking-submit-status');
  const endpoint='/api/content?type=chuntris-ranking',nicknameKey='chuntris.nickname.v1';
  const sharedNicknameKey='chunbong:player:nickname:v1';
  if(!App?.getGame||!gameRoot||!registerButton||!panel||!nicknameInput||!submitButton||!cancelButton)return;
  let terminalKey='',submittedKey='';

  const storageGet=(key,fallback='')=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
  const storageSet=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
  const currentState=()=>App.getGame()?.getSnapshot?.()||null;
  const isTerminal=(state=currentState())=>state?.status==='gameover'||state?.status==='completed';
  const mode=()=>gameRoot.dataset.mode==='sprint40'?'sprint40':gameRoot.dataset.mode==='score180'?'score180':'classic';
  const difficulty=()=>gameRoot.dataset.difficulty==='extreme'?'extreme':gameRoot.dataset.difficulty==='hard'?'hard':'normal';
  const keyFor=state=>state?`${mode()}:${difficulty()}:${state.status}:${state.elapsedMs}:${state.score}:${state.lines}`:'';
  function setStatus(message,state=''){if(!statusNode)return;statusNode.textContent=message;statusNode.dataset.state=state;}
  function resetTerminalControls(state=currentState()){if(!isTerminal(state))return;const nextKey=keyFor(state);if(nextKey===terminalKey)return;terminalKey=nextKey;panel.hidden=true;registerButton.disabled=false;registerButton.textContent='랭킹 등록';submitButton.disabled=false;setStatus('닉네임을 입력하면 현재 모드·난이도 기록을 전체 랭킹에 등록할 수 있어요.');}
  function openTerminalRankingRegistration(){const state=currentState();if(!isTerminal(state))return false;resetTerminalControls(state);panel.hidden=false;if(!nicknameInput.value)nicknameInput.value=storageGet(sharedNicknameKey,storageGet(nicknameKey,''));setStatus(`${difficulty()==='extreme'?'익스트림':difficulty()==='hard'?'하드':'노말'} 랭킹에 등록합니다.`);nicknameInput.focus();nicknameInput.select?.();return true;}
  function closeTerminalRankingRegistration(){panel.hidden=true;setStatus('랭킹 등록을 건너뛰어도 로컬 최고 기록은 그대로 저장됩니다.');registerButton.focus?.();return true;}
  function validateNickname(){const result=RankingCore?.validateNickname?.(nicknameInput.value||'');if(!result?.ok){setStatus('닉네임은 2~16자로 입력해 주세요.','error');nicknameInput.focus();return null;}return result;}
  async function submitTerminalRanking(){
    const state=currentState();if(!isTerminal(state))return false;
    const nickname=validateNickname();if(!nickname||typeof fetch!=='function')return false;
    const key=keyFor(state);if(submittedKey===key)return true;
    submitButton.disabled=true;setStatus('랭킹에 기록을 등록하는 중…','loading');
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({mode:mode(),difficulty:difficulty(),nickname:nickname.displayName,score:state.score,lines:state.lines,level:state.level,timeMs:state.elapsedMs})});
      if(!response.ok)throw new Error(`ranking ${response.status}`);
      submittedKey=key;storageSet(sharedNicknameKey,nickname.displayName);storageSet(nicknameKey,nickname.displayName);registerButton.disabled=true;registerButton.textContent='등록 완료 ✓';setStatus(`${nickname.displayName} 이름으로 랭킹 등록이 완료됐어요.`,'success');await App.loadRanking?.(mode(),difficulty());return true;
    }catch{submitButton.disabled=false;setStatus('랭킹 등록에 실패했어요. 잠시 후 다시 시도해 주세요.','error');return false;}
  }
  function syncFromGameStatus(){const state=currentState();if(isTerminal(state)){resetTerminalControls(state);return;}terminalKey='';panel.hidden=true;registerButton.disabled=false;registerButton.textContent='랭킹 등록';}
  registerButton.addEventListener('click',openTerminalRankingRegistration);submitButton.addEventListener('click',()=>void submitTerminalRanking());cancelButton.addEventListener('click',closeTerminalRankingRegistration);
  nicknameInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void submitTerminalRanking();}else if(event.key==='Escape'){event.preventDefault();closeTerminalRankingRegistration();}});
  new MutationObserver(syncFromGameStatus).observe(gameRoot,{attributes:true,attributeFilter:['data-game-status','data-mode','data-difficulty']});syncFromGameStatus();
  globalThis.ChuntrisPostgameRanking={openTerminalRankingRegistration,closeTerminalRankingRegistration,submitTerminalRanking,syncFromGameStatus};
})();