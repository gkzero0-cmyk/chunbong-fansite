import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');
const data = require('../tarot-data.js');

assert.equal(api.LOCAL_PROVIDER, 'local-tarot-engine');
assert.equal(api.LOCAL_MODEL, 'rule-based-v2');
for (const [spreadId, count] of [['single',1],['threeFlow',3],['fiveInsight',5],['twelveCompass',12]]) {
  const positions = data.spreads[spreadId].positions;
  const body = {
    question:'현재 흐름을 점검해줘', topic:'general', spreadId,
    cards:data.cards.slice(0,count).map((card,i) => ({ id:card.id, orientation:i%2?'reversed':'upright', position:positions[i] }))
  };
  const validated = api.validateReadingRequest(body);
  const reading = api.generateLocalReading(validated);
  assert.equal(reading.cards.length, count);
  assert.ok(reading.overall.length > 80);
  assert.ok(reading.summary.length > 20);
}
for (const topic of Object.keys(data.topics)) {
  assert.doesNotThrow(() => api.validateReadingRequest({
    question:'', topic, spreadId:'single',
    cards:[{ id:data.cards[0].id, orientation:'upright', position:'핵심 메시지' }]
  }));
}
assert.throws(() => api.validateReadingRequest({
  question:'', topic:'general', spreadId:'threeFlow',
  cards:[{ id:data.cards[0].id, orientation:'upright', position:'과거·배경' }]
}));
console.log('expanded local tarot API regression test passed');
