import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');

const topicIds = ['general','love','relations','broadcast','crew','content','career','money','direction'];
assert.deepEqual(Object.keys(data.topics), topicIds);
assert.deepEqual(Object.keys(data.spreads), ['single','threeFlow','fiveInsight','twelveCompass']);
assert.deepEqual(data.spreads.single.positions, ['핵심 메시지']);
assert.deepEqual(data.spreads.threeFlow.positions, ['과거·배경','현재·핵심','앞으로의 흐름']);
assert.deepEqual(data.spreads.fiveInsight.positions, ['현재 상황','강점','장애물','조언','예상 흐름']);
assert.deepEqual(data.spreads.twelveCompass.positions, [
  '현재 상태','내면','외부 환경','관계','강점','약점',
  '기회','장애물','조언','가까운 흐름','장기 흐름','최종 방향'
]);
assert.equal(data.cards.length, 78);
assert.equal(new Set(data.cards.map(card => card.id)).size, 78);
assert.deepEqual(data.cards.map(card => card.deckNumber), Array.from({ length: 78 }, (_, i) => i + 1));
for (const card of data.cards) {
  for (const topicId of topicIds) assert.ok(card.topicHints[topicId], `${card.id} missing ${topicId}`);
}
console.log('expanded tarot data regression test passed');
