(() => {
  'use strict';

  const Core = globalThis.ChunbakGameCore;
  const Audio = globalThis.ChunbakAudio;
  const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking';
  const WIDTH = 420;
  const HEIGHT = 680;
  const DANGER_Y = 105;
  const DROP_Y = 60;
  const DROP_COOLDOWN_MS = 260;
  const BEST_KEY = 'chunbak:best:v1';
  // Keep the visible artwork full-size, but shrink the circular collider so
  // transparent PNG padding does not create large visual gaps between pieces.
  const COLLISION_RADIUS_SCALE = 0.84;
  const PHYSICS = Object.freeze({
    gravityY: 1.18,
    restitution: 0.025,
    friction: 0.035,
    frictionStatic: 0.06,
    frictionAir: 0.004,
    density: 0.0024
  });

  const root = document.getElementById('chunbak-game');
  const canvas = document.getElementById('chunbak-canvas');
  if (!root || !canvas || !Core || !Audio || !globalThis.Matter) return;

  const ctx = canvas.getContext('2d');
  const startView = document.getElementById('chunbak-start-view');
  const playView = document.getElementById('chunbak-play-view');
  const startButton = document.getElementById('chunbak-start');
  const restartButton = document.getElementById('chunbak-restart');
  const pauseButton = document.getElementById('chunbak-pause');
  const soundButton = document.getElementById('chunbak-sound');
  const volumeInput = document.getElementById('chunbak-volume');
  const scoreNode = document.getElementById('chunbak-score');
  const bestNode = document.getElementById('chunbak-best');
  const maxLevelNode = document.getElementById('chunbak-max-level');
  const rankingStatus = document.getElementById('chunbak-ranking-status');
  const rankingList = document.getElementById('chunbak-ranking-list');
  const rankingModalStatus = document.getElementById('chunbak-ranking-modal-status');
  const rankingModalList = document.getElementById('chunbak-ranking-modal-list');
  const nextNode = document.getElementById('chunbak-next');
  const stageLegend = document.getElementById('chunbak-stage-legend');
  const overlay = document.getElementById('chunbak-overlay');
  const overlayRestart = overlay?.querySelector('[data-chunbak-overlay-restart]');
  const fxLayer = document.getElementById('chunbak-fx-layer');
  const comboNode = document.getElementById('chunbak-combo');
  const modal = document.getElementById('chunbak-modal');
  const modalTitle = document.getElementById('chunbak-modal-title');
  const modalClose = document.getElementById('chunbak-modal-close');
  const modalPanels = [...document.querySelectorAll('[data-chunbak-panel]')];

  const images = new Map();
  const imageLoads = new Map();
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
  let rankingEntries = [];
  let activePanel = null;
  let modalReturnPanel = null;
  let lastFocusedElement = null;
  let pausedAt = null;
  let resumeAfterUtility = false;
  let spawnRandom = Math.random;

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

  function syncAudioControls() {
    const settings = Audio.getSettings();
    if (soundButton) {
      soundButton.textContent = settings.enabled ? '효과음 ON' : '효과음 OFF';
      soundButton.setAttribute('aria-pressed', String(settings.enabled));
    }
    if (volumeInput) volumeInput.value = String(Math.round(settings.volume * 100));
  }

  function updateHud() {
    scoreNode.textContent = String(score);
    bestNode.textContent = String(best);
    maxLevelNode.textContent = String(maxLevel);
    root.dataset.gameStatus = gameState;
  }

  function showModalPanel(panelName, { returnPanel = null } = {}) {
    if (!modal || !modalTitle) return;
    activePanel = panelName;
    modalReturnPanel = returnPanel;
    lastFocusedElement ||= document.activeElement;
    modal.hidden = false;
    document.body.classList.add('chunbak-modal-open');
    for (const panel of modalPanels) panel.hidden = panel.dataset.chunbakPanel !== panelName;
    modalTitle.textContent = ({ ranking:'전체 랭킹', sound:'소리 설정', controls:'조작법', pause:'일시정지' })[panelName] || '춘박게임';
    modal.querySelectorAll('[data-chunbak-action="back-to-pause"]').forEach(button => {
      button.hidden = returnPanel !== 'pause';
    });
    modalClose?.focus();
  }

  function hideModalShell() {
    if (!modal) return;
    modal.hidden = true;
    activePanel = null;
    modalReturnPanel = null;
    document.body.classList.remove('chunbak-modal-open');
    lastFocusedElement?.focus?.();
    lastFocusedElement = null;
  }

  function pauseGame(reason = 'manual') {
    if (gameState !== 'playing') return false;
    pausedAt = performance.now();
    gameState = 'paused';
    playing = false;
    root.dataset.gameStatus = 'paused';
    root.dataset.pauseReason = reason;
    return true;
  }

  function resumeGame() {
    if (gameState !== 'paused') return false;
    const now = performance.now();
    const pauseDuration = pausedAt == null ? 0 : Math.max(0, now - pausedAt);
    if (Number.isFinite(lastMergeAt)) lastMergeAt += pauseDuration;
    dangerStartedAtById = Object.fromEntries(
      Object.entries(dangerStartedAtById).map(([id, startedAt]) => [id, startedAt + pauseDuration])
    );
    pausedAt = null;
    lastFrameAt = performance.now();
    gameState = 'playing';
    playing = true;
    root.dataset.gameStatus = 'playing';
    delete root.dataset.pauseReason;
    return true;
  }

  function openUtilityModal(panelName) {
    resumeAfterUtility = gameState === 'playing';
    if (resumeAfterUtility) pauseGame('utility');
    showModalPanel(panelName);
  }

  function openPauseMenu() {
    resumeAfterUtility = false;
    if (gameState === 'playing') pauseGame('manual');
    if (gameState === 'paused') showModalPanel('pause');
  }

  function closeUtilityModal() {
    if (modalReturnPanel === 'pause') {
      showModalPanel('pause');
      return;
    }
    const shouldResume = resumeAfterUtility;
    resumeAfterUtility = false;
    hideModalShell();
    if (shouldResume && gameState === 'paused') resumeGame();
  }

  function effectTier(stage) {
    if (stage <= 4) return 'low';
    if (stage <= 7) return 'mid';
    if (stage <= 10) return 'high';
    return 'final';
  }

  function removeTransient(node) {
    if (!node) return;
    const remove = () => node.remove();
    node.addEventListener('animationend', remove, { once:true });
    setTimeout(remove, 1400);
  }

  function showMergeEffect({ x, y, stage, combo: mergeCombo = 1 }) {
    if (!fxLayer) return;
    const tier = effectTier(stage);
    const left = `${(x / WIDTH) * 100}%`;
    const top = `${(y / HEIGHT) * 100}%`;
    const particleCounts = { low:4, mid:7, high:10, final:14 };
    const symbols = ['✦', '★', '♥'];

    const ring = document.createElement('span');
    ring.className = `chunbak-merge-ring tier-${tier}`;
    ring.style.setProperty('--fx-x', left);
    ring.style.setProperty('--fx-y', top);
    fxLayer.appendChild(ring);
    removeTransient(ring);

    for (let i = 0; i < particleCounts[tier]; i += 1) {
      const angle = (Math.PI * 2 * i) / particleCounts[tier] + Math.random() * 0.22;
      const distance = 36 + Math.random() * (tier === 'final' ? 68 : 46);
      const particle = document.createElement('span');
      particle.className = `chunbak-particle tier-${tier}`;
      particle.textContent = symbols[(i + stage + mergeCombo) % symbols.length];
      particle.style.setProperty('--fx-x', left);
      particle.style.setProperty('--fx-y', top);
      particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--particle-delay', `${(i % 4) * 18}ms`);
      particle.style.setProperty('--particle-size', `${14 + Math.min(stage, 11) + (i % 3) * 2}px`);
      particle.style.setProperty('--particle-rotate', `${70 + (i * 37) % 180}deg`);
      fxLayer.appendChild(particle);
      removeTransient(particle);
    }

    if (tier === 'final') {
      const crown = document.createElement('span');
      crown.className = 'chunbak-particle tier-final chunbak-final-crown';
      crown.textContent = '♛';
      crown.style.setProperty('--fx-x', left);
      crown.style.setProperty('--fx-y', top);
      crown.style.setProperty('--particle-x', '0px');
      crown.style.setProperty('--particle-y', '-76px');
      crown.style.setProperty('--particle-rotate', '0deg');
      fxLayer.appendChild(crown);
      removeTransient(crown);
    }
  }

  function showCombo(comboValue, x, y) {
    if (!comboNode || comboValue < 2) return;
    comboNode.textContent = `COMBO x${comboValue}`;
    comboNode.style.setProperty('--combo-x', `${(x / WIDTH) * 100}%`);
    comboNode.style.setProperty('--combo-y', `${(y / HEIGHT) * 100}%`);
    comboNode.classList.remove('is-visible');
    void comboNode.offsetWidth;
    comboNode.classList.add('is-visible');
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
    const collisionRadius = Math.max(8, meta.radius * COLLISION_RADIUS_SCALE);
    const body = Matter.Bodies.circle(x, y, collisionRadius, {
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionStatic: PHYSICS.frictionStatic,
      frictionAir: PHYSICS.frictionAir,
      density: PHYSICS.density,
      slop: 0.02
    });
    body.plugin ||= {};
    body.plugin.chunbak = {
      stage,
      merging: false,
      renderRadius: meta.radius,
      collisionRadius
    };
    Matter.World.add(world, body);
    return body;
  }

  function chooseUpcoming() {
    currentStage = nextStage || Core.pickSpawnStage(spawnRandom);
    nextStage = Core.pickSpawnStage(spawnRandom);
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
    img.decoding = 'async';
    img.fetchPriority = 'high';
    void ensureStageImage(nextStage);
    nextNode.appendChild(img);
  }

  function buildLegend() {
    const fragment = document.createDocumentFragment();
    for (const meta of Core.STAGES) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = meta.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.fetchPriority = 'low';
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
    nextStage = Core.pickSpawnStage(spawnRandom);
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
      if (typeof Audio.playMerge === 'function') Audio.playMerge(resultStage, combo);
      else Audio.play(resultStage >= 8 ? 'highmerge' : 'merge');
      showMergeEffect({ x, y, stage:resultStage, combo });
      showCombo(combo, x, y);
      if (score > best) best = score;
      updateHud();
    }
  }

  function renderRankingList(target, entries) {
    if (!target) return;
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
    target.replaceChildren(fragment);
  }

  function renderRankings() {
    renderRankingList(rankingList, rankingEntries);
    renderRankingList(rankingModalList, rankingEntries);
  }

  function setRankingStatus(text) {
    if (rankingStatus) rankingStatus.textContent = text;
    if (rankingModalStatus) rankingModalStatus.textContent = text;
  }

  async function loadRanking() {
    setRankingStatus('랭킹 불러오는 중…');
    try {
      const response = await fetch(`${RANKING_ENDPOINT}&mode=classic`, { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error(`ranking ${response.status}`);
      const payload = await response.json();
      rankingEntries = Array.isArray(payload.entries) ? payload.entries : [];
      renderRankings();
      setRankingStatus(rankingEntries.length ? '전체 최고 기록' : '아직 등록된 기록이 없습니다.');
    } catch (_) {
      setRankingStatus('랭킹을 불러올 수 없습니다');
    }
  }

  function setGameOver() {
    if (!playing) return;
    playing = false;
    pausedAt = null;
    resumeAfterUtility = false;
    setView('gameover');
    Audio.play('gameover');
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) {}
    overlay.hidden = false;
    updateHud();
  }

  function evaluateDanger(nowMs) {
    if (gameState === 'paused') return;
    if (gameState !== 'playing') {
      dangerStartedAtById = {};
      return;
    }
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
    if (!meta) return;
    if (!img) {
      void ensureStageImage(stage);
      return;
    }
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
    if (!meta) return;
    if (!img) {
      void ensureStageImage(currentStage);
      return;
    }
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
    engine.positionIterations = 10;
    engine.velocityIterations = 8;
    engine.constraintIterations = 4;
    engine.gravity.y = PHYSICS.gravityY;
    world = engine.world;
    createBoundaries();
    Matter.Events.on(engine, 'collisionStart', event => handleCollisionPairs(event.pairs, performance.now()));
  }

  function resetGame({ autoStart = true, random = Math.random } = {}) {
    spawnRandom = typeof random === 'function' ? random : Math.random;
    score = 0;
    maxLevel = 1;
    combo = 0;
    lastMergeAt = null;
    dangerStartedAtById = {};
    lastDropAt = 0;
    pointerX = WIDTH / 2;
    pausedAt = null;
    resumeAfterUtility = false;
    overlay.hidden = true;
    fxLayer?.replaceChildren();
    if (comboNode) {
      comboNode.textContent = '';
      comboNode.classList.remove('is-visible');
    }
    initWorld();
    nextStage = Core.pickSpawnStage(spawnRandom);
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
    hideModalShell();
    startGameWithSound();
  });
  restartButton?.addEventListener('click', startGameWithSound);
  overlayRestart?.addEventListener('click', startGameWithSound);
  pauseButton?.addEventListener('click', openPauseMenu);
  document.querySelectorAll('[data-chunbak-open]').forEach(button => {
    button.addEventListener('click', () => openUtilityModal(button.dataset.chunbakOpen));
  });
  modalClose?.addEventListener('click', () => {
    if (activePanel === 'pause') {
      hideModalShell();
      resumeGame();
      return;
    }
    closeUtilityModal();
  });
  modal?.querySelector('[data-chunbak-close]')?.addEventListener('click', () => {
    if (activePanel === 'pause') {
      hideModalShell();
      resumeGame();
      return;
    }
    closeUtilityModal();
  });
  modal?.querySelectorAll('[data-chunbak-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.chunbakAction;
      if (action === 'resume') {
        resumeAfterUtility = false;
        hideModalShell();
        resumeGame();
      } else if (action === 'new-game') {
        resumeAfterUtility = false;
        hideModalShell();
        resetGame({ autoStart:true });
      } else if (action === 'pause-sound') {
        showModalPanel('sound', { returnPanel:'pause' });
      } else if (action === 'pause-controls') {
        showModalPanel('controls', { returnPanel:'pause' });
      } else if (action === 'back-to-pause') {
        showModalPanel('pause');
      }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (modal && !modal.hidden) {
      event.preventDefault();
      if (modalReturnPanel === 'pause' && (activePanel === 'sound' || activePanel === 'controls')) {
        showModalPanel('pause');
      } else if (activePanel === 'pause') {
        hideModalShell();
        resumeGame();
      } else {
        closeUtilityModal();
      }
    } else if (gameState === 'playing') {
      event.preventDefault();
      openPauseMenu();
    }
  });
  soundButton?.addEventListener('click', () => {
    void Audio.resume();
    Audio.setEnabled(!Audio.getSettings().enabled);
    syncAudioControls();
  });
  volumeInput?.addEventListener('input', () => {
    Audio.setVolume(Number(volumeInput.value) / 100);
    syncAudioControls();
  });
  comboNode?.addEventListener('animationend', () => comboNode.classList.remove('is-visible'));

  function loadStageImage(meta) {
    if (!meta) return Promise.reject(new Error('missing_stage_image'));
    if (images.has(meta.id)) return Promise.resolve(images.get(meta.id));
    if (imageLoads.has(meta.id)) return imageLoads.get(meta.id);

    const task = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        images.set(meta.id, img);
        imageLoads.delete(meta.id);
        resolve(img);
      };
      img.onerror = () => {
        imageLoads.delete(meta.id);
        reject(new Error(`failed_stage_image_${meta.id}`));
      };
      img.src = meta.image;
    });
    imageLoads.set(meta.id, task);
    return task;
  }

  function ensureStageImage(stage) {
    const meta = Core.STAGES[Number(stage) - 1];
    if (!meta) return Promise.resolve(null);
    return loadStageImage(meta).catch(() => null);
  }

  function warmRemainingImages() {
    const warm = () => {
      void Promise.allSettled(Core.STAGES.slice(5).map(meta => loadStageImage(meta)));
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warm, { timeout: 1800 });
    } else {
      setTimeout(warm, 350);
    }
  }

  async function preloadImages() {
    try {
      await Promise.all(Core.STAGES.slice(0, 5).map(meta => loadStageImage(meta)));
      startButton.disabled = false;
      if (restartButton) restartButton.disabled = false;
      buildLegend();
      renderNext();
      warmRemainingImages();
    } catch (_) {
      startButton.disabled = true;
      if (restartButton) restartButton.disabled = true;
      setRankingStatus('캐릭터 이미지를 불러오지 못했습니다.');
    }
  }

  bestNode.textContent = String(best);
  syncAudioControls();
  resetGame({ autoStart: false });
  preloadImages();
  void loadRanking();
  if (!frameId) frameId = requestAnimationFrame(tick);

  globalThis.ChunbakGame = Object.freeze({
    createPiece,
    dropCurrent,
    handleCollisionPairs,
    resetGame,
    pauseGame,
    resumeGame,
    setGameOver,
    showMergeEffect,
    showCombo,
    getDebugState: () => ({
      gameState,
      playing,
      score,
      combo,
      maxLevel,
      currentStage,
      nextStage,
      bodyCount: dynamicPieces().length
    })
  });
})();
