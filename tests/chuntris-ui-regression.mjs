import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');

assert.ok(html.includes('<title>춘트리스 | 춘봉 팬사이트</title>'));
assert.ok(html.includes('data-page="chuntris"'));
for (const id of ['chuntris-game','chuntris-board','chuntris-hold','chuntris-next','chuntris-score','chuntris-level','chuntris-lines','chuntris-time','chuntris-best','chuntris-reaction','chuntris-status','chuntris-start','chuntris-pause','chuntris-sound','chuntris-volume','chuntris-mobile-controls']) {
  assert.ok(html.includes(`id="${id}"`), id);
}
for (const mode of ['classic','sprint40']) assert.ok(html.includes(`data-chuntris-mode="${mode}"`));
for (const action of ['left','soft-drop','right','rotate-ccw','rotate-cw','hold','hard-drop']) assert.ok(html.includes(`data-chuntris-action="${action}"`));
assert.ok(css.includes('@media'));
assert.ok(css.includes('touch-action'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('chuntris UI regression passed');
