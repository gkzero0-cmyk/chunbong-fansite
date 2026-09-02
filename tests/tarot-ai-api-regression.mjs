import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');
const data = require('../tarot-data.js');

function makeReq(method, body) {
  return { method, body, headers: { 'content-type': 'application/json' } };
}
function makeRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

const validThree = {
  question: '지금 준비 중인 일을 계속해도 괜찮을까?',
  topic: 'general',
  spreadId: 'threeFlow',
  cards: [
    { id: 'major-16', orientation: 'upright', position: '과거·배경' },
    { id: 'major-17', orientation: 'upright', position: '현재·핵심' },
    { id: 'cups-03', orientation: 'reversed', position: '앞으로의 흐름' }
  ]
};
const validSingle = {
  question: '이번 주에 집중하면 좋은 점은?',
  topic: 'general',
  spreadId: 'single',
  cards: [{ id: 'major-19', orientation: 'upright', position: '핵심 메시지' }]
};
const validTwelve = {
  question: '앞으로의 방송과 콘텐츠 방향을 점검해줘',
  topic: 'direction',
  spreadId: 'twelveCompass',
  cards: data.cards.slice(0, 12).map((card, index) => ({
    id: card.id,
    orientation: index % 2 ? 'reversed' : 'upright',
    position: data.spreads.twelveCompass.positions[index]
  }))
};

{
  const res = makeRes();
  await api.createHandler({
    fetchImpl: async () => { throw new Error('local engine must not fetch'); },
    getOidcToken: async () => { throw new Error('local engine must not load OIDC'); },
    env: {}
  })(makeReq('POST', validThree), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.provider, 'local-tarot-engine');
  assert.equal(res.payload.model, 'rule-based-v2');
  assert.equal(res.payload.reading.cards.length, 3);
  assert.deepEqual(
    res.payload.reading.cards.map(card => [card.id, card.position]),
    [['major-16', '과거·배경'], ['major-17', '현재·핵심'], ['cups-03', '앞으로의 흐름']]
  );
  assert.ok(res.payload.reading.cards[0].reading.includes('탑'));
  assert.ok(res.payload.reading.cards[0].reading.includes('정방향'));
  assert.ok(res.payload.reading.cards[2].reading.includes('역방향'));
  assert.ok(res.payload.reading.overall.includes(validThree.question));
  assert.ok(res.payload.reading.advice.length >= 2);
}

{
  let fetchCalls = 0;
  let oidcCalls = 0;
  const res = makeRes();
  await api.createHandler({
    env: { OPENAI_API_KEY: 'unused', AI_GATEWAY_API_KEY: 'unused', VERCEL_OIDC_TOKEN: 'unused' },
    fetchImpl: async () => { fetchCalls += 1; throw new Error('must not fetch'); },
    getOidcToken: async () => { oidcCalls += 1; return 'unused'; }
  })(makeReq('POST', validSingle), res);

  assert.equal(res.statusCode, 200);
  assert.equal(fetchCalls, 0);
  assert.equal(oidcCalls, 0);
  assert.equal(res.payload.provider, 'local-tarot-engine');
  assert.equal(res.payload.model, 'rule-based-v2');
  assert.ok(res.payload.reading.cards[0].reading.includes('태양'));
  assert.ok(res.payload.reading.summary.length > 10);
}

{
  const res = makeRes();
  await api.createHandler({ env: {} })(makeReq('POST', validTwelve), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.provider, 'local-tarot-engine');
  assert.equal(res.payload.model, 'rule-based-v2');
  assert.equal(res.payload.reading.cards.length, 12);
  assert.ok(res.payload.reading.overall.includes('12장'));
  assert.ok(res.payload.reading.summary.includes('12장'));
}

{
  const a = makeRes();
  const b = makeRes();
  await api.createHandler({ env: {} })(makeReq('POST', validSingle), a);
  await api.createHandler({ env: {} })(makeReq('POST', { ...validSingle, question: '이번 주에 피해야 할 점은?' }), b);
  assert.notEqual(a.payload.reading.overall, b.payload.reading.overall);
}

{
  const res = makeRes();
  await api.createHandler({ env: {} })(makeReq('POST', {
    ...validSingle,
    question: '건강이 안 좋은데 병원에 가야 할까?'
  }), res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.reading.advice.some(item => item.includes('전문가') || item.includes('의료')));
}

{
  const res = makeRes();
  await api.createHandler({ env: {} })(makeReq('GET', validThree), res);
  assert.equal(res.statusCode, 405);
}

for (const mutate of [
  body => { body.cards[0].id = 'not-a-card'; },
  body => { body.cards[1].id = body.cards[0].id; },
  body => { body.cards[0].position = '앞으로의 흐름'; },
  body => { body.cards[0].orientation = 'sideways'; },
  body => { body.question = '가'.repeat(501); }
]) {
  const bad = structuredClone(validThree);
  mutate(bad);
  const res = makeRes();
  await api.createHandler({ env: {} })(makeReq('POST', bad), res);
  assert.equal(res.statusCode, 400);
}

console.log('free local tarot rule-based-v2 engine regression test passed');
