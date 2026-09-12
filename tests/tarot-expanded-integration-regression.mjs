import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const data = require('../tarot-data.js');
const config = require('../tarot-reading-config.js');

const selected = data.cards.slice(0,12).map((card,index) => ({
  card, orientation:'upright', position:data.spreads.twelveCompass.positions[index], deckNumber:card.deckNumber
}));
const payload = tarot.buildAiRequestPayload({ question:'12장 테스트', topic:'direction', spreadId:'twelveCompass', selected });
assert.equal(payload.cards.length, 12);
assert.equal(payload.cards[11].position, '최종 방향');
const baseSummary = tarot.buildSummary(selected, 'direction', 'twelveCompass');
assert.ok(baseSummary.includes(config.spreads.twelveCompass.label));
assert.ok(baseSummary.includes('가능성'));

const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');
assert.ok(js.includes('deckNumber'));
assert.ok(js.includes('dataset.count'));
assert.ok(js.includes("state.phase = 'revealing'"));
assert.ok(js.includes("state.phase = 'results'"));
assert.ok(js.includes('이번 리딩 한눈에 보기'));
assert.ok(html.includes('1~78'));
assert.ok(html.includes('춘봉 타로 상세 상담'));
assert.ok(html.includes('aria-live="polite"'));
assert.ok(html.includes('role="alert"'));
console.log('topic-aware tarot integration regression test passed');
