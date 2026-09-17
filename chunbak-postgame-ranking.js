(() => {
  'use strict';

  const RankingCore = globalThis.ChunbakRankingCore;
  const endpoint = '/api/content?type=chunbak-ranking';
  const nicknameKey = 'chunbak:nickname:v1';
  const root = document.getElementById('chunbak-game');
  const registerButton = document.getElementById('chunbak-ranking-register');
  const panel = document.getElementById('chunbak-ranking-submit-panel');
  const nicknameInput = document.getElementById('chunbak-ranking-nickname');
  const submitButton = document.getElementById('chunbak-ranking-submit');
  const cancelButton = document.getElementById('chunbak-ranking-cancel');
  const submitStatus = document.getElementById('chunbak-ranking-submit-status');
  const rankingStatus = document.getElementById('chunbak-ranking-status');
  const rankingList = document.getElementById('chunbak-ranking-list');
  const scoreNode = document.getElementById('chunbak-score');
  const maxLevelNode = document.getElementById('chunbak-max-level');
  if (!root || !registerButton || !panel || !nicknameInput || !submitButton || !cancelButton) return;

  let submittedRecordKey = '';
  let activeRecordKey = '';
  let submitting = false;

  function readRememberedNickname() {
    try { return localStorage.getItem(nicknameKey) || ''; } catch (_) { return ''; }
  }

  function rememberNickname(value) {
    try { localStorage.setItem(nicknameKey, value); } catch (_) {}
  }

  function currentRecord() {
    return {
      score: Math.max(0, Number(scoreNode?.textContent) || 0),
      maxLevel: Math.max(1, Number(maxLevelNode?.textContent) || 1)
    };
  }

  function recordKey(record = currentRecord()) {
    return `classic:${record.score}:${record.maxLevel}`;
  }

  function isTerminal() {
    return root.dataset.gameStatus === 'gameover';
  }

  function renderRanking(entries = []) {
    if (!rankingList) return;
    const fragment = document.createDocumentFragment();
    entries.slice(0, 10).forEach((entry, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      const name = document.createElement('strong');
      const metric = document.createElement('span');
      rank.textContent = String(entry.rank ?? index + 1);
      name.textContent = String(entry.nickname ?? '-');
      metric.textContent = `${Number(entry.score) || 0} · Lv.${Number(entry.maxLevel) || 1}`;
      item.append(rank, name, metric);
      fragment.appendChild(item);
    });
    rankingList.replaceChildren(fragment);
  }

  function setStatus(message) {
    if (submitStatus) submitStatus.textContent = message;
  }

  function resetTerminalRegistration() {
    panel.hidden = true;
    setStatus('');
    submitButton.disabled = false;
    cancelButton.disabled = false;
    submitting = false;
    activeRecordKey = isTerminal() ? recordKey() : '';
    if (!isTerminal()) {
      registerButton.disabled = false;
      registerButton.textContent = '랭킹 등록';
    }
  }

  function openTerminalRankingRegistration() {
    if (!isTerminal()) return false;
    const currentKey = recordKey();
    activeRecordKey = currentKey;
    if (submittedRecordKey === currentKey) {
      setStatus('이 기록은 이미 등록했습니다.');
      registerButton.textContent = '등록 완료 ✓';
      return false;
    }
    panel.hidden = false;
    nicknameInput.value = readRememberedNickname();
    setStatus('닉네임을 입력하면 현재 기록을 전체 랭킹에 등록합니다.');
    nicknameInput.focus();
    nicknameInput.select();
    return true;
  }

  function closeTerminalRankingRegistration() {
    panel.hidden = true;
    setStatus('');
    registerButton.focus();
  }

  async function submitTerminalRanking() {
    if (!isTerminal() || submitting) return false;
    const record = currentRecord();
    const currentKey = recordKey(record);
    if (submittedRecordKey === currentKey) {
      setStatus('이 기록은 이미 등록했습니다.');
      return false;
    }
    const validation = RankingCore?.validateNickname(nicknameInput.value || '');
    if (!validation?.ok) {
      setStatus('닉네임은 한글/영문/숫자 기준 2~16자로 입력해 주세요.');
      nicknameInput.focus();
      return false;
    }

    submitting = true;
    submitButton.disabled = true;
    cancelButton.disabled = true;
    setStatus('랭킹에 등록하는 중…');
    try {
      const response = await fetch(endpoint, {
        method:'POST',
        headers:{ 'content-type':'application/json', accept:'application/json' },
        body:JSON.stringify({ mode:'classic', nickname:validation.displayName, score:record.score, maxLevel:record.maxLevel })
      });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      rememberNickname(validation.displayName);
      submittedRecordKey = currentKey;
      activeRecordKey = currentKey;
      renderRanking(Array.isArray(payload.entries) ? payload.entries : []);
      const message = payload.updated ? '전체 랭킹에 기록을 등록했습니다.' : '기존 최고 기록이 유지되었습니다.';
      setStatus(message);
      if (rankingStatus) rankingStatus.textContent = message;
      registerButton.textContent = '등록 완료 ✓';
      registerButton.disabled = true;
      return true;
    } catch (_) {
      setStatus('랭킹 등록에 실패했습니다. 로컬 최고 기록은 그대로 유지됩니다.');
      return false;
    } finally {
      submitting = false;
      submitButton.disabled = false;
      cancelButton.disabled = false;
    }
  }

  function syncFromGameStatus() {
    if (isTerminal()) {
      const currentKey = recordKey();
      if (activeRecordKey !== currentKey) {
        activeRecordKey = currentKey;
        panel.hidden = true;
        setStatus('');
        registerButton.disabled = submittedRecordKey === currentKey;
        registerButton.textContent = submittedRecordKey === currentKey ? '등록 완료 ✓' : '랭킹 등록';
      }
      return;
    }
    resetTerminalRegistration();
  }

  registerButton.addEventListener('click', openTerminalRankingRegistration);
  submitButton.addEventListener('click', () => void submitTerminalRanking());
  cancelButton.addEventListener('click', closeTerminalRankingRegistration);
  nicknameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); void submitTerminalRanking(); }
    if (event.key === 'Escape') { event.preventDefault(); closeTerminalRankingRegistration(); }
  });

  new MutationObserver(syncFromGameStatus).observe(root, { attributes:true, attributeFilter:['data-game-status'] });
  syncFromGameStatus();

  globalThis.ChunbakPostgameRanking = Object.freeze({
    openTerminalRankingRegistration,
    closeTerminalRankingRegistration,
    submitTerminalRanking,
    syncFromGameStatus
  });
})();