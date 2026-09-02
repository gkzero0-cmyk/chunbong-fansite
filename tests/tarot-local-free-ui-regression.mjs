import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');

const html = read('tarot.html');
const script = read('tarot.js');

assert.ok(html.includes('무료 자동 타로 상담'), 'tarot page should describe the free local counseling mode');
assert.ok(html.includes('FREE LOCAL TAROT'), 'tarot page should label the local engine clearly');
assert.ok(!html.includes('AI 타로 상담'), 'tarot page should not claim the local engine is AI');
assert.ok(!html.includes('AI TAROT COUNSELING'), 'tarot page should not show the old AI kicker');

assert.ok(script.includes("button.textContent = '무료 자동 타로 상담 받기'"));
assert.ok(script.includes("status.textContent = '자동 상담 리딩이 준비됐습니다.'"));
assert.ok(!script.includes('AI 상담 기능의 서버 설정'), 'local mode should not expose obsolete AI setup errors');

console.log('free local tarot UI wording regression test passed');
