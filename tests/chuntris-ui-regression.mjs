import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');

assert.ok(html.includes('<title>춘트리스 | 춘봉 팬사이트</title>'));
assert.ok(html.includes('data-page="chuntris"'));
for (const id of ['chuntris-game','chuntris-board','chuntris-hold','chuntris-next','chuntris-score','chuntris-level','chuntris-lines','chuntris-time','chuntris-best','chuntris-reaction','chuntris-status','chuntris-start','chuntris-pause','chuntris-sound','chuntris-volume','chuntris-mobile-controls','chuntris-nickname','chuntris-ranking','chuntris-ranking-status','chuntris-ranking-list']) {
  assert.ok(html.includes(`id="${id}"`), id);
}
for (const mode of ['classic','sprint40']) assert.ok(html.includes(`data-chuntris-mode="${mode}"`));
for (const mode of ['classic','sprint40']) assert.ok(html.includes(`data-chuntris-ranking-mode="${mode}"`));
for (const action of ['left','soft-drop','right','rotate-ccw','rotate-cw','hold','hard-drop']) assert.ok(html.includes(`data-chuntris-action="${action}"`));

const rankingIndex = html.indexOf('class="chuntris-ranking-rail');
const leftIndex = html.indexOf('class="chuntris-side chuntris-left-panel');
const boardIndex = html.indexOf('class="chuntris-board-wrap');
const rightIndex = html.indexOf('class="chuntris-side chuntris-right-panel');
const helpIndex = html.indexOf('class="chuntris-help-rail');
assert.ok(rankingIndex < leftIndex && leftIndex < boardIndex && boardIndex < rightIndex && rightIndex < helpIndex);
assert.ok(html.indexOf('chuntris-hold-panel') < html.indexOf('aria-label="현재 플레이어 기록"'));
assert.ok(html.indexOf('chuntris-next-panel') < html.indexOf('chuntris-reaction-card'));

assert.ok(css.includes('@media'));
assert.ok(css.includes('touch-action'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('chuntris UI regression passed');
