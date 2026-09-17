import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

for (const token of [
  'id="chunbak-start-view"',
  'id="chunbak-play-view"',
  'id="chunbak-start"',
  'id="chunbak-ranking-list"',
  'id="chunbak-ranking-modal-list"',
  'id="chunbak-modal"',
  'id="chunbak-modal-title"',
  'id="chunbak-modal-close"',
  'id="chunbak-sound"',
  'id="chunbak-volume"',
  'id="chunbak-pause"',
  'data-chunbak-open="ranking"',
  'data-chunbak-open="sound"',
  'data-chunbak-open="controls"',
  'data-chunbak-panel="pause"',
  'id="chunbak-ranking-register"',
  'id="chunbak-ranking-nickname"'
]) assert.ok(html.includes(token), `missing ${token}`);

assert.equal(html.includes('id="chunbak-nickname"'), false, 'pre-game nickname must stay removed');

for (const token of [
  "let gameState = 'start'",
  'function setView(',
  'let rankingEntries = []',
  'function renderRankings(',
  'function showModalPanel(',
  'function hideModalShell(',
  'function pauseGame(',
  'function resumeGame('
]) assert.ok(js.includes(token), `missing ${token}`);

assert.equal(js.includes('getNicknameState'), false, 'nickname ownership belongs to terminal ranking module');
assert.equal(js.includes('submitRanking'), false, 'game runtime must not submit global rankings');

console.log('chunbak immersive state regression passed');
