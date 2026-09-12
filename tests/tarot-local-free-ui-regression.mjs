import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');

const html = read('tarot.html');
const script = read('tarot.js');

assert.ok(html.includes('춘봉 타로 상세 상담'), 'tarot page should describe the structured local counseling mode');
assert.ok(html.includes('상세 상담 보기'), 'tarot page should expose the detailed consultation action');
assert.ok(html.includes('CHUNBONG TAROT READING'), 'tarot page should label the local reading feature clearly');
assert.ok(!html.includes('AI 타로 상담'), 'tarot page should not claim the local engine is AI');
assert.ok(!html.includes('AI TAROT COUNSELING'), 'tarot page should not show the old AI kicker');

assert.ok(script.includes("button.textContent = '상세 상담 보기'"));
assert.ok(script.includes("status.textContent = '상세 상담을 볼 수 있습니다.'"));
assert.ok(script.includes('이번 리딩 한눈에 보기'));
assert.ok(!script.includes('AI 상담 기능의 서버 설정'), 'local mode should not expose obsolete AI setup errors');

console.log('structured local tarot UI wording regression test passed');
