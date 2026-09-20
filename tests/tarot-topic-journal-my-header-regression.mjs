import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../tarot.html',import.meta.url),'utf8');
const tarot=await readFile(new URL('../tarot.js',import.meta.url),'utf8');
const personal=await readFile(new URL('../personal-hub.js',import.meta.url),'utf8');
const improvements=await readFile(new URL('../site-improvements.js',import.meta.url),'utf8');

assert.match(html,/tarot-topic-group/,'topic chooser must be visible in quick mode');
assert.doesNotMatch(html,/tarot-choice-group tarot-detail-only"><legend>무엇을 볼까요/,'topic chooser must not be detail-only');
assert.match(html,/tarot-question-field tarot-detail-only/,'question input must be detail-only');
assert.match(html,/빠른 타로<\/strong><span>주제 · 1장\/3장 · 직접 선택/,'quick mode copy must describe topic-first flow');

assert.match(tarot,/question: setupMode==='detail' \? byId\('tarot-question'\)\.value\.trim\(\) : ''/,'quick mode must not record a question');
assert.match(tarot,/mode: setupMode/,'tarot setup must persist quick/detail mode');
assert.match(tarot,/mode:state\.mode\|\|setupMode/,'tarot reading event must include mode');
assert.doesNotMatch(tarot,/input\[name="topic"\]\[value="general"\][\s\S]{0,100}checked=true/,'quick mode must not force topic back to general');

assert.match(personal,/TAROT_TOPIC_LABELS/,'tarot journal needs topic labels');
assert.match(personal,/tarotRecordTitle/,'tarot journal needs topic + mode title');
assert.match(personal,/mode:entry\.mode==='quick'\?'quick':'detail'/,'tarot journal must persist reading mode');
assert.match(personal,/personal-tarot-question/,'question should render only when present');
assert.match(personal,/리딩 정보/,'archive detail must show reading metadata');
assert.match(personal,/<b>주제<\/b>/,'archive detail must show topic');
assert.match(personal,/<b>방식<\/b>/,'archive detail must show quick/detail mode');
assert.doesNotMatch(personal,/질문 없는 리딩/,'journal should not use missing-question placeholder');

assert.match(improvements,/link\.innerHTML='<span aria-hidden="true">MY<\/span>';/,'desktop MY header button should only render MY');
assert.doesNotMatch(improvements,/<strong>팬허브<\/strong>/,'desktop MY header button should not render 팬허브 text');
assert.match(improvements,/aria-label','MY 팬허브'/,'accessible MY fan hub label must remain');

console.log('tarot-topic-journal-my-header-regression: ok');
