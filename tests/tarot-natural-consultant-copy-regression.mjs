import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');
const data = require('../tarot-data.js');
const config = require('../tarot-reading-config.js');

function readingFor(topic, spreadId, orientations, question = '') {
  const spread = config.spreads[spreadId];
  const cards = data.cards.slice(0, spread.count).map((card, index) => ({
    id: card.id,
    orientation: orientations[index] || 'upright',
    position: spread.positions[index]
  }));
  return api.generateLocalReading(api.validateReadingRequest({ question, topic, spreadId, cards }));
}

const abstractPhrases = [
  '흐름이 중심입니다',
  '여지가 살아 있습니다',
  '기준으로 비교해 보세요',
  '이번 리딩의 중심을 잡고 있습니다',
  '메이저 아르카나가'
];

const choice = readingFor(
  'choice',
  'choice6',
  ['reversed', 'upright', 'reversed', 'upright', 'reversed', 'upright'],
  'A와 B 중 어느 쪽을 선택하는 게 좋을까?'
);

assert.match(choice.glance.conclusion, /지금 카드만 보면|지금은/);
assert.match(choice.glance.conclusion, /B/);
assert.match(choice.glance.conclusion, /더 (안정적|편안|유리|잘 맞)|B 쪽/);
assert.ok(choice.glance.conclusion.length < 220, choice.glance.conclusion);
assert.match(choice.glance.action, /오늘|먼저|확인/);
assert.match(choice.comparison.verdict, /A|B/);
assert.ok(choice.comparison.verdict.length < 220, choice.comparison.verdict);
assert.equal(choice.detail.answer, choice.glance.conclusion);
assert.ok(choice.detail.reason.length < 260, choice.detail.reason);
assert.match(choice.detail.reason, /A|B/);
assert.ok(choice.detail.actions.every(item => item.length < 180), JSON.stringify(choice.detail.actions));

for (const text of [
  choice.glance.conclusion,
  choice.glance.positive,
  choice.glance.caution,
  choice.glance.action,
  choice.comparison.leftSummary,
  choice.comparison.rightSummary,
  choice.comparison.verdict,
  choice.detail.reason,
  choice.detail.oneLine,
  ...choice.detail.actions
]) {
  for (const phrase of abstractPhrases) assert.ok(!text.includes(phrase), `${phrase}: ${text}`);
}

const relationship = readingFor(
  'love',
  'love6',
  ['upright', 'upright', 'upright', 'reversed', 'reversed', 'reversed'],
  '이 사람과 앞으로 어떻게 될까?'
);
assert.match(relationship.glance.conclusion, /내 쪽|나는/);
assert.match(relationship.glance.conclusion, /상대/);
assert.match(relationship.glance.conclusion, /조심|거리|속도|차이|마음/);
assert.ok(relationship.glance.conclusion.length < 220, relationship.glance.conclusion);
assert.match(relationship.comparison.bridge, /지금|먼저|핵심|상대/);
for (const phrase of abstractPhrases) {
  assert.ok(!relationship.glance.conclusion.includes(phrase), relationship.glance.conclusion);
  assert.ok(!relationship.detail.reason.includes(phrase), relationship.detail.reason);
}

const flow = readingFor(
  'broadcast',
  'fiveInsight',
  ['upright', 'upright', 'reversed', 'upright', 'upright'],
  '다음 방송은 어떤 방향으로 준비하는 게 좋을까?'
);
assert.match(flow.glance.conclusion, /^지금|^이번|^다음/);
assert.ok(flow.glance.conclusion.length < 220, flow.glance.conclusion);
assert.match(flow.glance.action, /먼저|오늘|한 가지|해보/);
for (const phrase of abstractPhrases) assert.ok(!flow.glance.conclusion.includes(phrase), flow.glance.conclusion);

console.log('natural consultant-style tarot copy regression test passed');
