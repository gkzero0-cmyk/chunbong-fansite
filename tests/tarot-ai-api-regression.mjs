import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');

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
  topic: 'concern',
  spreadId: 'situationAdviceOutcome',
  cards: [
    { id: 'major-16', orientation: 'upright', position: '상황' },
    { id: 'major-17', orientation: 'upright', position: '조언' },
    { id: 'cups-03', orientation: 'reversed', position: '결과' }
  ]
};
const validSingle = {
  question: '이번 주에 집중하면 좋은 점은?',
  topic: 'daily',
  spreadId: 'single',
  cards: [{ id: 'major-19', orientation: 'upright', position: '메시지' }]
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
  assert.equal(res.payload.model, 'rule-based-v1');
  assert.equal(res.payload.reading.cards.length, 3);
  assert.deepEqual(
    res.payload.reading.cards.map(card => [card.id, card.position]),
    [['major-16', '상황'], ['major-17', '조언'], ['cups-03', '결과']]
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
  assert.ok(res.payload.reading.cards[0].reading.includes('태양'));
  assert.ok(res.payload.reading.summary.length > 10);
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
    topic: 'concern',
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
  body => { body.cards[0].position = '결과'; },
  body => { body.cards[0].orientation = 'sideways'; },
  body => { body.question = '가'.repeat(501); }
]) {
  const bad = structuredClone(validThree);
  mutate(bad);
  const res = makeRes();
  await api.createHandler({ env: {} })(makeReq('POST', bad), res);
  assert.equal(res.statusCode, 400);
}

console.log('free local tarot reading engine regression test passed');
