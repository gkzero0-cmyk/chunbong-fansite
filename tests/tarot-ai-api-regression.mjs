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
function response(status, body) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
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
const reading = {
  title: '이번 카드가 보여주는 흐름',
  overall: '밝은 흐름을 현실적인 행동으로 이어가 보세요.',
  cards: [{ id: 'major-19', position: '메시지', reading: '태양은 명확함과 활력을 보여줍니다.' }],
  advice: ['이번 주 우선순위를 하나 정해 보세요.', '확인 가능한 작은 행동부터 시작하세요.'],
  summary: '명확한 목표를 작은 행동으로 옮겨 보세요.'
};
const successBody = { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reading) }] }] };

{
  const res = makeRes();
  await api.createHandler({ env: {}, getOidcToken: async () => undefined, fetchImpl: async () => { throw new Error('must not call'); } })(makeReq('POST', validThree), res);
  assert.equal(res.statusCode, 503);
}
{
  const res = makeRes();
  await api.createHandler({ env: { OPENAI_API_KEY: 'test' }, fetchImpl: async () => { throw new Error('must not call'); } })(makeReq('GET', validThree), res);
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
  await api.createHandler({ env: { VERCEL_OIDC_TOKEN: 'oidc-test' }, fetchImpl: async () => { throw new Error('must not call'); } })(makeReq('POST', bad), res);
  assert.equal(res.statusCode, 400);
}
{
  const res = makeRes();
  await api.createHandler({ env: { VERCEL_OIDC_TOKEN: 'oidc-test' }, fetchImpl: async () => response(429, { error: { message: 'rate limited' } }) })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, 429);
}
for (const [upstreamStatus, expectedStatus, expectedError] of [
  [400, 502, 'ai_request_rejected'],
  [401, 502, 'ai_auth_failed'],
  [403, 502, 'ai_access_denied'],
  [404, 502, 'ai_model_unavailable'],
  [500, 502, 'ai_upstream_failed']
]) {
  const res = makeRes();
  await api.createHandler({
    env: { VERCEL_OIDC_TOKEN: 'oidc-test' },
    fetchImpl: async () => response(upstreamStatus, { error: { message: 'safe test failure' } })
  })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, expectedStatus);
  assert.equal(res.payload.error, expectedError);
  assert.equal(res.payload.upstream_status, upstreamStatus);
}
{
  const res = makeRes();
  await api.createHandler({ env: { VERCEL_OIDC_TOKEN: 'oidc-test' }, fetchImpl: async () => response(200, { output: [] }) })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, 502);
}
{
  let requestUrl;
  let requestBody;
  let authorization;
  const fetchImpl = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    authorization = options.headers.authorization;
    return response(200, successBody);
  };
  const res = makeRes();
  await api.createHandler({ env: { VERCEL_OIDC_TOKEN: 'oidc-test' }, fetchImpl })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.reading, reading);
  assert.equal(res.payload.model, 'openai/gpt-5.6-sol');
  assert.equal(requestUrl, 'https://ai-gateway.vercel.sh/v1/responses');
  assert.equal(authorization, 'Bearer oidc-test');
  assert.equal(requestBody.model, 'openai/gpt-5.6-sol');
  assert.equal(requestBody.reasoning.effort, 'low');
  assert.equal(requestBody.text.format.type, 'json_schema');
  assert.equal(requestBody.text.format.strict, true);
  assert.ok(requestBody.instructions.includes('자기성찰'));
  assert.ok(requestBody.input.includes('태양'));
}
{
  let requestUrl;
  let requestBody;
  let authorization;
  let oidcCalls = 0;
  const fetchImpl = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    authorization = options.headers.authorization;
    return response(200, successBody);
  };
  const res = makeRes();
  await api.createHandler({
    env: {},
    getOidcToken: async () => {
      oidcCalls += 1;
      return 'runtime-oidc-test';
    },
    fetchImpl
  })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, 200);
  assert.equal(oidcCalls, 1);
  assert.equal(requestUrl, 'https://ai-gateway.vercel.sh/v1/responses');
  assert.equal(authorization, 'Bearer runtime-oidc-test');
  assert.equal(requestBody.model, 'openai/gpt-5.6-sol');
  assert.equal(res.payload.provider, 'vercel-ai-gateway');
}
{
  let requestUrl;
  let requestBody;
  const fetchImpl = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return response(200, successBody);
  };
  const res = makeRes();
  await api.createHandler({ env: { OPENAI_API_KEY: 'direct-test', OPENAI_TAROT_MODEL: 'gpt-5.6-terra' }, fetchImpl })(makeReq('POST', validSingle), res);
  assert.equal(res.statusCode, 200);
  assert.equal(requestUrl, 'https://api.openai.com/v1/responses');
  assert.equal(requestBody.model, 'gpt-5.6-terra');
}

console.log('AI tarot API validation, direct OpenAI, runtime OIDC, and upstream diagnostics regression test passed');
