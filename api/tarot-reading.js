const DATA = require('../tarot-data.js');

const DEFAULT_MODEL = 'gpt-5.6-luna';
const cardById = new Map(DATA.cards.map(card => [card.id, card]));

const READING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'overall', 'cards', 'advice', 'summary'],
  properties: {
    title: { type: 'string' },
    overall: { type: 'string' },
    cards: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'position', 'reading'],
        properties: {
          id: { type: 'string' },
          position: { type: 'string' },
          reading: { type: 'string' }
        }
      }
    },
    advice: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string' }
    },
    summary: { type: 'string' }
  }
};

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

function buildOpenAIRequest(validated, model = DEFAULT_MODEL) {
  const topicLabel = DATA.topics[validated.topic].label;
  const spreadLabel = DATA.spreads[validated.spreadId].label;
  const cardText = validated.cards.map(({ card, orientation, position }) => {
    const direction = orientation === 'upright' ? '정방향' : '역방향';
    const keywords = orientation === 'upright' ? card.keywordsUpright : card.keywordsReversed;
    const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
    return `${position}: ${card.nameKo} ${direction}\n핵심 키워드: ${keywords}\n기본 의미: ${meaning}`;
  }).join('\n\n');

  return {
    model,
    reasoning: { effort: 'low' },
    max_output_tokens: 1200,
    instructions: [
      '당신은 타로를 자기성찰과 선택 점검을 돕는 참고 도구로 해석하는 한국어 상담자입니다.',
      '뽑힌 카드, 정방향·역방향, 스프레드 위치를 모두 구체적으로 연결해 자연스러운 상담형 리딩을 작성하세요.',
      '운명이나 미래를 확정적으로 단언하거나 공포·불안을 조장하지 마세요.',
      '건강, 법률, 투자, 안전 등 고위험 사안은 전문 진단이나 확정적 예측을 하지 말고 실제 확인 가능한 정보와 전문가의 도움을 함께 고려하도록 안내하세요.',
      '질문자에게 실행 가능한 작은 행동이나 점검 포인트를 제안하세요.',
      '타로 결과는 가능성과 관점을 살펴보는 참고용이라는 태도를 유지하세요.'
    ].join(' '),
    input: `주제: ${topicLabel}\n스프레드: ${spreadLabel}\n질문: ${validated.question || '질문 없음'}\n\n카드:\n${cardText}`,
    text: {
      format: {
        type: 'json_schema',
        name: 'tarot_reading',
        strict: true,
        schema: READING_SCHEMA
      }
    }
  };
}

function extractStructuredReading(responseBody) {
  const text = (responseBody?.output || [])
    .flatMap(item => Array.isArray(item?.content) ? item.content : [])
    .find(part => part?.type === 'output_text')?.text;
  if (!text) throw new Error('missing_output_text');
  const reading = JSON.parse(text);
  if (!reading || typeof reading !== 'object' || typeof reading.title !== 'string' ||
      typeof reading.overall !== 'string' || !Array.isArray(reading.cards) ||
      !Array.isArray(reading.advice) || typeof reading.summary !== 'string') {
    throw new Error('invalid_reading_shape');
  }
  return reading;
}

async function callOpenAI(fetchImpl, apiKey, requestBody) {
  return fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
}

function createHandler({ fetchImpl = global.fetch, env = process.env } = {}) {
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

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'ai_not_configured' });
    }

    const model = env.OPENAI_TAROT_MODEL || DEFAULT_MODEL;
    const requestBody = buildOpenAIRequest(validated, model);

    try {
      const response = await callOpenAI(fetchImpl, apiKey, requestBody);
      if (response.status === 429) {
        return res.status(429).json({ error: 'ai_rate_limited' });
      }
      if (!response.ok) {
        return res.status(502).json({ error: 'ai_upstream_failed' });
      }

      const responseBody = await response.json();
      const reading = extractStructuredReading(responseBody);
      return res.status(200).json({ reading, model });
    } catch (_) {
      return res.status(502).json({ error: 'ai_reading_failed' });
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
module.exports.validateReadingRequest = validateReadingRequest;
module.exports.buildOpenAIRequest = buildOpenAIRequest;
module.exports.extractStructuredReading = extractStructuredReading;
module.exports.READING_SCHEMA = READING_SCHEMA;
