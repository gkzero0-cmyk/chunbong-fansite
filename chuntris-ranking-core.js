(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ChuntrisRankingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODES = new Set(['classic', 'sprint40', 'hard']);
  const NICKNAME_RE = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/u;
  const MAX_SCORE = 100000000;
  const MAX_LINES = 100000;
  const MAX_LEVEL = 10000;
  const MAX_TIME_MS = 86400000;

  function normalizeNickname(value) {
    return String(value ?? '').replace(/\s+/gu, ' ').trim();
  }

  function validateNickname(value) {
    const displayName = normalizeNickname(value);
    if (displayName.length < 2 || displayName.length > 16 || !NICKNAME_RE.test(displayName)) {
      return { ok: false, error: 'invalid_nickname' };
    }
    return { ok: true, displayName, key: displayName.toLocaleLowerCase('ko-KR') };
  }

  function validInt(value, max) {
    return Number.isInteger(value) && value >= 0 && value <= max;
  }

  function validateRecord(input) {
    if (!input || !MODES.has(input.mode)) return { ok: false, error: 'invalid_mode' };
    const nickname = validateNickname(input.nickname);
    if (!nickname.ok) return nickname;
    if (!validInt(input.score, MAX_SCORE) || !validInt(input.lines, MAX_LINES) || !validInt(input.level, MAX_LEVEL) || !validInt(input.timeMs, MAX_TIME_MS)) {
      return { ok: false, error: 'invalid_record' };
    }
    if (input.mode === 'sprint40' && (input.lines < 40 || input.timeMs <= 0)) {
      return { ok: false, error: 'incomplete_sprint' };
    }
    return {
      ok: true,
      record: {
        mode: input.mode,
        displayName: nickname.displayName,
        key: nickname.key,
        score: input.score,
        lines: input.lines,
        level: input.level,
        timeMs: input.timeMs
      }
    };
  }

  function isBetterRecord(mode, candidate, current) {
    if (!current) return true;
    if (mode !== 'sprint40') {
      if (candidate.score !== current.score) return candidate.score > current.score;
      if (candidate.lines !== current.lines) return candidate.lines > current.lines;
    } else {
      if (candidate.timeMs !== current.timeMs) return candidate.timeMs < current.timeMs;
      if (candidate.score !== current.score) return candidate.score > current.score;
    }
    return String(candidate.achievedAt) < String(current.achievedAt);
  }

  function sortRecords(mode, records) {
    return [...records].sort((a, b) => {
      if (mode !== 'sprint40') {
        return (b.score - a.score) || (b.lines - a.lines) || String(a.achievedAt).localeCompare(String(b.achievedAt));
      }
      return (a.timeMs - b.timeMs) || (b.score - a.score) || String(a.achievedAt).localeCompare(String(b.achievedAt));
    });
  }

  function formatTime(ms) {
    const safe = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const millis = safe % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  return { normalizeNickname, validateNickname, validateRecord, isBetterRecord, sortRecords, formatTime };
});
