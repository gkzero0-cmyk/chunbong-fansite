const DATA = require('../tarot-data.js');

const LOCAL_MODEL = 'rule-based-v1';
const LOCAL_PROVIDER = 'local-tarot-engine';
const cardById = new Map(DATA.cards.map(card => [card.id, card]));

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

function validateReadingRequest(rawBody) {
  const body = normalizeBody(rawBody);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length > 500) throw httpError('question_too_long', 400);

  const topic = String(body.topic || '');
  const spreadId = String(body.spreadId || '');
  if (!DATA.topics[topic] || !DATA.spreads[spreadId]) throw httpError('invalid_reading', 400);

  const cards = Array.isArray(body.cards) ? body.cards : [];
  const positions = DATA.spreads[spreadId].positions;
  if (![1, 3].includes(cards.length) || positions.length !== cards.length) {
    throw httpError('invalid_card_count', 400);
  }

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

  return { question, topic, spreadId, cards: validatedCards };
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
  return values[seed % values.length];
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

function topicHint(card, topic) {
  return card.topicHints?.[topic] || '';
}

function containsHighRiskQuestion(question) {
  return /(병원|의사|의료|건강|증상|약|수술|임신|법률|소송|변호사|고소|투자|주식|코인|대출|빚|안전|사고|자해|죽고|죽음)/i.test(question || '');
}

function buildCardReading(item, topic, index, seed) {
  const { card, orientation, position } = item;
  const direction = directionLabel(orientation);
  const meaning = cardMeaning(card, orientation);
  const hint = topicHint(card, topic);
  const keyword = cardKeywords(card, orientation);
  const lead = pick([
    `${position} 자리의 ${card.nameKo} ${direction}은`,
    `${card.nameKo} ${direction}이 ${position} 자리에 나온 것은`,
    `${position} 흐름에서 보이는 ${card.nameKo} ${direction}은`
  ], seed + index);

  return `${lead} ${meaning} 핵심 키워드는 ${keyword}입니다. ${hint}`.trim();
}

function buildOverall(validated, seed) {
  const topicLabel = DATA.topics[validated.topic].label;
  const spreadLabel = DATA.spreads[validated.spreadId].label;
  const names = validated.cards.map(({ card, orientation }) => `${card.nameKo} ${directionLabel(orientation)}`).join(', ');
  const questionContext = validated.question
    ? `“${validated.question}”라는 질문을 기준으로 보면, `
    : '';
  const reversedCount = validated.cards.filter(card => card.orientation === 'reversed').length;
  const pace = reversedCount === 0
    ? '현재 흐름을 활용해 작게라도 행동으로 옮기는 쪽에 무게가 실립니다.'
    : reversedCount === validated.cards.length
      ? '지금은 속도를 내기보다 막히는 지점과 우선순위를 다시 점검하는 편이 좋습니다.'
      : '밀어붙일 부분과 조절할 부분을 나눠 보는 균형이 중요합니다.';
  const bridge = pick([
    '카드들은 한 가지 결론을 단정하기보다 현재 선택의 장단점을 함께 살펴보라고 말합니다.',
    '전체적으로는 가능성과 주의점을 함께 보고 현실적인 다음 행동을 고르는 흐름입니다.',
    '이번 배열은 결과를 예언하기보다 지금 조절할 수 있는 부분에 초점을 맞추는 편이 유리하다고 보여줍니다.'
  ], seed);

  return `${questionContext}${topicLabel}의 ${spreadLabel}에서 ${names} 카드가 나왔습니다. ${bridge} ${pace}`;
}

function buildAdvice(validated, seed) {
  const advice = [];
  const first = validated.cards[0];
  const primaryKeywords = cardKeywords(first.card, first.orientation).split(',').map(value => value.trim()).filter(Boolean);
  const mainKeyword = primaryKeywords[seed % Math.max(primaryKeywords.length, 1)] || first.card.nameKo;

  advice.push(`${mainKeyword}을 기준으로 지금 바로 확인할 수 있는 작은 행동 한 가지를 정해 보세요.`);

  if (validated.cards.some(card => card.orientation === 'reversed')) {
    advice.push('역방향 카드는 실패를 뜻하기보다 과속, 누락, 감정 소모처럼 조정할 지점을 먼저 확인하라는 신호로 받아들이세요.');
  } else {
    advice.push('흐름이 좋게 보여도 한 번에 크게 결정하기보다 확인 가능한 단계부터 실행해 보세요.');
  }

  if (validated.cards.length === 3) {
    const last = validated.cards[2];
    advice.push(`${last.position} 카드인 ${last.card.nameKo}의 메시지를 최종 확정이 아니라 다음 선택 전에 확인할 체크포인트로 활용해 보세요.`);
  }

  if (containsHighRiskQuestion(validated.question)) {
    advice.push('건강·의료·법률·투자·안전처럼 결과의 영향이 큰 문제는 타로만으로 결정하지 말고 실제 정보와 관련 전문가의 판단을 함께 확인하세요.');
  }

  return advice.slice(0, 4);
}

function buildSummary(validated, seed) {
  const first = validated.cards[0];
  const last = validated.cards[validated.cards.length - 1];
  const verb = pick(['점검해 보세요', '정리해 보세요', '작은 행동으로 옮겨 보세요'], seed + 7);

  if (validated.cards.length === 1) {
    return `${first.card.nameKo} ${directionLabel(first.orientation)}의 메시지처럼 ${cardKeywords(first.card, first.orientation)}을 현실적인 기준으로 삼아 ${verb}.`;
  }

  return `${first.position}의 ${first.card.nameKo}에서 시작해 ${last.position}의 ${last.card.nameKo}까지 이어지는 흐름을 보며, 지금 바꿀 수 있는 한 가지를 골라 ${verb}.`;
}

function generateLocalReading(validated) {
  const topicLabel = DATA.topics[validated.topic].label;
  const spreadLabel = DATA.spreads[validated.spreadId].label;
  const seed = stableHash([
    validated.question,
    validated.topic,
    validated.spreadId,
    ...validated.cards.map(({ card, orientation, position }) => `${card.id}:${orientation}:${position}`)
  ].join('|'));

  return {
    title: `${topicLabel} · ${spreadLabel}`,
    overall: buildOverall(validated, seed),
    cards: validated.cards.map((item, index) => ({
      id: item.card.id,
      position: item.position,
      reading: buildCardReading(item, validated.topic, index, seed)
    })),
    advice: buildAdvice(validated, seed),
    summary: buildSummary(validated, seed)
  };
}

function createHandler() {
  return async function tarotReadingHandler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    let validated;
    try {
      validated = validateReadingRequest(req.body);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: 'invalid_request' });
    }

    try {
      const reading = generateLocalReading(validated);
      return res.status(200).json({
        reading,
        model: LOCAL_MODEL,
        provider: LOCAL_PROVIDER
      });
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
module.exports.LOCAL_MODEL = LOCAL_MODEL;
module.exports.LOCAL_PROVIDER = LOCAL_PROVIDER;
