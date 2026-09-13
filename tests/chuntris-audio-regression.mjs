import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync(new URL('../chuntris-audio.js', import.meta.url), 'utf8');
for (const token of ['AudioContext','chuntris.sound.enabled.v1','chuntris.sound.volume.v1','move','rotate','lock','line','tetris','levelup','gameover','complete']) {
  assert.ok(js.includes(token), token);
}
console.log('chuntris audio regression passed');
