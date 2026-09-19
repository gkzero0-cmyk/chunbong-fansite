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

  function createFortuneAudio() {
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) return null;
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
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, frequency), start);
      if (endFrequency > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.025, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (_) {}
  }

  function playSpinSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, start);
      osc.frequency.exponentialRampToValueAtTime(720, start + 1.25);
      osc.frequency.exponentialRampToValueAtTime(150, start + 2.08);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, start);
      filter.frequency.exponentialRampToValueAtTime(2800, start + 1.25);
      filter.frequency.exponentialRampToValueAtTime(520, start + 2.08);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.018, start + 0.12);
      gain.gain.setValueAtTime(0.018, start + 1.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.12);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 2.15);
    } catch (_) {}

    let tickAt = 0.05;
    for (let index = 0; index < 18; index += 1) {
      const progress = index / 17;
      const interval = 0.07 + progress * progress * 0.085;
      playTone(ctx, 780 - progress * 260, start + tickAt, 0.045 + progress * 0.02, 0.015, 'triangle');
      tickAt += interval;
    }
  }

  function playStopSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    playTone(ctx, 160, start, 0.28, 0.065, 'sine', 72);
    playTone(ctx, 520, start + 0.03, 0.18, 0.035, 'triangle', 260);
    playTone(ctx, 1040, start + 0.08, 0.13, 0.022, 'sine', 720);
  }

  function playRevealSound(ctx) {
    if (!ctx) return;
    const start = ctx.currentTime;
    const tones = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    tones.forEach((frequency, index) => {
      playTone(ctx, frequency, start + index * 0.052, 0.5 + index * 0.025, index < 2 ? 0.034 : 0.026, index < 2 ? 'sine' : 'triangle');
    });
    playTone(ctx, 1568, start + 0.24, 0.72, 0.018, 'sine', 2093);
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
    const closeButton = document.querySelector('[data-daily-fortune-close]');
    const launcher = document.querySelector('[data-daily-fortune-launcher]');
    const result = document.querySelector('[data-daily-fortune-result]');
    if (!dialog || !cardButton || !closeButton || !launcher || !result) return;

    let state = readState();
    let drawing = false;
    let autoOpenTimer = 0;
    const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const showLauncher = () => {
      launcher.hidden = false;
      launcher.setAttribute('aria-label', state ? '오늘의 운세 다시 보기' : '오늘의 운세 열기');
    };

    const hideLauncher = () => { launcher.hidden = true; };

    const renderState = (animate = false) => {
      if (!state) {
        dialog.classList.remove('has-result','is-bursting');
        cardButton.classList.remove('is-revealed');
        result.hidden = true;
        cardButton.disabled = false;
        cardButton.setAttribute('aria-label','오늘의 타로 카드 한 장 뽑기');
        return;
      }
      const [name, keywords, caution, message] = CARDS[state.card];
      const image = document.querySelector('[data-daily-fortune-image]');
      image.src = artworkUrl(state.card);
      image.alt = `메이저 아르카나 ${state.card}번 ${name}`;
      document.querySelector('[data-daily-fortune-mark]').textContent = ROMAN[state.card];
      document.querySelector('[data-daily-fortune-en]').textContent = EN[state.card];
      document.querySelector('[data-daily-fortune-name]').textContent = name;
      document.querySelector('[data-daily-fortune-result-title]').textContent = `${name} · 오늘의 운세`;
      document.querySelector('[data-daily-fortune-keywords]').textContent = keywords;
      document.querySelector('[data-daily-fortune-message]').textContent = message;
      document.querySelector('[data-daily-fortune-caution]').textContent = caution;
      cardButton.disabled = true;
      cardButton.setAttribute('aria-label',`오늘의 카드 ${name}`);
      if (animate && !reducedMotion()) {
        dialog.classList.add('is-bursting');
        requestAnimationFrame(() => cardButton.classList.add('is-revealed'));
        setTimeout(() => {
          result.hidden = false;
          dialog.classList.add('has-result');
        }, 720);
        setTimeout(() => dialog.classList.remove('is-bursting'), 1900);
      } else {
        cardButton.classList.add('is-revealed');
        result.hidden = false;
        dialog.classList.add('has-result');
      }
    };

    const openDialog = () => {
      hideLauncher();
      renderState(false);
      if (!dialog.open) dialog.showModal();
    };

    const closeDialog = () => {
      if (dialog.open) dialog.close();
      showLauncher();
    };

    cardButton.addEventListener('click', () => {
      if (state || drawing) return;
      drawing = true;
      const card = randomInt(CARDS.length);
      state = writeState(card);
      playRevealSound();
      try { navigator.vibrate?.([20, 25, 45]); } catch (_) {}
      renderState(true);
      setTimeout(() => { drawing = false; }, reducedMotion() ? 0 : 900);
    });

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

  window.CHUNBONG_DAILY_FORTUNE = { STORAGE_KEY, kstDate, artworkUrl, readState, writeState, cards: CARDS.map(row => row[0]) };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();