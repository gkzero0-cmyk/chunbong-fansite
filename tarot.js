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

function buildCardInterpretation(selection, topicId, position) {
  const { card, orientation } = selection;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
  const hint = card.topicHints[topicId] || card.topicHints.daily;
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
  buildCardInterpretation,
  buildSummary,
  buildAiRequestPayload
};
if (typeof window !== 'undefined') window.CHUNBONG_TAROT = TAROT_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_API;

if (typeof document !== 'undefined') {
  const state = {
    topic: 'daily',
    count: 1,
    spreadId: 'single',
    question: '',
    deck: [],
    selected: [],
    aiSucceeded: false
  };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const scrollToElement = element => element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  function readSetup() {
    const form = byId('tarot-setup');
    const formData = new FormData(form);
    const count = Number(formData.get('count') || 1);
    return {
      topic: String(formData.get('topic') || 'daily'),
      count,
      spreadId: count === 3 ? String(formData.get('spread') || 'pastPresentFuture') : 'single',
      question: byId('tarot-question').value.trim()
    };
  }

  function renderDeck() {
    const visible = state.deck.slice(0, 18);
    byId('tarot-deck').innerHTML = visible.map((card, index) =>
      `<button class="tarot-card-back" type="button" data-card-index="${index}" aria-label="뒤집힌 타로 카드 ${index + 1} 선택"><span>CB</span></button>`
    ).join('');
    byId('tarot-selection-status').textContent = `${state.count}장 중 0장을 선택했습니다.`;
  }

  function resetAiPanel() {
    state.aiSucceeded = false;
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    const content = byId('tarot-ai-content');
    if (!button || !status || !content) return;
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'AI 타로 상담 받기';
    status.textContent = '뽑은 카드와 질문을 바탕으로 조금 더 자세한 상담형 리딩을 받을 수 있습니다.';
    content.hidden = true;
    content.replaceChildren();
  }

  function startReading() {
    Object.assign(state, readSetup());
    state.deck = shuffleDeck(DATA.cards);
    state.selected = [];
    state.aiSucceeded = false;
    byId('tarot-results').hidden = true;
    byId('tarot-reading-grid').innerHTML = '';
    byId('tarot-summary').innerHTML = '';
    resetAiPanel();
    byId('tarot-deck').classList.remove('is-shuffling');
    void byId('tarot-deck').offsetWidth;
    byId('tarot-deck').classList.add('is-shuffling');
    renderDeck();
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
      art.style.backgroundImage = 'url("assets/tarot/hd/cards-atlas.avif")';
      art.style.backgroundSize = '1300% 600%';
      art.style.backgroundPosition = `${(slot / 12) * 100}% ${(sheet / 5) * 100}%`;
    });
  }

  function renderResults() {
    byId('tarot-reading-grid').innerHTML = state.selected.map(selection => {
      const reversed = selection.orientation === 'reversed';
      const direction = reversed ? '역방향' : '정방향';
      const meaning = buildCardInterpretation(selection, state.topic, selection.position);
      return `<article class="tarot-card-result">
        <p class="tarot-position">${escapeHtml(selection.position)}</p>
        <div class="tarot-card-art ${reversed ? 'is-reversed' : ''}" data-sheet="${selection.card.imageSheet}" data-slot="${selection.card.imageSlot}" role="img" aria-label="${escapeHtml(selection.card.nameKo)} ${direction}"><span>카드 이미지를 불러오지 못했습니다.</span></div>
        <div class="tarot-card-copy"><small>${direction}</small><h2>${escapeHtml(selection.card.nameKo)}</h2><p>${escapeHtml(meaning)}</p></div>
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
    if (state.aiSucceeded || state.selected.length !== state.count) return;
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    button.disabled = true;
    button.textContent = '상담 생성 중...';
    status.textContent = '카드를 읽고 있어요...';
    try {
      const response = await fetch('/api/tarot-reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildAiRequestPayload(state))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.reading) {
        const error = new Error('ai_reading_failed');
        error.status = response.status;
        throw error;
      }
      renderAiReading(payload.reading);
      state.aiSucceeded = true;
      status.textContent = 'AI 상담 리딩이 준비됐습니다.';
      button.hidden = true;
    } catch (error) {
      status.textContent = error.status === 503
        ? 'AI 상담 기능의 서버 설정을 준비 중입니다. 기본 해석은 그대로 이용할 수 있습니다.'
        : 'AI 상담을 불러오지 못했습니다. 기본 해석은 그대로 이용할 수 있습니다.';
      button.textContent = '다시 시도';
      button.disabled = false;
    }
  }

  function selectCard(button) {
    if (state.selected.length >= state.count || button.disabled) return;
    const index = Number(button.dataset.cardIndex);
    const card = state.deck[index];
    if (!card) return;
    const positions = DATA.spreads[state.spreadId].positions;
    state.selected.push({ card, orientation: orientationFromRandom(), position: positions[state.selected.length] });
    button.disabled = true;
    button.classList.add('selected');
    byId('tarot-selection-status').textContent = `${state.count}장 중 ${state.selected.length}장을 선택했습니다.`;
    if (state.selected.length === state.count) renderResults();
  }

  function resetReading() {
    state.deck = [];
    state.selected = [];
    state.aiSucceeded = false;
    byId('tarot-deck').innerHTML = '';
    byId('tarot-results').hidden = true;
    resetAiPanel();
    byId('tarot-selection-status').textContent = '주제와 카드 수를 선택한 뒤 카드를 섞어 주세요.';
    scrollToElement(byId('tarot-setup'));
  }

  const setup = byId('tarot-setup');
  if (setup) {
    setup.addEventListener('change', event => {
      if (event.target.name === 'count') byId('tarot-spread-options').hidden = event.target.value !== '3';
    });
    setup.addEventListener('submit', event => {
      event.preventDefault();
      startReading();
    });
    byId('tarot-deck').addEventListener('click', event => {
      const button = event.target.closest('[data-card-index]');
      if (button) selectCard(button);
    });
    byId('tarot-ai-button').addEventListener('click', requestAiReading);
    byId('tarot-redraw').addEventListener('click', startReading);
    byId('tarot-reset').addEventListener('click', resetReading);
  }
}
