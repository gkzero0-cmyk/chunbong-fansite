import fs from 'node:fs';
import assert from 'node:assert/strict';

const yml=fs.readFileSync(new URL('../.github/workflows/chunbak-production-smoke.yml',import.meta.url),'utf8');
for(const token of [
  'chunbak-audio.js',
  'chunbak-start-view',
  'chunbak-play-view',
  'data-chunbak-open="ranking"',
  'chunbak-modal-close',
  'getDebugState()',
  'chunbak-fx-layer',
  '1440',
  '1024',
  '390',
  'playwright',
  'ChunbakGame.createPiece(1',
  'invalid_nickname',
  '[data-chunbak-panel="sound"] [data-chunbak-action="back-to-pause"]'
]) assert.ok(yml.includes(token), `missing ${token}`);

console.log('chunbak production smoke source regression passed');
