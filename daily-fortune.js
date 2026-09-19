const DAILY_TAROT_DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;

const DAILY_TAROT_STORAGE_KEY = 'chunbongDailyTarotFortuneV1';
const DAILY_TAROT_SOUND_KEY = 'chunbongDailyTarotSoundV1';
const DAILY_TAROT_SESSION_KEY = 'chunbongDailyTarotAutoOpenV1';
const DAILY_TAROT_MAJOR_COUNT = 22;
const DAILY_TAROT_CLOUDINARY_BASE = 'https://res.cloudinary.com/lyppgyei/image/upload';
const DAILY_TAROT_CARD_WIDTH = 898;
const DAILY_TAROT_CARD_HEIGHT = 1488;
const DAILY_TAROT_SHEET_COUNT = 13;

function kstDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function millisecondsUntilNextKstMidnight(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
  const nextMidnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day + 1) - (9 * 60 * 60 * 1000);
  return Math.max(1000, nextMidnightUtc - date.getTime());
}

function secureRandom01(cryptoObject = globalThis.crypto) {
  if (cryptoObject?.getRandomValues) {
    const value = new Uint32Array(1);
    cryptoObject.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function dailyCardCropUrl(cardIndex) {
  const index = Number(cardIndex);
  if (!Number.isInteger(index) || index < 0 || index >= DAILY_TAROT_MAJOR_COUNT) return '';
  const sheet = Math.floor(index / DAILY_TAROT_SHEET_COUNT);
  const slot = index % DAILY_TAROT_SHEET_COUNT;
  const cropX = slot * DAILY_TAROT_CARD_WIDTH;
  return `${DAILY_TAROT_CLOUDINARY_BASE}/c_crop,g_north_west,h_${DAILY_TAROT_CARD_HEIGHT},w_${DAILY_TAROT_CARD_WIDTH},x_${cropX},y_0/q_100/f_avif/chunbong-fansite/tarot-original/sheet-${sheet}.avif`;
}

function chooseDailyFortune(cards = DAILY_TAROT_DATA?.cards || [], randomFn = secureRandom01) {
  const majors = cards.filter(card => card?.arcana === 'major').slice(0, DAILY_TAROT_MAJOR_COUNT);
  if (majors.length !== DAILY_TAROT_MAJOR_COUNT) throw new Error('major_arcana_unavailable');
  const cardPosition = Math.min(majors.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, Number(randomFn()))) * majors.length));
  const card = majors[cardPosition];
  const cardIndex = cards.indexOf(card);
  const orientation = Number(randomFn()) < 0.5 ? 'upright' : 'reversed';
  return { cardIndex, orientation };
}

function normalizeStoredFortune(value, dateKey, cards = DAILY_TAROT_DATA?.cards || []) {
  if (!value || typeof value !== 'object' || value.dateKey !== dateKey) return null;
  const cardIndex = Number(value.cardIndex);
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= DAILY_TAROT_MAJOR_COUNT) return null;
  const card = cards[cardIndex];
  if (!card || card.arcana !== 'major') return null;
  const orientation = value.orientation === 'reversed' ? 'reversed' : value.orientation === 'upright' ? 'upright' : null;
  if (!orientation) return null;
  return {
    dateKey,
    cardIndex,
    orientation,
    drawnAt: Number(value.drawnAt) || 0
  };
}

function loadDailyFortune(storage, dateKey = kstDateKey(), cards = DAILY_TAROT_DATA?.cards || []) {
  try {
    const raw = storage?.getItem?.(DAILY_TAROT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeStoredFortune(JSON.parse(raw), dateKey, cards);
  } catch (_) {
    return null;
  }
}

function saveDailyFortune(storage, value) {
  try {
    storage?.setItem?.(DAILY_TAROT_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

function buildDailyReading(card, orientation) {
  const reversed = orientation === 'reversed';
  const direction = reversed ? '역방향' : '정방향';
  const keywords = reversed ? card.keywordsReversed : card.keywordsUpright;
  const meaning = reversed ? card.meaningReversed : card.meaningUpright;
  const hint = card.topicHints?.general || '';
  const lead = String(keywords || '').split(',')[0].trim();
  const advice = reversed
    ? `오늘은 ${lead || '멈춰 보는 것'}을 신호로 삼아 서두르기보다 한 번 더 확인해 보세요. 작은 정리가 내일의 흐름을 가볍게 만듭니다.`
    : `오늘은 ${lead || '좋은 흐름'}을 살릴 수 있는 작은 행동 하나를 직접 해보세요. 완벽한 계획보다 가벼운 첫걸음이 잘 맞는 날입니다.`;
  return {
    direction,
    keywords,
    meaning,
    hint,
    advice,
    title: `오늘의 카드 · ${card.nameKo}`
  };
}

const DAILY_TAROT_API = {
  STORAGE_KEY: DAILY_TAROT_STORAGE_KEY,
  SOUND_KEY: DAILY_TAROT_SOUND_KEY,
  SESSION_KEY: DAILY_TAROT_SESSION_KEY,
  MAJOR_COUNT: DAILY_TAROT_MAJOR_COUNT,
  kstDateKey,
  millisecondsUntilNextKstMidnight,
  secureRandom01,
  dailyCardCropUrl,
  chooseDailyFortune,
  normalizeStoredFortune,
  loadDailyFortune,
  saveDailyFortune,
  buildDailyReading
};

if (typeof window !== 'undefined') window.ChunbongDailyFortune = DAILY_TAROT_API;
if (typeof module !== 'undefined' && module.exports) module.exports = DAILY_TAROT_API;

if (typeof document !== 'undefined') {
  const cards = DAILY_TAROT_DATA?.cards || [];
  const majorCards = cards.filter(card => card?.arcana === 'major').slice(0, DAILY_TAROT_MAJOR_COUNT);
  const dialog = document.getElementById('daily-fortune-dialog');
  const openButton = document.getElementById('daily-fortune-open');
  const closeButton = document.querySelector('[data-daily-fortune-close]');
  const cardButton = document.getElementById('daily-fortune-card');
  const cardImage = document.getElementById('daily-fortune-card-image');
  const cardName = document.getElementById('daily-fortune-card-name');
  const directionBadge = document.getElementById('daily-fortune-direction');
  const result = document.getElementById('daily-fortune-result');
  const keywords = document.getElementById('daily-fortune-keywords');
  const meaning = document.getElementById('daily-fortune-meaning');
  const advice = document.getElementById('daily-fortune-advice');
  const status = document.getElementById('daily-fortune-status');
  const dateLabel = document.getElementById('daily-fortune-date');
  const stage = document.querySelector('.daily-fortune-stage');
  const burst = document.getElementById('daily-fortune-burst');
  const soundToggle = document.getElementById('daily-fortune-sound');
  let todayKey = kstDateKey();
  let current = loadDailyFortune(window.localStorage, todayKey, cards);
  let revealing = false;
  let midnightTimer = null;

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  function soundEnabled() {
    try { return window.localStorage.getItem(DAILY_TAROT_SOUND_KEY) !== 'off'; }
    catch (_) { return true; }
  }

  function setSoundEnabled(enabled) {
    try { window.localStorage.setItem(DAILY_TAROT_SOUND_KEY, enabled ? 'on' : 'off'); } catch (_) {}
    syncSoundToggle();
  }

  function syncSoundToggle() {
    if (!soundToggle) return;
    const enabled = soundEnabled();
    soundToggle.textContent = enabled ? '효과음 ON' : '효과음 OFF';
    soundToggle.setAttribute('aria-pressed', String(enabled));
  }

  function playRevealSound() {
    if (!soundEnabled()) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      const context = new AudioContextCtor();
      context.resume?.();
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.34, now + 0.035);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.75);
      master.connect(context.destination);

      [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index < 3 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.015, now + index * 0.07 + 0.5);
        gain.gain.setValueAtTime(0.0001, now + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(index < 3 ? 0.16 : 0.09, now + index * 0.07 + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.9);
        oscillator.connect(gain).connect(master);
        oscillator.start(now + index * 0.07);
        oscillator.stop(now + index * 0.07 + 1);
      });

      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.75), context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / channel.length, 2.4);
      }
      const shimmer = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const shimmerGain = context.createGain();
      shimmer.buffer = buffer;
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      shimmerGain.gain.setValueAtTime(0.06, now + 0.2);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      shimmer.connect(filter).connect(shimmerGain).connect(master);
      shimmer.start(now + 0.2);
      setTimeout(() => { try { context.close(); } catch (_) {} }, 2200);
    } catch (_) {}
  }

  function makeBurst() {
    if (!burst || prefersReducedMotion()) return;
    burst.replaceChildren();
    for (let index = 0; index < 30; index += 1) {
      const particle = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const distance = 95 + Math.random() * 155;
      particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--delay', `${Math.random() * 160}ms`);
      particle.style.setProperty('--spin', `${Math.round(Math.random() * 540 - 270)}deg`);
      particle.className = index % 4 === 0 ? 'is-star' : '';
      burst.appendChild(particle);
    }
    burst.classList.remove('is-active');
    requestAnimationFrame(() => burst.classList.add('is-active'));
    setTimeout(() => burst.classList.remove('is-active'), 1700);
  }

  function formatKstLabel(dateKey) {
    const [year, month, day] = String(dateKey).split('-');
    return `${year}.${month}.${day} · KST 00:00 갱신`;
  }

  function updateTrigger(record = current) {
    if (!openButton) return;
    if (!record) {
      openButton.innerHTML = '<span aria-hidden="true">✦</span> 오늘의 운세';
      openButton.removeAttribute('data-drawn');
      return;
    }
    const card = cards[record.cardIndex];
    openButton.innerHTML = `<span aria-hidden="true">✦</span> 오늘의 운세 · ${card?.nameKo || '확인'}`;
    openButton.dataset.drawn = 'true';
  }

  function applyRecord(record, animate = false) {
    const card = cards[record.cardIndex];
    if (!card) return;
    const reading = buildDailyReading(card, record.orientation);
    current = record;
    if (cardImage) {
      cardImage.src = dailyCardCropUrl(record.cardIndex);
      cardImage.alt = `${card.nameKo} 타로 카드`;
      cardImage.classList.toggle('is-reversed', record.orientation === 'reversed');
    }
    if (cardName) cardName.textContent = card.nameKo;
    if (directionBadge) {
      directionBadge.textContent = reading.direction;
      directionBadge.dataset.direction = record.orientation;
    }
    if (keywords) keywords.textContent = reading.keywords;
    if (meaning) meaning.textContent = reading.meaning;
    if (advice) advice.textContent = reading.advice;
    if (dateLabel) dateLabel.textContent = formatKstLabel(record.dateKey);
    if (result) result.hidden = true;
    cardButton?.classList.remove('is-revealed', 'is-locked', 'is-revealing');

    const finish = () => {
      cardButton?.classList.add('is-revealed', 'is-locked');
      cardButton?.classList.remove('is-revealing');
      if (cardButton) {
        cardButton.disabled = true;
        cardButton.setAttribute('aria-label', `오늘의 카드 ${card.nameKo} ${reading.direction}. 내일 0시에 새 카드를 뽑을 수 있습니다.`);
      }
      if (result) result.hidden = false;
      if (status) status.textContent = '오늘의 카드는 정해졌어요. 다음 카드는 KST 자정 이후에 만날 수 있습니다.';
      stage?.classList.remove('is-celebrating');
      updateTrigger(record);
    };

    if (animate && !prefersReducedMotion()) {
      revealing = true;
      if (status) status.textContent = '카드가 당신의 오늘을 비추고 있어요…';
      cardButton?.classList.add('is-revealing');
      stage?.classList.add('is-celebrating');
      requestAnimationFrame(() => cardButton?.classList.add('is-revealed'));
      makeBurst();
      playRevealSound();
      setTimeout(() => {
        revealing = false;
        finish();
      }, 1280);
    } else {
      finish();
    }
  }

  function resetForNewDay() {
    todayKey = kstDateKey();
    current = null;
    revealing = false;
    try { window.localStorage.removeItem(DAILY_TAROT_STORAGE_KEY); } catch (_) {}
    cardButton?.classList.remove('is-revealed', 'is-locked', 'is-revealing');
    if (cardButton) {
      cardButton.disabled = false;
      cardButton.setAttribute('aria-label', '뒤집힌 오늘의 타로 카드 선택');
    }
    if (cardImage) {
      cardImage.removeAttribute('src');
      cardImage.alt = '';
      cardImage.classList.remove('is-reversed');
    }
    if (result) result.hidden = true;
    if (status) status.textContent = '카드를 눌러 오늘의 메시지를 확인해 보세요.';
    if (dateLabel) dateLabel.textContent = formatKstLabel(todayKey);
    updateTrigger(null);
    scheduleMidnightReset();
  }

  function scheduleMidnightReset() {
    if (midnightTimer) clearTimeout(midnightTimer);
    midnightTimer = setTimeout(() => {
      const nextKey = kstDateKey();
      if (nextKey !== todayKey) resetForNewDay();
      else scheduleMidnightReset();
    }, millisecondsUntilNextKstMidnight() + 1200);
  }

  function drawToday() {
    if (revealing) return;
    const existing = loadDailyFortune(window.localStorage, todayKey, cards);
    if (existing) {
      applyRecord(existing, false);
      return;
    }
    if (majorCards.length !== DAILY_TAROT_MAJOR_COUNT) {
      if (status) status.textContent = '카드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return;
    }
    const picked = chooseDailyFortune(cards, secureRandom01);
    const record = {
      dateKey: todayKey,
      cardIndex: picked.cardIndex,
      orientation: picked.orientation,
      drawnAt: Date.now()
    };
    saveDailyFortune(window.localStorage, record);
    applyRecord(record, true);
  }

  function openDialog() {
    if (!dialog) return;
    if (dialog.showModal) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    if (current) applyRecord(current, false);
    else cardButton?.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!dialog) return;
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }

  function init() {
    if (!dialog || !cardButton || !openButton || majorCards.length !== DAILY_TAROT_MAJOR_COUNT) return;
    syncSoundToggle();
    if (dateLabel) dateLabel.textContent = formatKstLabel(todayKey);
    if (current) applyRecord(current, false);
    else resetForNewDay();

    openButton.addEventListener('click', openDialog);
    closeButton?.addEventListener('click', closeDialog);
    cardButton.addEventListener('click', drawToday);
    soundToggle?.addEventListener('click', () => setSoundEnabled(!soundEnabled()));
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });

    if (!current) {
      let alreadyOpened = false;
      try { alreadyOpened = window.sessionStorage.getItem(DAILY_TAROT_SESSION_KEY) === todayKey; } catch (_) {}
      if (!alreadyOpened) {
        try { window.sessionStorage.setItem(DAILY_TAROT_SESSION_KEY, todayKey); } catch (_) {}
        setTimeout(openDialog, prefersReducedMotion() ? 80 : 650);
      }
    }
    scheduleMidnightReset();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}
