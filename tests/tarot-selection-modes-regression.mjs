import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');

assert.equal(tarot.spreadIdForCount(1), 'single');
assert.equal(tarot.spreadIdForCount(3), 'threeFlow');
assert.equal(tarot.spreadIdForCount(5), 'fiveInsight');
assert.equal(tarot.spreadIdForCount(12), 'twelveCompass');
assert.throws(() => tarot.spreadIdForCount(2));

assert.deepEqual(tarot.validateDeckNumbers(['1','40','78'], 3), [1,40,78]);
for (const bad of [
  { values: ['0'], count: 1 },
  { values: ['79'], count: 1 },
  { values: ['1.5'], count: 1 },
  { values: [''], count: 1 },
  { values: ['3','3','8'], count: 3 },
  { values: ['1','2'], count: 3 }
]) assert.throws(() => tarot.validateDeckNumbers(bad.values, bad.count));

const picks = tarot.buildNumberSelections(['1','40','78'], 'threeFlow', () => 0.1);
assert.deepEqual(picks.map(x => x.card), [data.cards[0], data.cards[39], data.cards[77]]);
assert.deepEqual(picks.map(x => x.deckNumber), [1,40,78]);
assert.deepEqual(picks.map(x => x.position), data.spreads.threeFlow.positions);
assert.ok(picks.every(x => x.orientation === 'upright'));

const shuffled = tarot.shuffleDeck(data.cards, () => 0.5);
assert.equal(shuffled.length, 78);
assert.equal(new Set(shuffled.map(card => card.id)).size, 78);

assert.deepEqual(
  tarot.numberInputConstraintState('number'),
  { disabled: false, required: true },
  'number mode must keep number inputs active and required'
);
assert.deepEqual(
  tarot.numberInputConstraintState('cards'),
  { disabled: true, required: false },
  'direct card selection must disable hidden number inputs so native form validation cannot block submit'
);

console.log('tarot selection modes regression test passed');
