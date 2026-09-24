(() => {
  'use strict';

  if (document.body?.dataset?.page !== 'home') return;

  const STORAGE_KEY = 'chunbong-daily-fortune-v1';
  const SEOUL_TZ = 'Asia/Seoul';
  const CLOUDINARY_ROOT = 'https://res.cloudinary.com/lyppgyei/image/upload';
  const PUBLIC_ID = 'chunbong-fansite/tarot-original';
  const CELL_WIDTH = 898;
  const CELL_HEIGHT = 1488;
  const SHEET_SIZE = 13;

  const CARDS = [
    ['바보','새로운 시작 · 자유 · 가능성','준비가 덜 된 일은 한 번 더 확인해 보세요.','가볍게 첫걸음을 내딛기 좋은 날입니다. 완벽한 계획보다 작은 실행이 흐름을 엽니다.'],
    ['마법사','의지 · 실행력 · 자원 활용','한꺼번에 너무 많은 일을 벌이지 마세요.','이미 가진 능력과 도구를 잘 조합하면 원하는 방향으로 상황을 움직일 수 있습니다.'],
    ['여사제','직관 · 관찰 · 내면의 지혜','서두른 결론보다 한 번 더 관찰하세요.','말보다 느낌과 분위기에 중요한 힌트가 숨어 있습니다. 조용히 살펴보면 답이 보입니다.'],
    ['여황제','풍요 · 돌봄 · 창조성','남을 챙기느라 자신을 놓치지 마세요.','즐거움과 여유가 좋은 결과를 키웁니다. 오늘은 편안함과 창조적인 선택을 믿어 보세요.'],
    ['황제','질서 · 책임 · 안정','지나친 통제나 고집은 부담이 될 수 있습니다.','기준과 우선순위를 세우면 하루가 안정됩니다. 해야 할 일을 차분히 정리해 보세요.'],
    ['교황','배움 · 조언 · 신뢰','익숙한 방식만 고집하지는 마세요.','경험자의 조언이나 검증된 방법에서 좋은 답을 얻기 쉬운 날입니다.'],
    ['연인','관계 · 선택 · 조화','마음과 행동이 다른 선택은 피하세요.','사람과의 연결이나 중요한 선택에서 내 가치관을 분명히 하면 좋은 흐름이 생깁니다.'],
    ['전차','전진 · 의지 · 승부욕','속도만 높이다 방향을 놓치지 마세요.','집중력이 강해지는 날입니다. 목표를 하나 정하고 밀어붙이면 성과가 따라옵니다.'],
    ['힘','용기 · 인내 · 부드러운 통제','억지로 참기보다 감정을 건강하게 풀어 주세요.','강하게 밀어붙이기보다 침착함과 여유가 더 큰 힘이 됩니다.'],
    ['은둔자','성찰 · 탐구 · 혼자만의 시간','생각이 길어져 행동을 미루지 않도록 하세요.','잠깐의 거리두기와 정리가 도움이 됩니다. 혼자 집중하는 시간이 답을 선명하게 만듭니다.'],
    ['운명의 수레바퀴','전환점 · 흐름 · 기회','통제하기 어려운 변화에 너무 매달리지 마세요.','예상 밖의 기회나 방향 전환이 생길 수 있습니다. 흐름이 바뀌면 유연하게 올라타 보세요.'],
    ['정의','균형 · 책임 · 판단','감정만으로 결론 내리지 않도록 주의하세요.','사실과 기준을 분명히 할수록 좋은 선택을 할 수 있습니다. 정리와 결정에 강한 날입니다.'],
    ['매달린 사람','관점 전환 · 기다림 · 내려놓음','답이 늦는다고 억지로 밀어붙이지 마세요.','잠시 멈추면 보이지 않던 선택지가 보입니다. 다른 관점에서 문제를 바라보세요.'],
    ['죽음','종료 · 변화 · 재출발','끝난 것을 붙잡느라 새 기회를 놓치지 마세요.','정리해야 할 것을 정리하면 새로운 흐름이 열립니다. 작은 마무리부터 시작해 보세요.'],
    ['절제','조율 · 균형 · 회복','과한 일정이나 감정 소모를 줄여 주세요.','속도를 조금 낮추고 균형을 맞추면 하루가 편안해집니다. 무리하지 않는 것이 핵심입니다.'],
    ['악마','욕망 · 집착 인식 · 현실 감각','충동적인 소비나 반복 습관을 조심하세요.','끌리는 것의 이유를 솔직히 들여다보면 오히려 선택권을 되찾을 수 있습니다.'],
    ['탑','급변 · 진실 · 구조 재편','갑작스러운 변수에 감정적으로 반응하지 마세요.','예상 밖의 변화가 있어도 불필요한 것을 정리하는 계기가 될 수 있습니다.'],
    ['별','희망 · 회복 · 영감','결과를 너무 빨리 단정하지 마세요.','마음이 다시 가벼워지고 새로운 아이디어가 떠오르기 좋은 날입니다. 작은 희망을 키워 보세요.'],
    ['달','감정 · 상상력 · 불확실성','확실하지 않은 정보로 걱정을 키우지 마세요.','직감은 중요하지만 확인도 필요합니다. 오늘은 감정과 사실을 분리해 바라보세요.'],
    ['태양','성취 · 활력 · 명확함','과신해서 일정을 너무 빡빡하게 잡지 마세요.','밝고 긍정적인 에너지가 강합니다. 사람들과 나누고 드러낼수록 좋은 흐름이 커집니다.'],
    ['심판','각성 · 결단 · 재평가','과거의 실수를 계속 붙잡지 마세요.','미뤄 둔 결정을 다시 바라보기 좋은 날입니다. 지금의 기준으로 새롭게 선택해 보세요.'],
    ['세계','완성 · 통합 · 다음 단계','마무리를 대충 넘기지 마세요.','하나의 흐름을 잘 마무리하고 다음 단계로 넘어가기 좋은 날입니다. 성취를 충분히 인정해 주세요.']
  ];

  const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
  const EN = ['THE FOOL','THE MAGICIAN','THE HIGH PRIESTESS','THE EMPRESS','THE EMPEROR','THE HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT','WHEEL OF FORTUNE','JUSTICE','THE HANGED MAN','DEATH','TEMPERANCE','THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN','JUDGEMENT','THE WORLD'];

  function kstDate(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: SEOUL_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
  }

  function randomInt(max) {
    const limit = Number(max);
    if (!Number.isInteger(limit) || limit <= 0) return 0;
    if (globalThis.crypto?.getRandomValues) {
      const bucket = new Uint32Array(1);
      globalThis.crypto.getRandomValues(bucket);
      return bucket[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  }

  function artworkUrl(cardNumber) {
    const index = Math.max(0, Math.min(21, Number(cardNumber) || 0));
    const sheet = Math.floor(index / SHEET_SIZE);
    const slot = index % SHEET_SIZE;
    const x = slot * CELL_WIDTH;
    const transform = `c_crop,g_north_west,h_${CELL_HEIGHT},w_${CELL_WIDTH},x_${x},y_0/f_auto/q_auto`;
    return `${CLOUDINARY_ROOT}/${transform}/${PUBLIC_ID}/sheet-${sheet}.avif`;
  }

  function readState(storage = globalThis.localStorage, today = kstDate()) {
    try {
      const raw = storage?.getItem?.(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.date !== today) return null;
      const card = Number(parsed.card);
      if (!Number.isInteger(card) || card < 0 || card > 21) return null;
      return { date: today, card, drawnAt: String(parsed.drawnAt || '') };
    } catch (_) {
      return null;
    }
  }

  function writeState(card, storage = globalThis.localStorage, today = kstDate()) {
    const state = { date: today, card: Number(card), drawnAt: new Date().toISOString() };
    try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    return state;
  }

  function fortuneSoundPreferences(storage = globalThis.localStorage) {
    let enabled = true;
    let volume = 0.7;
    try {
      enabled = storage?.getItem?.('chunbongTarotSound') !== 'off';
      const storedVolume = Number(storage?.getItem?.('chunbongTarotVolume'));
      if (Number.isFinite(storedVolume)) volume = Math.min(1, Math.max(0, storedVolume));
    } catch (_) {}
    return { enabled, volume };
  }

  function createFortuneAudio() {
    const prefs = fortuneSoundPreferences();
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor || !prefs.enabled || prefs.volume <= 0) return null;
    try {
      const ctx = new Ctor();
      ctx.resume?.();
      return ctx;
    } catch (_) {
      return null;
    }
  }

  function playTone(ctx, frequency, start, duration, volume = 0.035, type = 'sine', endFrequency = 0) {
    if (!ctx) return;
    const prefs = fortuneSoundPreferences();
    if (!prefs.enabled || prefs.volume <= 0) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, frequency), start);
      if (endFrequency > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      const scaledVolume = Math.max(0.0002, volume * prefs.volume);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(scaledVolume, start + Math.min(0.025, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (_) {}
  }

  function playMagicRippleSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    // Refined glass-halo hover: inharmonic crystal partials with a soft attack.
    // It plays only on pointer entry so the card never chatters while the pointer moves.
    const partials = [
      [945, 0.60, 0.0100, 0.000, 'sine'],
      [1313, 0.64, 0.0066, 0.012, 'sine'],
      [1777, 0.68, 0.0042, 0.020, 'triangle'],
      [2400, 0.58, 0.0024, 0.032, 'sine'],
      [2940, 0.48, 0.0014, 0.046, 'sine']
    ];
    partials.forEach(([frequency, duration, volume, offset, type]) => {
      playTone(ctx, frequency, start + offset, duration, volume, type);
    });
  }

  function playSelectionBurstSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    playTone(ctx, 720, start, 0.22, 0.0060, 'sine', 1320);
    playTone(ctx, 1540, start + 0.025, 0.28, 0.0042, 'triangle', 2140);
    playTone(ctx, 2480, start + 0.055, 0.22, 0.0020, 'sine', 3060);
  }

  function playSpinSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    const prefs = fortuneSoundPreferences();
    if (!prefs.enabled || prefs.volume <= 0) return;
    try {
      const duration = 3.26;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        const p = index / Math.max(1, data.length - 1);
        const accel = Math.min(1, p / 0.40);
        const plateau = p < 0.76 ? 1 : Math.max(0, (1 - p) / 0.24);
        const texture = 0.035 + accel * 0.085;
        data[index] = (Math.random() * 2 - 1) * texture * plateau;
      }
      const source = ctx.createBufferSource();
      const band = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      band.type = 'bandpass';
      band.Q.value = 0.62;
      band.frequency.setValueAtTime(620, start);
      band.frequency.exponentialRampToValueAtTime(1080, start + 0.28);
      band.frequency.exponentialRampToValueAtTime(3350, start + 1.35);
      band.frequency.setValueAtTime(3650, start + 2.38);
      band.frequency.exponentialRampToValueAtTime(680, start + duration);
      const peak = Math.max(0.0002, 0.0125 * prefs.volume);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.28), start + 0.28);
      gain.gain.exponentialRampToValueAtTime(peak, start + 1.35);
      gain.gain.setValueAtTime(peak, start + 2.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(band).connect(gain).connect(ctx.destination);
      source.start(start);
      source.stop(start + duration + 0.02);
    } catch (_) {}
  }

  function playStopSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    playTone(ctx, 420, start, 0.30, 0.0040, 'sine', 360);
    playTone(ctx, 820, start + 0.04, 0.24, 0.0022, 'sine', 690);
  }

  function playRevealSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    // A single clear wind-chime strike, followed by a restrained crystal tail.
    // Inharmonic spacing keeps it glassy rather than piano-like.
    const chime = [
      [1178, 1.55, 0.0180, 0.000, 'sine'],
      [1664, 1.48, 0.0115, 0.018, 'sine'],
      [2268, 1.34, 0.0072, 0.042, 'triangle'],
      [3080, 1.08, 0.0038, 0.070, 'sine']
    ];
    chime.forEach(([frequency, duration, volume, offset, type]) => {
      playTone(ctx, frequency, start + offset, duration, volume, type);
    });
    playTone(ctx, 590, start + 0.12, 1.30, 0.0040, 'sine', 520);
  }

  function createMarkup() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <dialog class="daily-fortune-dialog" id="daily-fortune-dialog" aria-labelledby="daily-fortune-title">
        <div class="daily-fortune-shell">
          <button class="daily-fortune-close" type="button" data-daily-fortune-close aria-label="오늘의 운세 닫기">×</button>
          <div class="daily-fortune-stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>
          <div class="daily-fortune-copy">
            <p>MAJOR ARCANA · DAILY FORTUNE</p>
            <h2 id="daily-fortune-title">오늘의 운세</h2>
            <span>메이저 아르카나 22장 중 단 한 장.<br>한국 시간 자정이 지나면 다시 뽑을 수 있어요.</span>
          </div>
          <span class="daily-fortune-stage" data-daily-fortune-stage>
            <span class="daily-fortune-orbit" aria-hidden="true"></span>
            <button class="daily-fortune-card" type="button" data-daily-fortune-card aria-label="오늘의 타로 카드 한 장 뽑기">
              <span class="daily-fortune-card-inner">
                <span class="daily-fortune-back" aria-hidden="true"><i>CB</i><b>✦</b><em>DAILY TAROT</em></span>
                <span class="daily-fortune-front" aria-hidden="true">
                  <img data-daily-fortune-image alt="" width="898" height="1488" decoding="async">
                  <span class="daily-fortune-front-frame"></span>
                  <span class="daily-fortune-front-mark" data-daily-fortune-mark></span>
                  <span class="daily-fortune-front-title"><small data-daily-fortune-en></small><strong data-daily-fortune-name></strong></span>
                </span>
              </span>
              <span class="daily-fortune-holo-surface" data-daily-fortune-holo aria-hidden="true">
                <span class="daily-fortune-holo-film"></span>
                <span class="daily-fortune-holo-lens"></span>
                <span class="daily-fortune-holo-crystals">
                  <i></i><i></i><i></i><i></i><i></i><i></i>
                </span>
              </span>
            </button>
          </span>
          <span class="daily-fortune-fx" data-daily-fortune-fx aria-hidden="true"></span>
          <div class="daily-fortune-result" data-daily-fortune-result hidden>
            <div class="daily-fortune-badge">TODAY'S MESSAGE</div>
            <h3 data-daily-fortune-result-title></h3>
            <p class="daily-fortune-keywords" data-daily-fortune-keywords></p>
            <p class="daily-fortune-message" data-daily-fortune-message></p>
            <p class="daily-fortune-caution"><strong>오늘의 포인트</strong><span data-daily-fortune-caution></span></p>
            <small>이 결과는 오늘 하루 동안 저장됩니다 · KST 00:00 갱신</small>
          </div>
        </div>
      </dialog>
      <button class="daily-fortune-launcher" type="button" data-daily-fortune-launcher hidden aria-label="오늘의 운세 열기">
        <span aria-hidden="true"><i>CB</i><b>✦</b></span>
      </button>`;
    document.body.append(...wrapper.children);
  }

  function init() {
    createMarkup();
    const dialog = document.getElementById('daily-fortune-dialog');
    const cardButton = document.querySelector('[data-daily-fortune-card]');
    const stage = document.querySelector('[data-daily-fortune-stage]');
    const holo = document.querySelector('[data-daily-fortune-holo]');
    const fx = document.querySelector('[data-daily-fortune-fx]');
    const closeButton = document.querySelector('[data-daily-fortune-close]');
    const launcher = document.querySelector('[data-daily-fortune-launcher]');
    const result = document.querySelector('[data-daily-fortune-result]');
    if (!dialog || !cardButton || !stage || !holo || !fx || !closeButton || !launcher || !result) return;

    const PRIME_MS = 280;
    const HYPER_START_MS = 1350;
    const DECEL_START_MS = 2450;
    const STOP_CUE_MS = 3130;
    const SPIN_MS = 3250;
    const RESULT_MS = 3900;
    let state = readState();
    let pendingState = null;
    let drawing = false;
    let drawFailsafeTimer = 0;
    let autoOpenTimer = 0;
    let animationRun = 0;
    let hoverAudioCtx = null;
    let lastHoverSoundAt = -Infinity;
    let lastFoilAt = 0;
    let lastFoilX = -1;
    let lastFoilY = -1;
    const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const ensureHoverAudio = () => {
      const prefs = fortuneSoundPreferences();
      if (!prefs.enabled || prefs.volume <= 0) return null;
      if (!hoverAudioCtx || hoverAudioCtx.state === 'closed') hoverAudioCtx = createFortuneAudio();
      try { hoverAudioCtx?.resume?.(); } catch (_) {}
      return hoverAudioCtx;
    };

    const spawnSelectionBurst = (px = 0.5, py = 0.5) => {
      if (reducedMotion()) return;
      const burst = document.createElement('span');
      burst.className = 'daily-fortune-click-burst';
      burst.style.left = (px * 100).toFixed(2) + '%';
      burst.style.top = (py * 100).toFixed(2) + '%';
      stage.style.setProperty('--burst-x', (px * 100).toFixed(2) + '%');
      stage.style.setProperty('--burst-y', (py * 100).toFixed(2) + '%');
      for (let index = 0; index < 10; index += 1) {
        const shard = document.createElement('i');
        const angle = (Math.PI * 2 * index) / 10 + (Math.random() - 0.5) * 0.24;
        const distance = 54 + Math.random() * 52;
        shard.style.setProperty('--burst-dx', (Math.cos(angle) * distance).toFixed(1) + 'px');
        shard.style.setProperty('--burst-dy', (Math.sin(angle) * distance).toFixed(1) + 'px');
        shard.style.setProperty('--burst-rotate', ((angle * 180 / Math.PI) + 42 + Math.random() * 38).toFixed(1) + 'deg');
        shard.style.setProperty('--burst-delay', (Math.random() * 90).toFixed(0) + 'ms');
        burst.appendChild(shard);
      }
      stage.appendChild(burst);
      setTimeout(() => burst.remove(), 980);
    };

    const spawnFoilSparkle = (px, py, force = false) => {
      if (reducedMotion() || drawing) return;
      const now = performance.now();
      const moved = Math.hypot(px - lastFoilX, py - lastFoilY);
      if (!force && now - lastFoilAt < 72 && moved < 0.028) return;
      lastFoilAt = now;
      lastFoilX = px;
      lastFoilY = py;

      const sparkle = document.createElement('span');
      sparkle.className = 'daily-fortune-foil-sparkle';
      sparkle.style.left = (px * 100).toFixed(2) + '%';
      sparkle.style.top = (py * 100).toFixed(2) + '%';
      sparkle.style.setProperty('--sparkle-x', (-8 + Math.random() * 16).toFixed(1) + 'px');
      sparkle.style.setProperty('--sparkle-y', (-8 + Math.random() * 16).toFixed(1) + 'px');
      sparkle.style.setProperty('--sparkle-size', (5 + Math.random() * 6).toFixed(1) + 'px');
      sparkle.style.setProperty('--sparkle-hue', String(Math.round(175 + Math.random() * 115)));
      holo.appendChild(sparkle);
      const sparkles = holo.querySelectorAll('.daily-fortune-foil-sparkle');
      if (sparkles.length > 5) sparkles[0]?.remove();
      setTimeout(() => sparkle.remove(), 420);
    };

    const spawnRevealedFoilBloom = (px = 0.5, py = 0.5) => {
      if (reducedMotion()) return;
      const bloom = document.createElement('span');
      bloom.className = 'daily-fortune-foil-bloom';
      bloom.style.left = (px * 100).toFixed(2) + '%';
      bloom.style.top = (py * 100).toFixed(2) + '%';
      bloom.style.setProperty('--bloom-rotate', (-10 + Math.random() * 20).toFixed(1) + 'deg');

      for (let index = 0; index < 8; index += 1) {
        const sparkle = document.createElement('i');
        const angle = Math.random() * Math.PI * 2;
        const distance = 24 + Math.random() * 92;
        sparkle.style.setProperty('--spark-dx', (Math.cos(angle) * distance).toFixed(1) + 'px');
        sparkle.style.setProperty('--spark-dy', (Math.sin(angle) * distance).toFixed(1) + 'px');
        sparkle.style.setProperty('--spark-size', (3 + Math.random() * 5).toFixed(1) + 'px');
        sparkle.style.setProperty('--spark-delay', Math.round(40 + Math.random() * 180) + 'ms');
        sparkle.style.setProperty('--spark-hue', String(Math.round(175 + Math.random() * 120)));
        bloom.appendChild(sparkle);
      }

      holo.appendChild(bloom);
      setTimeout(() => bloom.remove(), 1120);
    };

    const showLauncher = () => {
      launcher.hidden = false;
      launcher.setAttribute('aria-label', state ? '오늘의 운세 다시 보기' : '오늘의 운세 열기');
    };

    const hideLauncher = () => { launcher.hidden = true; };

    const resetPrism = () => {
      stage.classList.remove('is-prism-active');
      stage.style.setProperty('--tilt-x', '0deg');
      stage.style.setProperty('--tilt-y', '0deg');
      stage.style.setProperty('--glow-x', '50%');
      stage.style.setProperty('--glow-y', '50%');
      stage.style.setProperty('--prism-angle', '0deg');
      lastFoilX = -1;
      lastFoilY = -1;
      holo.querySelectorAll('.daily-fortune-holo-ripple,.daily-fortune-holo-spark').forEach(node => node.remove());
    };

    const spawnBurst = (kind = 'reveal') => {
      if (reducedMotion()) return;
      const stageBox = stage.getBoundingClientRect();
      const fxBox = fx.getBoundingClientRect();
      const originX = stageBox.left - fxBox.left + stageBox.width / 2;
      const originY = stageBox.top - fxBox.top + stageBox.height / 2;
      const count = kind === 'stop' ? 14 : 30;
      const distanceBase = kind === 'stop' ? 70 : 125;

      const ring = document.createElement('i');
      ring.className = 'daily-fortune-ring ' + (kind === 'stop' ? 'is-stop' : 'is-reveal');
      ring.style.left = originX + 'px';
      ring.style.top = originY + 'px';
      fx.appendChild(ring);

      for (let index = 0; index < count; index += 1) {
        const particle = document.createElement('i');
        particle.className = 'daily-fortune-particle ' + (kind === 'stop' ? 'is-stop' : 'is-reveal');
        const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.18;
        const distance = distanceBase * (0.58 + Math.random() * 0.75);
        particle.style.left = originX + 'px';
        particle.style.top = originY + 'px';
        particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
        particle.style.setProperty('--delay', (Math.random() * 90) + 'ms');
        particle.style.setProperty('--particle-scale', String(0.7 + Math.random() * 1.4));
        fx.appendChild(particle);
      }

      setTimeout(() => {
        ring.remove();
        fx.querySelectorAll('.daily-fortune-particle').forEach(node => node.remove());
      }, kind === 'stop' ? 850 : 1450);
    };

    const setCardInteractionLocked = locked => {
      // Never rely on native disabled for the draw lifecycle. A disabled button can
      // survive interrupted/BFCache states and then cannot emit the click needed to recover.
      cardButton.disabled = false;
      cardButton.setAttribute('aria-disabled', locked ? 'true' : 'false');
      cardButton.dataset.drawLocked = locked ? '1' : '0';
    };

    const activeDrawState = () => pendingState || state;

    const fillResult = (targetState = activeDrawState()) => {
      if (!targetState) return false;
      const row = CARDS[targetState.card];
      if (!row) return false;
      const [name, keywords, caution, message] = row;
      const image = document.querySelector('[data-daily-fortune-image]');
      if (image) {
        image.src = artworkUrl(targetState.card);
        image.alt = `메이저 아르카나 ${targetState.card}번 ${name}`;
      }
      document.querySelector('[data-daily-fortune-mark]')?.replaceChildren(document.createTextNode(ROMAN[targetState.card] || ''));
      document.querySelector('[data-daily-fortune-en]')?.replaceChildren(document.createTextNode(EN[targetState.card] || ''));
      document.querySelector('[data-daily-fortune-name]')?.replaceChildren(document.createTextNode(name || ''));
      document.querySelector('[data-daily-fortune-result-title]')?.replaceChildren(document.createTextNode(`${name} · 오늘의 운세`));
      document.querySelector('[data-daily-fortune-keywords]')?.replaceChildren(document.createTextNode(keywords || ''));
      document.querySelector('[data-daily-fortune-message]')?.replaceChildren(document.createTextNode(message || ''));
      document.querySelector('[data-daily-fortune-caution]')?.replaceChildren(document.createTextNode(caution || ''));
      cardButton.setAttribute('aria-label', `오늘의 카드 ${name}`);
      return true;
    };

    const commitPendingState = () => {
      if (!pendingState) return state;
      state = writeState(pendingState.card);
      pendingState = null;
      return state;
    };

    const clearDrawFailsafe = () => {
      if (!drawFailsafeTimer) return;
      clearTimeout(drawFailsafeTimer);
      drawFailsafeTimer = 0;
    };

    const clearSpinClasses = () => {
      stage.classList.remove('is-priming','is-spinning','is-accelerating','is-hyper','is-decelerating');
    };

    const forceCompleteDraw = () => {
      if (!drawing) return;
      animationRun += 1;
      commitPendingState();
      if (!state || !fillResult(state)) {
        pendingState = null;
        drawing = false;
        setCardInteractionLocked(false);
        dialog.classList.remove('has-result','is-bursting','is-spinning','is-revealing');
        clearSpinClasses();
        stage.classList.remove('is-interactive');
        cardButton.classList.remove('is-revealed');
        result.hidden = true;
        cardButton.setAttribute('aria-label','오늘의 타로 카드 한 장 뽑기');
        return;
      }
      clearSpinClasses();
      dialog.classList.remove('is-spinning');
      dialog.classList.add('has-result');
      cardButton.classList.add('is-revealed');
      setCardInteractionLocked(true);
      result.hidden = false;
      stage.classList.add('is-interactive');
      drawing = false;
      clearDrawFailsafe();
    };

    const renderState = (animate = false, audioCtx = null) => {
      animationRun += 1;
      const run = animationRun;
      resetPrism();
      const targetState = activeDrawState();

      if (!targetState) {
        dialog.classList.remove('has-result','is-bursting','is-spinning','is-revealing');
        clearSpinClasses();
        stage.classList.remove('is-interactive');
        cardButton.classList.remove('is-revealed');
        result.hidden = true;
        setCardInteractionLocked(false);
        cardButton.setAttribute('aria-label','오늘의 타로 카드 한 장 뽑기');
        return;
      }

      if (!fillResult(targetState)) throw new Error('daily_fortune_result_render_failed');
      setCardInteractionLocked(true);

      if (!animate || reducedMotion()) {
        if (pendingState) commitPendingState();
        dialog.classList.remove('is-spinning','is-revealing');
        clearSpinClasses();
        cardButton.classList.add('is-revealed');
        result.hidden = false;
        dialog.classList.add('has-result');
        stage.classList.add('is-interactive');
        if (animate && audioCtx) playRevealSound(audioCtx);
        if (animate) drawing = false;
        clearDrawFailsafe();
        if (audioCtx) setTimeout(() => { try { audioCtx.close?.(); } catch (_) {} }, 1200);
        return;
      }

      result.hidden = true;
      dialog.classList.remove('has-result','is-bursting','is-revealing');
      cardButton.classList.remove('is-revealed');
      clearSpinClasses();
      stage.classList.remove('is-interactive');
      stage.classList.add('is-priming');
      dialog.classList.add('is-spinning');
      playSelectionBurstSound(audioCtx);
      playSpinSound(audioCtx);
      try { navigator.vibrate?.([10, 22, 12, 30, 14]); } catch (_) {}

      setTimeout(() => {
        if (run !== animationRun) return;
        stage.classList.remove('is-priming');
        stage.classList.add('is-spinning','is-accelerating');
      }, PRIME_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        stage.classList.remove('is-accelerating');
        stage.classList.add('is-hyper');
      }, HYPER_START_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        stage.classList.remove('is-hyper','is-accelerating');
        stage.classList.add('is-decelerating');
      }, DECEL_START_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        playStopSound(audioCtx);
        spawnBurst('stop');
      }, STOP_CUE_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        commitPendingState();
        clearSpinClasses();
        dialog.classList.remove('is-spinning');
        dialog.classList.add('is-bursting','is-revealing');
        requestAnimationFrame(() => cardButton.classList.add('is-revealed'));
        playRevealSound(audioCtx);
        spawnBurst('reveal');
        try { navigator.vibrate?.([28, 30, 60]); } catch (_) {}
      }, SPIN_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        if (pendingState) commitPendingState();
        result.hidden = false;
        dialog.classList.add('has-result');
        stage.classList.add('is-interactive');
        setCardInteractionLocked(true);
        drawing = false;
        clearDrawFailsafe();
      }, RESULT_MS);

      setTimeout(() => {
        if (run !== animationRun) return;
        dialog.classList.remove('is-bursting','is-revealing');
        try { audioCtx?.close?.(); } catch (_) {}
      }, 4550);
    };

    const recoverIdleState = () => {
      if (drawing) return;
      clearDrawFailsafe();
      pendingState = null;
      state = readState();
      renderState(false);
    };

    const openDialog = () => {
      hideLauncher();
      recoverIdleState();
      if (!dialog.open) dialog.showModal();
    };

    const closeDialog = () => {
      if (dialog.open) dialog.close();
      showLauncher();
    };

    const startDraw = (origin = { px: 0.5, py: 0.5 }) => {
      if (drawing || state) return false;
      // Repair stale native button state immediately before the interaction.
      // Pointer activation below calls this before a browser-generated click, so
      // even an old disabled DOM state cannot swallow the draw action.
      cardButton.disabled = false;
      drawing = true;
      const card = randomInt(CARDS.length);
      pendingState = { date: kstDate(), card, drawnAt: new Date().toISOString() };
      const audioCtx = createFortuneAudio();
      try {
        holo.querySelectorAll('.daily-fortune-foil-sparkle,.daily-fortune-foil-bloom').forEach(node => node.remove());
        spawnSelectionBurst(origin.px, origin.py);
        renderState(true, audioCtx);
        clearDrawFailsafe();
        drawFailsafeTimer = setTimeout(forceCompleteDraw, RESULT_MS + 1200);
        return true;
      } catch (_) {
        pendingState = null;
        drawing = false;
        setCardInteractionLocked(false);
        try { audioCtx?.close?.(); } catch (_) {}
        renderState(false);
        return false;
      }
    };

    cardButton.addEventListener('click', event => {
      // Keyboard / assistive-technology activation fallback.
      // Pointer activation is handled on the stage at pointerup so it does not
      // depend on native button click delivery.
      if (event.detail !== 0) return;
      if (state && cardButton.classList.contains('is-revealed') && !drawing) {
        spawnRevealedFoilBloom(0.5, 0.5);
        return;
      }
      startDraw({ px: 0.5, py: 0.5 });
    });

    stage.addEventListener('pointerdown', () => {
      // The stage still receives pointer input in the stale-state case observed
      // in production, so clear any persisted native disabled flag before release.
      cardButton.disabled = false;
    });

    stage.addEventListener('pointerup', event => {
      if (event.button != null && event.button !== 0) return;
      const point = pointerPosition(event) || { px: 0.5, py: 0.5 };
      updateCrystalPointer(point);
      if (state && cardButton.classList.contains('is-revealed') && !drawing) {
        spawnFoilSparkle(point.px, point.py, true);
        spawnRevealedFoilBloom(point.px, point.py);
        return;
      }
      startDraw(point);
    });

    const pointerPosition = event => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return {
        px: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        py: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      };
    };

    const updateCrystalPointer = ({ px, py }) => {
      const dx = px - 0.5;
      const dy = py - 0.5;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const distance = Math.min(1, Math.hypot(dx, dy) * 1.55);
      stage.style.setProperty('--glow-x', (px * 100).toFixed(1) + '%');
      stage.style.setProperty('--glow-y', (py * 100).toFixed(1) + '%');
      stage.style.setProperty('--prism-angle', angle.toFixed(1) + 'deg');
    };

    stage.addEventListener('pointerenter', event => {
      cardButton.disabled = false;
      if (drawing || event.pointerType === 'touch') return;
      const point = pointerPosition(event);
      if (!point) return;
      updateCrystalPointer(point);
      stage.classList.add('is-prism-active');
      spawnFoilSparkle(point.px, point.py, true);
      if (reducedMotion()) return;
      const now = performance.now();
      if (now - lastHoverSoundAt >= 5000) {
        lastHoverSoundAt = now;
        playMagicRippleSound(ensureHoverAudio());
      }
    });

    stage.addEventListener('pointermove', event => {
      if (drawing || event.pointerType === 'touch') return;
      const point = pointerPosition(event);
      if (!point) return;
      const { px, py } = point;
      updateCrystalPointer({ px, py });
      stage.classList.add('is-prism-active');
      spawnFoilSparkle(px, py);
      if (reducedMotion()) return;
      const revealed = cardButton.classList.contains('is-revealed');
      const tiltX = revealed ? 8 : 6.5;
      const tiltY = revealed ? 10 : 8.5;
      stage.style.setProperty('--tilt-x', ((0.5 - py) * tiltX).toFixed(2) + 'deg');
      stage.style.setProperty('--tilt-y', ((px - 0.5) * tiltY).toFixed(2) + 'deg');
    });
    stage.addEventListener('pointerleave', resetPrism);

    document.addEventListener('pointerdown', () => { ensureHoverAudio(); }, { once: true, capture: true });
    document.addEventListener('keydown', () => { ensureHoverAudio(); }, { once: true, capture: true });

    closeButton.addEventListener('click', closeDialog);
    launcher.addEventListener('click', openDialog);
    document.querySelector('[data-home-overview-fortune]')?.addEventListener('click', event => {
      event.preventDefault();
      openDialog();
    });
    document.addEventListener('chunbong:daily-fortune-open', openDialog);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });

    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      clearDrawFailsafe();
      animationRun += 1;
      drawing = false;
      pendingState = null;
      state = readState();
      renderState(false);
      if (!dialog.open) showLauncher();
    });

    if (state) {
      showLauncher();
    } else {
      renderState(false);
      const openIfIdle = () => {
        autoOpenTimer = 0;
        document.removeEventListener('pointerdown', cancelAutoOpen, true);
        document.removeEventListener('keydown', cancelAutoOpen, true);
        if (!dialog.open) openDialog();
      };
      const cancelAutoOpen = event => {
        if (!autoOpenTimer || dialog.open) return;
        if (event.target?.closest?.('#daily-fortune-dialog,[data-daily-fortune-launcher]')) return;
        clearTimeout(autoOpenTimer);
        autoOpenTimer = 0;
        document.removeEventListener('pointerdown', cancelAutoOpen, true);
        document.removeEventListener('keydown', cancelAutoOpen, true);
        showLauncher();
      };
      if (reducedMotion()) openIfIdle();
      else {
        autoOpenTimer = setTimeout(openIfIdle, 900);
        document.addEventListener('pointerdown', cancelAutoOpen, true);
        document.addEventListener('keydown', cancelAutoOpen, true);
      }
    }
  }

  window.CHUNBONG_DAILY_FORTUNE = { STORAGE_KEY, kstDate, artworkUrl, readState, writeState, cards: CARDS.map(row => row[0]), nativeDisableSafe: true, pointerActivationSafe: true, crystalPointerImmediate: true, clickCrystalBurst: true, progressiveSpin: true, horizontalSpinFx: true, microFoilSurface: true, sparseFoilSparkle: true, revealedFoilBloom: true };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();