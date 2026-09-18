(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ChungwagameRankingCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VALID_NAME=/^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/u;
  const MAX_SCORE=100000000,MAX_COMBO=999,MAX_CLEARED=170;
  function normalizeNickname(value=''){return String(value).trim().replace(/\s+/g,' ')}
  function validateNickname(value){const displayName=normalizeNickname(value);if(displayName.length<2||displayName.length>16||!VALID_NAME.test(displayName))return{ok:false,error:'invalid_nickname'};return{ok:true,displayName,key:displayName.toLocaleLowerCase('ko-KR')}}
  function validInt(value,max){return Number.isInteger(value)&&value>=0&&value<=max}
  function validateRecord(input={}){if(input.mode!=='classic')return{ok:false,error:'invalid_mode'};const nickname=validateNickname(input.nickname);if(!nickname.ok)return nickname;const score=Number(input.score),maxCombo=Number(input.maxCombo),cleared=Number(input.cleared);if(!validInt(score,MAX_SCORE))return{ok:false,error:'invalid_score'};if(!validInt(maxCombo,MAX_COMBO))return{ok:false,error:'invalid_combo'};if(!validInt(cleared,MAX_CLEARED))return{ok:false,error:'invalid_cleared'};return{ok:true,record:{mode:'classic',key:nickname.key,displayName:nickname.displayName,score,maxCombo,cleared}}}
  function sortRecords(mode,records){if(mode!=='classic')return[];return[...records].sort((a,b)=>Number(b.score||0)-Number(a.score||0)||Number(b.maxCombo||0)-Number(a.maxCombo||0)||Number(b.cleared||0)-Number(a.cleared||0)||String(a.achievedAt||'').localeCompare(String(b.achievedAt||'')))}
  function isBetterRecord(mode,candidate,current){if(!current)return true;return sortRecords(mode,[candidate,current])[0]===candidate}
  return{normalizeNickname,validateNickname,validateRecord,sortRecords,isBetterRecord,MAX_SCORE,MAX_COMBO,MAX_CLEARED};
});