(() => {
  'use strict';

  const Core = globalThis.ChunbakGameCore;
  const RankingCore = globalThis.ChunbakRankingCore;
  const Audio = globalThis.ChunbakAudio;
  const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking';
  const WIDTH = 420;
  const HEIGHT = 680;
  const DANGER_Y = 105;
  const DROP_Y = 60;
  const DROP_COOLDOWN_MS = 260;
  const BEST_KEY = 'chunbak:best:v1';
  const NICKNAME_KEY = 'chunbak:nickname:v1';

  const root = document.getElementById('chunbak-game');
  const canvas = document.getElementById('chunbak-canvas');
  if (!root || !canvas || !Core || !Audio || !globalThis.Matter) return;

  const ctx = canvas.getContext('2d');
  const startView = document.getElementById('chunbak-start-view');
  const playView = document.getElementById('chunbak-play-view');
  const startButton = document.getElementById('chunbak-start');
  const restartButton = document.getElementById('chunbak-restart');
  const soundButton = document.getElementById('chunbak-sound');
  const volumeInput = document.getElementById('chunbak-volume');
  const nicknameInput = document.getElementById('chunbak-nickname');
  const scoreNode = document.getElementById('chunbak-score');
  const bestNode = document.getElementById('chunbak-best');
  const maxLevelNode = document.getElementById('chunbak-max-level');
  const rankingStatus = document.getElementById('chunbak-ranking-status');
  const rankingList = document.getElementById('chunbak-ranking-list');
  const nextNode = document.getElementById('chunbak-next');
  const stageLegend = document.getElementById('chunbak-stage-legend');
  const overlay = document.getElementById('chunbak-overlay');
  const overlayRestart = overlay?.querySelector('[data-chunbak-overlay-restart]');

  const images = new Map();
  let engine = null;
  let world = null;
  let gameState = 'start';
  let playing = false;
  let score = 0;
  let maxLevel = 1;
  let currentStage = 1;
  let nextStage = 1;
  let pointerX = WIDTH / 2;
  let lastDropAt = 0;
  let lastMergeAt = null;
  let combo = 0;
  let dangerStartedAtById = {};
  let frameId = null;
  let lastFrameAt = performance.now();

  function safeReadBest() {
    try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); }
    catch (_) { return 0; }
  }
  let best = safeReadBest();

  function setView(state) {
    gameState = state;
    if (startView) startView.hidden = state !== 'start';
    if (playView) playView.hidden = state === 'start';
    root.dataset.gameStatus = state;
  }

  function getNicknameState() {
    const raw = RankingCore?.normalizeNickname
      ? RankingCore.normalizeNickname(nicknameInput.value)
      : String(nicknameInput.value || '').trim();
    if (!raw) return { kind: 'anonymous' };
    const validation = RankingCore?.validateNickname(raw);
    return validation?.ok
      ? { kind: 'valid', displayName: validation.displayName }
      : { kind: 'invalid' };
  }

  function syncAudioControls() {
    const settings = Audio.getSettings();
    soundButton.textContent = settings.enabled ? '효과음 ON' : '효과음 OFF';
    soundButton.setAttribute('aria-pressed', String(settings.enabled));
    volumeInput.value = String(Math.round(settings.volume * 100));
  }

  function updateHud() {
    scoreNode.textContent = String(score);
    bestNode.textContent = String(best);
    maxLevelNode.textContent = String(maxLevel);
    root.dataset.gameStatus = gameState;
  }

  function dynamicPieces() {
    return Matter.Composite.allBodies(world).filter(body => body.plugin?.chunbak && !body.isStatic);
  }

  function createBoundaries() {
    const opts = { isStatic: true, restitution: 0, friction: 0.2 };
    Matter.World.add(world, [
      Matter.Bodies.rectangle(-14, HEIGHT / 2, 28, HEIGHT + 80, opts),
      Matter.Bodies.rectangle(WIDTH + 14, HEIGHT / 2, 28, HEIGHT + 80, opts),
      Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + 14, WIDTH + 56, 28, opts)
    ]);
  }

  function createPiece(stage, x, y) {
    const meta = Core.STAGES[stage - 1];
    const body = Matter.Bodies.circle(x, y, meta.radius, {
      restitution: 0.08,
      friction: 0.12,
      frictionStatic: 0.35,
      density: 0.0017
    });
    body.plugin ||= {};
    body.plugin.chunbak = { stage, merging: false };
    Matter.World.add(world, body);
    return body;
  }

  function chooseUpcoming() {
    currentStage = nextStage || Core.pickSpawnStage(Math.random);
    nextStage = Core.pickSpawnStage(Math.random);
    const radius = Core.STAGES[currentStage - 1].radius;
    pointerX = Math.min(WIDTH - radius, Math.max(radius, pointerX));
    renderNext();
  }

  function renderNext() {
    const meta = Core.STAGES[nextStage - 1];
    nextNode.replaceChildren();
    const img = document.createElement('img');
    img.src = meta.image;
    img.alt = `${nextStage}단계`;
    nextNode.appendChild(img);
  }

  function buildLegend() {
    const fragment = document.createDocumentFragment();
    for (const meta of Core.STAGES) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = meta.image;
      img.alt = '';
      const caption = document.createElement('figcaption');
      caption.textContent = `${meta.id}단계`;
      figure.append(img, caption);
      fragment.appendChild(figure);
    }
    stageLegend.replaceChildren(fragment);
  }

  function dropCurrent() {
    if (!playing) return false;
    const now = performance.now();
    if (now - lastDropAt < DROP_COOLDOWN_MS) return false;
    const radius = Core.STAGES[currentStage - 1].radius;
    const x = Math.min(WIDTH - radius, Math.max(radius, pointerX));
    createPiece(currentStage, x, DROP_Y + radius);
    Audio.play('drop');
    maxLevel = Math.max(maxLevel, currentStage);
    lastDropAt = now;
    currentStage = nextStage;
    nextStage = Core.pickSpawnStage(Math.random);
    renderNext();
    updateHud();
    return true;
  }

  function handleCollisionPairs(pairs, nowMs) {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const aMeta = a.plugin?.chunbak;
      const bMeta = b.plugin?.chunbak;
      if (!aMeta || !bMeta || aMeta.merging || bMeta.merging) continue;
      const resultStage = Core.mergeResult(aMeta.stage, bMeta.stage);
      if (!resultStage) continue;
      aMeta.merging = true;
      bMeta.merging = true;
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const vx = (a.velocity.x + b.velocity.x) / 2;
      const vy = Math.min(2.5, (a.velocity.y + b.velocity.y) / 2);
      Matter.World.remove(world, a);
      Matter.World.remove(world, b);
      const merged = createPiece(resultStage, x, y);
      Matter.Body.setVelocity(merged, { x: vx, y: vy });
      combo = Core.nextCombo(lastMergeAt, nowMs, combo);
      lastMergeAt = nowMs;
      score += Core.scoreMerge(resultStage, combo).total;
      maxLevel = Math.max(maxLevel, resultStage);
      if (resultStage >= 8) Audio.play('highmerge');
      else Audio.play('merge');
      if (score > best) best = score;
      updateHud();
    }
  }

  function renderRanking(entries = []) {
    const fragment = document.createDocumentFragment();
    for (const entry of entries.slice(0, 10)) {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      const name = document.createElement('strong');
      const record = document.createElement('span');
      rank.textContent = String(entry.rank ?? fragment.childNodes.length + 1);
      name.textContent = String(entry.nickname ?? '-');
      record.textContent = `${Number(entry.score) || 0} · Lv.${Number(entry.maxLevel) || 1}`;
      item.append(rank, name, record);
      fragment.appendChild(item);
    }
    rankingList.replaceChildren(fragment);
  }

  async function loadRanking() {
    rankingStatus.textContent = '랭킹 불러오는 중…';
    try {
      const response = await fetch(`${RANKING_ENDPOINT}&mode=classic`, { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      renderRanking(Array.isArray(payload.entries) ? payload.entries : []);
      rankingStatus.textContent = payload.entries?.length ? '전체 최고 기록' : '아직 등록된 기록이 없습니다.';
    } catch (_) {
      rankingStatus.textContent = '랭킹을 불러올 수 없습니다';
    }
  }

  function currentNickname() {
    const nicknameState = getNicknameState();
    return nicknameState.kind === 'valid'
      ? { ok: true, displayName: nicknameState.displayName }
      : null;
  }

  async function submitRanking() {
    const nicknameState = getNicknameState();
    if (nicknameState.kind === 'anonymous') {
      rankingStatus.textContent = '로컬 최고 기록만 저장되었습니다.';
      return;
    }
    if (nicknameState.kind === 'invalid') {
      rankingStatus.textContent = '전체 랭킹은 2~16자 닉네임을 입력한 기록만 등록됩니다.';
      return;
    }
    try { localStorage.setItem(NICKNAME_KEY, nicknameState.displayName); } catch (_) {}
    try {
      const response = await fetch(RANKING_ENDPOINT, {
        method:'POST',
        headers:{ 'content-type':'application/json', accept:'application/json' },
        body:JSON.stringify({ mode:'classic', nickname:nicknameState.displayName, score, maxLevel })
      });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      renderRanking(Array.isArray(payload.entries) ? payload.entries : []);
      rankingStatus.textContent = payload.updated ? '새 최고 기록이 저장되었습니다.' : '기존 최고 기록이 유지되었습니다.';
    } catch (_) {
      rankingStatus.textContent = '점수는 저장되지 않았지만 게임은 계속 플레이할 수 있습니다.';
    }
  }

  function setGameOver() {
    if (!playing) return;
    playing = false;
    setView('gameover');
    Audio.play('gameover');
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) {}
    overlay.hidden = false;
    updateHud();
    void submitRanking();
  }

  function evaluateDanger(nowMs) {
    if (!playing) { dangerStartedAtById = {}; return; }
    const aboveIds = dynamicPieces()
      .filter(body => body.bounds.min.y < DANGER_Y)
      .map(body => body.id);
    const danger = Core.updateDangerTracker(dangerStartedAtById, aboveIds, nowMs, 2000);
    dangerStartedAtById = danger.startedAtById;
    if (danger.gameOver) setGameOver();
  }

  function drawPiece(body) {
    const stage = body.plugin?.chunbak?.stage;
    const meta = Core.STAGES[stage - 1];
    const img = images.get(stage);
    if (!img || !meta) return;
    const size = meta.radius * 2;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawPreview() {
    if (!playing) return;
    const meta = Core.STAGES[currentStage - 1];
    const img = images.get(currentStage);
    if (!meta || !img) return;
    const radius = meta.radius;
    const x = Math.min(WIDTH - radius, Math.max(radius, pointerX));
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, DROP_Y + radius);
    ctx.stroke();
    ctx.drawImage(img, x - radius, DROP_Y, radius * 2, radius * 2);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const body of dynamicPieces()) drawPiece(body);
    drawPreview();
  }

  function tick(nowMs) {
    const delta = Math.min(32, Math.max(8, nowMs - lastFrameAt));
    lastFrameAt = nowMs;
    if (playing) Matter.Engine.update(engine, delta);
    evaluateDanger(nowMs);
    render();
    frameId = requestAnimationFrame(tick);
  }

  function initWorld() {
    if (engine) Matter.Engine.clear(engine);
    engine = Matter.Engine.create();
    engine.gravity.y = 1.05;
    world = engine.world;
    createBoundaries();
    Matter.Events.on(engine, 'collisionStart', event => handleCollisionPairs(event.pairs, performance.now()));
  }

  function resetGame({ autoStart = true } = {}) {
    score = 0;
    maxLevel = 1;
    combo = 0;
    lastMergeAt = null;
    dangerStartedAtById = {};
    lastDropAt = 0;
    pointerX = WIDTH / 2;
    overlay.hidden = true;
    initWorld();
    nextStage = Core.pickSpawnStage(Math.random);
    chooseUpcoming();
    playing = autoStart;
    setView(autoStart ? 'playing' : 'start');
    updateHud();
  }

  function startGameWithSound() {
    void Audio.resume();
    Audio.play('start');
    resetGame({ autoStart: true });
  }

  function pointerToStageX(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = WIDTH / Math.max(1, rect.width);
    const raw = (event.clientX - rect.left) * scale;
    const radius = Core.STAGES[currentStage - 1].radius;
    return Math.min(WIDTH - radius, Math.max(radius, raw));
  }

  canvas.addEventListener('pointermove', event => {
    if (!playing) return;
    pointerX = pointerToStageX(event);
  });
  canvas.addEventListener('pointerdown', event => {
    if (!playing) return;
    event.preventDefault();
    pointerX = pointerToStageX(event);
    dropCurrent();
  });

  startButton.addEventListener('click', () => {
    const nicknameState = getNicknameState();
    if (nicknameState.kind === 'valid') {
      try { localStorage.setItem(NICKNAME_KEY, nicknameState.displayName); } catch (_) {}
    }
    startGameWithSound();
  });
  restartButton.addEventListener('click', startGameWithSound);
  overlayRestart?.addEventListener('click', startGameWithSound);
  soundButton.addEventListener('click', () => {
    void Audio.resume();
    Audio.setEnabled(!Audio.getSettings().enabled);
    syncAudioControls();
  });
  volumeInput.addEventListener('input', () => {
    Audio.setVolume(Number(volumeInput.value) / 100);
    syncAudioControls();
  });

  async function preloadImages() {
    try {
      await Promise.all(Core.STAGES.map(meta => new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { images.set(meta.id, img); resolve(); };
        img.onerror = reject;
        img.src = meta.image;
      })));
      startButton.disabled = false;
      restartButton.disabled = false;
      buildLegend();
      renderNext();
    } catch (_) {
      startButton.disabled = true;
      restartButton.disabled = true;
      const status = document.getElementById('chunbak-ranking-status');
      if (status) status.textContent = '캐릭터 이미지를 불러오지 못했습니다.';
    }
  }

  try { nicknameInput.value = localStorage.getItem(NICKNAME_KEY) || ''; } catch (_) {}
  nicknameInput.addEventListener('change', () => {
    const nicknameState = getNicknameState();
    if (nicknameState.kind === 'valid') {
      nicknameInput.value = nicknameState.displayName;
      try { localStorage.setItem(NICKNAME_KEY, nicknameState.displayName); } catch (_) {}
    }
  });
  bestNode.textContent = String(best);
  syncAudioControls();
  resetGame({ autoStart: false });
  preloadImages();
  void loadRanking();
  if (!frameId) frameId = requestAnimationFrame(tick);

  globalThis.ChunbakGame = Object.freeze({ createPiece, dropCurrent, handleCollisionPairs, resetGame });
})();
