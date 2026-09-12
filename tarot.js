const DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;
const READING_CONFIG = typeof module !== 'undefined' && module.exports
  ? require('./tarot-reading-config.js')
  : window.CHUNBONG_TAROT_READING_CONFIG;

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

// Legacy helper retained for old callers and regression compatibility.
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

function buildConfiguredNumberSelections(values, spreadId, randomFn = random01) {
  const positions = READING_CONFIG.spreads[spreadId]?.positions;
  if (!positions) throw new Error('invalid_spread');
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}

function numberInputConstraintState(mode) {
  const isNumberMode = String(mode) === 'number';
  return { disabled: !isNumberMode, required: isNumberMode };
}

function selectionCanComplete(selected, count) {
  return Array.isArray(selected) && selected.length === Number(count);
}

function toggleDirectSelection(selected, card, deckIndex, positions, count, randomFn = random01) {
  const current = Array.isArray(selected) ? selected : [];
  const normalizedIndex = Number(deckIndex);
  const existingIndex = current.findIndex(item => item.deckIndex === normalizedIndex);
  let next;
  if (existingIndex >= 0) {
    next = current.filter((_, index) => index !== existingIndex);
  } else {
    if (!card || current.length >= Number(count)) return current;
    next = [...current, {
      card,
      deckIndex: normalizedIndex,
      orientation: orientationFromRandom(randomFn),
      position: positions[current.length],
      deckNumber: card.deckNumber
    }];
  }
  return next.map((item, index) => ({ ...item, position: positions[index] }));
}

function cardArtworkDescriptor(card) {
  const sheet = Number(card?.imageSheet);
  const slot = Number(card?.imageSlot);
  if (!Number.isInteger(sheet) || sheet < 0 || sheet > 5 || !Number.isInteger(slot) || slot < 0 || slot > 12) return null;
  const globalIndex = sheet * 13 + slot;
  if (globalIndex < 0 || globalIndex > 77) return null;
  const pair = Math.floor(globalIndex / 2);
  const pairSlot = globalIndex % 2;
  return {
    pair,
    pairSlot,
    url: `assets/tarot/hd/pair-${String(pair).padStart(2, '0')}.avif`,
    sourceX: pairSlot === 0 ? 0 : -960
  };
}

function createTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const soundKey = 'chunbongTarotSound';
  const volumeKey = 'chunbongTarotVolume';
  let enabled = true;
  let volume = 0.7;
  try {
    enabled = storage?.getItem?.(soundKey) !== 'off';
    const storedVolume = Number(storage?.getItem?.(volumeKey));
    if (Number.isFinite(storedVolume)) volume = Math.min(1, Math.max(0, storedVolume));
  } catch (_) {}
  let context = null;
  const ensureContext = () => {
    if (!enabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    context.resume?.();
    return context;
  };
  const tone = frequency => {
    if (!enabled || volume <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0001, 0.025 * volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  };
  return {
    enabled: () => enabled,
    volume: () => volume,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) {
      enabled = Boolean(value);
      try { storage?.setItem?.(soundKey, enabled ? 'on' : 'off'); } catch (_) {}
    },
    setVolume(value) {
      const number = Number(value);
      volume = Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0.7;
      try { storage?.setItem?.(volumeKey, String(volume)); } catch (_) {}
    },
    play(name) {
      if (name === 'complete') tone(659);
    }
  };
}

function mappedHintTopic(topicId) {
  if (topicId === 'partner') return 'love';
  if (topicId === 'choice') return 'general';
  return topicId;
}

function buildCardInterpretation(selection, topicId, position) {
  const { card, orientation } = selection;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
  const hintId = mappedHintTopic(topicId);
  const hint = card.topicHints[hintId] || card.topicHints.general;
  return `${position}의 ${card.nameKo} ${direction}. ${meaning} ${hint}`;
}

function buildSummary(selections, topicId, spreadId) {
  if (!selections.length) return '';
  const topic = READING_CONFIG.topics[topicId]?.label || DATA.topics[topicId]?.label || '타로';
  const spread = READING_CONFIG.spreads[spreadId]?.label || DATA.spreads[spreadId]?.label || '리딩';
  const reversedCount = selections.filter(item => item.orientation === 'reversed').length;
  const pace = reversedCount >= Math.ceil(selections.length / 2)
    ? '지금은 속도를 내기보다 막히는 부분을 먼저 정리하는 편이 좋습니다.'
    : '현재 흐름에서 살릴 수 있는 부분을 작은 행동으로 확인해 볼 수 있습니다.';
  return `${topic} · ${spread}입니다. ${pace} 결과는 정답이 아니라 현재 선택에서 확인할 수 있는 하나의 가능성으로 참고해 주세요.`;
}

function buildAiRequestPayload(readingState) {
  return {
    question: readingState.question || '',
    topic: readingState.topic,
    spreadId: readingState.spreadId,
    cards: (readingState.selected || []).map(({ card, orientation, position }) => ({ id: card.id, orientation, position }))
  };
}

const TAROT_API = {
  random01,
  shuffleDeck,
  orientationFromRandom,
  spreadIdForCount,
  validateDeckNumbers,
  buildNumberSelections,
  numberInputConstraintState,
  selectionCanComplete,
  toggleDirectSelection,
  cardArtworkDescriptor,
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
    spreadId: 'single',
    count: 1,
    selectionMode: 'number',
    question: '',
    deck: [],
    selected: [],
    phase: 'setup',
    structuredReading: null,
    readingPromise: null,
    requestVersion: 0
  };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const scrollToElement = element => element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  function spreadForId(spreadId) {
    return READING_CONFIG.spreads[spreadId] || null;
  }

  function renderSpreadChoices(topicId, selectedSpreadId = '') {
    const container = byId('tarot-spread-options');
    if (!container) return;
    const choices = READING_CONFIG.choicesForTopic(topicId);
    const active = choices.some(choice => choice.spreadId === selectedSpreadId) ? selectedSpreadId : choices[0].spreadId;
    container.replaceChildren(...choices.map(choice => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      const span = document.createElement('span');
      input.type = 'radio';
      input.name = 'spread';
      input.value = choice.spreadId;
      input.dataset.count = String(choice.count);
      input.checked = choice.spreadId === active;
      span.textContent = choice.label;
      label.append(input, span);
      return label;
    }));
    const spread = spreadForId(active);
    if (spread) renderNumberInputs(spread.count);
    syncSelectionModeUI();
  }

  function readSetup() {
    const formData = new FormData(byId('tarot-setup'));
    const topic = String(formData.get('topic') || 'general');
    const fallback = READING_CONFIG.choicesForTopic(topic)[0]?.spreadId || 'single';
    const spreadId = String(formData.get('spread') || fallback);
    const spread = spreadForId(spreadId);
    if (!spread || !READING_CONFIG.isSpreadAllowed(topic, spreadId)) throw new Error('invalid_spread');
    return {
      topic,
      spreadId,
      count: spread.count,
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
    const setup = byId('tarot-setup');
    if (!setup) return;
    const mode = String(new FormData(setup).get('selection-mode') || 'number');
    const numberPanel = byId('tarot-number-panel');
    const startButton = byId('tarot-shuffle');
    if (numberPanel) numberPanel.hidden = mode !== 'number';
    const constraints = numberInputConstraintState(mode);
    byId('tarot-number-inputs')?.querySelectorAll('input').forEach(input => {
      input.disabled = constraints.disabled;
      input.required = constraints.required;
    });
    if (startButton) startButton.textContent = mode === 'number' ? '숫자로 카드 열기' : '78장 카드 섞기';
  }

  function renderSelectedSlots() {
    const positions = spreadForId(state.spreadId)?.positions || [];
    const slots = byId('tarot-selected-slots');
    if (!slots) return;
    slots.innerHTML = positions.map((position, index) => `<div class="tarot-selected-slot ${index < state.selected.length ? 'is-filled' : ''}" data-slot-index="${index}">${escapeHtml(position)} · ${index < state.selected.length ? '선택됨' : '대기'}</div>`).join('');
  }

  function syncDeckSelectionState() {
    byId('tarot-deck')?.querySelectorAll('[data-card-index]').forEach(button => {
      const index = Number(button.dataset.cardIndex);
      const selected = state.selected.some(item => item.deckIndex === index);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `뒤집힌 타로 카드 ${index + 1} ${selected ? '선택 취소' : '선택'}`);
    });
  }

  function updateDirectSelectionUI() {
    renderSelectedSlots();
    syncDeckSelectionState();
    const complete = selectionCanComplete(state.selected, state.count);
    const confirm = byId('tarot-confirm-selection');
    if (confirm) {
      confirm.hidden = state.selectionMode !== 'cards' || state.phase !== 'selecting';
      confirm.disabled = !complete;
      confirm.textContent = complete ? '선택 완료 · 카드 펼치기' : `${state.selected.length}/${state.count}장 선택 중`;
    }
    if (state.phase === 'selecting') {
      byId('tarot-selection-status').textContent = complete
        ? `${state.count}/${state.count}장을 골랐습니다. 바꾸려면 선택한 카드를 다시 누른 뒤 선택 완료를 눌러 주세요.`
        : `78장 중 ${state.selected.length}/${state.count}장을 선택했습니다.`;
    }
  }

  function renderDeck() {
    byId('tarot-deck').innerHTML = state.deck.slice(0, 78).map((card, index) => `<button class="tarot-card-back" type="button" data-card-index="${index}" aria-pressed="false" aria-label="뒤집힌 타로 카드 ${index + 1} 선택"><span class="tarot-card-back-number" aria-hidden="true">${index + 1}</span></button>`).join('');
    updateDirectSelectionUI();
  }

  function renderCardSvg(card, filterId) {
    const descriptor = cardArtworkDescriptor(card);
    if (!descriptor) return '<span class="tarot-card-art-missing">카드 이미지를 불러오지 못했습니다.</span>';
    return `<svg class="tarot-card-art-svg" viewBox="0 0 960 1440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><filter id="${filterId}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -0.08 0 -0.08 1.32 -0.08 0 -0.08 0" divisor="1" bias="0" edgeMode="duplicate" preserveAlpha="true"/></filter></defs><image href="${descriptor.url}" x="${descriptor.sourceX}" y="0" width="1920" height="1440" preserveAspectRatio="none" filter="url(#${filterId})"/></svg>`;
  }

  function appendTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(text || '');
    parent.appendChild(element);
    return element;
  }

  function makeInfoCard(title, text, className = '') {
    const article = document.createElement('article');
    article.className = `tarot-glance-card ${className}`.trim();
    appendTextElement(article, 'h3', '', title);
    appendTextElement(article, 'p', '', text);
    return article;
  }

  function renderComparison(comparison, parent) {
    if (!comparison || !parent) return;
    const section = document.createElement('section');
    section.className = `tarot-comparison tarot-comparison-${comparison.type}`;
    appendTextElement(section, 'h3', 'tarot-comparison-title', comparison.type === 'choice' ? 'A / B 비교' : '나와 상대 비교');
    const columns = document.createElement('div');
    columns.className = 'tarot-comparison-columns';
    columns.append(
      makeInfoCard(comparison.leftLabel, comparison.leftSummary, 'tarot-comparison-side'),
      makeInfoCard(comparison.rightLabel, comparison.rightSummary, 'tarot-comparison-side')
    );
    section.appendChild(columns);
    appendTextElement(section, 'p', 'tarot-comparison-verdict', comparison.verdict || comparison.bridge || '');
    parent.appendChild(section);
  }

  function renderGlance(reading) {
    const summary = byId('tarot-summary');
    if (!summary || !reading?.glance) return;
    summary.replaceChildren();
    appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
    if (state.question) appendTextElement(summary, 'p', 'tarot-question-result', `질문 · ${state.question}`);
    const grid = document.createElement('div');
    grid.className = 'tarot-glance-grid';
    grid.append(
      makeInfoCard('핵심 결론', reading.glance.conclusion, 'is-conclusion'),
      makeInfoCard('좋은 흐름', reading.glance.positive, 'is-positive'),
      makeInfoCard('주의할 점', reading.glance.caution, 'is-caution'),
      makeInfoCard('지금 할 일', reading.glance.action, 'is-action')
    );
    summary.appendChild(grid);
    renderComparison(reading.comparison, summary);
  }

  function resetAiPanel() {
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    const content = byId('tarot-ai-content');
    if (!button || !status || !content) return;
    button.hidden = false;
    button.disabled = true;
    button.textContent = '상세 상담 보기';
    status.textContent = '이번 카드 흐름을 질문에 맞춰 정리하고 있어요.';
    content.hidden = true;
    content.replaceChildren();
  }

  async function loadStructuredReading() {
    if (state.structuredReading) return state.structuredReading;
    if (state.readingPromise) return state.readingPromise;
    const version = state.requestVersion;
    state.readingPromise = fetch('/api/tarot-reading', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildAiRequestPayload(state))
    }).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.reading) throw new Error('tarot_reading_failed');
      if (version !== state.requestVersion) return null;
      state.structuredReading = payload.reading;
      renderGlance(payload.reading);
      const button = byId('tarot-ai-button');
      const status = byId('tarot-ai-status');
      if (button) button.disabled = false;
      if (status) status.textContent = '상세 상담을 볼 수 있습니다.';
      return payload.reading;
    }).catch(() => {
      const summary = byId('tarot-summary');
      if (summary) {
        summary.replaceChildren();
        appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
        appendTextElement(summary, 'p', '', buildSummary(state.selected, state.topic, state.spreadId));
      }
      const status = byId('tarot-ai-status');
      if (status) status.textContent = '상세 상담을 불러오지 못했습니다. 기본 카드 해석은 그대로 확인할 수 있습니다.';
      return null;
    }).finally(() => { state.readingPromise = null; });
    return state.readingPromise;
  }

  function renderResults() {
    const grid = byId('tarot-reading-grid');
    grid.dataset.count = String(state.count);
    grid.dataset.spreadKind = READING_CONFIG.topics[state.topic]?.type || 'flow';
    grid.innerHTML = state.selected.map((selection, index) => {
      const reversed = selection.orientation === 'reversed';
      const direction = reversed ? '역방향' : '정방향';
      const meaning = buildCardInterpretation(selection, state.topic, selection.position);
      const artwork = renderCardSvg(selection.card, `tarot-sharp-${index}`);
      return `<article class="tarot-card-result" data-position="${escapeHtml(selection.position)}"><p class="tarot-position">${escapeHtml(selection.position)}</p><button class="tarot-card-art-button" type="button" data-tarot-zoom data-selection-index="${index}" aria-label="${escapeHtml(selection.card.nameKo)} ${direction} 카드 크게 보기"><span class="tarot-card-art ${reversed ? 'is-reversed' : ''}">${artwork}</span><span class="tarot-card-zoom-label" aria-hidden="true">크게 보기</span></button><div class="tarot-card-copy"><small>${direction} · DECK ${selection.deckNumber}</small><h2>${escapeHtml(selection.card.nameKo)}</h2><p>${escapeHtml(meaning)}</p></div></article>`;
    }).join('');
    const summary = byId('tarot-summary');
    summary.replaceChildren();
    appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
    if (state.question) appendTextElement(summary, 'p', 'tarot-question-result', `질문 · ${state.question}`);
    appendTextElement(summary, 'p', 'tarot-reading-loading', '카드 사이의 연결을 정리하고 있어요…');
    resetAiPanel();
    byId('tarot-results').hidden = false;
    scrollToElement(byId('tarot-results'));
    void loadStructuredReading();
  }

  function renderAiReading(reading) {
    const content = byId('tarot-ai-content');
    if (!content || !reading?.detail) return;
    const detail = reading.detail;
    content.replaceChildren();
    appendTextElement(content, 'h3', 'tarot-ai-title', reading.title || '춘봉 타로 상세 상담');
    const sections = [
      ['질문에 대한 답', detail.answer],
      ['카드가 그렇게 말하는 이유', detail.reason]
    ];
    for (const [title, text] of sections) {
      const block = document.createElement('section');
      block.className = 'tarot-detail-section';
      appendTextElement(block, 'h4', '', title);
      appendTextElement(block, 'p', '', text);
      content.appendChild(block);
    }
    if (Array.isArray(detail.keyCards) && detail.keyCards.length) {
      const keySection = document.createElement('section');
      keySection.className = 'tarot-detail-section';
      appendTextElement(keySection, 'h4', '', '핵심 카드');
      const keyGrid = document.createElement('div');
      keyGrid.className = 'tarot-key-card-grid';
      for (const card of detail.keyCards) {
        const article = document.createElement('article');
        article.className = 'tarot-key-card';
        appendTextElement(article, 'span', '', `${card.position} · ${card.name}`);
        appendTextElement(article, 'p', '', card.reading);
        keyGrid.appendChild(article);
      }
      keySection.appendChild(keyGrid);
      content.appendChild(keySection);
    }
    const caution = document.createElement('section');
    caution.className = 'tarot-detail-section is-caution';
    appendTextElement(caution, 'h4', '', '주의해야 할 점');
    appendTextElement(caution, 'p', '', detail.caution);
    content.appendChild(caution);
    const advice = document.createElement('section');
    advice.className = 'tarot-ai-advice';
    appendTextElement(advice, 'h4', '', '지금 해볼 수 있는 것');
    const list = document.createElement('ul');
    for (const item of Array.isArray(detail.actions) ? detail.actions : []) appendTextElement(list, 'li', '', item);
    advice.appendChild(list);
    content.appendChild(advice);
    appendTextElement(content, 'p', 'tarot-ai-summary', `한 줄 정리 · ${detail.oneLine}`);
    content.hidden = false;
  }

  async function requestAiReading() {
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    if (!button) return;
    button.disabled = true;
    button.textContent = '상세 상담 준비 중…';
    const reading = await loadStructuredReading();
    if (!reading) {
      button.disabled = false;
      button.textContent = '다시 시도';
      return;
    }
    renderAiReading(reading);
    if (status) status.textContent = '춘봉 타로 상세 상담이 준비됐습니다.';
    button.hidden = true;
  }

  function closeCardZoom() {
    const dialog = byId('tarot-card-zoom');
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function openCardZoom(trigger) {
    const index = Number(trigger?.dataset.selectionIndex);
    const selection = state.selected[index];
    const dialog = byId('tarot-card-zoom');
    const art = byId('tarot-card-zoom-art');
    const caption = byId('tarot-card-zoom-caption');
    if (!selection || !dialog || !art || !caption) return;
    const reversed = selection.orientation === 'reversed';
    const direction = reversed ? '역방향' : '정방향';
    caption.textContent = `${selection.card.nameKo} · ${direction}`;
    art.innerHTML = `<div class="tarot-card-art ${reversed ? 'is-reversed' : ''}">${renderCardSvg(selection.card, 'tarot-sharp-zoom')}</div>`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function clearResults() {
    state.requestVersion += 1;
    state.structuredReading = null;
    state.readingPromise = null;
    byId('tarot-results').hidden = true;
    byId('tarot-results').classList.remove('is-complete');
    byId('tarot-reading-grid').innerHTML = '';
    byId('tarot-summary').replaceChildren();
    closeCardZoom();
    resetAiPanel();
  }

  function beginReveal() {
    state.phase = 'revealing';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) confirm.hidden = true;
    byId('tarot-selection-status').textContent = '카드를 순서대로 펼치고 있어요.';
    renderResults();
    const cards = [...byId('tarot-reading-grid').querySelectorAll('.tarot-card-result')];
    const step = state.count >= 12 ? 70 : state.count >= 6 ? 90 : 130;
    cards.forEach((card, index) => card.style.setProperty('--reveal-delay', `${index * step}ms`));
    soundController.play('reveal');
    const finish = () => {
      state.phase = 'results';
      byId('tarot-results').classList.add('is-complete');
      byId('tarot-selection-status').textContent = '리딩이 준비됐습니다.';
      soundController.play('complete');
    };
    if (prefersReducedMotion()) finish();
    else setTimeout(finish, Math.min(1500, cards.length * step + 420));
  }

  function startReading() {
    soundController.unlock();
    try { Object.assign(state, readSetup()); }
    catch (_) {
      byId('tarot-number-error').textContent = '리딩 방식을 다시 선택해 주세요.';
      return;
    }
    clearResults();
    byId('tarot-number-error').textContent = '';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) { confirm.hidden = true; confirm.disabled = true; }
    if (state.selectionMode === 'number') {
      const values = [...byId('tarot-number-inputs').querySelectorAll('input')].map(input => input.value);
      try { state.selected = buildConfiguredNumberSelections(values, state.spreadId); }
      catch (error) {
        byId('tarot-number-error').textContent = error.message === 'duplicate_deck_number'
          ? '같은 숫자는 중복해서 사용할 수 없습니다.'
          : `1부터 78 사이의 정수를 ${state.count}개 입력해 주세요.`;
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
    const deck = byId('tarot-deck');
    deck.classList.remove('is-shuffling');
    void deck.offsetWidth;
    deck.classList.add('is-shuffling');
    renderDeck();
    soundController.play('shuffle');
    scrollToElement(byId('tarot-stage'));
  }

  function selectCard(button) {
    if (state.phase !== 'selecting') return;
    soundController.unlock();
    const index = Number(button.dataset.cardIndex);
    const card = state.deck[index];
    if (!card) return;
    const positions = spreadForId(state.spreadId)?.positions || [];
    const previous = state.selected;
    state.selected = toggleDirectSelection(state.selected, card, index, positions, state.count);
    if (state.selected === previous) return;
    soundController.play('select');
    updateDirectSelectionUI();
  }

  function updateSoundToggle() {
    const button = byId('tarot-sound-toggle');
    if (!button) return;
    const enabled = soundController.enabled();
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '효과음 ON' : '효과음 OFF';
  }

  function updateVolumeUI() {
    const percent = Math.round(soundController.volume() * 100);
    const button = byId('tarot-volume-toggle');
    const range = byId('tarot-volume-range');
    const output = byId('tarot-volume-value');
    if (button) button.textContent = `${percent === 0 ? '🔇' : '🔊'} 음량 ${percent}%`;
    if (range) { range.value = String(percent); range.setAttribute('aria-valuetext', `${percent}%`); }
    if (output) output.textContent = `${percent}%`;
  }

  function toggleVolumePanel(force) {
    const button = byId('tarot-volume-toggle');
    const panel = byId('tarot-volume-panel');
    if (!button || !panel) return;
    const expanded = typeof force === 'boolean' ? force : button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
  }

  function resetReading() {
    state.deck = [];
    state.selected = [];
    state.phase = 'setup';
    clearResults();
    byId('tarot-deck').innerHTML = '';
    byId('tarot-selected-slots').innerHTML = '';
    byId('tarot-number-error').textContent = '';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) { confirm.hidden = true; confirm.disabled = true; }
    byId('tarot-selection-status').textContent = '주제와 리딩 방식, 카드 선택 방식을 정해 주세요.';
    scrollToElement(byId('tarot-setup'));
  }

  const setup = byId('tarot-setup');
  if (setup) {
    renderSpreadChoices('general');
    syncSelectionModeUI();
    updateSoundToggle();
    updateVolumeUI();
    setup.addEventListener('change', event => {
      if (event.target.name === 'topic') renderSpreadChoices(event.target.value);
      if (event.target.name === 'spread') {
        const spread = spreadForId(event.target.value);
        if (spread) renderNumberInputs(spread.count);
        syncSelectionModeUI();
      }
      if (event.target.name === 'selection-mode') syncSelectionModeUI();
    });
    setup.addEventListener('submit', event => { event.preventDefault(); startReading(); });
    byId('tarot-deck')?.addEventListener('click', event => {
      const button = event.target.closest('[data-card-index]');
      if (button) selectCard(button);
    });
    byId('tarot-confirm-selection')?.addEventListener('click', () => {
      if (state.phase === 'selecting' && selectionCanComplete(state.selected, state.count)) beginReveal();
    });
    byId('tarot-reading-grid')?.addEventListener('click', event => {
      const trigger = event.target.closest('[data-tarot-zoom]');
      if (trigger) openCardZoom(trigger);
    });
    byId('tarot-card-zoom-close')?.addEventListener('click', closeCardZoom);
    byId('tarot-card-zoom')?.addEventListener('click', event => { if (event.target === byId('tarot-card-zoom')) closeCardZoom(); });
    byId('tarot-sound-toggle')?.addEventListener('click', () => {
      soundController.unlock();
      soundController.setEnabled(!soundController.enabled());
      updateSoundToggle();
    });
    byId('tarot-volume-toggle')?.addEventListener('click', () => toggleVolumePanel());
    byId('tarot-volume-range')?.addEventListener('input', event => {
      soundController.unlock();
      soundController.setVolume(Number(event.target.value) / 100);
      updateVolumeUI();
    });
    byId('tarot-volume-panel')?.addEventListener('keydown', event => {
      if (event.key === 'Escape') { toggleVolumePanel(false); byId('tarot-volume-toggle')?.focus(); }
    });
    byId('tarot-ai-button')?.addEventListener('click', requestAiReading);
    byId('tarot-redraw')?.addEventListener('click', startReading);
    byId('tarot-reset')?.addEventListener('click', resetReading);
  }
}
