import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');
const data = require('../tarot-data.js');
const config = require('../tarot-reading-config.js');

const awkward = /(정방향|역방향)(가|는|와|를)(?=\s|[,.])/;

const sampleItem = {
  card: data.cards[0],
  orientation: 'upright',
  position: '현재·핵심'
};
for (const seed of [0, 1, 2]) {
  const text = api.buildCardReading(sampleItem, 'general', 0, seed);
  assert.ok(!awkward.test(text), `awkward Korean particle in card reading: ${text}`);
}

function makeReading(topic, spreadId, orientations) {
  const spread = config.spreads[spreadId];
  const cards = data.cards.slice(0, spread.count).map((card, index) => ({
    id: card.id,
    orientation: orientations[index] || 'upright',
    position: spread.positions[index]
  }));
  return api.generateLocalReading(api.validateReadingRequest({ question: '문법 테스트', topic, spreadId, cards }));
}

const readings = [
  makeReading('choice', 'choice6', ['reversed','upright','reversed','upright','reversed','upright']),
  makeReading('love', 'love6', ['upright','upright','upright','reversed','reversed','reversed']),
  makeReading('general', 'threeFlow', ['upright','reversed','upright'])
];

for (const reading of readings) {
  const texts = [
    ...Object.values(reading.glance),
    reading.overall,
    reading.summary,
    reading.detail.answer,
    reading.detail.reason,
    reading.detail.caution,
    reading.detail.oneLine,
    ...reading.detail.actions,
    ...(reading.comparison ? Object.values(reading.comparison).filter(value => typeof value === 'string') : []),
    ...reading.cards.map(card => card.reading)
  ];
  for (const text of texts) assert.ok(!awkward.test(text), `awkward Korean particle: ${text}`);
}

console.log('tarot Korean particle regression test passed');
