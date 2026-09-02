const DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;

function random01() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function shuffleDeck(cards, randomFn = random01) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(randomFn() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function orientationFromRandom(randomFn = random01) {
  return randomFn() < 0.5 ? 'upright' : 'reversed';
}

function spreadIdForCount(count) {
  const map = { 1: 'single', 3: 'threeFlow', 5: 'fiveInsight', 12: 'twelveCompass' };
  const spreadId = map[Number(count)];
  if (!spreadId) throw new Error('invalid_card_count');
  return spreadId;
}

function validateDeckNumbers(values, count) {
  if (!Array.isArray(values) || values.length !== Number(count)) throw new Error('invalid_number_count');
  const numbers = values.map(value => {
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) throw new Error('invalid_deck_number');
    const number = Number(text);
    if (number < 1 || number > 78) throw new Error('invalid_deck_number');
    return number;
  });
  if (new Set(numbers).size !== numbers.length) throw new Error('duplicate_deck_number');
  return numbers;
}

function buildNumberSelections(values, spreadId, randomFn = random01) {
  const positions = DATA.spreads[spreadId]?.positions;
  if (!positions) throw new Error('invalid_spread');
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}

function createTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const key = 'chunbongTarotSound';
  let stored = null;
  try { stored = storage?.getItem?.(key); } catch (_) {}
  let isEnabled = stored !== 'off';
  let context = null;

  const ensureContext = () => {
    if (!isEnabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    if (context.state === 'suspended') context.resume?.();
    return context;
  };

  const tone = (frequency, duration, gain = 0.03, offset = 0) => {
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const start = ctx.currentTime + offset;
    amp.gain.setValueAtTime(Math.max(gain, 0.0001), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  };

  const swish = () => {
    const ctx = ensureContext();
    if (!ctx) return;
    const duration = 0.16;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 0.8;
    amp.gain.setValueAtTime(0.025, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration);
  };

  return {
    enabled: () => isEnabled,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) {
      isEnabled = Boolean(value);
      try { storage?.setItem?.(key, isEnabled ? 'on' : 'off'); } catch (_) {}
    },
    play(name) {
      if (!isEnabled) return;
      try {
        if (name === 'shuffle') swish();
        if (name === 'select') tone(520, 0.08, 0.025);
        if (name === 'reveal') {
          tone(220, 0.18, 0.022);
          tone(740, 0.12, 0.024, 0.08);
        }
        if (name === 'complete') {
          tone(440, 0.12, 0.026);
          tone(554, 0.12, 0.028, 0.11);
          tone(659, 0.16, 0.03, 0.22);
        }
      } catch (_) {}
    }
  };
}

function buildCardInterpretation(selection, topicId, position) {
  const { card, orientation } = selection;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
  const hint = card.topicHints[topicId] || card.topicHints.general;
  return `${position}의 ${card.nameKo} ${direction}. ${meaning} ${hint}`;
}

function buildSummary(selections, topicId, spreadId) {
  if (!selections.length) return '';
  const majorCount = selections.filter(item => item.card.arcana === 'major').length;
  const reversedCount = selections.filter(item => item.orientation === 'reversed').length;
  const finalCard = selections[selections.length - 1].card;
  const topic = DATA.topics[topicId]?.label || '타로';
  const spread = DATA.spreads[spreadId]?.label || '한 장 메시지';
  const scaleText = majorCount >= 2
    ? '큰 방향 전환이나 중요한 선택이 중심에 놓일 가능성이 있습니다.'
    : '일상적인 선택과 태도 조정이 흐름을 바꾸는 열쇠가 될 가능성이 있습니다.';
  const balanceText = reversedCount >= Math.ceil(selections.length / 2)
    ? '지금은 밀어붙이기보다 막힌 지점과 내면의 부담을 먼저 정리하는 편이 좋습니다.'
    : '현재 흐름은 비교적 바깥으로 움직이기 쉬우므로 작은 행동부터 확인해 볼 수 있습니다.';
  return `${topic} · ${spread} 리딩입니다. ${scaleText} ${balanceText} 마지막 카드인 ${finalCard.nameKo}의 메시지를 결론이 아니라 다음 선택을 점검하는 기준으로 활용해 보세요. 결과는 하나의 가능성으로 참고하는 것이 좋습니다.`;
}

function buildAiRequestPayload(readingState) {
  return {
    question: readingState.question || '',
    topic: readingState.topic,
    spreadId: readingState.spreadId,
    cards: (readingState.selected || []).map(({ card, orientation, position }) => ({
      id: card.id,
      orientation,
      position
    }))
  };
}

const TAROT_API = {
  random01,
  shuffleDeck,
  orientationFromRandom,
  spreadIdForCount,
  validateDeckNumbers,
  buildNumberSelections,
  createTarotSoundController,
  buildCardInterpretation,
  buildSummary,
  buildAiRequestPayload
};
if (typeof window !== 'undefined') window.CHUNBONG_TAROT = TAROT_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_API;

if (typeof document !== 'undefined') {
  const soundController = createTarotSoundController();
  const state = {
    topic: 'general',
    count: 1,
    spreadId: 'single',
    selectionMode: 'number',
    question: '',
    deck: [],
    selected: [],
    phase: 'setup',
    readingSucceeded: false,
    soundEnabled: soundController.enabled()
  };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const scrollToElement = element => element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  function readSetup() {
    const formData = new FormData(byId('tarot-setup'));
    const count = Number(formData.get('count') || 1);
    return {
      topic: String(formData.get('topic') || 'general'),
      count,
      spreadId: spreadIdForCount(count),
      selectionMode: String(formData.get('selection-mode') || 'number'),
      question: byId('tarot-question').value.trim()
    };
  }

  function renderNumberInputs(count) {
    const container = byId('tarot-number-inputs');
    if (!container) return;
    container.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '1';
      input.max = '78';
      input.step = '1';
      input.required = true;
      input.placeholder = `${index + 1}번째 번호`;
      input.setAttribute('aria-label', `${index + 1}번째 카드 번호`);
      return input;
    }));
  }

  function syncSelectionModeUI() {
    const mode = String(new FormData(byId('tarot-setup')).get('selection-mode') || 'number');
    const numberPanel = byId('tarot-number-panel');
    const startButton = byId('tarot-shuffle');
    if (numberPanel) numberPanel.hidden = mode !== 'number';
    if (startButton) startButton.textContent = mode === 'number' ? '숫자로 카드 열기' : '78장 카드 섞기';
  }

  function renderSelectedSlots() {
    const positions = DATA.spreads[state.spreadId]?.positions || [];
    const slots = byId('tarot-selected-slots');
    if (!slots) return;
    slots.innerHTML = positions.map((position, index) =>
      `<div class="tarot-selected-slot ${index < state.selected.length ? 'is-filled' : ''}" data-slot-index="${index}">${escapeHtml(position)} · ${index < state.selected.length ? '선택됨' : '대기'}</div>`
    ).join('');
  }

  function renderDeck() {
    const visible = state.deck.slice(0, 78);
    byId('tarot-deck').innerHTML = visible.map((card, index) =>
      `<button class="tarot-card-back" type="button" data-card-index="${index}" aria-label="뒤집힌 타로 카드 ${index + 1} 선택"><span>CB</span></button>`
    ).join('');
    renderSelectedSlots();
    byId('tarot-selection-status').textContent = `78장 중 ${state.selected.length}/${state.count}장을 선택했습니다.`;
  }

  function resetAiPanel() {
    state.readingSucceeded = false;
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    const content = byId('tarot-ai-content');
    if (!button || !status || !content) return;
    button.hidden = false;
    button.disabled = false;
    button.textContent = '무료 자동 타로 상담 받기';
    status.textContent = '뽑은 카드와 질문을 서버 내부 카드 데이터로 조합해 자세한 상담형 리딩을 만들 수 있습니다.';
    content.hidden = true;
    content.replaceChildren();
  }

  function clearResults() {
    byId('tarot-results').hidden = true;
    byId('tarot-results').classList.remove('is-complete');
    byId('tarot-reading-grid').innerHTML = '';
    byId('tarot-summary').innerHTML = '';
    resetAiPanel();
  }

  function startReading() {
    soundController.unlock();
    Object.assign(state, readSetup());
    clearResults();
    byId('tarot-number-error').textContent = '';

    if (state.selectionMode === 'number') {
      const values = [...byId('tarot-number-inputs').querySelectorAll('input')].map(input => input.value);
      try {
        state.selected = buildNumberSelections(values, state.spreadId);
      } catch (error) {
        byId('tarot-number-error').textContent = error.message === 'duplicate_deck_number'
          ? '같은 숫자는 중복해서 사용할 수 없습니다.'
          : '1부터 78 사이의 정수를 필요한 장수만큼 입력해 주세요.';
        state.phase = 'setup';
        return;
      }
      state.deck = [];
      byId('tarot-deck').innerHTML = '';
      byId('tarot-selected-slots').innerHTML = '';
      byId('tarot-selection-status').textContent = '숫자를 확인하고 카드를 펼칩니다.';
      beginReveal();
      return;
    }

    state.deck = shuffleDeck(DATA.cards);
    state.selected = [];
    state.phase = 'selecting';
    byId('tarot-deck').classList.remove('is-shuffling');
    void byId('tarot-deck').offsetWidth;
    byId('tarot-deck').classList.add('is-shuffling');
    renderDeck();
    soundController.play('shuffle');
    scrollToElement(byId('tarot-stage'));
  }

  function applyCardArtwork() {
    byId('tarot-reading-grid').querySelectorAll('[data-sheet]').forEach(art => {
      const sheet = Number(art.dataset.sheet);
      const slot = Number(art.dataset.slot);
      if (!Number.isInteger(sheet) || sheet < 0 || sheet > 5 || !Number.isInteger(slot) || slot < 0 || slot > 12) {
        art.classList.add('is-missing');
        return;
      }
      const globalIndex = sheet * 13 + slot;
      const pair = Math.floor(globalIndex / 2);
      const pairSlot = globalIndex % 2;
      art.style.backgroundImage = `url("assets/tarot/hd/pair-${String(pair).padStart(2, '0')}.avif")`;
      art.style.backgroundSize = '200% 100%';
      art.style.backgroundPosition = pairSlot === 0 ? '0% 0' : '100% 0';
    });
  }

  function renderResults() {
    const grid = byId('tarot-reading-grid');
    grid.dataset.count = String(state.count);
    grid.innerHTML = state.selected.map(selection => {
      const reversed = selection.orientation === 'reversed';
      const direction = reversed ? '역방향' : '정방향';
      const meaning = buildCardInterpretation(selection, state.topic, selection.position);
      return `<article class="tarot-card-result">
        <p class="tarot-position">${escapeHtml(selection.position)}</p>
        <div class="tarot-card-art ${reversed ? 'is-reversed' : ''}" data-sheet="${selection.card.imageSheet}" data-slot="${selection.card.imageSlot}" role="img" aria-label="${escapeHtml(selection.card.nameKo)} ${direction}"><span>카드 이미지를 불러오지 못했습니다.</span></div>
        <div class="tarot-card-copy"><small>${direction} · DECK ${selection.deckNumber}</small><h2>${escapeHtml(selection.card.nameKo)}</h2><p>${escapeHtml(meaning)}</p></div>
      </article>`;
    }).join('');

    const question = state.question
      ? `<p class="tarot-question-result">질문 · ${escapeHtml(state.question)}</p>`
      : '';
    byId('tarot-summary').innerHTML = `<h2>전체 리딩</h2>${question}<p>${escapeHtml(buildSummary(state.selected, state.topic, state.spreadId))}</p>`;
    applyCardArtwork();
    resetAiPanel();
    byId('tarot-results').hidden = false;
    scrollToElement(byId('tarot-results'));
  }

  function beginReveal() {
    state.phase = 'revealing';
    byId('tarot-selection-status').textContent = '카드를 순서대로 펼치고 있어요.';
    renderResults();
    const cards = [...byId('tarot-reading-grid').querySelectorAll('.tarot-card-result')];
    const step = state.count === 12 ? 70 : 130;
    cards.forEach((card, index) => card.style.setProperty('--reveal-delay', `${index * step}ms`));
    soundController.play('reveal');
    const finish = () => {
      state.phase = 'results';
      byId('tarot-results').classList.add('is-complete');
      byId('tarot-selection-status').textContent = '리딩이 준비됐습니다.';
      soundController.play('complete');
    };
    if (prefersReducedMotion()) finish();
    else setTimeout(finish, Math.min(1400, cards.length * step + 420));
  }

  function appendTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(text || '');
    parent.appendChild(element);
    return element;
  }

  function renderAiReading(reading) {
    const content = byId('tarot-ai-content');
    content.replaceChildren();
    appendTextElement(content, 'h3', 'tarot-ai-title', reading.title);
    appendTextElement(content, 'p', 'tarot-ai-overall', reading.overall);
    const cardSection = document.createElement('div');
    cardSection.className = 'tarot-ai-cards';
    for (const card of Array.isArray(reading.cards) ? reading.cards : []) {
      const article = document.createElement('article');
      article.className = 'tarot-ai-card-reading';
      appendTextElement(article, 'span', 'tarot-ai-card-position', card.position);
      appendTextElement(article, 'p', '', card.reading);
      cardSection.appendChild(article);
    }
    content.appendChild(cardSection);
    const advice = document.createElement('div');
    advice.className = 'tarot-ai-advice';
    appendTextElement(advice, 'h4', '', '지금 해볼 수 있는 것');
    const list = document.createElement('ul');
    for (const item of Array.isArray(reading.advice) ? reading.advice : []) appendTextElement(list, 'li', '', item);
    advice.appendChild(list);
    content.appendChild(advice);
    appendTextElement(content, 'p', 'tarot-ai-summary', reading.summary);
    content.hidden = false;
  }

  async function requestAiReading() {
    if (state.readingSucceeded || state.selected.length !== state.count) return;
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    button.disabled = true;
    button.textContent = '상담 생성 중...';
    status.textContent = '카드 데이터를 조합하고 있어요...';
    try {
      const response = await fetch('/api/tarot-reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildAiRequestPayload(state))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.reading) {
        const error = new Error('tarot_reading_failed');
        error.status = response.status;
        throw error;
      }
      renderAiReading(payload.reading);
      state.readingSucceeded = true;
      status.textContent = '자동 상담 리딩이 준비됐습니다.';
      button.hidden = true;
    } catch (_) {
      status.textContent = '자동 상담을 생성하지 못했습니다. 기본 해석은 그대로 이용할 수 있습니다.';
      button.textContent = '다시 시도';
      button.disabled = false;
    }
  }

  function selectCard(button) {
    if (state.phase !== 'selecting' || state.selected.length >= state.count || button.disabled) return;
    soundController.unlock();
    const index = Number(button.dataset.cardIndex);
    const card = state.deck[index];
    if (!card) return;
    const positions = DATA.spreads[state.spreadId].positions;
    state.selected.push({
      card,
      orientation: orientationFromRandom(),
      position: positions[state.selected.length],
      deckNumber: card.deckNumber
    });
    button.disabled = true;
    button.classList.add('selected');
    soundController.play('select');
    renderSelectedSlots();
    byId('tarot-selection-status').textContent = `78장 중 ${state.selected.length}/${state.count}장을 선택했습니다.`;
    if (state.selected.length === state.count) beginReveal();
  }

  function updateSoundToggle() {
    const button = byId('tarot-sound-toggle');
    if (!button) return;
    state.soundEnabled = soundController.enabled();
    button.setAttribute('aria-pressed', String(state.soundEnabled));
    button.textContent = state.soundEnabled ? '효과음 ON' : '효과음 OFF';
  }

  function resetReading() {
    state.deck = [];
    state.selected = [];
    state.phase = 'setup';
    state.readingSucceeded = false;
    byId('tarot-deck').innerHTML = '';
    byId('tarot-selected-slots').innerHTML = '';
    byId('tarot-results').hidden = true;
    byId('tarot-results').classList.remove('is-complete');
    byId('tarot-number-error').textContent = '';
    resetAiPanel();
    byId('tarot-selection-status').textContent = '주제와 카드 수, 선택 방식을 정해 주세요.';
    scrollToElement(byId('tarot-setup'));
  }

  const setup = byId('tarot-setup');
  if (setup) {
    renderNumberInputs(1);
    syncSelectionModeUI();
    updateSoundToggle();
    setup.addEventListener('change', event => {
      if (event.target.name === 'count') renderNumberInputs(Number(event.target.value));
      if (event.target.name === 'selection-mode') syncSelectionModeUI();
    });
    setup.addEventListener('submit', event => {
      event.preventDefault();
      startReading();
    });
    byId('tarot-deck').addEventListener('click', event => {
      const button = event.target.closest('[data-card-index]');
      if (button) selectCard(button);
    });
    byId('tarot-sound-toggle').addEventListener('click', () => {
      soundController.unlock();
      soundController.setEnabled(!soundController.enabled());
      updateSoundToggle();
    });
    byId('tarot-ai-button').addEventListener('click', requestAiReading);
    byId('tarot-redraw').addEventListener('click', startReading);
    byId('tarot-reset').addEventListener('click', resetReading);
  }
}