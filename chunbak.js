(() => {
  'use strict';

  const Core = globalThis.ChunbakGameCore;
  const RankingCore = globalThis.ChunbakRankingCore;
  const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking';
  const WIDTH = 420;
  const HEIGHT = 680;
  const DANGER_Y = 105;
  const DROP_Y = 60;
  const DROP_COOLDOWN_MS = 260;
  const BEST_KEY = 'chunbak:best:v1';

  const root = document.getElementById('chunbak-game');
  const canvas = document.getElementById('chunbak-canvas');
  if (!root || !canvas || !Core || !globalThis.Matter) return;

  const ctx = canvas.getContext('2d');
  const startButton = document.getElementById('chunbak-start');
  const restartButton = document.getElementById('chunbak-restart');
  const nicknameInput = document.getElementById('chunbak-nickname');
  const scoreNode = document.getElementById('chunbak-score');
  const bestNode = document.getElementById('chunbak-best');
  const maxLevelNode = document.getElementById('chunbak-max-level');
  const nextNode = document.getElementById('chunbak-next');
  const stageLegend = document.getElementById('chunbak-stage-legend');
  const overlay = document.getElementById('chunbak-overlay');
  const overlayRestart = overlay?.querySelector('[data-chunbak-overlay-restart]');

  const images = new Map();
  let engine = null;
  let world = null;
  let playing = false;
  let score = 0;
  let maxLevel = 1;
  let currentStage = 1;
  let nextStage = 1;
  let pointerX = WIDTH / 2;
  let lastDropAt = 0;
  let lastMergeAt = null;
  let combo = 0;
  let dangerStartedAt = null;
  let frameId = null;
  let lastFrameAt = performance.now();

  function safeReadBest() {
    try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); }
    catch (_) { return 0; }
  }
  let best = safeReadBest();

  function updateHud() {
    scoreNode.textContent = String(score);
    bestNode.textContent = String(best);
    maxLevelNode.textContent = String(maxLevel);
    root.dataset.gameStatus = playing ? 'playing' : (overlay && !overlay.hidden ? 'gameover' : 'idle');
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
      Matter.World.remove(world, [a, b]);
      const merged = createPiece(resultStage, x, y);
      Matter.Body.setVelocity(merged, { x: vx, y: vy });
      combo = Core.nextCombo(lastMergeAt, nowMs, combo);
      lastMergeAt = nowMs;
      score += Core.scoreMerge(resultStage, combo).total;
      maxLevel = Math.max(maxLevel, resultStage);
      if (score > best) best = score;
      updateHud();
    }
  }

  function setGameOver() {
    if (!playing) return;
    playing = false;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) {}
    overlay.hidden = false;
    updateHud();
  }

  function evaluateDanger(nowMs) {
    if (!playing) { dangerStartedAt = null; return; }
    const aboveLine = dynamicPieces().some(body => body.bounds.min.y < DANGER_Y);
    const danger = Core.updateDangerState({ startedAt: dangerStartedAt, aboveLine, nowMs, thresholdMs: 2000 });
    dangerStartedAt = danger.startedAt;
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
    dangerStartedAt = null;
    lastDropAt = 0;
    pointerX = WIDTH / 2;
    overlay.hidden = true;
    initWorld();
    nextStage = Core.pickSpawnStage(Math.random);
    chooseUpcoming();
    playing = autoStart;
    updateHud();
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

  startButton.addEventListener('click', () => resetGame({ autoStart: true }));
  restartButton.addEventListener('click', () => resetGame({ autoStart: true }));
  overlayRestart?.addEventListener('click', () => resetGame({ autoStart: true }));

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
      buildLegend();
      renderNext();
    } catch (_) {
      startButton.disabled = true;
      const status = document.getElementById('chunbak-ranking-status');
      if (status) status.textContent = '캐릭터 이미지를 불러오지 못했습니다.';
    }
  }

  bestNode.textContent = String(best);
  resetGame({ autoStart: false });
  preloadImages();
  if (!frameId) frameId = requestAnimationFrame(tick);

  globalThis.ChunbakGame = Object.freeze({ createPiece, dropCurrent, handleCollisionPairs, resetGame });
})();
