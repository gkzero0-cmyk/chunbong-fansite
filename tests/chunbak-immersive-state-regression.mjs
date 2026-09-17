import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

for (const token of [
  'id="chunbak-start-view"',
  'id="chunbak-play-view"',
  'id="chunbak-nickname"',
  'id="chunbak-start"',
  '닉네임 (선택)'
]) assert.ok(html.includes(token), `missing ${token}`);

for (const token of [
  "let gameState = 'start'",
  'function setView(',
  "kind: 'anonymous'",
  "kind: 'valid'",
  "kind: 'invalid'"
]) assert.ok(js.includes(token), `missing ${token}`);

console.log('chunbak immersive state regression passed');
