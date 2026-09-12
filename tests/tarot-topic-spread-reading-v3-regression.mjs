import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const config = require('../tarot-reading-config.js');
const data = require('../tarot-data.js');
const api = require('../api/tarot-reading.js');

assert.deepEqual(Object.keys(config.topics), [
  'general','love','partner','relations','broadcast','content','crew','money','choice','direction'
]);
assert.equal(config.topics.partner.label, '상대방 마음');
assert.equal(config.topics.choice.label, '선택 · 결정');
assert.deepEqual(config.topicSpreads.general.map(item => item.count), [1,3,5,12]);
assert.deepEqual(config.topicSpreads.love.map(item => item.count), [3,6,7,12]);
assert.deepEqual(config.topicSpreads.choice.map(item => item.count), [2,6,8,12]);
assert.equal(config.topicSpreads.choice.find(item => item.count === 6).label, '6장 A3 · B3');
assert.equal(config.spreads.choice6.positions.length, 6);
assert.deepEqual(config.spreads.choice6.positions, [
  'A · 장점','A · 위험','A · 예상 결과','B · 장점','B · 위험','B · 예상 결과'
]);
assert.equal(config.spreads.love12.positions.length, 12);
assert.equal(config.spreads.love12.positions[0], '나 · 마음');
assert.equal(config.spreads.love12.positions[5], '상대 · 마음');

const choiceSpread = config.spreads.choice6;
const choiceBody = {
  question: 'A와 B 중 어느 방향이 지금 더 맞을까?',
  topic: 'choice',
  spreadId: 'choice6',
  cards: data.cards.slice(0, 6).map((card, index) => ({
    id: card.id,
    orientation: index % 2 ? 'reversed' : 'upright',
    position: choiceSpread.positions[index]
  }))
};
const validated = api.validateReadingRequest(choiceBody);
assert.equal(validated.cards.length, 6, 'choice comparison must allow six cards');
const reading = api.generateLocalReading(validated);
assert.equal(reading.engine, 'topic-structured-v3');
assert.deepEqual(Object.keys(reading.glance), ['conclusion','positive','caution','action']);
for (const key of Object.keys(reading.glance)) assert.ok(reading.glance[key].length > 12, `${key} must be useful`);
assert.ok(!reading.glance.conclusion.includes(choiceBody.question), 'question text should not be repeated inside the conclusion card');
assert.equal(reading.comparison.type, 'choice');
assert.equal(reading.comparison.leftLabel, 'A');
assert.equal(reading.comparison.rightLabel, 'B');
assert.ok(reading.comparison.leftSummary.length > 10);
assert.ok(reading.comparison.rightSummary.length > 10);
assert.ok(reading.comparison.verdict.length > 10);
assert.ok(!reading.comparison.verdict.includes('B · 예상 결과의'), 'six-card A/B comparison must not privilege B as the verdict card');
assert.ok(reading.detail.answer.length > 15);
assert.ok(reading.detail.reason.length > 15);
assert.ok(reading.detail.keyCards.length >= 2 && reading.detail.keyCards.length <= 4);
assert.ok(reading.detail.actions.length >= 2);
assert.ok(reading.detail.oneLine.length > 10);
assert.ok(reading.cards.every(card => !card.reading.includes('핵심 키워드는')));

const relationshipSpread = config.spreads.love6;
const relationshipReading = api.generateLocalReading(api.validateReadingRequest({
  question: '나와 상대의 관계를 비교해서 보고 싶어',
  topic: 'love',
  spreadId: 'love6',
  cards: data.cards.slice(10, 16).map((card, index) => ({
    id: card.id,
    orientation: 'upright',
    position: relationshipSpread.positions[index]
  }))
}));
assert.equal(relationshipReading.comparison.type, 'relationship');
assert.equal(relationshipReading.comparison.leftLabel, '나');
assert.equal(relationshipReading.comparison.rightLabel, '상대');
assert.ok(relationshipReading.comparison.bridge.length > 10);
assert.ok(!relationshipReading.comparison.bridge.includes('상대 · 기대의'), 'six-card relationship comparison must not invent a single bridge card');

assert.throws(() => api.validateReadingRequest({ ...choiceBody, spreadId: 'threeFlow' }), /invalid_spread_for_topic|invalid_reading/);

const html = read('tarot.html');
assert.ok(html.includes('어떻게 볼까요?'));
assert.ok(html.includes('id="tarot-spread-options"'));
assert.ok(html.includes('춘봉 타로 상세 상담'));
assert.ok(html.includes('상세 상담 보기'));
assert.ok(html.includes('tarot-reading-v3.css'));
assert.ok(html.includes('tarot-reading-config.js'));

const script = read('tarot.js');
assert.ok(script.includes('renderSpreadChoices'));
assert.ok(script.includes('이번 리딩 한눈에 보기'));
assert.ok(script.includes('핵심 결론'));
assert.ok(script.includes('좋은 흐름'));
assert.ok(script.includes('주의할 점'));
assert.ok(script.includes('지금 할 일'));
assert.ok(script.includes('renderComparison'));
assert.ok(script.includes('renderAiReading'));

console.log('topic-aware Tarot spreads and structured reading v3 regression test passed');
