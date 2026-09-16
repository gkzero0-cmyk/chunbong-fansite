(() => {
  'use strict';
  const MIN_NAME = 2;
  const MAX_NAME = 16;
  const MAX_SCORE = 10_000_000;
  const MAX_LEVEL = 11;
  const VALID_NAME = /^[0-9A-Za-z가-힣 _-]+$/u;

  function normalizeNickname(value = '') {
    return String(value).trim().replace(/\s+/g, ' ');
  }

  function validateNickname(value) {
    const displayName = normalizeNickname(value);
    if (displayName.length < MIN_NAME || displayName.length > MAX_NAME) return { ok:false, error:'invalid_nickname' };
    if (!VALID_NAME.test(displayName)) return { ok:false, error:'invalid_nickname' };
    return { ok:true, displayName, key:displayName.toLocaleLowerCase('ko-KR') };
  }

  function validateRecord(body = {}) {
    if (body?.mode !== 'classic') return { ok:false, error:'invalid_mode' };
    const nickname = validateNickname(body.nickname);
    if (!nickname.ok) return nickname;
    const score = Number(body.score);
    const maxLevel = Number(body.maxLevel);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { ok:false, error:'invalid_score' };
    if (!Number.isInteger(maxLevel) || maxLevel < 1 || maxLevel > MAX_LEVEL) return { ok:false, error:'invalid_max_level' };
    return { ok:true, record:{ mode:'classic', key:nickname.key, displayName:nickname.displayName, score, maxLevel } };
  }

  function sortRecords(mode, records) {
    if (mode !== 'classic') return [];
    return [...records].sort((a,b) =>
      Number(b.score || 0) - Number(a.score || 0) ||
      Number(b.maxLevel || 0) - Number(a.maxLevel || 0) ||
      String(a.achievedAt || '').localeCompare(String(b.achievedAt || ''))
    );
  }

  function isBetterRecord(mode, candidate, current) {
    if (!current) return true;
    return sortRecords(mode, [candidate, current])[0] === candidate;
  }

  const API = { MIN_NAME, MAX_NAME, MAX_SCORE, MAX_LEVEL, normalizeNickname, validateNickname, validateRecord, sortRecords, isBetterRecord };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  globalThis.ChunbakRankingCore = API;
})();
