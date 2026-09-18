import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../chuntris.css',import.meta.url),'utf8');
const startCss=fs.readFileSync(new URL('../chuntris-board-start-ui.css',import.meta.url),'utf8');

assert.ok(html.includes('<title>춘트리스 | 춘봉 팬사이트</title>'));
assert.ok(html.includes('data-page="minigames"'));
for(const id of ['chuntris-game','chuntris-board','chuntris-hold','chuntris-next','chuntris-score','chuntris-level','chuntris-lines','chuntris-time','chuntris-best','chuntris-reaction','chuntris-status','chuntris-start','chuntris-pause','chuntris-sound','chuntris-volume','chuntris-mobile-controls','chuntris-ranking-nickname','chuntris-ranking-status','chuntris-ranking-list','chuntris-mode-step','chuntris-difficulty-step','chuntris-gimmick-alert']) assert.ok(html.includes(`id="${id}"`),id);
assert.equal(html.includes('id="chuntris-nickname"'),false);
for(const mode of ['classic','sprint40','score180'])assert.ok(html.includes(`data-chuntris-mode="${mode}"`),mode);
assert.equal(html.includes('data-chuntris-mode="hard"'),false,'hard is now a difficulty, not a mode');
for(const difficulty of ['normal','hard','extreme'])assert.ok(html.includes(`data-chuntris-difficulty="${difficulty}"`),difficulty);
for(const mode of ['classic','sprint40','score180'])assert.ok(html.includes(`data-chuntris-ranking-mode="${mode}"`),mode);
for(const difficulty of ['normal','hard','extreme'])assert.ok(html.includes(`data-chuntris-ranking-difficulty="${difficulty}"`),difficulty);
for(const action of ['left','soft-drop','right','rotate-ccw','rotate-cw','hold','hard-drop'])assert.ok(html.includes(`data-chuntris-action="${action}"`));

assert.ok(html.includes('id="chuntris-start-view"'));
assert.ok(html.includes('id="chuntris-play-view"'));
assert.ok(html.includes('id="chuntris-modal"'));
assert.ok(html.includes('id="chuntris-ranking-register"'));
assert.ok(startCss.includes('.chuntris-difficulty-cards'));
assert.ok(startCss.includes('.chuntris-gimmick-alert'));
assert.ok(startCss.includes('is-gimmick-phantom'));
assert.ok(css.includes('@media'));
assert.ok(css.includes('touch-action'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('chuntris UI regression passed');
