const DATA = require('../tarot-data.js');
const CONFIG = require('../tarot-reading-config.js');

const LOCAL_MODEL = 'rule-based-v2';
const LOCAL_PROVIDER = 'local-tarot-engine';
const cardById = new Map(DATA.cards.map(card => [card.id, card]));
const LEGACY_SPREADS = new Set(['single', 'threeFlow', 'fiveInsight', 'twelveCompass']);

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function normalizeBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_) { throw httpError('invalid_json', 400); }
  }
  throw httpError('invalid_body', 400);
}

function topicDefinition(topic) {
  return CONFIG.topics[topic] || DATA.topics[topic] || null;
}

function spreadDefinition(spreadId) {
  return CONFIG.spreads[spreadId] || DATA.spreads[spreadId] || null;
}

function spreadAllowedForTopic(topic, spreadId) {
  if (CONFIG.topics[topic]) {
    if (CONFIG.isSpreadAllowed(topic, spreadId)) return true;
    if (DATA.topics[topic] && LEGACY_SPREADS.has(spreadId)) return true;
    return false;
  }
  return Boolean(DATA.topics[topic] && LEGACY_SPREADS.has(spreadId));
}

function validateReadingRequest(rawBody) {
  const body = normalizeBody(rawBody);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length > 500) throw httpError('question_too_long', 400);

  const topic = String(body.topic || '');
  const spreadId = String(body.spreadId || '');
  const topicDef = topicDefinition(topic);
  const spread = spreadDefinition(spreadId);
  if (!topicDef || !spread) throw httpError('invalid_reading', 400);
  if (!spreadAllowedForTopic(topic, spreadId)) throw httpError('invalid_spread_for_topic', 400);

  const cards = Array.isArray(body.cards) ? body.cards : [];
  const positions = spread.positions;
  if (cards.length !== positions.length) throw httpError('invalid_card_count', 400);

  const seen = new Set();
  const validatedCards = cards.map((item, index) => {
    const id = String(item?.id || '');
    const card = cardById.get(id);
    if (!card || seen.has(id)) throw httpError('invalid_card', 400);
    seen.add(id);

    const orientation = String(item?.orientation || '');
    if (!['upright', 'reversed'].includes(orientation)) throw httpError('invalid_orientation', 400);
    if (item?.position !== positions[index]) throw httpError('invalid_position', 400);
    return { card, orientation, position: positions[index] };
  });

  return { question, topic, spreadId, spread, topicDef, cards: validatedCards };
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(values, seed) {
  return values[Math.abs(seed) % values.length];
}

function directionLabel(orientation) {
  return orientation === 'upright' ? '정방향' : '역방향';
}

function cardMeaning(card, orientation) {
  return orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
}

function cardKeywords(card, orientation) {
  return orientation === 'upright' ? card.keywordsUpright : card.keywordsReversed;
}

function hintTopic(topic) {
  if (topic === 'partner') return 'love';
  if (topic === 'choice') return 'general';
  return topic;
}

function topicHint(card, topic) {
  const id = hintTopic(topic);
  return card.topicHints?.[id] || card.topicHints?.general || '';
}

function stripMeaningLead(card, orientation) {
  const raw = cardMeaning(card, orientation);
  const marker = orientation === 'upright' ? '정방향은 ' : '역방향은 ';
  const at = raw.indexOf(marker);
  return at >= 0 ? raw.slice(at + marker.length) : raw;
}

function roleSentence(position, topic) {
  if (/장애물|위험|단점|불안|문제|약점|피해야/.test(position)) return '이 자리는 겁을 주는 결과라기보다 미리 조절할 부분을 알려주는 자리로 보는 편이 좋습니다.';
  if (/조언|해야 할|필요한 노력|핵심 메시지/.test(position)) return '생각으로만 두기보다 현실에서 확인할 수 있는 작은 행동으로 옮기는 것이 포인트입니다.';
  if (/결과|최종|앞으로|미래|흐름/.test(position)) return '확정된 미래라기보다 지금의 선택이 이어질 때 나타나기 쉬운 방향으로 읽어 주세요.';
  if (topic === 'partner' || topic === 'love' || topic === 'relations' || topic === 'crew') return '말보다 실제 태도와 주고받는 균형을 함께 확인하면 이 카드의 의미가 더 선명해집니다.';
  return '현재 상황에서 실제로 조절할 수 있는 부분에 초점을 맞추면 카드의 메시지를 활용하기 쉽습니다.';
}

function buildCardReading(item, topic, index, seed) {
  const { card, orientation, position } = item;
  const direction = directionLabel(orientation);
  const meaning = stripMeaningLead(card, orientation);
  const open = pick([
    `${position}에서 ${card.nameKo} ${direction}은 ${meaning}`,
    `${card.nameKo} ${direction}이 ${position}에 나온 흐름은 ${meaning}`,
    `${position}의 핵심은 ${card.nameKo} ${direction}입니다. ${meaning}`
  ], seed + index);
  return `${open} ${roleSentence(position, topic)}`.replace(/\s+/g, ' ').trim();
}

function summarizeDistribution(cards) {
  const majorCount = cards.filter(item => item.card.arcana === 'major').length;
  const reversedCount = cards.filter(item => item.orientation === 'reversed').length;
  const suits = new Map();
  for (const item of cards) {
    if (!item.card.suit) continue;
    suits.set(item.card.suit, (suits.get(item.card.suit) || 0) + 1);
  }
  const dominantSuit = [...suits.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  return { majorCount, reversedCount, dominantSuit };
}

function cardLabel(item) {
  return `${item.card.nameKo} ${directionLabel(item.orientation)}`;
}

function firstMatching(cards, pattern, fallbackIndex = 0) {
  return cards.find(item => pattern.test(item.position)) || cards[fallbackIndex] || cards[0];
}

function buildConclusion(validated, seed) {
  const cards = validated.cards;
  const final = firstMatching(cards, /최종|결과|앞으로|미래|흐름/, cards.length - 1);
  const core = firstMatching(cards, /핵심|현재/, Math.min(1, cards.length - 1));
  const topic = topicDefinition(validated.topic)?.label || '이번 질문';
  const questionLead = validated.question ? `“${validated.question}”에 대해 카드 흐름을 먼저 한마디로 정리하면, ` : '';
  const direction = final.orientation === 'upright'
    ? `${final.card.nameKo}의 흐름처럼 움직일 여지가 살아 있습니다.`
    : `${final.card.nameKo}이 보여주는 막힘을 먼저 정리해야 다음 흐름이 편해집니다.`;
  const bridge = pick([
    `${core.card.nameKo}이 보여주는 현재 상태를 무시하지 않는 것이 중요합니다.`,
    `지금은 결과를 서두르기보다 ${core.card.nameKo}이 가리키는 핵심부터 정리하는 편이 좋습니다.`,
    `${core.card.nameKo}의 메시지를 기준으로 우선순위를 하나 정하면 판단이 훨씬 쉬워집니다.`
  ], seed);
  return `${questionLead}${topic}에서는 ${direction} ${bridge}`;
}

function buildPositive(validated) {
  const good = validated.cards.filter(item => item.orientation === 'upright' && !/장애물|위험|단점|약점|불안|문제/.test(item.position));
  const picks = (good.length ? good : validated.cards).slice(0, 2);
  const names = picks.map(cardLabel).join('과 ');
  return `${names}에서 살릴 수 있는 힘이 보입니다. 이미 되는 부분을 크게 바꾸기보다 이 강점을 실제 선택과 행동에 연결할수록 흐름이 안정됩니다.`;
}

function buildCaution(validated) {
  const caution = validated.cards.find(item => item.orientation === 'reversed' || /장애물|위험|단점|약점|불안|문제/.test(item.position));
  if (!caution) return '큰 경고가 두드러지기보다는 좋은 흐름을 과하게 밀어붙이지 않는 것이 중요합니다. 속도보다 확인 가능한 단계와 균형을 지켜 주세요.';
  return `${caution.position}의 ${cardLabel(caution)}은 특히 점검할 부분입니다. 실패를 뜻한다기보다 과속, 오해, 누락처럼 미리 조절하면 줄일 수 있는 변수로 받아들이는 편이 좋습니다.`;
}

function buildAction(validated) {
  const action = firstMatching(validated.cards, /조언|해야 할|필요한 노력|핵심 메시지|최종 방향/, validated.cards.length - 1);
  const keyword = cardKeywords(action.card, action.orientation).split(',')[0].trim();
  return `${action.position}의 ${action.card.nameKo}을 행동 기준으로 삼아 보세요. 오늘 바로 확인할 수 있는 일 중 “${keyword}”과 연결되는 한 가지를 정하고, 그 결과를 본 뒤 다음 선택을 이어가는 방식이 좋습니다.`;
}

function buildGlance(validated, seed) {
  return {
    conclusion: buildConclusion(validated, seed),
    positive: buildPositive(validated),
    caution: buildCaution(validated),
    action: buildAction(validated)
  };
}

function summarizeGroup(items, label) {
  if (!items.length) return `${label} 쪽은 별도 카드가 없어 전체 흐름 안에서 함께 보는 편이 좋습니다.`;
  const first = items[0];
  const last = items[items.length - 1];
  const reversed = items.filter(item => item.orientation === 'reversed').length;
  const tone = reversed > items.length / 2 ? '조심스럽게 속도를 맞추는 흐름' : '움직일 여지가 비교적 살아 있는 흐름';
  return `${label} 쪽은 ${cardLabel(first)}에서 ${cardLabel(last)}로 이어지며 ${tone}입니다. 각 카드의 장점과 부담을 따로 보기보다 서로 연결해서 보는 것이 좋습니다.`;
}

function buildComparison(validated) {
  const type = CONFIG.topics[validated.topic]?.type;
  if (type === 'choice') {
    const a = validated.cards.filter(item => /^A\s*·/.test(item.position));
    const b = validated.cards.filter(item => /^B\s*·/.test(item.position));
    const final = firstMatching(validated.cards, /최종 방향|더 맞는 방향|조언/, validated.cards.length - 1);
    return {
      type: 'choice', leftLabel: 'A', rightLabel: 'B',
      leftSummary: summarizeGroup(a, 'A'),
      rightSummary: summarizeGroup(b, 'B'),
      verdict: `${a.length && b.length ? 'A와 B는 장단점의 결이 다릅니다. ' : ''}${final.position}의 ${cardLabel(final)}을 기준으로 보면 어느 쪽이 무조건 정답이라기보다 지금 감당하기 쉬운 조건과 우선순위를 먼저 고르는 것이 핵심입니다.`
    };
  }
  if (type === 'relationship') {
    const rightLabel = validated.topic === 'crew' ? '상대·크루' : '상대';
    const mine = validated.cards.filter(item => /^나\s*·/.test(item.position));
    const other = validated.cards.filter(item => /^상대\s*·/.test(item.position) || /^상대·크루\s*·/.test(item.position));
    if (!mine.length || !other.length) return null;
    const bridge = firstMatching(validated.cards, /관계|협업|핵심|앞으로/, validated.cards.length - 1);
    return {
      type: 'relationship', leftLabel: '나', rightLabel,
      leftSummary: summarizeGroup(mine, '나'),
      rightSummary: summarizeGroup(other, rightLabel),
      bridge: `${bridge.position}의 ${cardLabel(bridge)}이 두 쪽을 연결하는 핵심입니다. 누가 맞는지를 가르기보다 마음과 행동의 차이가 어디에서 생기는지 확인해 보세요.`
    };
  }
  return null;
}

function chooseKeyCards(validated, readings) {
  const indexes = [];
  validated.cards.forEach((item, index) => { if (item.card.arcana === 'major' && indexes.length < 2) indexes.push(index); });
  for (const pattern of [/핵심|현재/, /조언|해야 할|필요한 노력/, /최종|결과|앞으로|흐름/]) {
    const index = validated.cards.findIndex(item => pattern.test(item.position));
    if (index >= 0 && !indexes.includes(index)) indexes.push(index);
  }
  if (!indexes.length) indexes.push(0);
  if (indexes.length === 1 && validated.cards.length > 1) indexes.push(validated.cards.length - 1);
  return indexes.slice(0, 4).map(index => ({
    id: validated.cards[index].card.id,
    name: validated.cards[index].card.nameKo,
    position: validated.cards[index].position,
    reading: readings[index].reading
  }));
}

function containsHighRiskQuestion(question) {
  return /(병원|의사|의료|건강|증상|약|수술|임신|법률|소송|변호사|고소|투자|주식|코인|대출|빚|안전|사고|자해|죽고|죽음)/i.test(question || '');
}

function buildAdvice(validated, glance) {
  const actions = [
    glance.action,
    '카드에서 좋게 보이는 부분과 주의할 부분을 각각 하나씩 적은 뒤, 실제 상황에서 확인 가능한 사실과 비교해 보세요.'
  ];
  if (validated.cards.some(item => item.orientation === 'reversed')) actions.push('역방향 카드는 나쁜 결말이 아니라 조정 신호로 보고, 서두르기보다 막히는 이유를 먼저 확인해 보세요.');
  if (containsHighRiskQuestion(validated.question)) actions.push('건강·의료·법률·투자·안전처럼 영향이 큰 문제는 타로만으로 결정하지 말고 실제 정보와 관련 전문가의 판단을 함께 확인하세요.');
  return actions.slice(0, 4);
}

function buildDetail(validated, glance, readings, comparison) {
  const keyCards = chooseKeyCards(validated, readings);
  const stats = summarizeDistribution(validated.cards);
  const reasonParts = [
    `${keyCards.map(item => `${item.position}의 ${item.name}`).join(', ')}가 이번 리딩의 중심을 잡고 있습니다.`
  ];
  if (stats.majorCount) reasonParts.push(`메이저 아르카나가 ${stats.majorCount}장이라 단순한 기분보다 방향과 선택의 의미가 조금 더 크게 보입니다.`);
  if (comparison?.type === 'choice') reasonParts.push('A와 B를 같은 기준으로 나눠 보았기 때문에 결과보다 각 선택이 요구하는 조건의 차이를 비교하는 것이 중요합니다.');
  if (comparison?.type === 'relationship') reasonParts.push('나와 상대를 나눠 읽었기 때문에 감정 자체보다 마음·행동·기대가 서로 어디에서 어긋나는지 보는 것이 핵심입니다.');
  const actions = buildAdvice(validated, glance);
  return {
    answer: glance.conclusion,
    reason: reasonParts.join(' '),
    keyCards,
    caution: glance.caution,
    actions,
    oneLine: `${topicDefinition(validated.topic)?.label || '이번 리딩'}에서는 ${glance.action.replace(/오늘 바로.*$/, '지금 할 수 있는 한 가지부터 확인해 보는 것이 좋습니다.')}`
  };
}

function buildOverall(validated, glance, comparison) {
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  const question = validated.question ? `질문 “${validated.question}”을 기준으로 보면, ` : '';
  const compareText = comparison?.type === 'choice' ? ` ${comparison.verdict}` : comparison?.type === 'relationship' ? ` ${comparison.bridge}` : '';
  return `${spreadLabel}입니다. ${question}${glance.conclusion} ${glance.positive} ${glance.caution}${compareText}`.replace(/\s+/g, ' ').trim();
}

function buildSummary(validated, glance) {
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  return `${spreadLabel}의 한 줄 정리입니다. ${glance.action} 결과를 정답으로 고정하기보다 실제 상황을 확인하는 다음 기준으로 활용해 보세요.`;
}

function generateLocalReading(validated) {
  const seed = stableHash([
    validated.question, validated.topic, validated.spreadId,
    ...validated.cards.map(({ card, orientation, position }) => `${card.id}:${orientation}:${position}`)
  ].join('|'));
  const cards = validated.cards.map((item, index) => ({
    id: item.card.id,
    name: item.card.nameKo,
    orientation: item.orientation,
    position: item.position,
    reading: buildCardReading(item, validated.topic, index, seed)
  }));
  const glance = buildGlance(validated, seed);
  const comparison = buildComparison(validated);
  const detail = buildDetail(validated, glance, cards, comparison);
  const topicLabel = topicDefinition(validated.topic)?.label || '타로';
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  return {
    engine: 'topic-structured-v3',
    title: `${topicLabel} · ${spreadLabel}`,
    glance,
    comparison,
    overall: buildOverall(validated, glance, comparison),
    cards,
    advice: detail.actions,
    detail,
    summary: buildSummary(validated, glance)
  };
}

function createHandler() {
  return async function tarotReadingHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    let validated;
    try { validated = validateReadingRequest(req.body); }
    catch (error) { return res.status(error.statusCode || 400).json({ error: error.message || 'invalid_request' }); }
    try {
      return res.status(200).json({ reading: generateLocalReading(validated), model: LOCAL_MODEL, provider: LOCAL_PROVIDER });
    } catch (_) {
      return res.status(500).json({ error: 'local_reading_failed' });
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
module.exports.validateReadingRequest = validateReadingRequest;
module.exports.generateLocalReading = generateLocalReading;
module.exports.buildCardReading = buildCardReading;
module.exports.LOCAL_MODEL = LOCAL_MODEL;
module.exports.LOCAL_PROVIDER = LOCAL_PROVIDER;
