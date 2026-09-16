(() => {
  'use strict';
  const MAX_STAGE = 11;
  const RADII = [0,22,27,33,40,48,57,67,78,90,103,118];
  const MERGE_SCORES = Object.freeze({2:20,3:40,4:80,5:140,6:220,7:340,8:520,9:760,10:1080,11:1500});
  const SPAWN_WEIGHTS = Object.freeze([0.35,0.27,0.18,0.12,0.08]);
  const STAGES = Object.freeze(Array.from({length:MAX_STAGE}, (_, index) => {
    const id = index + 1;
    return Object.freeze({ id, radius:RADII[id], image:`assets/chunbak/${id}.png` });
  }));

  function pickSpawnStage(random = Math.random) {
    const raw = Number(random());
    const roll = Math.min(0.999999999, Math.max(0, Number.isFinite(raw) ? raw : 0));
    let cumulative = 0;
    for (let i=0; i<SPAWN_WEIGHTS.length; i+=1) {
      cumulative += SPAWN_WEIGHTS[i];
      if (roll < cumulative) return i + 1;
    }
    return 5;
  }
  function mergeResult(a,b) { if (a !== b || a < 1 || a >= MAX_STAGE) return null; return a + 1; }
  function scoreMerge(resultStage, comboCount=1) { const base=MERGE_SCORES[resultStage]||0; const bonus=Math.min(Math.max(0,comboCount)*10,100); return {base,bonus,total:base+bonus}; }
  function nextCombo(previousMergeAt, nowMs, previousCombo) { return Number.isFinite(previousMergeAt) && nowMs-previousMergeAt<=1250 ? Math.max(1,previousCombo+1) : 1; }
  function updateDangerState({startedAt=null,aboveLine=false,nowMs=0,thresholdMs=2000}) { if(!aboveLine) return {startedAt:null,gameOver:false}; const nextStartedAt=Number.isFinite(startedAt)?startedAt:nowMs; return {startedAt:nextStartedAt,gameOver:nowMs-nextStartedAt>=thresholdMs}; }
  function updateDangerTracker(previousStartedAtById={}, aboveIds=[], nowMs=0, thresholdMs=2000) {
    const previous = previousStartedAtById && typeof previousStartedAtById === 'object' ? previousStartedAtById : {};
    const startedAtById = {};
    let gameOver = false;
    for (const rawId of aboveIds) {
      const id = String(rawId);
      const previousStart = Number(previous[id]);
      const startedAt = Number.isFinite(previousStart) ? previousStart : nowMs;
      startedAtById[id] = startedAt;
      if (nowMs - startedAt >= thresholdMs) gameOver = true;
    }
    return { startedAtById, gameOver };
  }
  const API={MAX_STAGE,STAGES,SPAWN_WEIGHTS,MERGE_SCORES,pickSpawnStage,mergeResult,scoreMerge,nextCombo,updateDangerState,updateDangerTracker};
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
  globalThis.ChunbakGameCore=API;
})();
