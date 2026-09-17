import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const postgameJs = fs.readFileSync(new URL('../chuntris-postgame-ranking.js', import.meta.url), 'utf8');

for (const token of [
  'id="chuntris-modal"',
  'id="chuntris-ranking"',
  'data-chuntris-panel="ranking"',
  'id="chuntris-ranking-status"',
  'id="chuntris-ranking-list"',
  'data-chuntris-ranking-mode="classic"',
  'data-chuntris-ranking-mode="sprint40"',
  'chuntris-hold-panel',
  'chuntris-next-panel',
  'id="chuntris-ranking-nickname"'
]) {
  assert.ok(html.includes(token), token);
}
assert.equal(html.includes('id="chuntris-nickname"'), false, 'pre-game nickname input must be removed');
assert.equal(html.includes('class="chuntris-ranking-rail'), false, 'ranking must not consume a permanent play rail');
assert.equal(html.includes('class="chuntris-help-rail'), false, 'controls help must not consume a permanent play rail');
assert.ok(html.indexOf('chuntris-ranking-core.js') < html.indexOf('chuntris.js'));
assert.ok(html.indexOf('chuntris.js') < html.indexOf('chuntris-postgame-ranking.js'));

for (const token of [
  "const NICKNAME_KEY = 'chuntris.nickname.v1'",
  "const RANKING_ENDPOINT = '/api/content?type=chuntris-ranking'",
  'ChuntrisRankingCore',
  'loadRanking',
  'submitRanking',
  'data-chuntris-ranking-mode'
]) {
  assert.ok(js.includes(token), token);
}
for (const token of [
  "const endpoint = '/api/content?type=chuntris-ranking'",
  'submitTerminalRanking',
  'chuntris.nickname.v1'
]) {
  assert.ok(postgameJs.includes(token), token);
}
assert.equal(js.includes('innerHTML = entry.nickname'), false, 'nickname must never be rendered with innerHTML');
assert.ok(js.includes('.textContent'), 'ranking rows must use textContent');

console.log('Chuntris ranking UI regression passed');
