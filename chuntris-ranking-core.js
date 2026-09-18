(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChuntrisRankingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NICKNAME_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/u;
  const MODES = new Set(['classic','sprint40','score180']);
  const DIFFICULTIES = new Set(['normal','hard','extreme']);
  const MAX_SCORE = 1_000_000_000;
  const MAX_LINES = 100_000;
  const MAX_LEVEL = 10_000;
  const MAX_TIME_MS = 86_400_000;

  function normalizeNickname(value) { return String(value ?? '').replace(/\s+/gu, ' ').trim(); }
  function validateNickname(value) {
    const displayName = normalizeNickname(value);
    if (displayName.length < 2 || displayName.length > 16 || !NICKNAME_RE.test(displayName)) return { ok:false, error:'invalid_nickname' };
    return { ok:true, displayName, key:displayName.toLocaleLowerCase('ko-KR') };
  }
  function normalizeMode(value) { return value === 'sprint40' || value === 'score180' ? value : value === 'hard' ? 'classic' : 'classic'; }
  function normalizeDifficulty(value, modeValue = '') { return modeValue === 'hard' ? 'hard' : DIFFICULTIES.has(value) ? value : 'normal'; }
  function normalizeConfig(modeValue, difficultyValue) {
    return { mode: normalizeMode(modeValue), difficulty: normalizeDifficulty(difficultyValue, modeValue) };
  }
  function validInt(value,max){ return Number.isInteger(value) && value >= 0 && value <= max; }

  function validateRecord(input) {
    if (!input || (!MODES.has(input.mode) && input.mode !== 'hard')) return { ok:false, error:'invalid_mode' };
    const config = normalizeConfig(input.mode,input.difficulty);
    const nickname = validateNickname(input.nickname); if (!nickname.ok) return nickname;
    if (!validInt(input.score,MAX_SCORE) || !validInt(input.lines,MAX_LINES) || !validInt(input.level,MAX_LEVEL) || !validInt(input.timeMs,MAX_TIME_MS)) return { ok:false,error:'invalid_record' };
    if (config.mode === 'sprint40' && (input.lines < 40 || input.timeMs <= 0)) return { ok:false,error:'incomplete_sprint' };
    if (config.mode === 'score180' && input.timeMs <= 0) return { ok:false,error:'incomplete_score_attack' };
    return { ok:true, record:{ ...config, displayName:nickname.displayName, key:nickname.key, score:input.score, lines:input.lines, level:input.level, timeMs:input.timeMs } };
  }

  function isBetterRecord(mode,candidate,current){
    if(!current)return true;
    if(mode==='sprint40'){
      if(candidate.timeMs!==current.timeMs)return candidate.timeMs<current.timeMs;
      if(candidate.score!==current.score)return candidate.score>current.score;
      return String(candidate.achievedAt)<String(current.achievedAt);
    }
    if(candidate.score!==current.score)return candidate.score>current.score;
    if(candidate.lines!==current.lines)return candidate.lines>current.lines;
    if(mode==='score180'&&candidate.timeMs!==current.timeMs)return candidate.timeMs>current.timeMs;
    return String(candidate.achievedAt)<String(current.achievedAt);
  }

  function sortRecords(mode,records){
    return [...records].sort((a,b)=>{
      if(mode==='sprint40')return (a.timeMs-b.timeMs)||(b.score-a.score)||String(a.achievedAt).localeCompare(String(b.achievedAt));
      return (b.score-a.score)||(b.lines-a.lines)||(mode==='score180'?(b.timeMs-a.timeMs):0)||String(a.achievedAt).localeCompare(String(b.achievedAt));
    });
  }

  function formatTime(ms){
    const safe=Math.max(0,Math.floor(ms));const minutes=Math.floor(safe/60000),seconds=Math.floor((safe%60000)/1000),millis=safe%1000;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`;
  }
  return { MODES,DIFFICULTIES,normalizeNickname,validateNickname,normalizeMode,normalizeDifficulty,normalizeConfig,validateRecord,isBetterRecord,sortRecords,formatTime };
});