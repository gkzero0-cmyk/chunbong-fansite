(()=>{
  'use strict';
  const App=globalThis.ChuncortileApp,Core=globalThis.ChuncortileRankingCore,root=document.getElementById('chuncortile');
  const registerButton=document.getElementById('ct-ranking-register');
  const panel=document.getElementById('ct-ranking-submit-panel');
  const nicknameInput=document.getElementById('ct-ranking-nickname');
  const submitButton=document.getElementById('ct-ranking-submit');
  const cancelButton=document.getElementById('ct-ranking-cancel');
  const statusNode=document.getElementById('ct-ranking-submit-status');
  if(!App?.getSnapshot||!Core||!root||!registerButton||!panel||!nicknameInput||!submitButton||!cancelButton||!statusNode)return;

  const endpoint='/api/content?type=chuncortile-ranking',nicknameKey='chuncortile:nickname:v1';
  let submittedKey='',activeKey='',submitting=false;
  const remember=value=>{try{localStorage.setItem(nicknameKey,value)}catch{}};
  const recalled=()=>{try{return localStorage.getItem(nicknameKey)||''}catch{return''}};
  const state=()=>App.getSnapshot();
  const terminal=()=>root.dataset.gameStatus==='gameover';
  const keyFor=(s=state())=>`classic:${s.score}:${s.maxCombo}:${s.misses}`;
  function setStatus(message,state=''){statusNode.textContent=message;statusNode.dataset.state=state;}
  function reset(){
    panel.hidden=true;submitButton.disabled=false;cancelButton.disabled=false;submitting=false;activeKey=terminal()?keyFor():'';
    if(!terminal()){registerButton.disabled=false;registerButton.textContent='랭킹 등록';setStatus('');}
  }
  function open(){
    if(!terminal())return false;
    const key=keyFor();activeKey=key;
    if(submittedKey===key){registerButton.textContent='등록 완료 ✓';registerButton.disabled=true;setStatus('이 기록은 이미 등록했습니다.','success');return false;}
    panel.hidden=false;nicknameInput.value=recalled();setStatus('닉네임을 입력하면 현재 기록을 전체 랭킹에 등록합니다.');nicknameInput.focus();nicknameInput.select?.();return true;
  }
  function close(){panel.hidden=true;setStatus('');registerButton.focus?.();}
  async function submit(){
    if(!terminal()||submitting)return false;
    const s=state(),key=keyFor(s);if(submittedKey===key)return true;
    const valid=Core.validateNickname(nicknameInput.value||'');
    if(!valid.ok){setStatus('닉네임은 한글/영문/숫자 기준 2~16자로 입력해 주세요.','error');nicknameInput.focus();return false;}
    submitting=true;submitButton.disabled=true;cancelButton.disabled=true;setStatus('랭킹에 등록하는 중…','loading');
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({mode:'classic',nickname:valid.displayName,score:s.score,maxCombo:s.maxCombo,misses:s.misses})});
      if(!response.ok)throw new Error(`ranking ${response.status}`);
      const payload=await response.json();remember(valid.displayName);submittedKey=key;activeKey=key;
      registerButton.textContent='등록 완료 ✓';registerButton.disabled=true;
      setStatus(payload.updated?'전체 랭킹에 기록을 등록했습니다.':'기존 최고 기록이 유지되었습니다.','success');
      App.renderRanking?.(payload.entries||[]);return true;
    }catch{
      setStatus('랭킹 등록에 실패했습니다. 로컬 BEST는 그대로 유지됩니다.','error');return false;
    }finally{submitting=false;submitButton.disabled=false;cancelButton.disabled=false;}
  }
  function sync(){
    if(terminal()){
      const key=keyFor();
      if(activeKey!==key){activeKey=key;panel.hidden=true;setStatus('');registerButton.disabled=submittedKey===key;registerButton.textContent=submittedKey===key?'등록 완료 ✓':'랭킹 등록';}
      return;
    }
    reset();
  }
  registerButton.addEventListener('click',open);
  submitButton.addEventListener('click',()=>void submit());
  cancelButton.addEventListener('click',close);
  nicknameInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void submit();}else if(event.key==='Escape'){event.preventDefault();close();}});
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-game-status']});sync();
  globalThis.ChuncortilePostgameRanking=Object.freeze({openTerminalRankingRegistration:open,closeTerminalRankingRegistration:close,submitTerminalRanking:submit,syncFromGameStatus:sync});
})();