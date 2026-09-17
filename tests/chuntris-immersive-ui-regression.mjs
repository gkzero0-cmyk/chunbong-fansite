import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');

for (const marker of [
  'id="chuntris-start-view"',
  'id="chuntris-play-view"',
  'id="chuntris-mode-classic"',
  'id="chuntris-mode-sprint40"',
  'id="chuntris-player-step"',
  'id="chuntris-utility-ranking"',
  'id="chuntris-utility-sound"',
  'id="chuntris-utility-controls"',
  'id="chuntris-utility-pause"',
  'id="chuntris-modal"',
  'id="chuntris-modal-body"',
  'id="chuntris-pause-continue"',
  'id="chuntris-pause-new"',
  'id="chuntris-clear-label"',
  'id="chuntris-harddrop-fx"'
]) assert.ok(html.includes(marker), marker);

assert.ok(!html.includes('class="chuntris-ranking-rail"'), 'active play must not keep the ranking rail');
assert.ok(!html.includes('class="chuntris-help-rail"'), 'active play must not keep the controls rail');
assert.ok(html.includes('data-chuntris-mode="classic"'));
assert.ok(html.includes('data-chuntris-mode="sprint40"'));

console.log('chuntris immersive UI regression passed');
