import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');

for (const token of [
  'id="chuntris-nickname"',
  'id="chuntris-ranking"',
  'id="chuntris-ranking-status"',
  'id="chuntris-ranking-list"',
  'data-chuntris-ranking-mode="classic"',
  'data-chuntris-ranking-mode="sprint40"',
  'class="chuntris-ranking-rail',
  'class="chuntris-help-rail',
  'chuntris-hold-panel',
  'chuntris-next-panel'
]) {
  assert.ok(html.includes(token), token);
}
assert.ok(html.indexOf('chuntris-ranking-core.js') < html.indexOf('chuntris.js'));

console.log('Chuntris ranking UI regression passed');
